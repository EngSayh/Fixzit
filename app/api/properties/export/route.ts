import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Generate CSV data
    const csvData = `Property Name,Address,Type,Status,Units,Occupancy Rate,Monthly Revenue
Al Olaya Tower,King Fahd Road,Commercial,Active,45,92%,450000
Marina Residences,Corniche Road,Residential,Active,120,88%,800000`;
    
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="properties-export.csv"'
      }
    });
  } catch (error) {
    console.error('Error exporting properties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}