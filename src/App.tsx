
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";

import WorkableCallback from "@/pages/WorkableCallback";
import Index from "./pages/Index";
import CRM from "./pages/CRM";
import Matching from "./pages/Matching";
import Candidates from "./pages/Candidates";
import PostJobs from "./pages/PostJobs";
import Jobs from "./pages/Jobs";
import JobBoard from "./pages/JobBoard";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import JobAdvertising from "./pages/JobAdvertising";
import Integrations from "./pages/Integrations";
import LinkedIn from "./pages/LinkedIn";
import LinkedInCallback from "./pages/LinkedInCallback";
import Data from "./pages/Data";
import Advertising from "./pages/Advertising";
import Backoffice from "./pages/Backoffice";
import PortalHome from "./pages/portal/PortalHome";
import PortalOnboarding from "./pages/portal/PortalOnboarding";
import PortalBackoffice from "./pages/portal/PortalBackoffice";
import AccessPending from "./pages/AccessPending";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/access-pending" element={<AccessPending />} />
            
            <Route path="/auth/workable/callback" element={<WorkableCallback />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/crm" element={
              <ProtectedRoute>
                <CRM />
              </ProtectedRoute>
            } />
            <Route path="/matching" element={
              <ProtectedRoute>
                <Matching />
              </ProtectedRoute>
            } />
            <Route path="/candidates" element={
              <ProtectedRoute>
                <Candidates />
              </ProtectedRoute>
            } />
            <Route path="/post-jobs" element={
              <ProtectedRoute>
                <PostJobs />
              </ProtectedRoute>
            } />
            <Route path="/jobs" element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            } />
            <Route path="/job-board" element={
              <ProtectedRoute>
                <JobBoard />
              </ProtectedRoute>
            } />
            <Route path="/job-advertising" element={
              <ProtectedRoute>
                <JobAdvertising />
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <Integrations />
              </ProtectedRoute>
            } />
            <Route path="/linkedin" element={
              <ProtectedRoute>
                <LinkedIn />
              </ProtectedRoute>
            } />
            <Route path="/advertising" element={
              <ProtectedRoute>
                <Advertising />
              </ProtectedRoute>
            } />
            <Route path="/linkedin-callback" element={<LinkedInCallback />} />
            <Route path="/data" element={
              <ProtectedRoute>
                <Data />
              </ProtectedRoute>
            } />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/backoffice" element={<ProtectedRoute><Backoffice /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute audience="employee"><PortalHome /></ProtectedRoute>} />
            <Route path="/portal/onboarding" element={<ProtectedRoute audience="employee"><PortalOnboarding /></ProtectedRoute>} />
            <Route path="/portal/backoffice" element={<ProtectedRoute audience="employee"><PortalBackoffice /></ProtectedRoute>} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
