'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Target, Heart, Rocket, Users, Award, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Our Story
            </Badge>
            <h1 className="text-5xl font-bold mb-6">
              Building the Future of
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Backend Development
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              We believe every developer should focus on building great products, not wrestling with infrastructure.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-gray-600 mb-8">
              At Easbase, we're revolutionizing how developers create backend infrastructure. Our intelligent 
              Backend-as-a-Service platform generates complete, production-ready backends in 60 seconds – 
              including databases, authentication, APIs, and more.
            </p>
            
            <p className="text-gray-600 mb-8">
              Founded in 2024 by engineers frustrated with rebuilding the same infrastructure for every project, 
              we asked ourselves: Why does every app need months of backend development when 80% of the requirements 
              are identical? Why do startups spend $40,000+ and 3-6 months before they can even validate their idea?
            </p>

            <p className="text-gray-600 mb-8">
              That's why we built Easbase – a platform that understands your business requirements 
              and instantly generates a complete backend. Just describe what you're building, and our advanced 
              engine creates your entire database schema, sets up authentication, configures APIs, and even generates 
              SDKs in your preferred language.
            </p>

            <p className="text-gray-600 mb-12">
              We're not just another boilerplate or template. Easbase creates truly custom backends tailored to 
              your specific needs, whether you're building an e-commerce platform, SaaS application, marketplace, 
              or something entirely unique. Focus on your product, not your infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <Card>
              <CardContent className="pt-6">
                <Target className="w-10 h-10 text-cyan-500 mb-4" />
                <h3 className="font-semibold mb-2">Our Vision</h3>
                <p className="text-gray-600 text-sm">
                  A world where any developer can build production-ready backends in minutes, not months.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Heart className="w-10 h-10 text-cyan-500 mb-4" />
                <h3 className="font-semibold mb-2">Our Values</h3>
                <p className="text-gray-600 text-sm">
                  Simplicity, transparency, and developer happiness guide everything we build.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Rocket className="w-10 h-10 text-cyan-500 mb-4" />
                <h3 className="font-semibold mb-2">Our Promise</h3>
                <p className="text-gray-600 text-sm">
                  We'll always prioritize developer experience and never compromise on security.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">By the Numbers</h2>
          
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">60 sec</div>
              <div className="text-gray-600">To Production Backend</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">95%</div>
              <div className="text-gray-600">Development Time Saved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">$40k+</div>
              <div className="text-gray-600">Average Cost Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">100%</div>
              <div className="text-gray-600">Custom to Your Needs</div>
            </div>
          </div>
        </div>
      </section>


      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Development?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers building backends faster
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}