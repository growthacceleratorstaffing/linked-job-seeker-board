import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary-blue flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/auth')}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>

        <Card className="bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-bold text-white">Privacy Policy</CardTitle>
            <CardDescription className="text-slate-300">
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-slate-300">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h3>
              <p>
                We collect information you provide directly to us, such as when you create an account, 
                update your profile, or communicate with us. This may include your name, email address, 
                and other contact information.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h3>
              <p>
                We use the information we collect to provide, maintain, and improve our services, 
                process transactions, send communications, and comply with legal obligations.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. Information Sharing</h3>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this Privacy Policy or as required by law.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. Data Security</h3>
              <p>
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Cookies and Tracking</h3>
              <p>
                We use cookies and similar tracking technologies to collect and use personal information 
                about you. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Third-Party Services</h3>
              <p>
                Our service may integrate with third-party services such as Workable and LinkedIn. 
                These services have their own privacy policies governing the use of your information.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. Data Retention</h3>
              <p>
                We retain personal information for as long as necessary to fulfill the purposes outlined 
                in this Privacy Policy, unless a longer retention period is required by law.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Your Rights</h3>
              <p>
                You have the right to access, update, or delete your personal information. You may also 
                have the right to restrict or object to certain processing of your information.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">9. Changes to This Policy</h3>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">10. Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy, please contact us through our 
                support channels.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;