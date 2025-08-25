/**
 * Backend Templates Marketplace
 * Pre-built, ready-to-deploy backend templates
 */

export interface BackendTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  author: string;
  authorRevenue: number; // 70% of price
  downloads: number;
  rating: number;
  features: string[];
  schema: string; // SQL schema
  seedData?: string; // Sample data
  documentation: string;
  demoUrl?: string;
  imageUrl: string;
  tags: string[];
}

export const MARKETPLACE_TEMPLATES: BackendTemplate[] = [
  {
    id: 'uber-clone',
    name: 'Uber Clone Backend',
    description: 'Complete ride-sharing app backend with drivers, riders, payments, and real-time tracking',
    category: 'Transportation',
    price: 299,
    author: 'Easbase Team',
    authorRevenue: 209,
    downloads: 1250,
    rating: 4.8,
    features: [
      'User authentication (drivers & riders)',
      'Real-time location tracking',
      'Ride matching algorithm',
      'Payment processing',
      'Rating system',
      'Trip history',
      'Surge pricing logic',
      'Driver earnings dashboard'
    ],
    schema: `-- Uber Clone Schema
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        name TEXT,
        user_type TEXT CHECK (user_type IN ('rider', 'driver')),
        is_verified BOOLEAN DEFAULT false,
        rating DECIMAL(2,1),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE vehicles (
        id UUID PRIMARY KEY,
        driver_id UUID REFERENCES users(id),
        make TEXT,
        model TEXT,
        year INTEGER,
        license_plate TEXT UNIQUE,
        color TEXT,
        capacity INTEGER
      );
      
      CREATE TABLE rides (
        id UUID PRIMARY KEY,
        rider_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES users(id),
        pickup_location POINT,
        dropoff_location POINT,
        pickup_address TEXT,
        dropoff_address TEXT,
        status TEXT DEFAULT 'requested',
        fare DECIMAL(10,2),
        distance_km DECIMAL(10,2),
        duration_minutes INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      );`,
    seedData: 'INSERT INTO users...',
    documentation: '# Uber Clone API Documentation...',
    demoUrl: 'https://demo.easbase.com/uber-backend',
    imageUrl: '/templates/uber-clone.png',
    tags: ['ride-sharing', 'transportation', 'real-time', 'payments']
  },
  {
    id: 'airbnb-clone',
    name: 'Airbnb Clone Backend',
    description: 'Property rental platform with hosts, guests, bookings, reviews, and payments',
    category: 'Marketplace',
    price: 249,
    author: 'DevStudio',
    authorRevenue: 174,
    downloads: 890,
    rating: 4.9,
    features: [
      'Host & guest accounts',
      'Property listings with images',
      'Availability calendar',
      'Booking system',
      'Payment processing',
      'Review system',
      'Messaging between hosts/guests',
      'Search with filters'
    ],
    schema: `-- Airbnb Clone Schema...`,
    documentation: '# Airbnb Clone API Documentation...',
    imageUrl: '/templates/airbnb-clone.png',
    tags: ['marketplace', 'rental', 'booking', 'reviews']
  },
  {
    id: 'saas-starter',
    name: 'SaaS Starter Kit',
    description: 'Multi-tenant SaaS backend with teams, billing, permissions, and admin panel',
    category: 'SaaS',
    price: 149,
    author: 'Easbase Team',
    authorRevenue: 104,
    downloads: 2340,
    rating: 4.7,
    features: [
      'Multi-tenant architecture',
      'Team management',
      'Role-based permissions',
      'Subscription billing',
      'Usage tracking',
      'Admin dashboard',
      'Audit logs',
      'Webhooks'
    ],
    schema: `-- SaaS Starter Schema...`,
    documentation: '# SaaS Starter Documentation...',
    imageUrl: '/templates/saas-starter.png',
    tags: ['saas', 'multi-tenant', 'billing', 'teams']
  },
  {
    id: 'ecommerce-pro',
    name: 'E-commerce Pro Backend',
    description: 'Full-featured online store with products, cart, checkout, inventory, and analytics',
    category: 'E-commerce',
    price: 199,
    author: 'CommerceExperts',
    authorRevenue: 139,
    downloads: 1560,
    rating: 4.6,
    features: [
      'Product catalog',
      'Shopping cart',
      'Order management',
      'Inventory tracking',
      'Payment processing',
      'Shipping calculation',
      'Discount codes',
      'Analytics dashboard'
    ],
    schema: `-- E-commerce Schema...`,
    documentation: '# E-commerce API Documentation...',
    imageUrl: '/templates/ecommerce-pro.png',
    tags: ['ecommerce', 'shop', 'payments', 'inventory']
  },
  {
    id: 'social-network',
    name: 'Social Network Backend',
    description: 'Instagram-like social platform with posts, stories, followers, and messaging',
    category: 'Social',
    price: 179,
    author: 'SocialDev',
    authorRevenue: 125,
    downloads: 1120,
    rating: 4.5,
    features: [
      'User profiles',
      'Posts with images/videos',
      'Stories (24hr)',
      'Follow system',
      'Like & comment',
      'Direct messaging',
      'Notifications',
      'Explore/discover'
    ],
    schema: `-- Social Network Schema...`,
    documentation: '# Social Network API Documentation...',
    imageUrl: '/templates/social-network.png',
    tags: ['social', 'media', 'messaging', 'content']
  }
];

/**
 * Revenue calculation for template marketplace
 */
export class MarketplaceRevenue {
  static calculatePlatformRevenue(template: BackendTemplate): number {
    return template.price * 0.3; // Easbase takes 30%
  }

  static calculateAuthorRevenue(template: BackendTemplate): number {
    return template.price * 0.7; // Author gets 70%
  }

  static estimateMonthlyRevenue(avgSalesPerTemplate: number = 10): number {
    const totalTemplates = MARKETPLACE_TEMPLATES.length;
    const avgPrice = MARKETPLACE_TEMPLATES.reduce((sum, t) => sum + t.price, 0) / totalTemplates;
    const platformCut = 0.3;
    
    return totalTemplates * avgSalesPerTemplate * avgPrice * platformCut;
  }
}

/**
 * Template deployment service
 */
export class TemplateDeploymentService {
  async deployTemplate(
    templateId: string,
    userId: string,
    projectName: string
  ): Promise<any> {
    const template = MARKETPLACE_TEMPLATES.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    // 1. Create backend project
    // 2. Apply template schema
    // 3. Insert seed data
    // 4. Configure settings
    // 5. Return credentials

    return {
      success: true,
      projectName,
      template: template.name,
      apiEndpoint: `https://api.easbase.com/${projectName}`,
      documentation: template.documentation
    };
  }
}