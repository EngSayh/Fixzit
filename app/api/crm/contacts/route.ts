import { NextRequest, NextResponse } from 'next/server';
import { backendPrisma as prisma } from '@/lib/backend-prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-secret-key';

async function verifyAuth(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/crm/contacts - List contacts
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    // Build filter conditions
    const where: any = { orgId: auth.orgId };
    
    if (type) {
      where.type = type;
    }
    if (assignedTo) {
      where.assignedToId = assignedTo;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const totalCount = await prisma.contact.count({ where });

    // Fetch contacts with relations
    const contacts = await prisma.contact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        leads: {
          where: {
            status: { not: 'closed' }
          },
          select: {
            id: true,
            status: true
          }
        },
        deals: {
          where: {
            status: { not: 'closed' }
          },
          select: {
            id: true,
            status: true,
            value: true
          }
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            type: true,
            createdAt: true
          }
        }
      }
    });

    // Transform contacts
    const transformedContacts = contacts.map(contact => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      jobTitle: contact.jobTitle,
      type: contact.type,
      source: contact.source,
      status: contact.status,
      assignedTo: contact.assignedTo ? {
        id: contact.assignedTo.id,
        name: `${contact.assignedTo.firstName} ${contact.assignedTo.lastName}`,
        avatar: contact.assignedTo.avatar
      } : null,
      activeLeads: contact.leads.length,
      activeDeals: contact.deals.length,
      totalDealValue: contact.deals.reduce((sum, deal) => sum + deal.value.toNumber(), 0),
      lastInteraction: contact.interactions[0] || null,
      createdBy: `${contact.creator.firstName} ${contact.creator.lastName}`,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }));

    return NextResponse.json({
      data: transformedContacts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Contacts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/crm/contacts - Create contact
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      type = 'individual',
      source = 'direct',
      status = 'active',
      address,
      notes,
      assignedToId
    } = data;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email if provided
    if (email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          email,
          orgId: auth.orgId
        }
      });

      if (existingContact) {
        return NextResponse.json(
          { error: 'Contact with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        type,
        source,
        status,
        address,
        notes,
        assignedToId: assignedToId || auth.userId,
        createdById: auth.userId,
        orgId: auth.orgId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create initial interaction
    await prisma.interaction.create({
      data: {
        type: 'contact_created',
        description: `Contact created: ${firstName} ${lastName}`,
        contactId: contact.id,
        createdById: auth.userId,
        orgId: auth.orgId
      }
    }).catch(err => {
      console.error('Failed to create interaction:', err);
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'contact_created',
        title: 'New Contact Added',
        message: `New contact "${firstName} ${lastName}" has been added to CRM`,
        userId: assignedToId || auth.userId,
        entityType: 'contact',
        entityId: contact.id,
        orgId: auth.orgId,
        createdBy: auth.userId
      }
    }).catch(err => {
      console.error('Failed to create notification:', err);
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Contact creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}