import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createCheckoutSession, PLANS } from '@/lib/services/stripe';
import { getEnv } from '@/lib/config/env';
import { z } from 'zod';

const checkoutSchema = z.object({
  planId: z.enum(['starter', 'pro', 'enterprise']),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = checkoutSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { planId } = validation.data;
    const env = getEnv();

    const session = await createCheckoutSession(
      user.id,
      user.email!,
      planId,
      `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`
    );

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}