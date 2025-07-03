
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export interface EmploymentDetails {
  jobTitle: string;
  employmentType: string;
  department: string;
  jobCode: string;
  officeLocation: string;
  workplace: string;
}

interface EmploymentDetailsFormProps {
  details: EmploymentDetails;
  onChange: (details: EmploymentDetails) => void;
}

export const EmploymentDetailsForm: React.FC<EmploymentDetailsFormProps> = ({
  details,
  onChange,
}) => {
  const updateField = (field: keyof EmploymentDetails, value: string) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <Card className="bg-primary-blue border border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Briefcase className="w-5 h-5 text-secondary-pink" />
          Employment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="job-title" className="text-slate-200 text-sm font-medium">
              Job title *
            </Label>
            <Input
              id="job-title"
              value={details.jobTitle}
              onChange={(e) => updateField('jobTitle', e.target.value)}
              placeholder="e.g., Senior React Developer"
              className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-secondary-pink focus:ring-secondary-pink"
            />
            <p className="text-xs text-slate-400 mt-1">
              80 characters left. No special characters.
            </p>
          </div>

          <div>
            <Label htmlFor="job-code" className="text-slate-200 text-sm font-medium">
              Job code
            </Label>
            <Input
              id="job-code"
              value={details.jobCode}
              onChange={(e) => updateField('jobCode', e.target.value)}
              placeholder="e.g., SRD-001"
              className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-secondary-pink focus:ring-secondary-pink"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-200 text-sm font-medium">
              Employment type
            </Label>
            <Select value={details.employmentType} onValueChange={(value) => updateField('employmentType', value)}>
              <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white focus:border-secondary-pink focus:ring-secondary-pink">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="full_time" className="text-white hover:bg-slate-600">Full-time</SelectItem>
                <SelectItem value="part_time" className="text-white hover:bg-slate-600">Part-time</SelectItem>
                <SelectItem value="contract" className="text-white hover:bg-slate-600">Contract</SelectItem>
                <SelectItem value="temporary" className="text-white hover:bg-slate-600">Temporary</SelectItem>
                <SelectItem value="other" className="text-white hover:bg-slate-600">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-200 text-sm font-medium">
              Department
            </Label>
            <Select value={details.department} onValueChange={(value) => updateField('department', value)}>
              <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white focus:border-secondary-pink focus:ring-secondary-pink">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="engineering" className="text-white hover:bg-slate-600">Engineering</SelectItem>
                <SelectItem value="marketing" className="text-white hover:bg-slate-600">Marketing</SelectItem>
                <SelectItem value="sales" className="text-white hover:bg-slate-600">Sales</SelectItem>
                <SelectItem value="hr" className="text-white hover:bg-slate-600">Human Resources</SelectItem>
                <SelectItem value="finance" className="text-white hover:bg-slate-600">Finance</SelectItem>
                <SelectItem value="operations" className="text-white hover:bg-slate-600">Operations</SelectItem>
                <SelectItem value="design" className="text-white hover:bg-slate-600">Design</SelectItem>
                <SelectItem value="other" className="text-white hover:bg-slate-600">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-slate-200 text-sm font-medium mb-3 block">
            Workplace *
          </Label>
          <RadioGroup 
            value={details.workplace} 
            onValueChange={(value) => updateField('workplace', value)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="flex items-center space-x-2 bg-slate-700 p-4 rounded-lg border border-slate-600">
              <RadioGroupItem value="on_site" id="on-site" className="border-secondary-pink text-secondary-pink" />
              <div className="flex-1">
                <Label htmlFor="on-site" className="text-white font-medium cursor-pointer">
                  On-site
                </Label>
                <p className="text-xs text-slate-400">Employees work from an office</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-slate-700 p-4 rounded-lg border border-slate-600">
              <RadioGroupItem value="hybrid" id="hybrid" className="border-secondary-pink text-secondary-pink" />
              <div className="flex-1">
                <Label htmlFor="hybrid" className="text-white font-medium cursor-pointer">
                  Hybrid
                </Label>
                <p className="text-xs text-slate-400">Employees work from both office and home</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-slate-700 p-4 rounded-lg border border-slate-600">
              <RadioGroupItem value="remote" id="remote" className="border-secondary-pink text-secondary-pink" />
              <div className="flex-1">
                <Label htmlFor="remote" className="text-white font-medium cursor-pointer">
                  Remote
                </Label>
                <p className="text-xs text-slate-400">Employee works remotely</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="office-location" className="text-slate-200 text-sm font-medium">
            Office location *
          </Label>
          <Input
            id="office-location"
            value={details.officeLocation}
            onChange={(e) => updateField('officeLocation', e.target.value)}
            placeholder="Example: New York, NY 10019, United States"
            className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-secondary-pink focus:ring-secondary-pink"
          />
          <p className="text-xs text-slate-400 mt-1">
            For best results, write a ZIP/postal code to tell candidates where the office is based and to effectively advertise this job.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
