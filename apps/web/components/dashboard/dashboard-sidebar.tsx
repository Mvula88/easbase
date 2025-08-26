'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3,
  Rocket,
  Database,
  Activity,
  CreditCard,
  Settings,
  Key,
  LogOut,
  X,
  Menu,
  User,
  FolderOpen,
  Shield,
  Brain,
  Store,
  Users,
  Globe,
  Palette,
  FileCode,
  HelpCircle,
  Building2,
  Zap,
  BookOpen,
  Mail,
  UserPlus,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { createClient } from '@/lib/auth/supabase-client';
import { useRouter } from 'next/navigation';

interface DashboardSidebarProps {
  user: {
    name: string;
    email: string;
  };
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export function DashboardSidebar({ user, sidebarOpen = true, setSidebarOpen }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    // Core Features
    {
      href: '/dashboard',
      label: 'Overview',
      icon: BarChart3,
      exact: true
    },
    {
      href: '/dashboard/create-project',
      label: 'Create Backend',
      icon: Rocket,
      highlight: true
    },
    {
      href: '/dashboard/projects',
      label: 'My Backends',
      icon: Database
    },
    
    // AI & Builder Features
    {
      href: '/ai-builder',
      label: 'AI Backend Builder',
      icon: Brain,
      isNew: true
    },
    {
      href: '/marketplace',
      label: 'Template Marketplace',
      icon: Store
    },
    {
      href: '/api-marketplace',
      label: 'API Marketplace',
      icon: Layers,
      isNew: true
    },
    
    // Management & Analytics
    {
      href: '/dashboard/api-usage',
      label: 'API Usage',
      icon: Activity
    },
    {
      href: '/dashboard/api-keys',
      label: 'API Keys',
      icon: Key
    },
    
    // Team & Collaboration
    {
      href: '/admin/users',
      label: 'Team Management',
      icon: Users
    },
    {
      href: '/onboarding',
      label: 'Onboarding',
      icon: UserPlus
    },
    
    // Admin Features
    {
      href: '/admin',
      label: 'Admin Panel',
      icon: ShieldCheck,
      adminOnly: true
    },
    {
      href: '/admin/testing',
      label: 'Testing Tools',
      icon: Zap,
      adminOnly: true
    },
    
    // Billing & Settings
    {
      href: '/dashboard/billing',
      label: 'Billing',
      icon: CreditCard
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings
    },
    
    // Resources
    {
      href: '/docs',
      label: 'Documentation',
      icon: BookOpen
    },
    {
      href: '/help',
      label: 'Help Center',
      icon: HelpCircle
    },
    {
      href: '/contact',
      label: 'Contact Support',
      icon: Mail
    }
  ];

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {setSidebarOpen && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <Link href="/" className="flex items-center">
              <img src="/easbase-logo.png" alt="Easbase" className="h-10 w-auto" />
            </Link>
            {setSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {/* Core Features */}
            <div className="pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">Core</p>
              {menuItems.slice(0, 3).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={`w-full justify-start text-left ${
                        active ? 'bg-gray-100 font-medium' : ''
                      } ${
                        item.highlight ? 'text-cyan-600 hover:text-cyan-700' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                      {item.isNew && (
                        <span className="ml-auto bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* AI & Builder Features */}
            <div className="pb-2 pt-2 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">AI & Builder</p>
              {menuItems.slice(3, 6).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={`w-full justify-start text-left ${
                        active ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                      {item.isNew && (
                        <span className="ml-auto bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Management */}
            <div className="pb-2 pt-2 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">Management</p>
              {menuItems.slice(6, 10).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={`w-full justify-start text-left ${
                        active ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Admin */}
            <div className="pb-2 pt-2 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">Admin</p>
              {menuItems.slice(10, 12).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={`w-full justify-start text-left ${
                        active ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Account & Billing */}
            <div className="pb-2 pt-2 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">Account</p>
              {menuItems.slice(12, 14).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={`w-full justify-start text-left ${
                        active ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Resources */}
            <div className="pb-2 pt-2 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">Resources</p>
              {menuItems.slice(14).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={`w-full justify-start text-left ${
                        active ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom section with user info */}
          <div className="border-t">
            {/* User section */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium truncate max-w-[140px]">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{user.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}