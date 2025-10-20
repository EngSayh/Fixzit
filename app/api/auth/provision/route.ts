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
      
      // Generate unique user code
      const userCount = await User.countDocuments();
      const code = `USR${String(userCount + 1).padStart(6, '0')}`;

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
        email,
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
      const updatedUser = await User.findByIdAndUpdate(
        existingUser._id,
        {
          $set: {
            'metadata.lastLogin': new Date(),
            'metadata.profileImage': image,
          },
        },
        { new: true }
      );

      console.log('Existing OAuth user updated', { 
        userId: existingUser._id, 
        email 
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
