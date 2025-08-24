'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { 
  Search,
  Book,
  MessageSquare,
  Video,
  FileText,
  HelpCircle,
  ChevronRight,
  Zap,
  Database,
  Shield,
  Code,
  Settings,
  CreditCard,
  Users,
  Globe,
  Terminal,
  Mail
} from 'lucide-react';

const helpCategories = [
  {
    icon: Zap,
    title: 'Getting Started',
    description: 'Learn the basics of Easbase and get up and running quickly',
    articles: 12,
    link: '/help/getting-started'
  },
  {
    icon: Database,
    title: 'Schema Generation',
    description: 'Master advanced schema creation and optimization',
    articles: 18,
    link: '/help/schema-generation'
  },
  {
    icon: Shield,
    title: 'Authentication',
    description: 'Implement secure authentication patterns',
    articles: 15,
    link: '/help/authentication'
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Complete API documentation and examples',
    articles: 24,
    link: '/help/api-reference'
  },
  {
    icon: Settings,
    title: 'Configuration',
    description: 'Configure and customize Easbase for your needs',
    articles: 10,
    link: '/help/configuration'
  },
  {
    icon: CreditCard,
    title: 'Billing & Plans',
    description: 'Manage your subscription and understand pricing',
    articles: 8,
    link: '/help/billing'
  }
];

const popularArticles = [
  'How to generate your first schema instantly',
  'Understanding Row Level Security (RLS) policies',
  'Deploying to Database: Step-by-step guide',
  'Setting up authentication templates',
  'Optimizing cache performance',
  'Managing team permissions',
  'Using the CLI for automation',
  'Webhook integration guide'
];

const faqs = [
  {
    question: 'What is Easbase?',
    answer: 'Easbase is an advanced platform that helps developers create backend infrastructure using natural language. It generates production-ready PostgreSQL schemas, authentication templates, and more using proven patterns from thousands of deployments.'
  },
  {
    question: 'How does the schema generation work?',
    answer: 'Simply describe your application in plain English, and our system generates optimized PostgreSQL schemas with proper relationships, indexes, and security policies using battle-tested patterns.'
  },
  {
    question: 'Can I use Easbase with my existing database project?',
    answer: 'Yes! Our platform can deploy schemas directly to your existing database projects. You can also export the generated SQL and apply it manually.'
  },
  {
    question: 'What pricing plans are available?',
    answer: 'We offer a free tier with 100 API calls/month, and paid plans starting at $49/month for individuals and teams. Enterprise plans are also available.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We never store your database credentials. All schemas are generated with security best practices, including Row Level Security policies by default.'
  },
  {
    question: 'Do you offer support?',
    answer: 'Yes! Free tier users get community support, while paid plans include priority email support and dedicated Slack channels for higher tiers.'
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Help Center
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              How Can We
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Help You Today?
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Find answers, explore documentation, and get support for all your Easbase questions
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for help articles, guides, or documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-6 border-b">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/docs">
              <Button variant="outline" className="gap-2">
                <Book className="w-4 h-4" />
                Documentation
              </Button>
            </Link>
            <Link href="/help/tutorials">
              <Button variant="outline" className="gap-2">
                <Video className="w-4 h-4" />
                Video Tutorials
              </Button>
            </Link>
            <Link href="/help/api">
              <Button variant="outline" className="gap-2">
                <Terminal className="w-4 h-4" />
                API Reference
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Browse by Category</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => (
              <Link key={index} href={category.link}>
                <Card className="hover:shadow-lg transition cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <category.icon className="w-8 h-8 text-cyan-500" />
                      <Badge variant="secondary">{category.articles} articles</Badge>
                    </div>
                    <CardTitle className="mt-4">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{category.description}</p>
                    <div className="flex items-center text-cyan-600 font-medium">
                      Browse articles
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Popular Articles</h2>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {popularArticles.map((article, index) => (
              <Link key={index} href={`/help/article/${index}`}>
                <Card className="hover:shadow-md transition cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{article}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="cursor-pointer" onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{faq.question}</h3>
                      {expandedFaq === index && (
                        <p className="text-gray-600">{faq.answer}</p>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transform transition ${expandedFaq === index ? 'rotate-90' : ''}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">
            Still Need Help?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Our support team is here to assist you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
                <Mail className="w-5 h-5 mr-2" />
                Contact Support
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2 border-white bg-white/10 text-white hover:bg-white/20">
              <MessageSquare className="w-5 h-5 mr-2" />
              Join Community
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}