import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function initPostHog() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
}

export const PostHogProvider = PHProvider;

// Analytics events
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties);
    }
  },
  
  identify: (userId: string, traits?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, traits);
    }
  },

  // Specific events for Easbase
  events: {
    // AI Builder
    aiPromptSubmitted: (prompt: string, templateUsed?: string) => 
      analytics.track('ai_prompt_submitted', { prompt, templateUsed }),
    
    aiBackendGenerated: (projectName: string, timeMs: number) =>
      analytics.track('ai_backend_generated', { projectName, timeMs }),
    
    // Marketplace
    templateViewed: (templateId: string, templateName: string) =>
      analytics.track('template_viewed', { templateId, templateName }),
    
    templatePurchased: (templateId: string, price: number) =>
      analytics.track('template_purchased', { templateId, price }),
    
    templateDeployed: (templateId: string) =>
      analytics.track('template_deployed', { templateId }),
    
    // User Journey
    signupCompleted: (method: 'email' | 'google' | 'github') =>
      analytics.track('signup_completed', { method }),
    
    projectCreated: (projectType: 'ai' | 'template' | 'blank') =>
      analytics.track('project_created', { projectType }),
    
    // Revenue
    revenueGenerated: (amount: number, source: 'subscription' | 'template' | 'ai') =>
      analytics.track('revenue_generated', { amount, source }),
  }
};