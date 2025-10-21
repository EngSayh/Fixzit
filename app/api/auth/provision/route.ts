import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { User } from '@/server/models/User';
import { createHash } from 'crypto';

/**
 * POST /api/auth/provision
 * User provisioning endpoint for OAuth sign-ins
 * SECURED: Requires internal API token to prevent unauthorized user creation
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate internal API token to prevent public access
    const authHeader = request.headers.get('authorization');
    const internalToken = process.env.INTERNAL_API_TOKEN;
    
    if (!internalToken || !authHeader || authHeader !== `Bearer ${internalToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API token' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { email, name, image, provider } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

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
      
      // Generate unique user code atomically to prevent race conditions
      // Using atomic counter instead of countDocuments()
      const Counter = (await import('@/models/Counter')).default;
      const counter = await Counter.findOneAndUpdate(
        { _id: 'userCode' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const code = `USR${String(counter.seq).padStart(6, '0')}`;

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

      // Hash email for logging (PII protection)
      const emailHash = createHash('sha256').update(email).digest('hex').substring(0, 16);
      console.log('New OAuth user provisioned', { 
        userId: newUser._id,
        emailHash, // Log hash instead of plaintext email
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
      const _updatedUser = await User.findByIdAndUpdate(
        existingUser._id,
        {
          $set: {
            'metadata.lastLogin': new Date(),
            'metadata.profileImage': image,
          },
        },
        { new: true }
      );

      // Hash email for logging (PII protection)
      const emailHash = createHash('sha256').update(email).digest('hex').substring(0, 16);
      console.log('Existing OAuth user updated', { 
        userId: existingUser._id,
        emailHash // Log hash instead of plaintext email
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
    console.error('User provisioning error:', error);
    return NextResponse.json(
      { error: 'Failed to provision user' },
      { status: 500 }
    );
  }
}
