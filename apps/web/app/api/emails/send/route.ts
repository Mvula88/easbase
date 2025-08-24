import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text, template, data } = await request.json();

    if (!to || (!template && !subject)) {
      return NextResponse.json(
        { error: 'Recipient and subject/template are required' },
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
      .select('emails_sent, subscription_plan')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // For now, use SendGrid directly (in production, you'd check providers)
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    let emailHtml = html;
    let emailText = text;
    let emailSubject = subject;

    // Process template if provided
    if (template) {
      const templates: Record<string, any> = {
        'welcome': {
          subject: 'Welcome to Easbase!',
          html: `
            <h2>Welcome to Easbase!</h2>
            <p>Hi ${data?.name || 'there'},</p>
            <p>Thank you for signing up! Your complete backend solution is ready to use.</p>
            <p>Get started with these features:</p>
            <ul>
              <li>✅ Authentication & User Management</li>
              <li>✅ Team Organizations</li>
              <li>✅ Stripe Billing Integration</li>
              <li>✅ Email & SMS Services</li>
              <li>✅ File Storage</li>
              <li>✅ Secure Database</li>
            </ul>
            <p>Need help? Reply to this email or visit our docs.</p>
            <p>Best regards,<br>The Easbase Team</p>
          `,
        },
        'magic-link': {
          subject: 'Sign in to Easbase',
          html: `
            <h2>Sign in to Easbase</h2>
            <p>Click the link below to sign in to your account:</p>
            <a href="${data?.link}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Sign In
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
        },
        'team-invitation': {
          subject: `You've been invited to join ${data?.orgName}`,
          html: `
            <h2>Team Invitation</h2>
            <p>You've been invited to join ${data?.orgName} on Easbase as a ${data?.role}.</p>
            <a href="${data?.link}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
            <p>This invitation expires in 7 days.</p>
          `,
        },
        'password-reset': {
          subject: 'Reset your password',
          html: `
            <h2>Password Reset</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${data?.link}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
        },
      };

      const selectedTemplate = templates[template];
      if (selectedTemplate) {
        emailSubject = selectedTemplate.subject;
        emailHtml = selectedTemplate.html;
        emailText = selectedTemplate.text || emailHtml?.replace(/<[^>]*>/g, '');
      }
    }

    // Send email
    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@easbase.com',
      subject: emailSubject,
      text: emailText || emailHtml?.replace(/<[^>]*>/g, ''),
      html: emailHtml,
    };

    try {
      await sgMail.send(msg);
    } catch (sgError: any) {
      console.error('SendGrid error:', sgError);
      
      // Fallback to Resend if SendGrid fails
      if (process.env.RESEND_API_KEY) {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: Array.isArray(to) ? to : [to],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        });
      } else {
        throw sgError;
      }
    }

    // Log email in database
    await supabase
      .from('email_logs')
      .insert({
        user_id: user.id,
        recipients: Array.isArray(to) ? to : [to],
        subject: emailSubject,
        template,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    // Track usage
    await fetch('/api/billing/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: 'email_sent',
        quantity: Array.isArray(to) ? to.length : 1,
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${Array.isArray(to) ? to.length : 1} recipient(s)`,
    });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}