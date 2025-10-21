import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { User } from '@/server/models/User';

/**
 * POST /api/auth/provision
 * User provisioning endpoint for OAuth sign-ins
 * Creates or updates user record in database when users sign in via OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, image, provider } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate and sanitize optional OAuth fields
    const ALLOWED_PROVIDERS = ['google', 'github', 'microsoft', 'apple', 'oauth'];
    const MAX_NAME_LENGTH = 100;
    const MAX_URL_LENGTH = 2048;
    
    // Sanitize name: trim, limit length, remove control characters
    let sanitizedName: string | null = null;
    if (name && typeof name === 'string') {
      const trimmed = name.trim().replace(/[\x00-\x1F\x7F]/g, '');
      sanitizedName = trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH ? trimmed : null;
    }
    
    // Validate image URL: must be valid URL or data URI, within length limits
    let sanitizedImage: string | null = null;
    if (image && typeof image === 'string') {
      const trimmed = image.trim();
      if (trimmed.length > 0 && trimmed.length <= MAX_URL_LENGTH) {
        // Basic URL validation
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
          try {
            if (trimmed.startsWith('data:')) {
              // Validate data URI format
              sanitizedImage = /^data:image\/(png|jpg|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed) ? trimmed : null;
            } else {
              // Validate HTTP(S) URL
              new URL(trimmed);
              sanitizedImage = trimmed;
            }
          } catch {
            sanitizedImage = null;
          }
        }
      }
    }
    
    // Validate provider against allowlist
    const sanitizedProvider = (provider && typeof provider === 'string' && ALLOWED_PROVIDERS.includes(provider.toLowerCase()))
      ? provider.toLowerCase()
      : 'oauth';

    // Connect to database (single connection for entire request)
    const conn = await dbConnect();

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      // Create new user with OAuth details
      // Extract first and last name from full name
      const nameParts = (sanitizedName || email.split('@')[0]).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Generate username from email
      const username = email.split('@')[0];
      
      // Use MongoDB transaction for atomic counter increment + user creation
      const session = await conn.startSession();
      
      try {
        let code: string;
        let newUser: typeof User.prototype;
        
        await session.withTransaction(async () => {
          // Generate unique user code atomically using MongoDB counter
          if (!conn.db) {
            throw new Error('Database not available');
          }
          
          interface CounterDoc {
            _id: string;
            seq: number;
          }
          
          const result = await conn.db.collection<CounterDoc>('counters').findOneAndUpdate(
            { _id: 'userCode' },
            { 
              $inc: { seq: 1 },
              $setOnInsert: { seq: 0 }
            },
            { upsert: true, returnDocument: 'after', session }
          );
          
          if (!result?.seq && result?.seq !== 0) {
            throw new Error('Failed to generate user code: counter initialization failed');
          }
          
          code = `USR${String(result.seq).padStart(6, '0')}`;

          newUser = await User.create([{
            code,
            username,
            email,
            password: '', // OAuth users don't have passwords
            personal: {
              firstName,
              lastName,
            },
            professional: {
              role: 'USER', // Default role for OAuth users
            },
            status: 'ACTIVE',
            metadata: {
              authProvider: sanitizedProvider,
              profileImage: sanitizedImage,
              lastLogin: new Date(),
            },
          }], { session });
        });
        
        await session.endSession();

        console.log('New OAuth user provisioned successfully', { 
          provider: sanitizedProvider
        });

        return NextResponse.json(
          { 
            success: true, 
            userId: newUser._id,
            isNewUser: true 
          },
          { status: 200 }
        );
      } catch (txError) {
        await session.endSession();
        throw txError;
      }
    } else {
      // Update last login and profile image if changed
      try {
        const updated = await User.findByIdAndUpdate(
          existingUser._id,
          {
            $set: {
              'metadata.lastLogin': new Date(),
              'metadata.profileImage': sanitizedImage,
            },
          },
          { new: true }
        );

        if (!updated) {
          console.error('User update failed: user not found', {
            userId: existingUser._id
          });
          return NextResponse.json(
            { error: 'User update failed' },
            { status: 500 }
          );
        }

        console.log('Existing OAuth user updated successfully');
      } catch (updateError) {
        console.error('User update failed', {
          message: updateError instanceof Error ? updateError.message : 'Unknown error',
        });
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          userId: existingUser._id,
          isNewUser: false 
        },
        { status: 200 }
      );
    }
  } catch (error) {
    // Sanitized error logging - no PII (email), no connection strings, no stack traces
    const errorId = `provision_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.error('User provisioning error', {
      errorId,
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      { error: 'Failed to provision user', errorId },
      { status: 500 }
    );
  }
}
