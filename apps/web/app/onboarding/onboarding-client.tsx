'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Rocket, Building, Users, ChevronRight } from 'lucide-react';

export default function OnboardingClient({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    team_size: '1-5',
    use_case: '',
    role: '',
    goals: [] as string[]
  });
  
  const router = useRouter();
  const { toast } = useToast();

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      toast({
        title: "Welcome to Easbase!",
        description: "Your account has been set up successfully.",
      });
      
      // Small delay to ensure database update completes
      setTimeout(() => {
        // Force a hard navigation to ensure fresh data
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Easbase! 🚀</CardTitle>
          <CardDescription>
            Let's get your account set up in just a few steps
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-cyan-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Building className="w-12 h-12 text-cyan-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Tell us about yourself</h3>
              </div>
              
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>

              <div>
                <Label htmlFor="role">Your Role</Label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="">Select your role</option>
                  <option value="developer">Developer</option>
                  <option value="founder">Founder/CEO</option>
                  <option value="product">Product Manager</option>
                  <option value="designer">Designer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Button 
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!formData.full_name || !formData.company_name}
              >
                Continue
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Users className="w-12 h-12 text-cyan-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">About your team</h3>
              </div>

              <div>
                <Label htmlFor="team_size">Team Size</Label>
                <select
                  id="team_size"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.team_size}
                  onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
                >
                  <option value="1-5">1-5 people</option>
                  <option value="6-20">6-20 people</option>
                  <option value="21-50">21-50 people</option>
                  <option value="51-100">51-100 people</option>
                  <option value="100+">100+ people</option>
                </select>
              </div>

              <div>
                <Label htmlFor="use_case">Primary Use Case</Label>
                <select
                  id="use_case"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.use_case}
                  onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
                >
                  <option value="">Select use case</option>
                  <option value="saas">SaaS Application</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="internal">Internal Tools</option>
                  <option value="mobile">Mobile App Backend</option>
                  <option value="api">API Development</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!formData.use_case}
                >
                  Continue
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Rocket className="w-12 h-12 text-cyan-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">What are your goals?</h3>
                <p className="text-sm text-gray-600">Select all that apply</p>
              </div>

              <div className="space-y-2">
                {[
                  'Build faster',
                  'Reduce costs',
                  'Improve security',
                  'Scale infrastructure',
                  'Automate workflows',
                  'Learn best practices'
                ].map((goal) => (
                  <label key={goal} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.goals.includes(goal)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, goals: [...formData.goals, goal] });
                        } else {
                          setFormData({ ...formData, goals: formData.goals.filter(g => g !== goal) });
                        }
                      }}
                      className="rounded"
                    />
                    <span>{goal}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading || formData.goals.length === 0}
                >
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}