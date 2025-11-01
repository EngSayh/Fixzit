import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { User } from '@/server/models/User';

/**
 * POST /api/auth/provision-oauth
 * Internal API for OAuth user provisioning called from auth.config.ts
 * Protected by INTERNAL_API_SECRET header
 */
export async function POST(request: NextRequest) {
  // Verify internal API secret
  const secret = request.headers.get('X-Internal-Secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      // Create new user with OAuth details
      const nameParts = (name || email.split('@')[0]).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const username = email.split('@')[0];

      try {
        const newUser = await User.create({
          username,
          email: normalizedEmail,
          password: '', // OAuth users don't have passwords
          personal: {
            firstName,
            lastName,
          },
          professional: {
            role: 'TENANT', // Default role for OAuth users
          },
          status: 'ACTIVE',
          metadata: {
            authProvider: provider,
            profileImage: image,
            lastLogin: new Date(),
          },
        });

        return NextResponse.json(
          { success: true, userId: newUser._id, isNewUser: true },
          { status: 200 }
        );
      } catch (createError: unknown) {
        // Handle duplicate key error (race condition)
        if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 11000) {
          // User was created by another request, fetch and return
          const user = await User.findOne({ email: normalizedEmail });
          if (user) {
            return NextResponse.json(
              { success: true, userId: user._id, isNewUser: false },
              { status: 200 }
            );
          }
        }
        throw createError;
      }
    } else {
      // Update existing user's last login and profile image
      await User.findByIdAndUpdate(
        existingUser._id,
        {
          $set: {
            'metadata.lastLogin': new Date(),
            ...(image && { 'metadata.profileImage': image }),
          },
        },
        { new: true }
      );

      return NextResponse.json(
        { success: true, userId: existingUser._id, isNewUser: false },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('OAuth provisioning error', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to provision user' },
      { status: 500 }
    );
  }
}
