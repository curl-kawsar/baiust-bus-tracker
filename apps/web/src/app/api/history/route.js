import { NextResponse } from 'next/server';

const BASE_URL = process.env.BASE_URL || 'http://172.104.160.132:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'BCC2025';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const device_id = searchParams.get('device_id');
    
    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id parameter is required' },
        { status: 400 }
      );
    }

    console.log('Fetching history for device:', device_id);
    
    const response = await fetch(`${BASE_URL}/history?device_id=${device_id}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 } // Cache for 60 seconds for historical data
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching device history:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch device history', message: error.message },
      { status: 500 }
    );
  }
}
