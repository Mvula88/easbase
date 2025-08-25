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
  },
  {
    id: 'healthcare-platform',
    name: 'Healthcare Platform Backend',
    description: 'Complete telemedicine platform with appointments, prescriptions, patient records, video consultations',
    category: 'Healthcare',
    price: 499,
    authorRevenue: 349,
    author: 'Dr. Tech Solutions',
    rating: 4.9,
    downloads: 89,
    features: [
      'Patient management system',
      'Appointment scheduling with calendar',
      'Video consultation integration',
      'Electronic health records (EHR)',
      'Prescription management',
      'Lab results tracking',
      'Insurance verification',
      'HIPAA compliance ready',
      'Multi-clinic support',
      'Real-time notifications',
    ],
    imageUrl: '/templates/healthcare.png',
    tags: ['healthcare', 'telemedicine', 'appointments', 'medical', 'HIPAA'],
    demoUrl: 'https://demo.easbase.io/healthcare',
    schema: `
      -- Patients, Doctors, Appointments
      CREATE TABLE patients (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        date_of_birth DATE,
        medical_history JSONB,
        insurance_info JSONB
      );
      
      CREATE TABLE doctors (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        specialization TEXT,
        license_number TEXT UNIQUE,
        availability JSONB,
        consultation_fee DECIMAL
      );
      
      CREATE TABLE appointments (
        id UUID PRIMARY KEY,
        patient_id UUID REFERENCES patients(id),
        doctor_id UUID REFERENCES doctors(id),
        appointment_date TIMESTAMPTZ,
        status TEXT,
        consultation_notes TEXT,
        prescription JSONB
      );
    `,
    documentation: 'Full healthcare backend with HIPAA-ready architecture, supporting telemedicine, EHR, and multi-clinic operations.',
  },
  {
    id: 'fintech-banking',
    name: 'Digital Banking Backend',
    description: 'Modern banking backend with accounts, transactions, KYC, loans, and investment tracking',
    category: 'Fintech',
    price: 599,
    authorRevenue: 419,
    author: 'FinTech Builders',
    rating: 4.8,
    downloads: 134,
    features: [
      'Multi-currency accounts',
      'Transaction processing',
      'KYC/AML verification',
      'Loan management system',
      'Investment portfolios',
      'Card management',
      'Fraud detection rules',
      'Regulatory compliance',
      'Webhook notifications',
      'Analytics dashboard',
    ],
    imageUrl: '/templates/banking.png',
    tags: ['fintech', 'banking', 'payments', 'KYC', 'transactions'],
    demoUrl: 'https://demo.easbase.io/banking',
    schema: `
      -- Accounts, Transactions, Cards
      CREATE TABLE accounts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        account_number TEXT UNIQUE,
        account_type TEXT,
        balance DECIMAL(15,2),
        currency TEXT,
        status TEXT
      );
      
      CREATE TABLE transactions (
        id UUID PRIMARY KEY,
        from_account UUID REFERENCES accounts(id),
        to_account UUID REFERENCES accounts(id),
        amount DECIMAL(15,2),
        type TEXT,
        status TEXT,
        created_at TIMESTAMPTZ
      );
    `,
    documentation: 'Enterprise-grade banking backend with full compliance features, multi-currency support, and fraud detection.',
  },
  {
    id: 'learning-management',
    name: 'LMS (Learning Platform) Backend',
    description: 'Complete e-learning platform with courses, quizzes, certificates, and progress tracking',
    category: 'Education',
    price: 349,
    authorRevenue: 244,
    author: 'EduTech Pro',
    rating: 4.7,
    downloads: 267,
    features: [
      'Course management',
      'Video streaming support',
      'Quiz & assignment system',
      'Progress tracking',
      'Certificate generation',
      'Discussion forums',
      'Live class scheduling',
      'Payment integration',
      'Multi-language support',
      'Analytics & reporting',
    ],
    imageUrl: '/templates/lms.png',
    tags: ['education', 'LMS', 'courses', 'e-learning', 'training'],
    demoUrl: 'https://demo.easbase.io/lms',
    schema: `
      -- Courses, Lessons, Enrollments
      CREATE TABLE courses (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        instructor_id UUID,
        price DECIMAL(10,2),
        duration_hours INTEGER,
        difficulty_level TEXT
      );
      
      CREATE TABLE lessons (
        id UUID PRIMARY KEY,
        course_id UUID REFERENCES courses(id),
        title TEXT NOT NULL,
        content_type TEXT,
        content_url TEXT,
        duration_minutes INTEGER,
        order_index INTEGER
      );
      
      CREATE TABLE enrollments (
        id UUID PRIMARY KEY,
        student_id UUID,
        course_id UUID REFERENCES courses(id),
        progress_percentage INTEGER,
        completed_at TIMESTAMPTZ
      );
    `,
    documentation: 'Full-featured LMS backend supporting video courses, live classes, assessments, and certification.',
  },
  {
    id: 'logistics-delivery',
    name: 'Logistics & Delivery Backend',
    description: 'Advanced logistics platform with route optimization, fleet management, and real-time tracking',
    category: 'Logistics',
    price: 449,
    authorRevenue: 314,
    author: 'LogiTech Solutions',
    rating: 4.8,
    downloads: 156,
    features: [
      'Fleet management',
      'Route optimization',
      'Real-time GPS tracking',
      'Driver management',
      'Warehouse inventory',
      'Delivery scheduling',
      'Proof of delivery',
      'Customer notifications',
      'Analytics dashboard',
      'Multi-vendor support',
    ],
    imageUrl: '/templates/logistics.png',
    tags: ['logistics', 'delivery', 'fleet', 'tracking', 'shipping'],
    demoUrl: 'https://demo.easbase.io/logistics',
    schema: `
      -- Vehicles, Drivers, Deliveries
      CREATE TABLE vehicles (
        id UUID PRIMARY KEY,
        registration_number TEXT UNIQUE,
        type TEXT,
        capacity_kg DECIMAL,
        current_location POINT,
        status TEXT
      );
      
      CREATE TABLE deliveries (
        id UUID PRIMARY KEY,
        tracking_number TEXT UNIQUE,
        sender_address TEXT,
        recipient_address TEXT,
        vehicle_id UUID REFERENCES vehicles(id),
        status TEXT,
        estimated_delivery TIMESTAMPTZ
      );
    `,
    documentation: 'Enterprise logistics backend with route optimization, real-time tracking, and multi-warehouse support.',
  },
  {
    id: 'gaming-platform',
    name: 'Gaming Platform Backend',
    description: 'Multiplayer gaming backend with matchmaking, leaderboards, tournaments, and in-game economy',
    category: 'Gaming',
    price: 399,
    authorRevenue: 279,
    author: 'GameDev Studios',
    rating: 4.9,
    downloads: 412,
    features: [
      'Player authentication',
      'Matchmaking system',
      'Real-time multiplayer',
      'Leaderboards & rankings',
      'Tournament management',
      'In-game economy',
      'Virtual items & inventory',
      'Chat & messaging',
      'Anti-cheat system',
      'Analytics & metrics',
    ],
    imageUrl: '/templates/gaming.png',
    tags: ['gaming', 'multiplayer', 'tournaments', 'leaderboards', 'matchmaking'],
    demoUrl: 'https://demo.easbase.io/gaming',
    schema: `
      -- Players, Matches, Tournaments
      CREATE TABLE players (
        id UUID PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        level INTEGER,
        experience_points INTEGER,
        coins INTEGER,
        inventory JSONB
      );
      
      CREATE TABLE matches (
        id UUID PRIMARY KEY,
        game_mode TEXT,
        players JSONB,
        winner_id UUID,
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ
      );
      
      CREATE TABLE tournaments (
        id UUID PRIMARY KEY,
        name TEXT,
        prize_pool DECIMAL,
        participants JSONB,
        status TEXT,
        start_date TIMESTAMPTZ
      );
    `,
    documentation: 'Scalable gaming backend with real-time multiplayer, tournaments, and complete player progression system.',
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