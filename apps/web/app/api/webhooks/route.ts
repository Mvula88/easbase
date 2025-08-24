import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/services/webhook';
import { validateApiKey } from '@/lib/auth/api-key';

// GET /api/webhooks - List webhook subscriptions
export async function GET(request: NextRequest) {
  try {
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: 401 }
      );
    }

    const webhookService = new WebhookService();
    const subscriptions = await webhookService.listSubscriptions(
      apiKeyValidation.customerId!
    );

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create webhook subscription
export async function POST(request: NextRequest) {
  try {
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, events, headers } = body;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = [
      'schema.generated',
      'schema.cached',
      'deployment.started',
      'deployment.completed',
      'deployment.failed',
      'template.deployed',
      'project.created',
      'usage.limit_reached'
    ];

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event type must be specified' },
        { status: 400 }
      );
    }

    for (const event of events) {
      if (!validEvents.includes(event)) {
        return NextResponse.json(
          { error: `Invalid event type: ${event}` },
          { status: 400 }
        );
      }
    }

    const webhookService = new WebhookService();
    const subscription = await webhookService.createSubscription(
      apiKeyValidation.customerId!,
      url,
      events,
      headers
    );

    return NextResponse.json({
      subscription,
      message: 'Webhook subscription created successfully'
    });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook subscription' },
      { status: 500 }
    );
  }
}

// PATCH /api/webhooks - Update webhook subscription
export async function PATCH(request: NextRequest) {
  try {
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscriptionId, url, events, headers } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      );
    }

    const webhookService = new WebhookService();
    await webhookService.updateSubscription(subscriptionId, {
      url,
      events,
      headers
    });

    return NextResponse.json({
      message: 'Webhook subscription updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks - Disable webhook subscription
export async function DELETE(request: NextRequest) {
  try {
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      );
    }

    const webhookService = new WebhookService();
    await webhookService.disableSubscription(subscriptionId);

    return NextResponse.json({
      message: 'Webhook subscription disabled successfully'
    });
  } catch (error: any) {
    console.error('Error disabling webhook:', error);
    return NextResponse.json(
      { error: 'Failed to disable webhook subscription' },
      { status: 500 }
    );
  }
}