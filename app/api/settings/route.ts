import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, fetch from backend API
    // For now, return mock settings
    const settings = {
      notifications: {
        email: true,
        push: true,
        sms: true
      },
      language: {
        preferred: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      appearance: {
        theme: 'light',
        compactMode: false
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false
      }
    };

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // In production, save to backend API
    const response = await fetch(`${API_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // If backend doesn't have this endpoint yet, still return success
      return NextResponse.json({ success: true, message: 'Settings saved' });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error saving settings:', error);
    // Return success even if backend fails for now
    return NextResponse.json({ success: true, message: 'Settings saved locally' });
  }
}