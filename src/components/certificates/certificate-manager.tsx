'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Plus,
  Trash2,
  Loader2,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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

interface Certificate {
  id: string;
  title: string;
  issuingOrg: string;
  completionDate: string;
  skills: string;
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

function parseSkills(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatCertDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CertificateManager() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    issuingOrg: '',
    completionDate: '',
    skills: '',
  });

  // Fetch data
  useEffect(() => {
    async function fetchCertificates() {
      try {
        const res = await fetch('/api/certificates');
        if (res.ok) {
          const data = await res.json();
          setCertificates(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchCertificates();
  }, []);

  const resetForm = () => {
    setForm({ title: '', issuingOrg: '', completionDate: '', skills: '' });
  };

  const handleAdd = async () => {
    if (!form.title.trim()) {
      toast.error('Certificate title is required');
      return;
    }
    if (!form.issuingOrg.trim()) {
      toast.error('Issuing organization is required');
      return;
    }
    if (!form.completionDate) {
      toast.error('Completion date is required');
      return;
    }

    setSaving(true);

    const skillsList = form.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          issuingOrg: form.issuingOrg.trim(),
          completionDate: form.completionDate,
          skills: skillsList,
        }),
      });

      if (!res.ok) throw new Error('Create failed');

      // Refresh
      const listRes = await fetch('/api/certificates');
      const data = await listRes.json();
      setCertificates(Array.isArray(data) ? data : []);

      setDialogOpen(false);
      resetForm();
      toast.success('Certificate added');
    } catch {
      toast.error('Failed to add certificate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch('/api/certificates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setCertificates((prev) => prev.filter((c) => c.id !== id));
      toast.success('Certificate deleted');
    } catch {
      toast.error('Failed to delete certificate');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
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
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Award className="size-6 text-amber-400" />
          <div>
            <h2 className="text-xl font-bold">Certificates</h2>
            <p className="text-sm text-muted-foreground">
              {certificates.length} certificate
              {certificates.length !== 1 ? 's' : ''} earned
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" />
          Add Certificate
        </Button>
      </motion.div>

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {certificates.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <GraduationCap className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            No certificates yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add your certifications and courses to build a verified skill
            profile
          </p>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            variant="outline"
            className="mt-4 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Plus className="size-4" />
            Add your first certificate
          </Button>
        </motion.div>
      ) : (
        /* ── Certificate Grid ──────────────────────────────────────────────── */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {certificates.map((cert) => {
              const skills = parseSkills(cert.skills);
              return (
                <motion.div
                  key={cert.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card-hover bg-card border border-border rounded-xl p-5 flex flex-col gap-4"
                >
                  {/* Icon + Title */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                      <Award className="size-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight">
                        {cert.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cert.issuingOrg}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>Completed {formatCertDate(cert.completionDate)}</span>
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[10px] text-amber-400 border-amber-500/30"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Delete */}
                  <div className="flex justify-end pt-1 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-rose-400"
                      disabled={deletingId === cert.id}
                      onClick={() => handleDelete(cert.id)}
                    >
                      {deletingId === cert.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Delete
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Add Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Certificate</DialogTitle>
            <DialogDescription>
              Add a new certification or course completion
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cert-title">Certificate Title *</Label>
              <Input
                id="cert-title"
                placeholder="AWS Solutions Architect"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-org">Issuing Organization *</Label>
              <Input
                id="cert-org"
                placeholder="Amazon Web Services"
                value={form.issuingOrg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issuingOrg: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-date">Completion Date *</Label>
              <Input
                id="cert-date"
                type="date"
                value={form.completionDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, completionDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-skills">
                Skills Covered (comma-separated)
              </Label>
              <Input
                id="cert-skills"
                placeholder="Cloud Architecture, Lambda, S3, IAM"
                value={form.skills}
                onChange={(e) =>
                  setForm((f) => ({ ...f, skills: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                saving ||
                !form.title.trim() ||
                !form.issuingOrg.trim() ||
                !form.completionDate
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Add Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}