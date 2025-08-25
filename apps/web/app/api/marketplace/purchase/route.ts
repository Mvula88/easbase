import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/auth/supabase-server';
import { MARKETPLACE_TEMPLATES } from '@/lib/marketplace/templates';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to purchase templates' },
        { status: 401 }
      );
    }

    const { templateId, price } = await req.json();

    // Find the template
    const template = MARKETPLACE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify price matches (prevent price manipulation)
    if (template.price !== price) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: template.name,
              description: template.description,
              images: [`${process.env.NEXT_PUBLIC_APP_URL}/templates/${template.id}.png`],
              metadata: {
                templateId: template.id,
                author: template.author,
              },
            },
            unit_amount: template.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/success?session_id={CHECKOUT_SESSION_ID}&template=${templateId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?canceled=true`,
      metadata: {
        userId: user.id,
        templateId: template.id,
        templateName: template.name,
        authorRevenue: template.authorRevenue.toString(),
      },
      payment_intent_data: {
        metadata: {
          templateId: template.id,
          userId: user.id,
        },
        // Note: Transfer to authors requires Stripe Connect setup
        // For now, we'll handle payouts manually
      },
    });

    // Store purchase intent in database
    await supabase
      .from('template_purchases')
      .insert({
        user_id: user.id,
        template_id: templateId,
        template_name: template.name,
        price: template.price,
        status: 'pending',
        stripe_session_id: session.id,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}