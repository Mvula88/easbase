import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';

/**
 * Configure authentication settings for a backend
 * PUT /api/backends/[backendId]/auth-config
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { backendId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, config } = body;

    // Get backend details
    const { data: backend, error: backendError } = await supabase
      .from('customer_backends')
      .select('*')
      .eq('id', params.backendId)
      .eq('customer_id', user.id)
      .single();

    if (backendError || !backend) {
      return NextResponse.json({ error: 'Backend not found' }, { status: 404 });
    }

    const projectId = backend.project_id;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

    switch (type) {
      case 'oauth':
        return configureOAuthProvider(projectId, config, accessToken!);
      
      case 'smtp':
        return configureSMTP(projectId, config, accessToken!);
      
      case 'email-templates':
        return configureEmailTemplates(projectId, config, accessToken!);
      
      default:
        return NextResponse.json({ error: 'Invalid configuration type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Auth config error:', error);
    return NextResponse.json(
      { error: 'Failed to update auth configuration' },
      { status: 500 }
    );
  }
}

/**
 * Configure OAuth providers (Google, GitHub, Facebook, etc.)
 */
async function configureOAuthProvider(
  projectId: string,
  config: any,
  accessToken: string
): Promise<NextResponse> {
  const { provider, enabled, clientId, clientSecret, redirectUrl } = config;

  // Map of provider settings
  const providerSettings: Record<string, any> = {
    google: {
      EXTERNAL_GOOGLE_ENABLED: enabled,
      EXTERNAL_GOOGLE_CLIENT_ID: clientId,
      EXTERNAL_GOOGLE_SECRET: clientSecret,
      EXTERNAL_GOOGLE_REDIRECT_URI: redirectUrl || `https://${projectId}.supabase.co/auth/v1/callback`
    },
    github: {
      EXTERNAL_GITHUB_ENABLED: enabled,
      EXTERNAL_GITHUB_CLIENT_ID: clientId,
      EXTERNAL_GITHUB_SECRET: clientSecret,
      EXTERNAL_GITHUB_REDIRECT_URI: redirectUrl || `https://${projectId}.supabase.co/auth/v1/callback`
    },
    facebook: {
      EXTERNAL_FACEBOOK_ENABLED: enabled,
      EXTERNAL_FACEBOOK_CLIENT_ID: clientId,
      EXTERNAL_FACEBOOK_SECRET: clientSecret,
      EXTERNAL_FACEBOOK_REDIRECT_URI: redirectUrl || `https://${projectId}.supabase.co/auth/v1/callback`
    },
    twitter: {
      EXTERNAL_TWITTER_ENABLED: enabled,
      EXTERNAL_TWITTER_CLIENT_ID: clientId,
      EXTERNAL_TWITTER_SECRET: clientSecret,
      EXTERNAL_TWITTER_REDIRECT_URI: redirectUrl || `https://${projectId}.supabase.co/auth/v1/callback`
    },
    discord: {
      EXTERNAL_DISCORD_ENABLED: enabled,
      EXTERNAL_DISCORD_CLIENT_ID: clientId,
      EXTERNAL_DISCORD_SECRET: clientSecret,
      EXTERNAL_DISCORD_REDIRECT_URI: redirectUrl || `https://${projectId}.supabase.co/auth/v1/callback`
    }
  };

  const settings = providerSettings[provider.toLowerCase()];
  if (!settings) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  try {
    // Update auth configuration via Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update OAuth settings: ${error}`);
    }

    return NextResponse.json({
      message: `${provider} OAuth provider configured successfully`,
      provider,
      enabled,
      redirectUrl: settings[`EXTERNAL_${provider.toUpperCase()}_REDIRECT_URI`]
    });
  } catch (error: any) {
    console.error('OAuth config error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Configure custom SMTP settings (Resend, SendGrid, etc.)
 */
async function configureSMTP(
  projectId: string,
  config: any,
  accessToken: string
): Promise<NextResponse> {
  const { 
    provider, 
    host, 
    port, 
    username, 
    password, 
    fromEmail, 
    fromName 
  } = config;

  // Preset configurations for popular services
  const presets: Record<string, any> = {
    resend: {
      host: 'smtp.resend.com',
      port: 587,
      username: 'resend',
      password: config.apiKey, // Resend uses API key as password
    },
    sendgrid: {
      host: 'smtp.sendgrid.net',
      port: 587,
      username: 'apikey',
      password: config.apiKey,
    },
    mailgun: {
      host: 'smtp.mailgun.org',
      port: 587,
      username: config.username,
      password: config.password,
    },
    custom: {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    }
  };

  const smtpConfig = presets[provider] || presets.custom;

  const settings = {
    SMTP_ADMIN_EMAIL: fromEmail,
    SMTP_HOST: smtpConfig.host,
    SMTP_PORT: smtpConfig.port,
    SMTP_USER: smtpConfig.username,
    SMTP_PASS: smtpConfig.password,
    SMTP_SENDER_NAME: fromName || 'No Reply',
    SMTP_MAX_FREQUENCY: 60, // Rate limit: 1 email per minute
  };

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update SMTP settings: ${error}`);
    }

    return NextResponse.json({
      message: 'SMTP configuration updated successfully',
      provider,
      host: smtpConfig.host,
      fromEmail,
    });
  } catch (error: any) {
    console.error('SMTP config error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Configure email templates
 */
async function configureEmailTemplates(
  projectId: string,
  config: any,
  accessToken: string
): Promise<NextResponse> {
  const { templateType, subject, content, redirectTo } = config;

  const templateSettings: Record<string, any> = {
    'confirmation': {
      MAILER_SUBJECTS_CONFIRMATION: subject,
      MAILER_TEMPLATES_CONFIRMATION_CONTENT: content,
      MAILER_URLPATHS_CONFIRMATION: redirectTo || '',
    },
    'recovery': {
      MAILER_SUBJECTS_RECOVERY: subject,
      MAILER_TEMPLATES_RECOVERY_CONTENT: content,
      MAILER_URLPATHS_RECOVERY: redirectTo || '',
    },
    'invite': {
      MAILER_SUBJECTS_INVITE: subject,
      MAILER_TEMPLATES_INVITE_CONTENT: content,
      MAILER_URLPATHS_INVITE: redirectTo || '',
    },
    'magic_link': {
      MAILER_SUBJECTS_MAGIC_LINK: subject,
      MAILER_TEMPLATES_MAGIC_LINK_CONTENT: content,
      MAILER_URLPATHS_EMAIL_CHANGE: redirectTo || '',
    }
  };

  const settings = templateSettings[templateType];
  if (!settings) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update email template: ${error}`);
    }

    return NextResponse.json({
      message: `Email template ${templateType} updated successfully`,
      templateType,
      subject,
    });
  } catch (error: any) {
    console.error('Email template config error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET current auth configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { backendId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get backend details
    const { data: backend } = await supabase
      .from('customer_backends')
      .select('*')
      .eq('id', params.backendId)
      .eq('customer_id', user.id)
      .single();

    if (!backend) {
      return NextResponse.json({ error: 'Backend not found' }, { status: 404 });
    }

    // Return configuration instructions for the customer
    return NextResponse.json({
      projectId: backend.project_id,
      authEndpoint: `https://${backend.project_id}.supabase.co/auth/v1`,
      oauthCallbackUrl: `https://${backend.project_id}.supabase.co/auth/v1/callback`,
      availableProviders: [
        'email',
        'google',
        'github',
        'facebook',
        'twitter',
        'discord',
        'linkedin',
        'spotify',
        'slack',
        'azure',
        'gitlab',
        'bitbucket'
      ],
      smtpProviders: [
        'resend',
        'sendgrid',
        'mailgun',
        'ses',
        'custom'
      ],
      emailTemplates: [
        'confirmation',
        'recovery',
        'invite',
        'magic_link'
      ],
      instructions: {
        oauth: 'Use PUT /api/backends/:id/auth-config with type: "oauth"',
        smtp: 'Use PUT /api/backends/:id/auth-config with type: "smtp"',
        templates: 'Use PUT /api/backends/:id/auth-config with type: "email-templates"'
      }
    });
  } catch (error: any) {
    console.error('Get auth config error:', error);
    return NextResponse.json(
      { error: 'Failed to get auth configuration' },
      { status: 500 }
    );
  }
}