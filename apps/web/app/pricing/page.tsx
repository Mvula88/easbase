'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Check, X, Zap, Star, Sparkles, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { PRICING_PLANS, PRICING_FAQS, LAUNCH_DISCOUNT } from '@/lib/config/pricing';

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      key: 'starter',
      ...PRICING_PLANS.starter,
      price: billingPeriod === 'annual' ? PRICING_PLANS.starter.priceAnnual : PRICING_PLANS.starter.price,
      originalPrice: LAUNCH_DISCOUNT.enabled 
        ? (billingPeriod === 'annual' ? PRICING_PLANS.starter.priceAnnual * 2 : PRICING_PLANS.starter.price * 2)
        : undefined,
      icon: <Zap className="w-5 h-5" />,
      color: 'gray',
    },
    {
      key: 'professional',
      ...PRICING_PLANS.professional,
      price: billingPeriod === 'annual' ? PRICING_PLANS.professional.priceAnnual : PRICING_PLANS.professional.price,
      originalPrice: LAUNCH_DISCOUNT.enabled 
        ? (billingPeriod === 'annual' ? PRICING_PLANS.professional.priceAnnual * 2 : PRICING_PLANS.professional.price * 2)
        : undefined,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'cyan',
    },
    {
      key: 'business',
      ...PRICING_PLANS.business,
      price: billingPeriod === 'annual' ? PRICING_PLANS.business.priceAnnual : PRICING_PLANS.business.price,
      originalPrice: LAUNCH_DISCOUNT.enabled 
        ? (billingPeriod === 'annual' ? PRICING_PLANS.business.priceAnnual * 2 : PRICING_PLANS.business.price * 2)
        : undefined,
      icon: <Building2 className="w-5 h-5" />,
      color: 'purple',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Launch Discount Banner */}
          {LAUNCH_DISCOUNT.enabled && (
            <div className="mb-8 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold">{LAUNCH_DISCOUNT.message}</span>
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm mt-1 opacity-90">
                Only {LAUNCH_DISCOUNT.spotsLeft} spots remaining at this price
              </p>
            </div>
          )}

          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Intelligent Backend Infrastructure
            </Badge>
            <h1 className="text-5xl font-bold mb-4">
              Build Backends in Minutes, Not Months
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Stop writing boilerplate. Generate your perfect database schema instantly
              using advanced automation. What used to take $10,000 and 3 months now takes $149 and 3 minutes.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-gray-500'}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-7 w-14 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    billingPeriod === 'annual' ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={billingPeriod === 'annual' ? 'font-semibold' : 'text-gray-500'}>
                Annual
                <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">
                  Save 20%
                </Badge>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <Card 
                key={plan.key}
                className={`relative ${
                  plan.highlighted 
                    ? 'border-cyan-500 border-2 shadow-2xl scale-105 bg-gradient-to-b from-white to-cyan-50/30' 
                    : ''
                }`}
              >
                {'badge' in plan && plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-1.5 text-sm font-semibold shadow-lg">
                      <Star className="w-4 h-4 mr-1" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pt-8 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.icon}
                  </div>
                  <CardDescription className="text-sm">{plan.name === 'Growth' ? 'For growing startups' : plan.name === 'Starter' ? 'Perfect for side projects' : 'For scaling businesses'}</CardDescription>
                  
                  <div className="mt-6">
                    {plan.originalPrice && (
                      <div className="text-gray-400 line-through text-lg">
                        ${plan.originalPrice}
                      </div>
                    )}
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold">
                        {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                      </span>
                      {typeof plan.price === 'number' && (
                        <span className="text-gray-600 ml-2">/month</span>
                      )}
                    </div>
                    {LAUNCH_DISCOUNT.enabled && typeof plan.price === 'number' && (
                      <Badge className="mt-2 bg-red-100 text-red-700 border-red-200">
                        50% OFF - Limited Time
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-8">
                  <Button 
                    onClick={async () => {
                      // Check if user is logged in
                      const response = await fetch('/api/billing/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          planKey: plan.key,
                          billingPeriod,
                          priceId: billingPeriod === 'annual' 
                            ? (plan.key === 'starter' ? process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID :
                               plan.key === 'growth' ? process.env.NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID :
                               process.env.NEXT_PUBLIC_STRIPE_SCALE_ANNUAL_PRICE_ID)
                            : (plan.key === 'starter' ? process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID :
                               plan.key === 'growth' ? process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY_PRICE_ID :
                               process.env.NEXT_PUBLIC_STRIPE_SCALE_MONTHLY_PRICE_ID)
                        }),
                      });
                      
                      if (response.ok) {
                        const { url } = await response.json();
                        window.location.href = url;
                      } else {
                        // Redirect to signup if not logged in
                        window.location.href = `/signup?plan=${plan.key}&billing=${billingPeriod}`;
                      }
                    }}
                    className={`w-full mb-6 h-12 text-base font-semibold ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 shadow-lg' 
                        : 'bg-white hover:bg-gray-50 text-gray-900 border-2'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enterprise Card */}
          <Card className="mb-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-white/20 text-white border-white/30">
                    Enterprise
                  </Badge>
                  <h3 className="text-3xl font-bold mb-4">
                    Need More Power?
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Custom solutions for large teams with advanced requirements. 
                    Unlimited everything, dedicated support, and enterprise-grade security.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {PRICING_PLANS.enterprise.features.slice(0, 6).map((feature) => (
                      <div key={feature} className="flex items-center">
                        <Check className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-4xl font-bold mb-2">Custom Pricing</p>
                  <p className="text-gray-400 mb-6">Starting at $999/month</p>
                  <Link href="/contact">
                    <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                      Book a Demo
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Value Comparison */}
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold mb-8">Why Easbase Saves You Money</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-2">Traditional Development</h3>
                  <p className="text-3xl font-bold text-red-600 mb-2">$15,000+</p>
                  <p className="text-gray-600">3-6 months timeline</p>
                  <ul className="mt-4 space-y-2 text-sm text-left">
                    <li>• Hire backend developer</li>
                    <li>• Database architect</li>
                    <li>• DevOps setup</li>
                    <li>• Ongoing maintenance</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-2">DIY Database Setup</h3>
                  <p className="text-3xl font-bold text-orange-600 mb-2">$25+/month</p>
                  <p className="text-gray-600">2-4 weeks setup</p>
                  <ul className="mt-4 space-y-2 text-sm text-left">
                    <li>• Manual schema design</li>
                    <li>• Learn database management</li>
                    <li>• No templates</li>
                    <li>• Figure it out yourself</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-cyan-500 border-2">
                <CardContent className="p-6">
                  <Badge className="mb-2 bg-cyan-100 text-cyan-700">Best Value</Badge>
                  <h3 className="font-bold text-xl mb-2">Easbase</h3>
                  <p className="text-3xl font-bold text-green-600 mb-2">$149/month</p>
                  <p className="text-gray-600">5 minutes setup</p>
                  <ul className="mt-4 space-y-2 text-sm text-left">
                    <li>• Our engine generates schema</li>
                    <li>• One-click deploy</li>
                    <li>• Premium templates</li>
                    <li>• We handle everything</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Frequently Asked Questions
            </h2>
            
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
              {PRICING_FAQS.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg p-6">
                  <h3 className="font-semibold mb-2 text-lg">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-6 font-semibold">
              Trusted by developers building the future
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Badge variant="outline" className="px-4 py-2">
                <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                Instant Setup
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                🔒 SOC 2 Compliant
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                ⚡ 99.99% Uptime
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                🌍 Global CDN
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                💳 No Hidden Fees
              </Badge>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl p-12 text-white">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Build Faster?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join hundreds of developers who are shipping products 10x faster with Easbase
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 h-14 px-8 text-lg">
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="mt-4 text-sm opacity-75">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}