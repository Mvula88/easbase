'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  MapPin, 
  Briefcase, 
  Clock,
  DollarSign,
  Heart,
  Rocket,
  Users,
  Globe,
  Coffee,
  Laptop,
  ArrowRight,
  Check
} from 'lucide-react';

const openPositions = [
  {
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary: '$150k - $200k',
    description: 'Help us build the future of backend development with advanced automation tools.'
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    salary: '$120k - $160k',
    description: 'Design intuitive interfaces for developers building backend infrastructure.'
  },
  {
    title: 'Developer Advocate',
    department: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    salary: '$100k - $140k',
    description: 'Help developers succeed with Easbase through content, demos, and community engagement.'
  },
  {
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary: '$140k - $180k',
    description: 'Build and maintain our infrastructure automation and deployment pipelines.'
  }
];

const benefits = [
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: '100% covered health, dental, and vision insurance for you and your family'
  },
  {
    icon: DollarSign,
    title: 'Equity',
    description: 'Meaningful equity compensation so you own part of what you build'
  },
  {
    icon: Globe,
    title: 'Remote First',
    description: 'Work from anywhere in the world with flexible hours'
  },
  {
    icon: Coffee,
    title: 'Home Office',
    description: '$2,000 home office setup budget + $100/month stipend'
  },
  {
    icon: Laptop,
    title: 'Equipment',
    description: 'Top-of-the-line MacBook Pro or equivalent of your choice'
  },
  {
    icon: Rocket,
    title: 'Learning',
    description: '$1,500 annual learning budget for courses and conferences'
  }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              We're Hiring
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Join Us in Building
              <span className="block bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                The Future of Backend
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Help us democratize backend development and make it accessible to everyone. 
              We're looking for passionate people who want to make a difference.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
              View Open Positions
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Developer First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We obsess over developer experience. Every decision we make starts with 
                  "How will this help developers build better, faster?"
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Radical Simplicity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We believe powerful tools should be simple to use. Complexity is the enemy 
                  of adoption and productivity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Open by Default</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We share our learnings, contribute to open source, and build in public. 
                  Transparency builds trust.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Work at Easbase?</h2>
            <p className="text-xl text-gray-600">
              We take care of our team so they can take care of our customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Open Positions</h2>
            <p className="text-xl text-gray-600">
              Join our fully remote team from anywhere in the world
            </p>
          </div>

          <div className="space-y-4">
            {openPositions.map((position, index) => (
              <Card key={index} className="hover:shadow-lg transition">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{position.title}</h3>
                        <Badge>{position.department}</Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{position.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {position.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {position.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {position.salary}
                        </span>
                      </div>
                    </div>
                    <Button>
                      Apply Now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Don't see a perfect fit? We're always looking for exceptional talent.
            </p>
            <Button variant="outline">
              Send Us Your Resume
            </Button>
          </div>
        </div>
      </section>

      {/* Culture Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-teal-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Build Something Amazing With Us
          </h2>
          <p className="text-xl mb-8 opacity-90">
            We're a small team making a big impact. Every person here shapes our product, 
            culture, and future.
          </p>
          <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
            Explore Opportunities
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}