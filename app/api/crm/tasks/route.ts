import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const tasks = [
      {
        id: '1',
        title: 'Follow up with Ahmed on maintenance contract',
        type: 'call',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        contact: 'Ahmed Al-Rashid',
        status: 'pending'
      },
      {
        id: '2',
        title: 'Send proposal to Sara',
        type: 'email',
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        contact: 'Sara Al-Fahad',
        status: 'pending'
      }
    ];
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}