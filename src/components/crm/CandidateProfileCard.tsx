
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Briefcase, Calendar, ExternalLink, Sparkles, Mail, Phone } from "lucide-react";

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin_profile_url: string | null;
  profile_picture_url: string | null;
  location: string | null;
  current_position: string | null;
  company: string | null;
  skills: any[] | null;
  experience_years: number | null;
  source_platform: string | null;
  last_synced_at: string | null;
  profile_completeness_score: number | null;
  created_at: string;
};

interface CandidateProfileCardProps {
  candidate: Candidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrich: () => void;
  isEnriching: boolean;
}

export const CandidateProfileCard = ({ 
  candidate, 
  open, 
  onOpenChange, 
  onEnrich, 
  isEnriching 
}: CandidateProfileCardProps) => {
  const getSourceColor = (source: string | null) => {
    switch (source) {
      case 'linkedin': return 'bg-blue-100 text-blue-800';
      case 'workable': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletenessColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {candidate.profile_picture_url && (
                <img
                  src={candidate.profile_picture_url}
                  alt={candidate.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <DialogTitle className="text-xl">{candidate.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge className={getSourceColor(candidate.source_platform)}>
                    {candidate.source_platform || 'manual'}
                  </Badge>
                  <span className={`text-sm font-medium ${getCompletenessColor(candidate.profile_completeness_score)}`}>
                    {candidate.profile_completeness_score || 0}% complete
                  </span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEnrich}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enrich Profile
                  </>
                )}
              </Button>
              {candidate.linkedin_profile_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.linkedin_profile_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.location}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Professional Information */}
          <div>
            <h3 className="font-semibold mb-3">Professional Information</h3>
            <div className="space-y-3">
              {candidate.current_position && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.current_position}</span>
                  {candidate.company && <span>at {candidate.company}</span>}
                </div>
              )}
              {candidate.experience_years && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.experience_years} years of experience</span>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, index) => (
                    <Badge key={index} variant="outline">
                      {typeof skill === 'string' ? skill : skill.name || skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Added: {new Date(candidate.created_at).toLocaleDateString()}</div>
            {candidate.last_synced_at && (
              <div>Last synced: {new Date(candidate.last_synced_at).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
