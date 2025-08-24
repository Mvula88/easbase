'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, User } from 'lucide-react';

const blogPosts = [
  {
    id: 1,
    title: 'Introducing Easbase: The Future of Backend Development',
    excerpt: 'Learn how Easbase is revolutionizing backend development with advanced schema generation and smart caching.',
    author: 'Sarah Johnson',
    role: 'CEO & Co-founder',
    date: '2024-12-15',
    readTime: '5 min read',
    category: 'Product',
    image: '/blog/intro-easbase.jpg',
    featured: true
  },
  {
    id: 2,
    title: 'How We Reduced Generation Costs by 95% with Vector Caching',
    excerpt: 'Deep dive into our vector-based caching system and how it dramatically reduces API costs while maintaining quality.',
    author: 'Michael Chen',
    role: 'CTO',
    date: '2024-12-10',
    readTime: '8 min read',
    category: 'Engineering',
    image: '/blog/vector-caching.jpg'
  },
  {
    id: 3,
    title: 'Building Multi-Tenant SaaS Applications with Easbase',
    excerpt: 'A comprehensive guide to implementing multi-tenant architecture using Easbase authentication templates.',
    author: 'Emily Rodriguez',
    role: 'Head of Engineering',
    date: '2024-12-05',
    readTime: '12 min read',
    category: 'Tutorial',
    image: '/blog/multi-tenant.jpg'
  },
  {
    id: 4,
    title: 'From SQL Novice to Database Expert: Easbase as Your Guide',
    excerpt: 'How advanced automation is democratizing database design and making it accessible to everyone.',
    author: 'David Park',
    role: 'Product Manager',
    date: '2024-11-28',
    readTime: '6 min read',
    category: 'Product',
    image: '/blog/automation-guide.jpg'
  },
  {
    id: 5,
    title: 'PostgreSQL + Easbase: The Perfect Stack for Modern Apps',
    excerpt: 'Why PostgreSQL is the ideal database for modern applications and how our platform makes it easy to deploy.',
    author: 'Sarah Johnson',
    role: 'CEO & Co-founder',
    date: '2024-11-20',
    readTime: '7 min read',
    category: 'Partnership',
    image: '/blog/postgres-platform.jpg'
  },
  {
    id: 6,
    title: 'Best Practices for Database Schema Design in 2024',
    excerpt: 'Learn the latest best practices for designing scalable, secure, and performant database schemas.',
    author: 'Michael Chen',
    role: 'CTO',
    date: '2024-11-15',
    readTime: '10 min read',
    category: 'Engineering',
    image: '/blog/best-practices.jpg'
  }
];

const categories = [
  { name: 'All', count: blogPosts.length },
  { name: 'Product', count: 2 },
  { name: 'Engineering', count: 2 },
  { name: 'Tutorial', count: 1 },
  { name: 'Partnership', count: 1 }
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Blog
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Insights & Updates from
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                The Easbase Team
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Stay updated with the latest in backend development, technology trends, 
              and product updates from Easbase.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {blogPosts.filter(post => post.featured).map(post => (
        <section key={post.id} className="py-12 px-6 border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4">{post.category}</Badge>
                <h2 className="text-3xl font-bold mb-4">
                  <Link href={`/blog/${post.id}`} className="hover:text-cyan-600 transition">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-6 text-lg">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(post.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{post.readTime}</span>
                  </div>
                </div>
                <Link href={`/blog/${post.id}`}>
                  <Button>
                    Read Article
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="bg-gray-200 rounded-lg h-80 flex items-center justify-center">
                <span className="text-gray-400">Featured Image</span>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Blog Posts Grid */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            {categories.map(category => (
              <Button
                key={category.name}
                variant="outline"
                className="rounded-full"
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.filter(post => !post.featured).map(post => (
              <Card key={post.id} className="hover:shadow-lg transition">
                <div className="bg-gray-200 h-48 flex items-center justify-center rounded-t-lg">
                  <span className="text-gray-400">Blog Image</span>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
                    <span className="text-sm text-gray-500">{post.readTime}</span>
                  </div>
                  <CardTitle className="line-clamp-2">
                    <Link href={`/blog/${post.id}`} className="hover:text-cyan-600 transition">
                      {post.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <p className="font-medium text-gray-700">{post.author}</p>
                      <p>{new Date(post.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                    <Link href={`/blog/${post.id}`}>
                      <Button variant="ghost" size="sm">
                        Read more
                        <ArrowRight className="ml-1 w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Newsletter Signup */}
          <div className="mt-20">
            <Card className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0">
              <CardContent className="p-8 text-center text-white">
                <h3 className="text-2xl font-bold mb-2">Stay in the Loop</h3>
                <p className="mb-6 opacity-90">
                  Get the latest updates, tutorials, and insights delivered to your inbox
                </p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 rounded-lg text-gray-900"
                  />
                  <Button className="bg-white text-cyan-600 hover:bg-gray-100">
                    Subscribe
                  </Button>
                </div>
                <p className="text-sm mt-4 opacity-80">
                  No spam, unsubscribe anytime
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}