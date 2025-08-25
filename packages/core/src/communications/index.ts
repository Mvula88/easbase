import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

interface EmailConfig {
  from: string;
  to: string | string[];
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
  variables?: Record<string, any>;
}

interface SMSConfig {
  to: string;
  body: string;
  mediaUrl?: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
}

export class CommunicationsService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;
  private supabase: SupabaseClient;
  private projectId: string;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(projectId: string) {
    this.projectId = projectId;
    
    // Initialize email transporter (using SendGrid/AWS SES/SMTP)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'apikey',
        pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY
      }
    });

    // Initialize Twilio
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Initialize Supabase
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Load default templates
    this.loadDefaultTemplates();
  }

  // Email Services
  async sendEmail(config: EmailConfig) {
    try {
      let html = config.html;
      let text = config.text;
      let subject = config.subject;

      // Use template if specified
      if (config.template) {
        const template = await this.getTemplate(config.template);
        if (template) {
          html = await this.renderTemplate(template.html, config.variables || {});
          text = template.text ? await this.renderTemplate(template.text, config.variables || {}) : undefined;
          subject = await this.renderTemplate(template.subject, config.variables || {});
        }
      }

      // Send email
      const info = await this.emailTransporter.sendMail({
        from: config.from || process.env.EMAIL_FROM || 'noreply@easbase.dev',
        to: Array.isArray(config.to) ? config.to.join(', ') : config.to,
        subject,
        html,
        text,
        attachments: config.attachments
      });

      // Log email sent
      await this.logEmail({
        message_id: info.messageId,
        to: config.to,
        subject,
        template: config.template,
        status: 'sent',
        metadata: { variables: config.variables }
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      // Log failed email
      await this.logEmail({
        to: config.to,
        subject: config.subject,
        template: config.template,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  async sendBulkEmails(recipients: string[], config: Omit<EmailConfig, 'to'>) {
    const results = [];
    const batchSize = 50; // Send in batches to avoid rate limits

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(to => this.sendEmail({ ...config, to }))
      );
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results
    };
  }

  // SMS Services
  async sendSMS(config: SMSConfig) {
    try {
      const message = await this.twilioClient.messages.create({
        body: config.body,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: config.to,
        ...(config.mediaUrl && { mediaUrl: config.mediaUrl })
      });

      // Log SMS sent
      await this.logSMS({
        message_sid: message.sid,
        to: config.to,
        body: config.body,
        status: 'sent'
      });

      return { success: true, messageSid: message.sid };
    } catch (error: any) {
      // Log failed SMS
      await this.logSMS({
        to: config.to,
        body: config.body,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  async sendOTP(phoneNumber: string, code?: string) {
    const otp = code || this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store OTP
    await this.supabase
      .from('otp_codes')
      .insert({
        phone_number: phoneNumber,
        code: otp,
        expires_at: expiresAt.toISOString(),
        project_id: this.projectId
      });

    // Send SMS
    await this.sendSMS({
      to: phoneNumber,
      body: `Your Easbase verification code is: ${otp}. Valid for 10 minutes.`
    });

    return { success: true };
  }

  async verifyOTP(phoneNumber: string, code: string) {
    const { data, error } = await this.supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('used', false)
      .eq('project_id', this.projectId)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid code' };
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Code expired' };
    }

    // Mark as used
    await this.supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', data.id);

    return { valid: true };
  }

  // Template Management
  async createTemplate(template: Omit<EmailTemplate, 'id'>) {
    const { data, error } = await this.supabase
      .from('email_templates')
      .insert({
        ...template,
        project_id: this.projectId
      })
      .select()
      .single();

    if (error) throw error;

    // Compile and cache template
    this.templates.set(data.id, handlebars.compile(data.html));

    return data;
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>) {
    const { data, error } = await this.supabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) throw error;

    // Update cache
    if (updates.html) {
      this.templates.set(data.id, handlebars.compile(data.html));
    }

    return data;
  }

  async getTemplate(templateId: string) {
    // Check cache first
    if (this.templates.has(templateId)) {
      const { data } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('project_id', this.projectId)
        .single();
      return data;
    }

    // Load from database
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('project_id', this.projectId)
      .single();

    if (error) return null;

    // Cache template
    this.templates.set(data.id, handlebars.compile(data.html));

    return data;
  }

  async listTemplates() {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('project_id', this.projectId);

    if (error) throw error;
    return data;
  }

  // Transactional Emails
  async sendWelcomeEmail(userId: string, email: string, name?: string) {
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@easbase.dev',
      to: email,
      subject: 'Welcome to Easbase!',
      template: 'welcome',
      variables: {
        name: name || 'there',
        app_name: 'Easbase',
        login_url: `${process.env.NEXT_PUBLIC_APP_URL}/login`
      }
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@easbase.dev',
      to: email,
      subject: 'Reset your password',
      template: 'password-reset',
      variables: {
        reset_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`,
        expires_in: '1 hour'
      }
    });
  }

  async sendInvoiceEmail(email: string, invoiceData: any) {
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@easbase.dev',
      to: email,
      subject: `Invoice ${invoiceData.number}`,
      template: 'invoice',
      variables: {
        invoice_number: invoiceData.number,
        amount: invoiceData.amount,
        due_date: invoiceData.due_date,
        download_url: invoiceData.download_url
      }
    });
  }

  async sendTeamInviteEmail(email: string, inviteData: any) {
    return this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@easbase.dev',
      to: email,
      subject: `You've been invited to join ${inviteData.team_name}`,
      template: 'team-invite',
      variables: {
        team_name: inviteData.team_name,
        inviter_name: inviteData.inviter_name,
        role: inviteData.role,
        accept_url: `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite?token=${inviteData.token}`
      }
    });
  }

  // Notification Preferences
  async updateNotificationPreferences(userId: string, preferences: Record<string, boolean>) {
    const { error } = await this.supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        project_id: this.projectId,
        ...preferences
      });

    if (error) throw error;
    return { success: true };
  }

  async getNotificationPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', this.projectId)
      .single();

    if (error) {
      // Return defaults if not found
      return {
        email_marketing: true,
        email_transactional: true,
        sms_marketing: false,
        sms_transactional: true,
        push_notifications: true
      };
    }

    return data;
  }

  // Analytics & Logging
  private async logEmail(data: any) {
    await this.supabase
      .from('email_logs')
      .insert({
        ...data,
        project_id: this.projectId,
        created_at: new Date().toISOString()
      });
  }

  private async logSMS(data: any) {
    await this.supabase
      .from('sms_logs')
      .insert({
        ...data,
        project_id: this.projectId,
        created_at: new Date().toISOString()
      });
  }

  async getEmailStats(startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('email_logs')
      .select('status, created_at')
      .eq('project_id', this.projectId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      total: data.length,
      sent: data.filter(d => d.status === 'sent').length,
      failed: data.filter(d => d.status === 'failed').length,
      opened: data.filter(d => d.status === 'opened').length,
      clicked: data.filter(d => d.status === 'clicked').length
    };
  }

  // Helper Methods
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async renderTemplate(template: string, variables: Record<string, any>): Promise<string> {
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(variables);
  }

  private async loadDefaultTemplates() {
    // Load default email templates
    const defaultTemplates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{app_name}}!',
        html: `
          <h1>Welcome {{name}}!</h1>
          <p>Thanks for signing up for {{app_name}}. We're excited to have you on board.</p>
          <a href="{{login_url}}">Get Started</a>
        `,
        variables: ['name', 'app_name', 'login_url']
      },
      {
        id: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset your password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password. This link expires in {{expires_in}}.</p>
          <a href="{{reset_url}}">Reset Password</a>
        `,
        variables: ['reset_url', 'expires_in']
      },
      {
        id: 'team-invite',
        name: 'Team Invitation',
        subject: "You've been invited to join {{team_name}}",
        html: `
          <h1>Team Invitation</h1>
          <p>{{inviter_name}} has invited you to join {{team_name}} as a {{role}}.</p>
          <a href="{{accept_url}}">Accept Invitation</a>
        `,
        variables: ['team_name', 'inviter_name', 'role', 'accept_url']
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, handlebars.compile(template.html));
    }
  }

  // Webhook handling for email events (SendGrid, etc.)
  async handleEmailWebhook(events: any[]) {
    for (const event of events) {
      switch (event.event) {
        case 'open':
        case 'click':
        case 'bounce':
        case 'spam':
          await this.supabase
            .from('email_logs')
            .update({ status: event.event })
            .eq('message_id', event.sg_message_id);
          break;
      }
    }
  }
}