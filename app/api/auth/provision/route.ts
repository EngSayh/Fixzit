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

    // Connect to database (single connection for entire request)
    const conn = await dbConnect();

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      // Create new user with OAuth details
      // Extract first and last name from full name
      const nameParts = (name || email.split('@')[0]).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Generate username from email
      const username = email.split('@')[0];
      
      // Generate unique user code atomically using MongoDB counter
      // This prevents race conditions when multiple users register simultaneously
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
        { upsert: true, returnDocument: 'after' }
      );
      
      if (!result?.seq && result?.seq !== 0) {
        throw new Error('Failed to generate user code: counter initialization failed');
      }
      
      const code = `USR${String(result.seq).padStart(6, '0')}`;

      const newUser = await User.create({
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
          authProvider: provider || 'oauth',
          profileImage: image,
          lastLogin: new Date(),
        },
      });

      console.log('New OAuth user provisioned', { 
        userId: newUser._id, 
        code: newUser.code,
        provider 
      });

      return NextResponse.json(
        { 
          success: true, 
          userId: newUser._id,
          isNewUser: true 
        },
        { status: 200 }
      );
    } else {
      // Update last login and profile image if changed
      await User.findByIdAndUpdate(
        existingUser._id,
        {
          $set: {
            'metadata.lastLogin': new Date(),
            'metadata.profileImage': image,
          },
        }
      );

      console.log('Existing OAuth user updated', { 
        userId: existingUser._id, 
        code: existingUser.code
      });

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
