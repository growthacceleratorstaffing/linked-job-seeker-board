import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FEED_URL = `https://doulsumepjfihqowzheq.supabase.co/functions/v1/linkedin-job-feed`;
const STORAGE_KEY = 'linkedin-job-wrapping-steps';

const steps: React.ReactNode[] = [
  <>Log into <a className="underline text-secondary-pink" href="https://www.linkedin.com/talent" target="_blank" rel="noreferrer">LinkedIn Recruiter</a>.</>,
  <>Hover over your profile picture in the top right and select <b>Product settings</b>.</>,
  <>Click <b>Job posting</b> on the left menu.</>,
  <>Next to <i>Job sources for automated job postings</i>, click <b>View/Edit</b>.</>,
  <>Click <b>Add new job source</b>.</>,
  <>In the <i>Connect your ATS</i> window, open the dropdown and select <b>Other</b>. <i className="text-white/60">(If you don't see "Other", your contract may not have enough premium Job Slots for custom wrapping.)</i></>,
  <>Fill out the form with the <b>Custom ATS Name</b>, <b>Job Source URL</b> and your <b>LinkedIn Company Page</b> (copy them below).</>,
  <>Click <b>Request connection</b>. LinkedIn's support team will review and reach out to complete the mapping.</>,
];

const Advertising = () => {
  const { toast } = useToast();
  const [done, setDone] = useState<number[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((d) => d !== i) : [...done, i];
    setDone(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: 'Copied', description: v }); };

  const fields = [
    { label: 'Custom ATS Name', value: 'Growth Accelerator' },
    { label: 'Job Source URL', value: FEED_URL },
    { label: 'LinkedIn Company Page', value: 'https://www.linkedin.com/company/growth-accelerator' },
  ];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-white">Advertising on LinkedIn Recruiter</h1>
          <p className="text-white/70 mt-2">Let LinkedIn automatically post your vacancies (Job Wrapping). Requires a LinkedIn Recruiter contract with active Job Slots.</p>
        </div>

        <Card className="bg-white/5 border-white/20 text-white">
          <CardHeader>
            <CardTitle>Your connection details</CardTitle>
            <CardDescription className="text-white/70">Paste these into LinkedIn in step 7. The job source always lists your current vacancies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-3 p-3 rounded-lg border border-white/15 bg-white/5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60">{f.label}</div>
                  <div className="text-sm font-mono truncate">{f.value}</div>
                </div>
                <Button size="sm" onClick={() => copy(f.value)} className="bg-pink-600 hover:bg-pink-700 text-white"><Copy className="h-4 w-4" /></Button>
              </div>
            ))}
            <a href={FEED_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-secondary-pink underline"><ExternalLink className="h-3 w-3" /> Preview job source</a>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/20 text-white">
          <CardHeader>
            <CardTitle>Connect to LinkedIn Recruiter</CardTitle>
            <CardDescription className="text-white/70">{done.length}/{steps.length} steps done — tick each step as you go.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i}>
                  <button onClick={() => toggle(i)} className="w-full text-left flex gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5">
                    <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${done.includes(i) ? 'text-green-400' : 'text-white/30'}`} />
                    <span><b className="mr-1">{i + 1}.</b>{s}</span>
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Advertising;
