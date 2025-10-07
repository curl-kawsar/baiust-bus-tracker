import { NextResponse } from 'next/server';

const BASE_URL = process.env.BASE_URL || 'http://172.104.160.132:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'BCC2025';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const device_id = searchParams.get('device_id');
  
  if (!device_id) {
    return NextResponse.json(
      { error: 'device_id parameter is required' },
      { status: 400 }
    );
  }

  console.log('Starting SSE stream for device:', device_id);

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      const initialMessage = `data: ${JSON.stringify({ 
        type: 'connection', 
        message: 'Connected to live updates' 
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Function to send live data
      const sendLiveData = async () => {
        try {
          const response = await fetch(`${BASE_URL}/data?device_id=${device_id}`, {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const message = `data: ${JSON.stringify({
              type: 'update',
              timestamp: new Date().toISOString(),
              device_id: device_id,
              data: data
            })}\n\n`;
            controller.enqueue(encoder.encode(message));
          }
        } catch (error) {
          console.error('Error in SSE stream:', error.message);
          const errorMessage = `data: ${JSON.stringify({
            type: 'error',
            timestamp: new Date().toISOString(),
            message: error.message
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        }
      };

      // Send initial data
      sendLiveData();

      // Set up interval to send updates every 5 seconds
      const intervalId = setInterval(sendLiveData, 5000);

      // Clean up on close
      request.signal?.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
