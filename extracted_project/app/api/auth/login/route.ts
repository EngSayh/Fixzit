import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-secret-key';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user with organization using raw SQL
    const users = await query<any>(`
      SELECT u.*, o.name as org_name, o.subdomain as org_subdomain 
      FROM users u 
      LEFT JOIN organizations o ON u."organizationId" = o.id 
      WHERE u.email = $1
      LIMIT 1
    `, [email]);

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];
    
    // Check if user is active (status column exists in database)
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await query(`
      UPDATE users 
      SET "lastLoginAt" = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        orgId: user.organizationId,
        role: user.role || 'USER'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || user.name,
        lastName: user.lastName || '',
        phone: user.phone,
        avatar: user.avatar,
        role: user.role || 'USER',
        status: user.status,
        organization: user.organizationId ? {
          id: user.organizationId,
          name: user.org_name,
          subdomain: user.org_subdomain
        } : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}