export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 149,
    priceAnnual: 129,
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID, // Legacy support
    features: [
      '2,500 monthly active users',
      '10,000 emails/month',
      '1,000 OTP verifications',
      '10GB secure storage',
      '100GB bandwidth',
      '3 projects',
      'Email support (48hr)',
      'All core features included',
    ],
    limits: {
      mau: 2500,
      emails: 10000,
      sms: 1000,
      storage: 10,
      bandwidth: 100,
      projects: 3,
      prioritySupport: false,
    },
    highlighted: false,
    cta: 'Start Free Trial',
  },
  professional: {
    name: 'Professional',
    price: 349,
    priceAnnual: 299,
    stripePriceIdMonthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || process.env.STRIPE_GROWTH_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID,
    stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID, // Legacy support
    badge: 'Most Popular',
    features: [
      '10,000 monthly active users',
      '50,000 emails/month',
      '5,000 OTP verifications',
      '50GB secure storage',
      '500GB bandwidth',
      '10 projects',
      'Priority support (24hr)',
      'Custom domain',
      'Staging environment',
      'Advanced analytics',
      'Team collaboration',
      'API access',
    ],
    limits: {
      mau: 10000,
      emails: 50000,
      sms: 5000,
      storage: 50,
      bandwidth: 500,
      projects: 10,
      prioritySupport: true,
    },
    highlighted: true,
    cta: 'Start Free Trial',
  },
  business: {
    name: 'Business',
    price: 749,
    priceAnnual: 649,
    stripePriceIdMonthly: process.env.STRIPE_SCALE_MONTHLY_PRICE_ID || process.env.STRIPE_SCALE_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID,
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID, // Legacy support
    features: [
      '25,000 monthly active users',
      '150,000 emails/month',
      '15,000 OTP verifications',
      '150GB secure storage',
      '1TB bandwidth',
      'Unlimited projects',
      'Priority support (4hr)',
      'White-label option',
      'Multiple environments',
      'Advanced security',
      'SLA 99.9% uptime',
      'Dedicated onboarding',
    ],
    limits: {
      mau: 25000,
      emails: 150000,
      sms: 15000,
      storage: 150,
      bandwidth: 1000,
      projects: -1, // unlimited
      prioritySupport: true,
      whiteLabel: true,
    },
    highlighted: false,
    cta: 'Contact Sales',
  },
  enterprise: {
    name: 'Enterprise',
    price: 1999,
    priceAnnual: 1799,
    stripePriceId: null,
    features: [
      'Unlimited active users',
      'Unlimited emails',
      'Unlimited OTP verifications',
      '500GB+ storage',
      '5TB+ bandwidth',
      'Unlimited projects',
      'Dedicated support',
      'Custom contracts',
      'On-premise option',
      'Professional services',
      'Custom integrations',
      'Training included',
    ],
    limits: {
      aiGenerations: -1,
      teamMembers: -1,
      projects: -1,
      customTemplates: true,
      prioritySupport: true,
      whiteLabel: true,
      customDomain: true,
    },
    highlighted: false,
    cta: 'Book a Demo',
  },
};

export const PRICING_FAQS = [
  {
    question: "How is this different from using Supabase directly?",
    answer: "Easbase adds AI-powered schema generation, one-click deployments, pre-built templates, and a visual builder. What takes hours with Supabase alone takes minutes with Easbase."
  },
  {
    question: "Can I change plans anytime?",
    answer: "Yes! Upgrade or downgrade anytime. When upgrading, you'll be prorated. When downgrading, credits apply to your next bill."
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains yours. We provide a 30-day grace period to export everything, and we can help migrate to your own Supabase instance."
  },
  {
    question: "Do you offer discounts?",
    answer: "Yes! Save 20% with annual billing, and we offer 50% off for students, non-profits, and early-stage startups (under $10k MRR)."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! All plans come with a 14-day free trial. No credit card required to start."
  }
];

// Launch special pricing (first 100 customers)
export const LAUNCH_DISCOUNT = {
  enabled: true,
  discountPercent: 50,
  message: "🎉 Launch Special: 50% OFF for life - First 100 customers only!",
  spotsLeft: 73, // Update this dynamically
};