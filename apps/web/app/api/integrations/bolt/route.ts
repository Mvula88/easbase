import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const webhookUrl = request.headers.get('x-webhook-url') || 'https://bolt.new/api/webhooks/easbase';

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Easbase-Event': 'schema.generated',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Bolt webhook error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ success: true, message: 'Schema sent to Bolt successfully' });
    }
  } catch (error) {
    console.error('Error sending to Bolt:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Bolt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}