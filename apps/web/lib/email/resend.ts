import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  react?: React.ReactElement;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  react,
  from = 'Easbase <noreply@easbase.io>'
}: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      react,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
}

// Email templates
export const emailTemplates = {
  welcome: (userName: string) => ({
    subject: '🚀 Welcome to Easbase - Your Backend is Ready!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to Easbase!</h1>
        </div>
        
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-bottom: 20px;">Hi ${userName}! 👋</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            You're all set to build amazing backends with zero coding! Here's what you can do right now:
          </p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #374151; margin-top: 0;">🎯 Quick Start:</h3>
            <ul style="color: #6b7280; line-height: 1.8; padding-left: 20px;">
              <li><strong>AI Builder:</strong> Describe your app in plain English</li>
              <li><strong>Templates:</strong> Deploy production-ready backends instantly</li>
              <li><strong>Dashboard:</strong> Manage all your projects in one place</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            Need help? Just reply to this email or check our <a href="${process.env.NEXT_PUBLIC_APP_URL}/docs" style="color: #667eea;">documentation</a>
          </p>
        </div>
      </div>
    `
  }),

  purchaseConfirmation: (templateName: string, downloadUrl: string) => ({
    subject: `✅ Purchase Confirmed: ${templateName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Purchase Successful! 🎉</h1>
        </div>
        
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-bottom: 20px;">${templateName} is Ready to Deploy!</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
            Your backend template has been added to your account. You can now deploy it with a single click!
          </p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px;">
            <h3 style="color: #064e3b; margin-top: 0;">What's Next?</h3>
            <ol style="color: #6b7280; line-height: 1.8; padding-left: 20px;">
              <li>Go to your dashboard</li>
              <li>Click "Deploy Template"</li>
              <li>Choose your configuration</li>
              <li>Your backend will be live in 45 seconds!</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Deploy Now
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="color: #6b7280; margin: 0;">
              <strong>Need modifications?</strong> Our AI can customize this template for you!
            </p>
          </div>
        </div>
      </div>
    `
  }),

  aiBackendReady: (projectName: string, apiUrl: string) => ({
    subject: `🤖 AI Backend "${projectName}" is Live!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Your AI Backend is Live! 🚀</h1>
        </div>
        
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-bottom: 20px;">${projectName}</h2>
          
          <div style="background: #faf5ff; border: 2px solid #8b5cf6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #581c87; margin-top: 0;">API Endpoint:</h3>
            <code style="background: #f3f4f6; padding: 10px; border-radius: 4px; display: block; color: #111827; word-break: break-all;">
              ${apiUrl}
            </code>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #374151; margin-top: 0;">✨ What was generated:</h3>
            <ul style="color: #6b7280; line-height: 1.8; padding-left: 20px;">
              <li>Complete database schema with relationships</li>
              <li>RESTful API endpoints</li>
              <li>Authentication & authorization rules</li>
              <li>Row Level Security policies</li>
              <li>Real-time subscriptions</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">
              View Dashboard
            </a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/docs/api" style="display: inline-block; background: white; color: #6366f1; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #6366f1;">
              API Docs
            </a>
          </div>
        </div>
      </div>
    `
  })
};