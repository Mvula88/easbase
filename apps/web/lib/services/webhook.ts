import { createServiceClient } from '@/lib/auth/supabase';
import crypto from 'crypto';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  customerId: string;
  payload: any;
  timestamp: string;
}

export type WebhookEventType = 
  | 'schema.generated'
  | 'schema.cached'
  | 'deployment.started'
  | 'deployment.completed'
  | 'deployment.failed'
  | 'template.deployed'
  | 'project.created'
  | 'usage.limit_reached';

export interface WebhookSubscription {
  id: string;
  customerId: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  headers?: Record<string, string>;
}

export class WebhookService {
  private supabase;

  constructor() {
    this.supabase = createServiceClient();
  }

  /**
   * Create a new webhook subscription
   */
  async createSubscription(
    customerId: string,
    url: string,
    events: WebhookEventType[],
    headers?: Record<string, string>
  ): Promise<WebhookSubscription> {
    const supabase = await this.supabase;
    
    // Generate webhook secret for signature verification
    const secret = this.generateWebhookSecret();
    
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        customer_id: customerId,
        url,
        events,
        secret,
        headers: headers || {},
        active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Test the webhook endpoint
    await this.testWebhook(data.id);

    return data;
  }

  /**
   * Trigger a webhook event
   */
  async triggerEvent(
    type: WebhookEventType,
    customerId: string,
    payload: any
  ): Promise<void> {
    const supabase = await this.supabase;

    // Get all active subscriptions for this customer and event type
    const { data: subscriptions } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('active', true)
      .contains('events', [type]);

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // Create event record
    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      type,
      customerId,
      payload,
      timestamp: new Date().toISOString()
    };

    // Store event
    const { data: storedEvent } = await supabase
      .from('webhook_events')
      .insert({
        ...event,
        status: 'pending'
      })
      .select()
      .single();

    // Send webhooks to all subscriptions
    const deliveryPromises = subscriptions.map(subscription =>
      this.deliverWebhook(subscription, storedEvent)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver webhook to a specific endpoint
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    event: WebhookEvent
  ): Promise<void> {
    const supabase = await this.supabase;
    const maxRetries = 3;
    let attempt = 0;
    let lastError: string | null = null;

    while (attempt < maxRetries) {
      attempt++;

      try {
        // Generate signature
        const signature = this.generateSignature(
          JSON.stringify(event),
          subscription.secret
        );

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Easbase-Signature': signature,
          'X-Easbase-Event': event.type,
          'X-Easbase-Delivery-Id': crypto.randomUUID(),
          ...subscription.headers
        };

        // Send webhook
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        // Record delivery attempt
        await supabase
          .from('webhook_deliveries')
          .insert({
            event_id: event.id,
            subscription_id: subscription.id,
            attempt,
            status_code: response.status,
            success: response.ok,
            response_body: await response.text().catch(() => null),
            delivered_at: new Date().toISOString()
          });

        if (response.ok) {
          // Update event status
          await supabase
            .from('webhook_events')
            .update({ status: 'delivered' })
            .eq('id', event.id);
          return;
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`;
      } catch (error: any) {
        lastError = error.message;
        
        // Record failed delivery attempt
        await supabase
          .from('webhook_deliveries')
          .insert({
            event_id: event.id,
            subscription_id: subscription.id,
            attempt,
            success: false,
            error: lastError,
            delivered_at: new Date().toISOString()
          });
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // Mark as failed after all retries
    await supabase
      .from('webhook_events')
      .update({ 
        status: 'failed',
        error: lastError
      })
      .eq('id', event.id);

    // Disable subscription after multiple failures
    const { data: recentFailures } = await supabase
      .from('webhook_deliveries')
      .select('id')
      .eq('subscription_id', subscription.id)
      .eq('success', false)
      .gte('delivered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentFailures && recentFailures.length > 10) {
      await this.disableSubscription(subscription.id);
    }
  }

  /**
   * Test a webhook endpoint
   */
  async testWebhook(subscriptionId: string): Promise<boolean> {
    const supabase = await this.supabase;
    
    const { data: subscription } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!subscription) return false;

    const testEvent: WebhookEvent = {
      id: 'test_' + crypto.randomUUID(),
      type: 'schema.generated',
      customerId: subscription.customer_id,
      payload: {
        test: true,
        message: 'This is a test webhook from Easbase'
      },
      timestamp: new Date().toISOString()
    };

    try {
      const signature = this.generateSignature(
        JSON.stringify(testEvent),
        subscription.secret
      );

      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Easbase-Signature': signature,
          'X-Easbase-Event': 'test',
          ...subscription.headers
        },
        body: JSON.stringify(testEvent),
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List all subscriptions for a customer
   */
  async listSubscriptions(customerId: string): Promise<WebhookSubscription[]> {
    const supabase = await this.supabase;
    
    const { data } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Update a webhook subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<WebhookSubscription, 'url' | 'events' | 'headers'>>
  ): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase
      .from('webhook_subscriptions')
      .update(updates)
      .eq('id', subscriptionId);

    // Test the updated webhook
    if (updates.url) {
      await this.testWebhook(subscriptionId);
    }
  }

  /**
   * Disable a webhook subscription
   */
  async disableSubscription(subscriptionId: string): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase
      .from('webhook_subscriptions')
      .update({ active: false })
      .eq('id', subscriptionId);
  }

  /**
   * Get webhook events history
   */
  async getEventHistory(
    customerId: string,
    limit = 100
  ): Promise<any[]> {
    const supabase = await this.supabase;
    
    const { data } = await supabase
      .from('webhook_events')
      .select(`
        *,
        webhook_deliveries (
          attempt,
          status_code,
          success,
          delivered_at
        )
      `)
      .eq('customer_id', customerId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return 'whsec_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Verify webhook signature (for SDK)
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string,
    tolerance = 300 // 5 minutes
  ): boolean {
    const parts = signature.split(',');
    const timestamp = parseInt(parts[0].replace('t=', ''));
    const receivedSig = parts[1].replace('v1=', '');

    // Check timestamp tolerance
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - timestamp > tolerance) {
      return false;
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSig)
    );
  }
}