'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Check, X, Zap, Star } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out Easbase',
    features: [
      '100 API calls/month',
      'Basic schema generation',
      'Community support',
      'Public templates',
      '1 project',
    ],
    notIncluded: [
      'Priority support',
      'Custom templates',
      'Advanced caching',
      'Team collaboration',
    ],
    cta: 'Get Started',
    href: '/dashboard',
    variant: 'outline' as const,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For professional developers',
    popular: true,
    features: [
      '5,000 API calls/month',
      'Advanced schema generation',
      'Priority email support',
      'All templates',
      'Unlimited projects',
      'Advanced caching',
      'API access',
      'Custom domains',
    ],
    notIncluded: [
      'Phone support',
      'Custom AI models',
    ],
    cta: 'Start Free Trial',
    href: '/dashboard',
    variant: 'default' as const,
  },
  {
    name: 'Scale',
    price: '$199',
    period: '/month',
    description: 'For growing teams',
    features: [
      '50,000 API calls/month',
      'Everything in Pro',
      'Priority phone support',
      'Team collaboration',
      'Advanced analytics',
      'Custom templates',
      'Webhook integrations',
      'SSO authentication',
    ],
    notIncluded: [
      'Custom AI models',
      'On-premise deployment',
    ],
    cta: 'Start Free Trial',
    href: '/dashboard',
    variant: 'outline' as const,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited API calls',
      'Everything in Scale',
      'Dedicated support',
      'Custom AI models',
      'On-premise deployment',
      'SLA guarantee',
      'Security audit',
      'Custom contracts',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    href: '/contact',
    variant: 'outline' as const,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Simple, transparent pricing
            </Badge>
            <h1 className="text-5xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={`relative ${plan.popular ? 'border-cyan-500 border-2 shadow-xl' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-cyan-500 text-white px-3 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pt-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-gray-600">{plan.period}</span>}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Link href={plan.href}>
                    <Button 
                      className={`w-full mb-6 ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600' 
                          : ''
                      }`}
                      variant={plan.variant}
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.notIncluded.map((feature) => (
                      <div key={feature} className="flex items-start opacity-50">
                        <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-4">
              All plans include:
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Zap className="w-3 h-3 mr-1" />
                Instant setup
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                SSL certificates
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                99.9% uptime SLA
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                GDPR compliant
              </Badge>
            </div>
          </div>

          <div className="mt-16 bg-gray-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Frequently Asked Questions
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div>
                <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-gray-600">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">What happens if I exceed my API limit?</h3>
                <p className="text-gray-600">
                  We'll notify you when you reach 80% of your limit. You can upgrade or purchase additional calls.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Do you offer discounts for startups?</h3>
                <p className="text-gray-600">
                  Yes! We offer 50% off for qualified startups in their first year. Contact us for details.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Is there a free trial for paid plans?</h3>
                <p className="text-gray-600">
                  All paid plans come with a 14-day free trial. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}