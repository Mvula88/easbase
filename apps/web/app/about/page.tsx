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
              At Easbase, we're on a mission to democratize backend development. We believe that creating 
              robust, scalable infrastructure shouldn't require years of database expertise or deep pockets 
              for specialized engineers.
            </p>
            
            <p className="text-gray-600 mb-8">
              Founded in 2024 by a team of engineers who've spent years building infrastructure at scale, 
              we've experienced firsthand the repetitive nature of backend development. Every new project 
              starts with the same questions: How should we structure our database? What authentication 
              pattern should we use? How do we ensure security best practices?
            </p>

            <p className="text-gray-600 mb-12">
              That's why we built Easbase – to let AI handle the repetitive parts while you focus on what 
              makes your application unique.
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
              <div className="text-4xl font-bold text-cyan-500 mb-2">10,000+</div>
              <div className="text-gray-600">Developers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">1M+</div>
              <div className="text-gray-600">Schemas Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">$2M+</div>
              <div className="text-gray-600">Saved in AI Costs</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-500 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Meet the Team</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full mx-auto mb-4"></div>
                <h3 className="font-semibold">Sarah Chen</h3>
                <p className="text-gray-600 text-sm mb-2">CEO & Co-founder</p>
                <p className="text-gray-500 text-xs">
                  Former Google engineer with 10+ years building distributed systems
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-4"></div>
                <h3 className="font-semibold">Alex Kumar</h3>
                <p className="text-gray-600 text-sm mb-2">CTO & Co-founder</p>
                <p className="text-gray-500 text-xs">
                  AI researcher and former Meta infrastructure lead
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full mx-auto mb-4"></div>
                <h3 className="font-semibold">Jordan Park</h3>
                <p className="text-gray-600 text-sm mb-2">Head of Product</p>
                <p className="text-gray-500 text-xs">
                  Product leader with experience at Stripe and Vercel
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              Want to join our mission?
            </p>
            <Link href="/careers">
              <Button>
                View Open Positions
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Development?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers building backends faster with AI
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