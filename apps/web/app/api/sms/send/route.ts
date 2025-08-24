import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { to, body, type = 'sms' } = await request.json();

    if (!to || !body) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check usage limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('sms_sent, subscription_plan')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Send SMS using Twilio
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const message = await client.messages.create({
        body,
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      // Log SMS in database
      await supabase
        .from('sms_logs')
        .insert({
          user_id: user.id,
          recipient: to,
          body,
          type,
          status: 'sent',
          message_sid: message.sid,
          sent_at: new Date().toISOString(),
        });

      // Track usage
      await fetch('/api/billing/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'sms_sent',
          quantity: 1,
        }),
      });

      return NextResponse.json({
        success: true,
        messageId: message.sid,
        message: 'SMS sent successfully',
      });
    } catch (twilioError: any) {
      console.error('Twilio error:', twilioError);
      
      // Log failed attempt
      await supabase
        .from('sms_logs')
        .insert({
          user_id: user.id,
          recipient: to,
          body,
          type,
          status: 'failed',
          error: twilioError.message,
          sent_at: new Date().toISOString(),
        });

      throw twilioError;
    }
  } catch (error: any) {
    console.error('Send SMS error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}