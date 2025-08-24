'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  ShoppingCart, 
  Briefcase, 
  Store, 
  Calendar, 
  Settings,
  Database,
  Shield,
  Mail,
  CreditCard,
  HardDrive,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ProjectConfig {
  businessType: string;
  projectName: string;
  description: string;
  features: {
    auth: boolean;
    database: boolean;
    storage: boolean;
    email: boolean;
    payments: boolean;
    analytics: boolean;
  };
}

const businessTypes = [
  { 
    id: 'ecommerce', 
    name: 'E-Commerce', 
    icon: ShoppingCart,
    description: 'Online store with products, orders, and payments',
    features: ['Product catalog', 'Shopping cart', 'Order management', 'Payment processing']
  },
  { 
    id: 'saas', 
    name: 'SaaS Application', 
    icon: Briefcase,
    description: 'Multi-tenant app with teams and subscriptions',
    features: ['User management', 'Team collaboration', 'Subscription billing', 'Admin dashboard']
  },
  { 
    id: 'marketplace', 
    name: 'Marketplace', 
    icon: Store,
    description: 'Platform connecting buyers and sellers',
    features: ['Vendor management', 'Product listings', 'Commission system', 'Reviews & ratings']
  },
  { 
    id: 'booking', 
    name: 'Booking System', 
    icon: Calendar,
    description: 'Appointment and reservation management',
    features: ['Calendar integration', 'Availability management', 'Booking confirmations', 'Reminders']
  },
  { 
    id: 'custom', 
    name: 'Custom Backend', 
    icon: Settings,
    description: 'Start from scratch with your own design',
    features: ['Flexible schema', 'Custom workflows', 'API-first design', 'Full control']
  }
];

const features = [
  { id: 'auth', name: 'Authentication', icon: Shield, description: 'User login, SSO, 2FA' },
  { id: 'database', name: 'Database', icon: Database, description: 'PostgreSQL with real-time' },
  { id: 'storage', name: 'File Storage', icon: HardDrive, description: 'Images, documents, CDN' },
  { id: 'email', name: 'Email Service', icon: Mail, description: 'Transactional emails' },
  { id: 'payments', name: 'Payments', icon: CreditCard, description: 'Stripe integration' },
  { id: 'analytics', name: 'Analytics', icon: Sparkles, description: 'Usage tracking' }
];

export default function CreateProjectWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [config, setConfig] = useState<ProjectConfig>({
    businessType: '',
    projectName: '',
    description: '',
    features: {
      auth: true,
      database: true,
      storage: false,
      email: false,
      payments: false,
      analytics: false
    }
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleBusinessTypeSelect = (type: string) => {
    setConfig({ 
      ...config, 
      businessType: type,
      // Auto-enable recommended features based on business type
      features: {
        auth: true,
        database: true,
        storage: type === 'ecommerce' || type === 'marketplace',
        email: true,
        payments: type === 'ecommerce' || type === 'saas' || type === 'marketplace',
        analytics: type === 'saas'
      }
    });
    setStep(2);
  };

  const handleFeatureToggle = (featureId: string) => {
    setConfig({
      ...config,
      features: {
        ...config.features,
        [featureId]: !config.features[featureId as keyof typeof config.features]
      }
    });
  };

  const handleCreateProject = async () => {
    // Validate required fields
    if (!config.projectName || !config.businessType) {
      toast({
        title: "Missing Information",
        description: "Please provide a project name and select a business type.",
        variant: "destructive"
      });
      return;
    }

    console.log('Creating project with config:', config);
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (!response.ok) {
        console.error('API Error Details:', data);
        throw new Error(data.error || data.details || 'Failed to create project');
      }
      
      toast({
        title: "Success!",
        description: "Your backend has been created successfully.",
      });
      
      // Redirect to projects page
      setTimeout(() => {
        router.push('/dashboard/projects');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive"
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Backend</h1>
          <p className="text-gray-600">Get a complete backend in 60 seconds</p>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span className={step === 1 ? 'font-semibold text-cyan-600' : ''}>1. Choose Type</span>
              <span className={step === 2 ? 'font-semibold text-cyan-600' : ''}>2. Project Details</span>
              <span className={step === 3 ? 'font-semibold text-cyan-600' : ''}>3. Features</span>
              <span className={step === 4 ? 'font-semibold text-cyan-600' : ''}>4. Create</span>
            </div>
          </div>
          
          {/* Debug Test Button */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800 mb-2">Debug Mode - Test API Connection</p>
            <Button 
              onClick={async () => {
                console.log('Testing API connection...');
                try {
                  const response = await fetch('/api/projects/test-create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      projectName: 'Debug Test',
                      businessType: 'test',
                      features: {}
                    })
                  });
                  const data = await response.json();
                  console.log('Test API Response:', data);
                  if (response.ok) {
                    toast({
                      title: "API Test Success",
                      description: "Check console for details",
                    });
                  } else {
                    toast({
                      title: "API Test Failed",
                      description: data.error + (data.details ? ': ' + data.details : ''),
                      variant: "destructive"
                    });
                  }
                } catch (error: any) {
                  console.error('Test API Error:', error);
                  toast({
                    title: "Connection Error",
                    description: error.message,
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="bg-yellow-100 hover:bg-yellow-200"
            >
              Test API Connection
            </Button>
          </div>
        </div>

        {/* Step 1: Choose Business Type */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">What are you building?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {businessTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.id}
                    className="cursor-pointer hover:border-cyan-500 transition-colors"
                    onClick={() => handleBusinessTypeSelect(type.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Icon className="w-8 h-8 text-cyan-500" />
                        <Badge variant="outline">Popular</Badge>
                      </div>
                      <CardTitle className="mt-2">{type.name}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {type.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Project Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Name your backend and describe what it does</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="My Awesome Backend"
                  value={config.projectName}
                  onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Describe what your backend will do..."
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  disabled={!config.projectName}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Features */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Features</CardTitle>
              <CardDescription>Choose the features you need (you can add more later)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  const isEnabled = config.features[feature.id as keyof typeof config.features];
                  
                  return (
                    <div
                      key={feature.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isEnabled ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleFeatureToggle(feature.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <Icon className={`w-5 h-5 mr-3 ${isEnabled ? 'text-cyan-500' : 'text-gray-400'}`} />
                          <div>
                            <p className="font-medium">{feature.name}</p>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isEnabled ? 'border-cyan-500 bg-cyan-500' : 'border-gray-300'
                        }`}>
                          {isEnabled && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(4)}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review and Create */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>Your backend is ready to be created!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Project Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{config.projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{config.businessType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Features:</span>
                      <span className="font-medium">
                        {Object.values(config.features).filter(Boolean).length} enabled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg">
                  <h3 className="font-medium text-cyan-900 mb-2">What happens next?</h3>
                  <ul className="space-y-1 text-sm text-cyan-800">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2" />
                      Your backend will be provisioned in ~60 seconds
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2" />
                      You'll get API credentials and documentation
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2" />
                      Start using your backend immediately
                    </li>
                  </ul>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={isCreating}
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Backend...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Backend
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}