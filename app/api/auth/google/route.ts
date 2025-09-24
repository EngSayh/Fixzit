import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { config } from '@/src/config/environment';

const client = new OAuth2Client(
  config.oauth.google.clientId,
  config.oauth.google.clientSecret,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

/**
 * Handles Google OAuth login and callback flow for the API route.
 *
 * Supports two behaviors based on the `action` query parameter:
 * - `action=login`: redirects the client to Google's OAuth consent screen (offline access; scopes: `email`, `profile`).
 * - callback (no `action` or other value): exchanges the authorization `code` for tokens, verifies the ID token, finds or creates a user in MongoDB, issues a JWT, sets a secure HTTP-only cookie, and redirects to `/dashboard`.
 *
 * Side effects:
 * - May create a new user or update `lastLogin` for an existing user in the `users` MongoDB collection.
 * - Issues a JWT and sets it in a cookie named `fixzit_auth` (httpOnly, sameSite=lax, secure in production, 7-day max age, path=/).
 *
 * Redirects:
 * - `/login?error=no_code` if the callback is missing the authorization `code`.
 * - `/login?error=oauth_failed` on any OAuth/DB failure.
 *
 * @param req - The incoming NextRequest for this route.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  
  if (action === 'login') {
    // Generate Google OAuth URL
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    });
    
    return NextResponse.redirect(authUrl);
  }
  
  // Handle callback
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }
  
  try {
    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    
    // Get user info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.oauth.google.clientId
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('No payload from Google');
    }
    
    // Connect to MongoDB
    const mongoClient = new MongoClient(config.mongodb.uri);
    await mongoClient.connect();
    const db = mongoClient.db(config.mongodb.db);
    
    // Find or create user
    let user = await db.collection('users').findOne({ email: payload.email });
    
    if (!user) {
      // Create new user
      const newUser = {
        email: payload.email,
        googleId: payload.sub,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        picture: payload.picture,
        role: 'CUSTOMER', // Default role for OAuth users
        status: 'ACTIVE',
        authProvider: 'google',
        tenantId: 'default',
        modules: ['dashboard', 'marketplace'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update last login
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );
    }
    
    await mongoClient.close();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      } as any,
      config.jwt.secret as unknown as jwt.Secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
    
    // Create response with redirect
    const response = NextResponse.redirect('/dashboard');
    
    // Set secure cookie
    response.cookies.set('fixzit_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7, // 7 days
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect('/login?error=oauth_failed');
  }
}
