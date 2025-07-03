import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
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
            <CardTitle className="text-xl sm:text-2xl font-bold text-white">Terms of Service</CardTitle>
            <CardDescription className="text-slate-300">
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-slate-300">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h3>
              <p>
                By accessing and using Growth Accelerator, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Description of Service</h3>
              <p>
                Growth Accelerator is a recruitment platform that helps organizations manage their 
                hiring processes, candidate relationships, and job postings through integration with 
                various recruitment tools and platforms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. User Accounts</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. 
                You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. Acceptable Use</h3>
              <p>
                You agree to use the service only for lawful purposes and in accordance with these Terms. 
                You agree not to use the service in any way that could damage, disable, overburden, 
                or impair the service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Data and Privacy</h3>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs 
                your use of the service, to understand our practices.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Limitation of Liability</h3>
              <p>
                In no event shall Growth Accelerator be liable for any indirect, incidental, special, 
                consequential, or punitive damages, including without limitation, loss of profits, 
                data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. Changes to Terms</h3>
              <p>
                We reserve the right to modify or replace these Terms at any time. If a revision is 
                material, we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Contact Information</h3>
              <p>
                If you have any questions about these Terms of Service, please contact us through 
                our support channels.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;