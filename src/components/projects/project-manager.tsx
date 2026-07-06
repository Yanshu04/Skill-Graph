'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderCode,
  Plus,
  Pencil,
  Trash2,
  Github,
  ExternalLink,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectSkill {
  skill: { id: string; name: string };
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string;
  complexity: string;
  difficulty: number;
  githubUrl: string | null;
  liveUrl: string | null;
  skills: ProjectSkill[];
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

type FormData = {
  name: string;
  description: string;
  technologies: string;
  complexity: string;
  difficulty: number;
  githubUrl: string;
  liveUrl: string;
  skillIds: string[];
};

const emptyForm: FormData = {
  name: '',
  description: '',
  technologies: '',
  complexity: 'low',
  difficulty: 5,
  githubUrl: '',
  liveUrl: '',
  skillIds: [],
};

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

function complexityBadgeClass(complexity: string) {
  switch (complexity) {
    case 'low':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'medium':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'high':
    case 'expert':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function difficultyColor(val: number) {
  if (val <= 3) return 'text-emerald-400';
  if (val <= 6) return 'text-amber-400';
  return 'text-rose-400';
}

function parseTechnologies(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchAll() {
      try {
        const [projRes, skillRes] = await Promise.allSettled([
          fetch('/api/projects'),
          fetch('/api/skills'),
        ]);
        if (projRes.status === 'fulfilled') {
          const data = await projRes.value.json();
          setProjects(Array.isArray(data) ? data : []);
        }
        if (skillRes.status === 'fulfilled') {
          const data = await skillRes.value.json();
          setSkills(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      technologies: parseTechnologies(p.technologies).join(', '),
      complexity: p.complexity,
      difficulty: p.difficulty,
      githubUrl: p.githubUrl ?? '',
      liveUrl: p.liveUrl ?? '',
      skillIds: p.skills.map((ps) => ps.skill.id),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setSaving(true);
    const techList = form.technologies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      technologies: techList,
      complexity: form.complexity,
      difficulty: form.difficulty,
      githubUrl: form.githubUrl.trim() || null,
      liveUrl: form.liveUrl.trim() || null,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      skillIds: form.skillIds,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Project updated');
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Create failed');
        toast.success('Project created');
      }

      // Refresh
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);

      setDialogOpen(false);
    } catch {
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSkill = (skillId: string) => {
    setForm((prev) => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter((id) => id !== skillId)
        : [...prev.skillIds, skillId],
    }));
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
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
          <FolderCode className="size-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold">Projects</h2>
            <p className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
        </div>
        <Button
          onClick={openNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" />
          Add Project
        </Button>
      </motion.div>

      {/* ── Project Grid ────────────────────────────────────────────────────── */}
      {projects.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <FolderOpen className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            No projects yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Start tracking your projects to showcase your skills and experience
          </p>
          <Button
            onClick={openNew}
            variant="outline"
            className="mt-4 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Plus className="size-4" />
            Add your first project
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {projects.map((project) => {
              const techs = parseTechnologies(project.technologies);
              return (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card-hover bg-card border border-border rounded-xl p-5 flex flex-col gap-4"
                >
                  {/* Title + links */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Github className="size-4" />
                        </a>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Tech badges */}
                  {techs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {techs.slice(0, 6).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px] text-emerald-400 border-emerald-500/30"
                        >
                          {t}
                        </Badge>
                      ))}
                      {techs.length > 6 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          +{techs.length - 6}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Complexity + Difficulty */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          complexityBadgeClass(project.complexity)
                        )}
                      >
                        {project.complexity}
                      </Badge>
                      <span className={cn('font-medium', difficultyColor(project.difficulty))}>
                        {project.difficulty}/10
                      </span>
                    </div>
                    <Progress
                      value={project.difficulty * 10}
                      className="h-1.5"
                    />
                  </div>

                  {/* Skills */}
                  {project.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.skills.slice(0, 4).map((ps) => (
                        <Badge
                          key={ps.skill.id}
                          variant="secondary"
                          className="text-[10px] bg-muted"
                        >
                          {ps.skill.name}
                        </Badge>
                      ))}
                      {project.skills.length > 4 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-muted"
                        >
                          +{project.skills.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(project)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-rose-400"
                      disabled={deletingId === project.id}
                      onClick={() => handleDelete(project.id)}
                    >
                      {deletingId === project.id ? (
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

      {/* ── Add/Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Project' : 'Add Project'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the project details below'
                : 'Add a new project to your portfolio'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Name *</Label>
              <Input
                id="proj-name"
                placeholder="My Awesome Project"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-desc">Description</Label>
              <Textarea
                id="proj-desc"
                placeholder="Brief project description..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-tech">Technologies (comma-separated)</Label>
              <Input
                id="proj-tech"
                placeholder="React, TypeScript, Node.js, PostgreSQL"
                value={form.technologies}
                onChange={(e) => setForm((f) => ({ ...f, technologies: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Complexity</Label>
                <Select
                  value={form.complexity}
                  onValueChange={(v) => setForm((f) => ({ ...f, complexity: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty: {form.difficulty}/10</Label>
                <Slider
                  value={[form.difficulty]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([v]) => setForm((f) => ({ ...f, difficulty: v }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-github">GitHub URL</Label>
              <Input
                id="proj-github"
                placeholder="https://github.com/..."
                value={form.githubUrl}
                onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-live">Live URL</Label>
              <Input
                id="proj-live"
                placeholder="https://..."
                value={form.liveUrl}
                onChange={(e) => setForm((f) => ({ ...f, liveUrl: e.target.value }))}
              />
            </div>

            {/* Skills Multi-Select */}
            {skills.length > 0 && (
              <div className="space-y-3">
                <Label>Related Skills</Label>
                <ScrollArea className="max-h-48 rounded-md border border-border p-3">
                  <div className="space-y-2">
                    {skills.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={form.skillIds.includes(skill.id)}
                          onCheckedChange={() => toggleSkill(skill.id)}
                        />
                        <span className="text-muted-foreground">
                          {skill.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground ml-auto"
                        >
                          {skill.category}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}