'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  Book, 
  MessageSquare, 
  Video, 
  Mail,
  ExternalLink,
  Search,
  FileText,
  Code,
  Zap,
  Shield,
  CreditCard,
  Users,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

const helpResources = [
  {
    title: 'Documentation',
    description: 'Browse our comprehensive guides',
    icon: Book,
    href: '/docs',
    items: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Authentication', href: '/docs/auth' },
      { label: 'Database Schema', href: '/docs/schema' },
    ]
  },
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step tutorials',
    icon: Video,
    href: '/tutorials',
    items: [
      { label: 'Quick Start Guide', href: '/tutorials/quick-start' },
      { label: 'Building Your First Backend', href: '/tutorials/first-backend' },
      { label: 'Setting Up Authentication', href: '/tutorials/auth-setup' },
      { label: 'Deploying to Production', href: '/tutorials/deployment' },
    ]
  },
  {
    title: 'FAQs',
    description: 'Find answers to common questions',
    icon: FileText,
    href: '/faq',
    items: [
      { label: 'Billing & Pricing', href: '/faq#billing' },
      { label: 'Technical Issues', href: '/faq#technical' },
      { label: 'Security & Compliance', href: '/faq#security' },
      { label: 'Account Management', href: '/faq#account' },
    ]
  }
];

const quickLinks = [
  { icon: Zap, label: 'API Status', href: 'https://status.easbase.com', external: true },
  { icon: Shield, label: 'Security', href: '/security', external: false },
  { icon: CreditCard, label: 'Billing Help', href: '/docs/billing', external: false },
  { icon: Users, label: 'Community Forum', href: 'https://community.easbase.com', external: true },
];

export function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [supportForm, setSupportForm] = useState({
    subject: '',
    category: 'technical',
    message: '',
    priority: 'normal'
  });
  const { toast } = useToast();

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supportForm)
      });

      if (response.ok) {
        toast({
          title: 'Support ticket created',
          description: 'We\'ll get back to you within 24 hours.',
        });
        setSupportDialogOpen(false);
        setSupportForm({
          subject: '',
          category: 'technical',
          message: '',
          priority: 'normal'
        });
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create support ticket. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/docs/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end">
          <DropdownMenuLabel>Help & Support</DropdownMenuLabel>
          
          {/* Search */}
          <div className="p-2">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2"
              />
            </form>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Help Resources */}
          {helpResources.map((resource) => (
            <div key={resource.title} className="p-2">
              <Link href={resource.href}>
                <div className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer">
                  <resource.icon className="w-5 h-5 text-cyan-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{resource.title}</p>
                    <p className="text-xs text-gray-600">{resource.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                </div>
              </Link>
            </div>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Quick Links */}
          <div className="p-2">
            <p className="text-xs font-medium text-gray-500 mb-2 px-2">Quick Links</p>
            <div className="grid grid-cols-2 gap-1">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                >
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <link.icon className="w-4 h-4 mr-2" />
                    <span className="text-xs">{link.label}</span>
                    {link.external && <ExternalLink className="w-3 h-3 ml-auto" />}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Contact Support */}
          <DropdownMenuItem onSelect={(e) => {
            e.preventDefault();
            setSupportDialogOpen(true);
          }}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Mail className="w-4 h-4 mr-2" />
            support@easbase.com
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              We're here to help! Send us a message and we'll respond within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSupportSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full px-3 py-2 border rounded-md"
                value={supportForm.category}
                onChange={(e) => setSupportForm({...supportForm, category: e.target.value})}
              >
                <option value="technical">Technical Issue</option>
                <option value="billing">Billing & Payments</option>
                <option value="account">Account Management</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="w-full px-3 py-2 border rounded-md"
                value={supportForm.priority}
                onChange={(e) => setSupportForm({...supportForm, priority: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                required
                value={supportForm.subject}
                onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})}
                placeholder="Brief description of your issue"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                required
                rows={5}
                value={supportForm.message}
                onChange={(e) => setSupportForm({...supportForm, message: e.target.value})}
                placeholder="Please provide as much detail as possible..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSupportDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Message</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}