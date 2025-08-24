export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    mau: number;
    emails: number;
    sms: number;
    storage: number; // GB
    bandwidth: number; // GB
    projects: number;
  };
  support: {
    type: 'email' | 'priority' | 'dedicated';
    responseTime: string;
  };
  highlighted?: boolean;
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 149,
    interval: 'month',
    features: [
      '2,500 monthly active users',
      '10,000 emails/month',
      '1,000 OTP verifications',
      '10GB secure storage',
      '100GB bandwidth',
      '3 projects',
      'Email support (48hr)',
      'SSL certificates',
      'Daily backups',
      'Basic analytics',
    ],
    limits: {
      mau: 2500,
      emails: 10000,
      sms: 1000,
      storage: 10,
      bandwidth: 100,
      projects: 3,
    },
    support: {
      type: 'email',
      responseTime: '48 hours',
    },
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 349,
    interval: 'month',
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
    },
    support: {
      type: 'priority',
      responseTime: '24 hours',
    },
    highlighted: true, // Most popular
  },
  
  business: {
    id: 'business',
    name: 'Business',
    price: 749,
    interval: 'month',
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
    },
    support: {
      type: 'priority',
      responseTime: '4 hours',
    },
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1999,
    interval: 'month',
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
      mau: -1, // unlimited
      emails: -1,
      sms: -1,
      storage: 500,
      bandwidth: 5000,
      projects: -1,
    },
    support: {
      type: 'dedicated',
      responseTime: 'Immediate',
    },
  },
};

// Trial configuration
export const TRIAL_CONFIG = {
  enabled: true,
  duration: 14, // days
  plan: 'starter', // which plan to trial
  creditCardRequired: false,
  autoConvert: true,
};

// Usage-based pricing for overages
export const OVERAGE_PRICING = {
  mau: 0.05, // $0.05 per extra MAU
  emails: 0.001, // $0.001 per extra email
  sms: 0.015, // $0.015 per extra SMS
  storage: 0.50, // $0.50 per extra GB
  bandwidth: 0.10, // $0.10 per extra GB
};

// Calculate monthly cost for a customer
export function calculateMonthlyBill(
  plan: PricingPlan,
  usage: {
    mau: number;
    emails: number;
    sms: number;
    storage: number;
    bandwidth: number;
  }
): {
  base: number;
  overages: Record<string, number>;
  total: number;
} {
  const overages: Record<string, number> = {};
  let overageTotal = 0;

  // Calculate overages (except for unlimited plans)
  if (plan.limits.mau !== -1 && usage.mau > plan.limits.mau) {
    const extra = usage.mau - plan.limits.mau;
    overages.mau = extra * OVERAGE_PRICING.mau;
    overageTotal += overages.mau;
  }

  if (plan.limits.emails !== -1 && usage.emails > plan.limits.emails) {
    const extra = usage.emails - plan.limits.emails;
    overages.emails = extra * OVERAGE_PRICING.emails;
    overageTotal += overages.emails;
  }

  if (plan.limits.sms !== -1 && usage.sms > plan.limits.sms) {
    const extra = usage.sms - plan.limits.sms;
    overages.sms = extra * OVERAGE_PRICING.sms;
    overageTotal += overages.sms;
  }

  if (plan.limits.storage !== -1 && usage.storage > plan.limits.storage) {
    const extra = usage.storage - plan.limits.storage;
    overages.storage = extra * OVERAGE_PRICING.storage;
    overageTotal += overages.storage;
  }

  if (plan.limits.bandwidth !== -1 && usage.bandwidth > plan.limits.bandwidth) {
    const extra = usage.bandwidth - plan.limits.bandwidth;
    overages.bandwidth = extra * OVERAGE_PRICING.bandwidth;
    overageTotal += overages.bandwidth;
  }

  return {
    base: plan.price,
    overages,
    total: plan.price + overageTotal,
  };
}