'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FileDown, Share2, Globe, Lock, Copy, Check, ExternalLink,
  BrainCircuit, Briefcase, Award, FolderCode, Mail, MapPin, Link as LinkIcon
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string;
  complexity: string;
  liveUrl: string | null;
  githubUrl: string | null;
}

interface Certificate {
  id: string;
  title: string;
  issuingOrg: string | null;
  completionDate: string | null;
}

interface Experience {
  id: string;
  title: string;
  company: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export function PortfolioGenerator() {
  const user = useAppStore((s) => s.user);
  
  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  // Fetch full details and privacy settings
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // Load profile settings to get isPublic
        const profileRes = await fetch('/api/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setIsPublic(profileData.isPublic !== false);
        }

        // Fetch skills, projects, certificates, experiences
        const [skillsRes, projectsRes, certsRes, expRes] = await Promise.all([
          fetch('/api/skills'),
          fetch('/api/projects'),
          fetch('/api/certificates'),
          fetch('/api/experiences'),
        ]);

        if (skillsRes.ok) setSkills(await skillsRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());
        if (certsRes.ok) setCertificates(await certsRes.json());
        if (expRes.ok) setExperiences(await expRes.json());
      } catch {
        toast.error('Failed to load portfolio details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleTogglePrivacy = async (checked: boolean) => {
    setIsPublic(checked);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: checked }),
      });
      if (!res.ok) throw new Error();
      toast.success(checked ? 'Profile is now public!' : 'Profile is now private.');
    } catch {
      setIsPublic(!checked);
      toast.error('Failed to update privacy settings');
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/${user?.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading portfolio preview...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Settings Panel (Hidden when printing) */}
      <Card className="p-6 border-border bg-card/50 backdrop-blur-sm print:hidden">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Share2 className="size-4 text-emerald-400" />
              Public Portfolio Settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Toggle visibility and generate shareable links for employers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="privacy-toggle" checked={isPublic} onCheckedChange={handleTogglePrivacy} />
              <Label htmlFor="privacy-toggle" className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                {isPublic ? (
                  <>
                    <Globe className="size-3.5 text-emerald-400" />
                    Public Profile
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5 text-muted-foreground" />
                    Private Profile
                  </>
                )}
              </Label>
            </div>

            {isPublic && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 h-8">
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" asChild className="gap-1.5 h-8">
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Visit
                  </a>
                </Button>
              </div>
            )}

            <Button onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 sm:ml-2">
              <FileDown className="size-3.5" />
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Styled Printable Preview */}
      <div className="border border-border rounded-xl overflow-hidden bg-card/30 backdrop-blur-md shadow-xl max-w-4xl mx-auto print:border-none print:shadow-none print:bg-transparent">
        
        {/* Printable page content */}
        <div className="p-8 sm:p-12 space-y-8 bg-card/10 print:p-0 print:text-black">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/50 pb-6 print:border-neutral-300">
            <div className="text-center sm:text-left space-y-2">
              <h1 className="text-3xl font-extrabold text-foreground print:text-black">
                {user?.name || "Professional Profile"}
              </h1>
              {user?.headline && (
                <p className="text-lg text-emerald-400 font-semibold print:text-emerald-700">
                  {user.headline}
                </p>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-muted-foreground print:text-neutral-600">
                {user?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {user.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {user?.email}
                </span>
                {user?.website && (
                  <span className="flex items-center gap-1">
                    <LinkIcon className="size-3.5" />
                    {user.website}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1.5 text-xs text-muted-foreground print:text-neutral-500">
              {user?.github && <span>GitHub: github.com/{user.github}</span>}
              {user?.linkedin && <span>LinkedIn: linkedin.com/in/{user.linkedin}</span>}
            </div>
          </div>

          {/* Bio */}
          {user?.bio && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider print:text-black">Professional Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed print:text-neutral-700">{user.bio}</p>
            </div>
          )}

          {/* Skills Grid */}
          {skills.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 print:text-black">
                <BrainCircuit className="size-4 text-emerald-400 print:text-neutral-700" />
                Key Expertise
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <div key={skill.id} className="border border-border/50 bg-secondary/30 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs print:border-neutral-300 print:bg-neutral-100">
                    <span className="font-semibold text-foreground print:text-black">{skill.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/20 text-emerald-400 print:border-neutral-400 print:text-neutral-700">
                      {skill.proficiency}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {experiences.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 print:text-black">
                <Briefcase className="size-4 text-sky-400 print:text-neutral-700" />
                Work History
              </h3>
              <div className="space-y-4">
                {experiences.map((exp) => (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center text-sm">
                      <span className="font-bold text-foreground print:text-black">{exp.title}</span>
                      <span className="text-xs text-muted-foreground print:text-neutral-500">
                        {new Date(exp.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                        {exp.endDate ? ` – ${new Date(exp.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}` : ' – Present'}
                      </span>
                    </div>
                    {exp.company && <p className="text-xs text-emerald-400 font-medium print:text-emerald-700">{exp.company}</p>}
                    {exp.description && <p className="text-xs text-muted-foreground leading-relaxed pt-1 print:text-neutral-600">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 print:text-black">
                <FolderCode className="size-4 text-amber-400 print:text-neutral-700" />
                Featured Projects
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((proj) => {
                  let techList: string[] = [];
                  try {
                    techList = JSON.parse(proj.technologies);
                  } catch {}

                  return (
                    <div key={proj.id} className="border border-border/50 bg-secondary/15 rounded-xl p-4 flex flex-col justify-between gap-3 print:border-neutral-300 print:bg-neutral-50">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-xs text-foreground print:text-black">{proj.name}</h4>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/30 print:border-neutral-300 print:bg-neutral-100 print:text-neutral-600">
                            {proj.complexity}
                          </span>
                        </div>
                        {proj.description && <p className="text-xs text-muted-foreground leading-relaxed print:text-neutral-600">{proj.description}</p>}
                      </div>

                      {techList.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {techList.map((tech) => (
                            <Badge key={tech} variant="outline" className="text-[9px] px-1 py-0 h-4 border-border/50 text-muted-foreground print:border-neutral-300 print:text-neutral-600">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Certificates */}
          {certificates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 print:text-black">
                <Award className="size-4 text-purple-400 print:text-neutral-700" />
                Certificates & Accreditation
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {certificates.map((cert) => (
                  <div key={cert.id} className="border border-border/50 bg-secondary/10 p-3.5 rounded-lg flex justify-between items-center text-xs print:border-neutral-300 print:bg-neutral-50">
                    <span className="font-bold text-foreground print:text-black">{cert.title}</span>
                    <span className="text-[10px] text-muted-foreground print:text-neutral-500">
                      {cert.issuingOrg || ""}
                      {cert.completionDate && ` (${new Date(cert.completionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
