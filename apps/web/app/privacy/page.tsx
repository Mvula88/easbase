'use client';

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-gray-600">
              Last updated: December 15, 2024
            </p>
          </div>

          <Card>
            <CardContent className="prose prose-gray max-w-none p-8">
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="mb-6">
                Easbase ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our service.
              </p>

              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
              <p className="mb-4">We may collect personal information that you provide directly to us, such as:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Name and email address</li>
                <li>Company information</li>
                <li>Billing and payment information</li>
                <li>Account credentials</li>
                <li>Communications with us</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Usage Information</h3>
              <p className="mb-4">We automatically collect certain information when you use our Service:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information</li>
                <li>Usage patterns and preferences</li>
                <li>API calls and schema generation history</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze usage patterns</li>
                <li>Detect and prevent fraudulent activities</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">4. Information Sharing</h2>
              <p className="mb-4">We do not sell or rent your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>Consent:</strong> With your explicit consent</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
              <p className="mb-6">
                We implement appropriate technical and organizational measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet 
                or electronic storage is 100% secure.
              </p>
              <p className="mb-4">Our security measures include:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">6. Your Database Credentials</h2>
              <p className="mb-6">
                <strong>Important:</strong> We do not store your database credentials. When you connect Easbase to your 
                database services, credentials are transmitted securely and used only for the immediate operation requested. 
                We recommend using environment variables and secure key management practices.
              </p>

              <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
              <p className="mb-6">
                We retain your personal information for as long as necessary to provide our Service and fulfill the purposes 
                described in this Privacy Policy. We may also retain and use your information to comply with legal obligations, 
                resolve disputes, and enforce our agreements.
              </p>

              <h2 className="text-2xl font-bold mb-4">8. Your Rights</h2>
              <p className="mb-4">Depending on your location, you may have certain rights regarding your personal information:</p>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to certain processing of your information</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">9. Cookies and Tracking</h2>
              <p className="mb-6">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>

              <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
              <p className="mb-6">
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information 
                from children under 18. If you become aware that a child has provided us with personal information, please contact us.
              </p>

              <h2 className="text-2xl font-bold mb-4">11. International Data Transfers</h2>
              <p className="mb-6">
                Your information may be transferred to and maintained on servers located outside of your state, province, country, 
                or other governmental jurisdiction where data protection laws may differ from those in your jurisdiction.
              </p>

              <h2 className="text-2xl font-bold mb-4">12. Changes to This Policy</h2>
              <p className="mb-6">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy 
                Policy on this page and updating the "Last updated" date.
              </p>

              <h2 className="text-2xl font-bold mb-4">13. Contact Us</h2>
              <p className="mb-4">If you have questions about this Privacy Policy, please contact us:</p>
              <ul className="list-none mb-6">
                <li>Email: privacy@easbase.dev</li>
                <li>Address: Easbase, Inc.</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4">14. California Privacy Rights</h2>
              <p className="mb-6">
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), 
                including the right to know what personal information we collect, the right to delete your information, and the 
                right to opt-out of the sale of your personal information (which we do not do).
              </p>

              <h2 className="text-2xl font-bold mb-4">15. GDPR Compliance</h2>
              <p className="mb-6">
                For users in the European Economic Area (EEA), we comply with the General Data Protection Regulation (GDPR). 
                We process personal data based on legitimate interests, contract fulfillment, legal obligations, or your consent.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}