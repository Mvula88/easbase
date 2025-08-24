import { NextRequest, NextResponse } from 'next/server';
import { handleWebhook, PLANS } from '@/lib/services/stripe';
import { createServiceClient } from '@/lib/auth/supabase';
import { DatabaseProvisioningService } from '@/lib/services/database-provisioning';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const event = await handleWebhook(payload, signature);
    const supabase = await createServiceClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, planId } = session.metadata!;

        // Update user subscription
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_id: planId,
            status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

        // Update user limits based on plan
        const plan = PLANS[planId as keyof typeof PLANS];
        await supabase
          .from('user_usage')
          .upsert({
            user_id: userId,
            tokens_limit: plan.tokens,
            deployments_limit: plan.deployments,
            projects_limit: plan.projects,
          });

        // MODEL B: Automatically provision database for new paid customers
        if (planId !== 'free') {
          try {
            const provisioning = new DatabaseProvisioningService();
            
            // Get user email
            const { data: userData } = await supabase.auth.admin.getUserById(userId);
            const userEmail = userData?.user?.email || `user-${userId}@easbase.com`;
            
            // Check if customer already has a project
            const { data: existingProject } = await supabase
              .from('customer_projects')
              .select('id')
              .eq('customer_id', userId)
              .single();
            
            if (!existingProject) {
              console.log(`Provisioning database for customer ${userId}...`);
              
              // Create database project for customer
              const project = await provisioning.createProject(
                userId,
                userEmail,
                planId === 'enterprise' ? 'pro' : 'free'
              );
              
              // Store project info in our database
              await supabase
                .from('customer_projects')
                .insert({
                  customer_id: userId,
                  supabase_project_id: project.id,
                  project_name: project.name,
                  project_url: `https://${project.id}.supabase.co`,
                  project_status: 'active'
                });
              
              console.log(`Database provisioned successfully for customer ${userId}`);
            }
          } catch (error) {
            console.error(`Failed to provision database for customer ${userId}:`, error);
            // Don't fail the webhook, but log for manual intervention
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { userId } = subscription.metadata;

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { userId } = subscription.metadata;

        // Downgrade to free plan
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan_id: 'free',
          })
          .eq('stripe_subscription_id', subscription.id);

        // Reset to free tier limits
        await supabase
          .from('user_usage')
          .update({
            tokens_limit: PLANS.free.tokens,
            deployments_limit: PLANS.free.deployments,
            projects_limit: PLANS.free.projects,
          })
          .eq('user_id', userId);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Record payment
        await supabase
          .from('payments')
          .insert({
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer as string,
            amount: invoice.amount_paid,
            status: 'succeeded',
            created_at: new Date().toISOString(),
          });

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Record failed payment
        await supabase
          .from('payments')
          .insert({
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer as string,
            amount: invoice.amount_due,
            status: 'failed',
            created_at: new Date().toISOString(),
          });

        // Send notification email (implement email service)
        
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 400 }
    );
  }
}