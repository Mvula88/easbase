'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
              Legal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-600">
              Last updated: December 15, 2024
            </p>
          </div>

          <Card>
            <CardContent className="prose prose-gray max-w-none p-8">
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="mb-6">
                By accessing or using Easbase ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you disagree with any part of these terms, you may not access the Service.
              </p>

              <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
              <p className="mb-6">
                Easbase provides intelligent backend infrastructure generation services, including but not limited to:
              </p>
              <ul className="list-disc pl-6 mb-6">
                <li>Database schema generation using intelligent automation</li>
                <li>Authentication template deployment</li>
                <li>Caching and optimization services</li>
                <li>Integration with third-party database services</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
              <p className="mb-6">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
                You are responsible for safeguarding the password and for all activities that occur under your account.
              </p>

              <h2 className="text-2xl font-bold mb-4">4. Acceptable Use</h2>
              <p className="mb-4">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Violate any laws or regulations</li>
                <li>Infringe upon intellectual property rights</li>
                <li>Transmit malicious code or viruses</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Engage in any activity that disrupts or interferes with the Service</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">5. Intellectual Property</h2>
              <p className="mb-6">
                The Service and its original content, features, and functionality are owned by Easbase and are protected by 
                international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <h2 className="text-2xl font-bold mb-4">6. Payment Terms</h2>
              <p className="mb-6">
                Certain aspects of the Service may be provided for a fee. You agree to pay all fees associated with your 
                account. Fees are non-refundable except as required by law or as explicitly stated in these Terms.
              </p>

              <h2 className="text-2xl font-bold mb-4">7. Data Privacy</h2>
              <p className="mb-6">
                Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy, 
                which also governs the Site and informs users of our data collection practices.
              </p>

              <h2 className="text-2xl font-bold mb-4">8. Disclaimers and Limitations</h2>
              <p className="mb-6">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. EASBASE EXPRESSLY DISCLAIMS ALL WARRANTIES 
                OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, 
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>

              <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
              <p className="mb-6">
                IN NO EVENT SHALL EASBASE, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES, BE LIABLE 
                FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, 
                LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>

              <h2 className="text-2xl font-bold mb-4">10. Termination</h2>
              <p className="mb-6">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, 
                under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>

              <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
              <p className="mb-6">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide 
                at least 30 days notice prior to any new terms taking effect.
              </p>

              <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
              <p className="mb-6">
                If you have any questions about these Terms, please contact us at:
              </p>
              <ul className="list-none mb-6">
                <li>Email: legal@easbase.dev</li>
                <li>Address: Easbase, Inc.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}