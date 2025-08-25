import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/auth/supabase-server';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Mark purchase as completed
        const { data: purchase, error: purchaseError } = await supabase
          .from('template_purchases')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            stripe_payment_intent: session.payment_intent as string,
          })
          .eq('stripe_session_id', session.id)
          .select()
          .single();

        if (purchaseError) {
          console.error('Failed to update purchase:', purchaseError);
          return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 });
        }

        // Grant access to the template
        await supabase
          .from('user_templates')
          .insert({
            user_id: session.metadata?.userId,
            template_id: session.metadata?.templateId,
            template_name: session.metadata?.templateName,
            purchased_at: new Date().toISOString(),
            access_level: 'full',
          });

        // Update template sales count
        await supabase.rpc('increment_template_sales', {
          template_id: session.metadata?.templateId,
        });

        // Track revenue for analytics
        await supabase
          .from('revenue_tracking')
          .insert({
            type: 'template_sale',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            platform_revenue: session.amount_total ? (session.amount_total / 100) * 0.3 : 0,
            author_revenue: session.metadata?.authorRevenue ? parseFloat(session.metadata.authorRevenue) : 0,
            template_id: session.metadata?.templateId,
            user_id: session.metadata?.userId,
            created_at: new Date().toISOString(),
          });

        // Send confirmation email
        await sendPurchaseConfirmation(
          session.customer_email as string,
          session.metadata?.templateName as string
        );

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Mark purchase as failed
        await supabase
          .from('template_purchases')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: paymentIntent.last_payment_error?.message,
          })
          .eq('stripe_payment_intent', paymentIntent.id);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function sendPurchaseConfirmation(email: string, templateName: string) {
  const { sendEmail, emailTemplates } = await import('@/lib/email/resend');
  
  try {
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/templates`;
    const template = emailTemplates.purchaseConfirmation(templateName, downloadUrl);
    
    await sendEmail({
      to: email,
      ...template
    });
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }
}