'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="Easbase Logo" 
              width={300} 
              height={80} 
              priority
              className="h-12 md:h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
              Home
            </Link>
            <Link href="/features" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
              Features
            </Link>
            <Link href="/pricing" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
              Pricing
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="text-gray-700 hover:text-cyan-500">
                Home
              </Link>
              <Link href="/features" className="text-gray-700 hover:text-cyan-500">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-700 hover:text-cyan-500">
                Pricing
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-cyan-500">
                About
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-cyan-500">
                Contact
              </Link>
              <div className="pt-4 space-y-2">
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/signup" className="block">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}