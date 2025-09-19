import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { backendPrisma as prisma } from '@/lib/backend-prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-secret-key';

export async function POST(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authorization = req.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Logged out successfully' });
    }

    const token = authorization.split(' ')[1];
    
    try {
      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Optional: Update user's last activity for audit purposes
      if (decoded.userId) {
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { updatedAt: new Date() }
        }).catch(err => {
          console.error('Failed to update user activity:', err);
        });
      }
    } catch (error) {
      // Token is invalid, but logout should still succeed
      console.log('Token verification failed during logout:', error);
    }

    // In a JWT-based system, logout is primarily handled client-side
    // by removing the token from storage
    return NextResponse.json({ 
      message: 'Logged out successfully',
      success: true 
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, logout should succeed from client perspective
    return NextResponse.json({ 
      message: 'Logged out successfully',
      success: true 
    });
  }
}

export async function GET(req: NextRequest) {
  // Support GET method for simple logout links
  return POST(req);
}