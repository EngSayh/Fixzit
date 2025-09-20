import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { backendPrisma as prisma } from '@/lib/backend-prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-secret-key';

export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authorization = req.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    
    // Verify and decode token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId 
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            plan: true,
            isActive: true
          }
        },
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            position: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Get user's primary role and permissions
    const primaryRole = user.userRoles[0]?.role;
    const permissions = primaryRole?.rolePermissions
      .map(rp => rp.permission)
      .map(p => ({
        module: p.module,
        action: p.action,
        name: p.name
      })) || [];

    // Build session response
    const session = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      role: {
        name: primaryRole?.name || 'user',
        displayName: primaryRole?.displayName || 'User',
        level: primaryRole?.level || 0,
        permissions
      },
      employee: user.employee ? {
        id: user.employee.id,
        employeeId: user.employee.employeeId,
        position: user.employee.position,
        department: user.employee.department?.name
      } : null,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        subdomain: user.organization.subdomain,
        plan: user.organization.plan,
        isActive: user.organization.isActive
      } : null,
      token: {
        expiresIn: '24h',
        issued: new Date(decoded.iat * 1000),
        expires: new Date(decoded.exp * 1000)
      }
    };

    // Update last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    }).catch(err => {
      console.error('Failed to update last activity:', err);
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}