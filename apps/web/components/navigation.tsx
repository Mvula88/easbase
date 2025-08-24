'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/auth/supabase-client';
import { useRouter } from 'next/navigation';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/easbase-logo.png" 
              alt="Easbase Logo" 
              width={300} 
              height={80} 
              priority
              className="h-12 md:h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              // Authenticated user menu
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
                  Dashboard
                </Link>
                <Link href="/dashboard/projects" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
                  My Projects
                </Link>
                <Link href="/dashboard/api-usage" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
                  API Usage
                </Link>
                <Link href="/docs" className="text-gray-700 hover:text-cyan-500 transition text-lg font-medium">
                  Docs
                </Link>
              </>
            ) : (
              // Public menu
              <>
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
              </>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              // Authenticated user actions
              <div className="flex items-center space-x-4">
                <Link href="/dashboard/settings">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {user.email?.split('@')[0]}
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              // Public CTAs
              <>
                <Link href="/login">
                  <Button variant="outline" size="lg">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
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
              {user ? (
                // Authenticated mobile menu
                <>
                  <Link href="/dashboard" className="text-gray-700 hover:text-cyan-500">
                    Dashboard
                  </Link>
                  <Link href="/dashboard/projects" className="text-gray-700 hover:text-cyan-500">
                    My Projects
                  </Link>
                  <Link href="/dashboard/api-usage" className="text-gray-700 hover:text-cyan-500">
                    API Usage
                  </Link>
                  <Link href="/dashboard/settings" className="text-gray-700 hover:text-cyan-500">
                    Settings
                  </Link>
                  <Link href="/docs" className="text-gray-700 hover:text-cyan-500">
                    Documentation
                  </Link>
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      {user.email}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                // Public mobile menu
                <>
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}