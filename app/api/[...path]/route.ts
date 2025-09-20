import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path?.join('/') || '';
    const url = new URL(`${BACKEND_URL}/api/${path}`);
    
    // Forward query parameters
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    // Forward authorization if present
    const auth = req.headers.get('authorization');
    if (auth) {
      headers.set('Authorization', auth);
    }

    // Prepare request options
    const options: RequestInit = {
      method: req.method,
      headers,
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const body = await req.json();
        options.body = JSON.stringify(body);
      } catch {
        // No JSON body
      }
    }

    // Make the request to backend
    const response = await fetch(url.toString(), options);
    
    // Get response data
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Return response with same status
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json'
      }
    });
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: { path: string[] } }) {
  return handler(req, context);
}

export async function POST(req: NextRequest, context: { params: { path: string[] } }) {
  return handler(req, context);
}

export async function PUT(req: NextRequest, context: { params: { path: string[] } }) {
  return handler(req, context);
}

export async function PATCH(req: NextRequest, context: { params: { path: string[] } }) {
  return handler(req, context);
}

export async function DELETE(req: NextRequest, context: { params: { path: string[] } }) {
  return handler(req, context);
}