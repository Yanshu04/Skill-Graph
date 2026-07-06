'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Globe,
  Github,
  Linkedin,
  Twitter,
  MapPin,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  twitter: string | null;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDateRange(start: string, end: string | null): string {
  try {
    const startStr = format(parseISO(start), 'MMM yyyy');
    const endStr = end
      ? end === 'Present'
        ? 'Present'
        : format(parseISO(end), 'MMM yyyy')
      : 'Present';
    return `${startStr} – ${endStr}`;
  } catch {
    return `${start} – ${end ?? 'Present'}`;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile>({
    name: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    github: '',
    linkedin: '',
    twitter: '',
  });
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [expSaving, setExpSaving] = useState(false);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, expRes] = await Promise.allSettled([
          fetch('/api/profile'),
          fetch('/api/experiences'),
        ]);
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
          const data = await profileRes.value.json();
          setProfile({
            name: data.name ?? '',
            headline: data.headline ?? '',
            bio: data.bio ?? '',
            location: data.location ?? '',
            website: data.website ?? '',
            github: data.github ?? '',
            linkedin: data.linkedin ?? '',
            twitter: data.twitter ?? '',
          });
        }
        if (expRes.status === 'fulfilled' && expRes.value.ok) {
          const data = await expRes.value.json();
          setExperiences(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Profile field updater
  const updateField = (field: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Add experience
  const handleAddExperience = async () => {
    if (!expForm.title.trim() || !expForm.company.trim()) {
      toast.error('Title and company are required');
      return;
    }

    setExpSaving(true);
    try {
      const res = await fetch('/api/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expForm.title.trim(),
          company: expForm.company.trim(),
          startDate: expForm.startDate,
          endDate: expForm.endDate || null,
          description: expForm.description.trim(),
        }),
      });

      if (!res.ok) throw new Error('Create failed');

      // Refresh
      const listRes = await fetch('/api/experiences');
      const data = await listRes.json();
      setExperiences(Array.isArray(data) ? data : []);

      setExpDialogOpen(false);
      setExpForm({ title: '', company: '', startDate: '', endDate: '', description: '' });
      toast.success('Experience added');
    } catch {
      toast.error('Failed to add experience');
    } finally {
      setExpSaving(false);
    }
  };

  // Delete experience
  const handleDeleteExperience = async (id: string) => {
    setDeletingExpId(id);
    try {
      await fetch('/api/experiences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setExperiences((prev) => prev.filter((e) => e.id !== id));
      toast.success('Experience removed');
    } catch {
      toast.error('Failed to remove experience');
    } finally {
      setDeletingExpId(null);
    }
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: Profile Information ─────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="space-y-6">
          <Card className="bg-card border border-border rounded-xl p-6 space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 text-2xl font-bold text-emerald-400">
                {getInitials(profile.name)}
              </div>
              <p className="text-sm text-muted-foreground">Profile Picture</p>
            </div>

            <Separator className="bg-border" />

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  Name
                </Label>
                <Input
                  id="profile-name"
                  placeholder="John Doe"
                  value={profile.name ?? ''}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <Label htmlFor="profile-headline">Headline</Label>
                <Input
                  id="profile-headline"
                  placeholder="Full Stack Developer | React & Node.js"
                  value={profile.headline ?? ''}
                  onChange={(e) => updateField('headline', e.target.value)}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio ?? ''}
                  onChange={(e) => updateField('bio', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="profile-location" className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Location
                </Label>
                <Input
                  id="profile-location"
                  placeholder="San Francisco, CA"
                  value={profile.location ?? ''}
                  onChange={(e) => updateField('location', e.target.value)}
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="profile-website" className="flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  Website
                </Label>
                <Input
                  id="profile-website"
                  placeholder="https://johndoe.com"
                  value={profile.website ?? ''}
                  onChange={(e) => updateField('website', e.target.value)}
                />
              </div>

              {/* GitHub */}
              <div className="space-y-2">
                <Label htmlFor="profile-github" className="flex items-center gap-1.5">
                  <Github className="size-3.5 text-muted-foreground" />
                  GitHub
                </Label>
                <Input
                  id="profile-github"
                  placeholder="github.com/johndoe"
                  value={profile.github ?? ''}
                  onChange={(e) => updateField('github', e.target.value)}
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <Label htmlFor="profile-linkedin" className="flex items-center gap-1.5">
                  <Linkedin className="size-3.5 text-muted-foreground" />
                  LinkedIn
                </Label>
                <Input
                  id="profile-linkedin"
                  placeholder="linkedin.com/in/johndoe"
                  value={profile.linkedin ?? ''}
                  onChange={(e) => updateField('linkedin', e.target.value)}
                />
              </div>

              {/* Twitter */}
              <div className="space-y-2">
                <Label htmlFor="profile-twitter" className="flex items-center gap-1.5">
                  <Twitter className="size-3.5 text-muted-foreground" />
                  Twitter / X
                </Label>
                <Input
                  id="profile-twitter"
                  placeholder="@johndoe"
                  value={profile.twitter ?? ''}
                  onChange={(e) => updateField('twitter', e.target.value)}
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* ── Right: Experience ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="size-5 text-emerald-400" />
              <h3 className="text-lg font-semibold">Experience</h3>
              <Badge
                variant="outline"
                className="text-[10px] text-emerald-400 border-emerald-500/30"
              >
                {experiences.length}
              </Badge>
            </div>
            <Button
              onClick={() => {
                setExpForm({ title: '', company: '', startDate: '', endDate: '', description: '' });
                setExpDialogOpen(true);
              }}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>

          {/* Experience List */}
          {experiences.length === 0 ? (
            <Card className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center">
              <Briefcase className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No experience entries yet
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => {
                  setExpForm({ title: '', company: '', startDate: '', endDate: '', description: '' });
                  setExpDialogOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Add Experience
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {experiences.map((exp) => (
                  <motion.div
                    key={exp.id}
                    layout
                    exit={{ opacity: 0, x: -20 }}
                    className="card-hover bg-card border border-border rounded-xl p-5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm">{exp.title}</h4>
                        <p className="text-xs text-emerald-400 font-medium">
                          {exp.company}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400 flex-shrink-0"
                        disabled={deletingExpId === exp.id}
                        onClick={() => handleDeleteExperience(exp.id)}
                      >
                        {deletingExpId === exp.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatDateRange(exp.startDate, exp.endDate)}
                    </div>

                    {exp.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {exp.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Experience Dialog ───────────────────────────────────────────────── */}
      <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Experience</DialogTitle>
            <DialogDescription>
              Add a new work experience to your profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="exp-title">Job Title *</Label>
              <Input
                id="exp-title"
                placeholder="Senior Software Engineer"
                value={expForm.title}
                onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-company">Company *</Label>
              <Input
                id="exp-company"
                placeholder="Acme Corp"
                value={expForm.company}
                onChange={(e) => setExpForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp-start">Start Date</Label>
                <Input
                  id="exp-start"
                  type="date"
                  value={expForm.startDate}
                  onChange={(e) => setExpForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-end">End Date</Label>
                <Input
                  id="exp-end"
                  type="date"
                  value={expForm.endDate}
                  onChange={(e) => setExpForm((f) => ({ ...f, endDate: e.target.value }))}
                  placeholder="Leave empty for Present"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-desc">Description</Label>
              <Textarea
                id="exp-desc"
                placeholder="Describe your responsibilities and achievements..."
                value={expForm.description}
                onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExpDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddExperience}
              disabled={expSaving || !expForm.title.trim() || !expForm.company.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {expSaving && <Loader2 className="size-4 animate-spin" />}
              Add Experience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}