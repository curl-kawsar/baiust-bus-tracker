import { NextResponse } from 'next/server';

const BASE_URL = process.env.BASE_URL || 'http://172.104.160.132:3000';
const AUTH_TOKEN = process.env.BUS_API_TOKEN || 'BCC2025';

export async function GET() {
  try {
    console.log('Fetching devices from:', `${BASE_URL}/devices`);
    
    const response = await fetch(`${BASE_URL}/devices`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching devices:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch devices', message: error.message },
      { status: 500 }
    );
  }
}
