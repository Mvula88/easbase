import Link from 'next/link';
import Image from 'next/image';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Image 
                src="/easbase-logo.png" 
                alt="Easbase Logo" 
                width={120} 
                height={30} 
                className="h-8 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-gray-400">
              Intelligent backend infrastructure for modern applications
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="https://github.com" className="text-gray-400 hover:text-cyan-400">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" className="text-gray-400 hover:text-cyan-400">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" className="text-gray-400 hover:text-cyan-400">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-gray-400 hover:text-cyan-400">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-cyan-400">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-cyan-400">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="https://docs.easbase.dev" className="text-gray-400 hover:text-cyan-400">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-cyan-400">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-cyan-400">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-cyan-400">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-400 hover:text-cyan-400">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@easbase.dev" className="text-gray-400 hover:text-cyan-400 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  support@easbase.dev
                </a>
              </li>
              <li>
                <Link href="/help" className="text-gray-400 hover:text-cyan-400">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-gray-400 hover:text-cyan-400">
                  System Status
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-cyan-400">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <p>&copy; 2025 Easbase. All rights reserved.</p>
            <p className="mt-2 md:mt-0">
              8195, 1021 E Lincolnway, Cheyenne, WY, Laramie, US, 82001, United States
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}