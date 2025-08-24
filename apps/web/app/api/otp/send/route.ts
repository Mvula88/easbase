import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { phone, email, channel = 'sms' } = await request.json();

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user (optional for OTP)
    const { data: { user } } = await supabase.auth.getUser();

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { data: otp, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        email,
        code,
        channel,
        user_id: user?.id,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (otpError) {
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Send OTP based on channel
    if (channel === 'email' && email) {
      // Send via email
      await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Your verification code',
          html: `
            <h2>Verification Code</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 8px; color: #0891b2;">${code}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          `,
        }),
      });
    } else if (phone) {
      // Send via SMS/WhatsApp
      const message = `Your Easbase verification code is: ${code}. Valid for 10 minutes.`;
      
      if (channel === 'whatsapp') {
        // Send via WhatsApp using Twilio
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        await client.messages.create({
          body: message,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${phone}`,
        });
      } else {
        // Send via SMS
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            body: message,
            type: 'otp',
          }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      id: otp.id,
      expiresAt: expiresAt.toISOString(),
      message: `OTP sent via ${channel}`,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}