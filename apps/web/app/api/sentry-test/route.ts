import { NextResponse } from 'next/server';

export async function GET() {
  try {
    throw new Error('Test Sentry Error - This is a test error to verify Sentry integration');
  } catch (error) {
    console.error('Sentry test error triggered:', error);
    throw error;
  }
}

export async function POST() {
  return NextResponse.json({ 
    message: 'Sentry test endpoint - Use GET to trigger an error' 
  });
}