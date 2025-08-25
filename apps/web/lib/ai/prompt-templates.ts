/**
 * Pre-built prompt templates for common app types
 * Users can select these for instant backend generation
 */

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  icon: string;
  estimatedTime: string;
  popularity: number;
  tags: string[];
}

export const AI_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'uber-clone',
    title: 'Ride-Sharing App',
    category: 'Transportation',
    description: 'Create an Uber/Lyft style ride-sharing backend',
    prompt: 'I need a complete ride-sharing app backend with drivers who can accept ride requests, passengers who can book rides, real-time location tracking, surge pricing, payment processing, ratings and reviews, trip history, and an admin dashboard for monitoring.',
    icon: '🚗',
    estimatedTime: '45 seconds',
    popularity: 95,
    tags: ['transportation', 'real-time', 'payments', 'geolocation']
  },
  {
    id: 'airbnb-clone',
    title: 'Property Rental Platform',
    category: 'Marketplace',
    description: 'Build an Airbnb-style vacation rental backend',
    prompt: 'Create a property rental platform backend with hosts who can list properties with photos and amenities, guests who can search and book properties, availability calendar, pricing rules, messaging between hosts and guests, reviews and ratings, payment processing with host payouts, and booking management.',
    icon: '🏠',
    estimatedTime: '45 seconds',
    popularity: 92,
    tags: ['marketplace', 'booking', 'payments', 'reviews']
  },
  {
    id: 'tiktok-clone',
    title: 'Video Sharing Social Network',
    category: 'Social Media',
    description: 'TikTok/Instagram Reels style video platform',
    prompt: 'Build a short-form video sharing platform with user profiles, video uploads with captions and hashtags, follow/unfollow system, likes and comments, video feed algorithm, trending hashtags, duets and reactions, direct messaging, notifications, and content moderation tools.',
    icon: '📹',
    estimatedTime: '40 seconds',
    popularity: 94,
    tags: ['social', 'video', 'content', 'messaging']
  },
  {
    id: 'food-delivery',
    title: 'Food Delivery Service',
    category: 'On-Demand',
    description: 'DoorDash/UberEats style food delivery backend',
    prompt: 'Create a food delivery platform with restaurants that manage menus and orders, customers who browse restaurants and place orders, delivery drivers who accept and deliver orders, real-time order tracking, payment splitting, promo codes and discounts, ratings for restaurants and drivers, and order history.',
    icon: '🍔',
    estimatedTime: '45 seconds',
    popularity: 93,
    tags: ['delivery', 'restaurants', 'payments', 'tracking']
  },
  {
    id: 'netflix-clone',
    title: 'Video Streaming Platform',
    category: 'Entertainment',
    description: 'Netflix-style streaming service backend',
    prompt: 'Build a video streaming platform backend with user profiles and parental controls, content library with movies and series, watch history and continue watching, personalized recommendations, multiple quality settings, offline downloads, subscription tiers, content search and filtering, and admin panel for content management.',
    icon: '🎬',
    estimatedTime: '40 seconds',
    popularity: 91,
    tags: ['streaming', 'subscription', 'content', 'media']
  },
  {
    id: 'shopify-clone',
    title: 'E-commerce Platform',
    category: 'E-commerce',
    description: 'Full-featured online store backend',
    prompt: 'Create a complete e-commerce backend with product catalog with variants and inventory, shopping cart and wishlist, customer accounts with addresses, order processing and fulfillment, payment gateway integration, shipping calculations, discount codes and sales, product reviews, email notifications, and analytics dashboard.',
    icon: '🛍️',
    estimatedTime: '50 seconds',
    popularity: 96,
    tags: ['ecommerce', 'payments', 'inventory', 'orders']
  },
  {
    id: 'whatsapp-clone',
    title: 'Messaging App',
    category: 'Communication',
    description: 'WhatsApp-style instant messaging backend',
    prompt: 'Build a real-time messaging app backend with user registration with phone numbers, one-to-one and group chats, message status (sent, delivered, read), voice and video calls, file and media sharing, end-to-end encryption, online/offline status, push notifications, and chat backup.',
    icon: '💬',
    estimatedTime: '35 seconds',
    popularity: 90,
    tags: ['messaging', 'real-time', 'communication', 'encryption']
  },
  {
    id: 'notion-clone',
    title: 'Productivity & Notes App',
    category: 'Productivity',
    description: 'Notion-style workspace and notes backend',
    prompt: 'Create a productivity workspace backend with hierarchical pages and documents, rich text editing with blocks, databases with custom properties, templates and views, real-time collaboration, comments and mentions, file attachments, workspace sharing and permissions, search functionality, and version history.',
    icon: '📝',
    estimatedTime: '45 seconds',
    popularity: 88,
    tags: ['productivity', 'collaboration', 'documents', 'workspace']
  },
  {
    id: 'linkedin-clone',
    title: 'Professional Network',
    category: 'Social Media',
    description: 'LinkedIn-style professional networking backend',
    prompt: 'Build a professional networking platform with user profiles with work experience and skills, connection requests and networking, job postings and applications, company pages, content posts and articles, endorsements and recommendations, messaging and InMail, groups and communities, and job matching algorithm.',
    icon: '💼',
    estimatedTime: '50 seconds',
    popularity: 87,
    tags: ['networking', 'jobs', 'professional', 'social']
  },
  {
    id: 'spotify-clone',
    title: 'Music Streaming Service',
    category: 'Entertainment',
    description: 'Spotify-style music streaming backend',
    prompt: 'Create a music streaming backend with user profiles and preferences, song library with metadata, playlists creation and sharing, personalized recommendations, artist profiles and following, podcast support, offline downloads, listening history, social features for sharing, and royalty tracking.',
    icon: '🎵',
    estimatedTime: '45 seconds',
    popularity: 89,
    tags: ['music', 'streaming', 'playlists', 'audio']
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return AI_PROMPT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get most popular templates
 */
export function getPopularTemplates(limit: number = 5): PromptTemplate[] {
  return [...AI_PROMPT_TEMPLATES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): PromptTemplate[] {
  const lower = keyword.toLowerCase();
  return AI_PROMPT_TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some(tag => tag.includes(lower))
  );
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return [...new Set(AI_PROMPT_TEMPLATES.map(t => t.category))];
}