'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkillGraph } from './skill-graph';
import {
  Plus,
  Search,
  List,
  GitBranch,
  Pencil,
  Trash2,
  Filter,
  LayoutGrid,
  X,
  Loader2,
  BrainCircuit,
  Sparkles,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  verification: string;
  confidence: number;
  lastSeen?: string;
  parentRelations?: { toSkill: { id: string; name: string } }[];
  childRelations?: { fromSkill: { id: string; name: string } }[];
}

const CATEGORIES = [
  'Language',
  'Framework',
  'Tool',
  'Database',
  'Cloud',
  'DevOps',
  'Domain',
  'Soft Skill',
  'Other',
];

const VERIFICATIONS = ['self_reported', 'partially_verified', 'verified'];

const RELATION_TYPES = [
  { value: 'uses', label: 'Uses' },
  { value: 'built_with', label: 'Built With' },
  { value: 'learned_from', label: 'Learned From' },
  { value: 'required_by', label: 'Required By' },
  { value: 'related_to', label: 'Related To' },
];

// ── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

// ── Verification Badge Config ────────────────────────────────────────────────

function getVerificationConfig(verification: string) {
  switch (verification) {
    case 'verified':
      return {
        label: 'Verified',
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      };
    case 'partially_verified':
      return {
        label: 'Partial',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    default:
      return {
        label: 'Self Reported',
        className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      };
  }
}

// ── Skeleton Loading ─────────────────────────────────────────────────────────

function SkillsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-3/4" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <BrainCircuit className="size-10 text-emerald-400" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No Skills Added Yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-[300px] mb-6">
        Start building your skill graph by adding your first skill. Track
        proficiency, verification, and relationships.
      </p>
      <Button
        onClick={onAdd}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
      >
        <Plus className="size-4" />
        Add Your First Skill
      </Button>
    </motion.div>
  );
}

// ── Skill Card ───────────────────────────────────────────────────────────────

function SkillCard({
  skill,
  onEdit,
  onDelete,
}: {
  skill: Skill;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
}) {
  const vConfig = getVerificationConfig(skill.verification);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card border border-border rounded-xl p-5 hover:border-emerald-500/30 transition-colors duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {skill.name}
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] shrink-0 border-border text-muted-foreground"
          >
            {skill.category}
          </Badge>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(skill)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{skill.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this skill and all its
                  relationships. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => onDelete(skill)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Proficiency */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Proficiency</span>
          <span className="text-xs font-medium text-emerald-400 tabular-nums">
            {skill.proficiency}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${skill.proficiency}%` }}
          />
        </div>
      </div>

      {/* Verification + Confidence */}
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className={`text-[10px] ${vConfig.className}`}
        >
          {vConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Confidence: <span className="text-foreground font-medium tabular-nums">{Math.round(skill.confidence * 100)}%</span>
        </span>
      </div>

      {/* Relations count */}
      {(skill.parentRelations?.length || 0) + (skill.childRelations?.length || 0) > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {skill.parentRelations && skill.parentRelations.length > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch className="size-3" />
                {skill.parentRelations.length} dep{skill.parentRelations.length > 1 ? 's' : ''}
              </span>
            )}
            {skill.childRelations && skill.childRelations.length > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="size-3" />
                {skill.childRelations.length} used by
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Add/Edit Dialog ──────────────────────────────────────────────────────────

function SkillDialog({
  open,
  onOpenChange,
  editSkill,
  allSkills,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSkill: Skill | null;
  allSkills: Skill[];
}) {
  const isEditing = !!editSkill;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [proficiency, setProficiency] = useState<number[]>([50]);
  const [verification, setVerification] = useState<string>('self_reported');
  const [confidence, setConfidence] = useState<number[]>([0.7]);
  const [parentId, setParentId] = useState<string>('none');
  const [relationType, setRelationType] = useState<string>('uses');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editSkill) {
        setName(editSkill.name);
        setCategory(editSkill.category);
        setProficiency([editSkill.proficiency]);
        setVerification(editSkill.verification);
        setConfidence([editSkill.confidence]);
      } else {
        setName('');
        setCategory('');
        setProficiency([50]);
        setVerification('self_reported');
        setConfidence([0.7]);
      }
      setParentId('none');
      setRelationType('uses');
      setSubmitting(false);
    }
  }, [open, editSkill]);

  const handleSubmit = async () => {
    if (!name.trim() || !category) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        category,
        proficiency: proficiency[0],
        verification,
        confidence: confidence[0],
      };

      if (!isEditing) {
        if (parentId && parentId !== 'none') {
          body.parentId = parentId;
          body.relationType = relationType;
        }
        await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`/api/skills/${editSkill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      onOpenChange(false);
      // Trigger re-fetch via custom event
      window.dispatchEvent(new CustomEvent('skills-changed'));
    } catch {
      // silent error
    } finally {
      setSubmitting(false);
    }
  };

  const availableParents = allSkills.filter(
    (s) => !editSkill || s.id !== editSkill.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Skill' : 'Add New Skill'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the skill details below.'
              : 'Add a new skill to your skill graph.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="skill-name">Skill Name</Label>
            <Input
              id="skill-name"
              placeholder="e.g., TypeScript, React, PostgreSQL"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proficiency */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Proficiency</Label>
              <span className="text-sm font-medium text-emerald-400 tabular-nums">
                {proficiency[0]}%
              </span>
            </div>
            <Slider
              value={proficiency}
              onValueChange={setProficiency}
              min={0}
              max={100}
              step={5}
              className="w-full [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
            />
          </div>

          {/* Verification */}
          <div className="space-y-2">
            <Label>Verification</Label>
            <Select value={verification} onValueChange={setVerification}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self_reported">Self Reported</SelectItem>
                <SelectItem value="partially_verified">Partially Verified</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Confidence</Label>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {Math.round(confidence[0] * 100)}%
              </span>
            </div>
            <Slider
              value={confidence}
              onValueChange={setConfidence}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>

          {/* Related Skill (only for Add) */}
          {!isEditing && availableParents.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="size-4 text-muted-foreground" />
                  <Label className="text-sm">Relationship (Optional)</Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Related Skill</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a parent skill" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableParents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {parentId && parentId !== 'none' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Relation Type
                    </Label>
                    <Select value={relationType} onValueChange={setRelationType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_TYPES.map((rt) => (
                          <SelectItem key={rt.value} value={rt.value}>
                            {rt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !category || submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[100px]"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEditing ? (
              'Save Changes'
            ) : (
              <>
                <Plus className="size-4" />
                Add Skill
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main SkillManager Component ──────────────────────────────────────────────

export function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch {
      // silent error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Listen for custom re-fetch event
  useEffect(() => {
    const handler = () => fetchSkills();
    window.addEventListener('skills-changed', handler);
    return () => window.removeEventListener('skills-changed', handler);
  }, [fetchSkills]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' || s.category === categoryFilter;

      const matchesVerification =
        verificationFilter === 'all' || s.verification === verificationFilter;

      return matchesSearch && matchesCategory && matchesVerification;
    });
  }, [skills, search, categoryFilter, verificationFilter]);

  const handleDelete = async (skill: Skill) => {
    try {
      await fetch(`/api/skills/${skill.id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('skills-changed'));
    } catch {
      // silent error
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditSkill(skill);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditSkill(null);
    setDialogOpen(true);
  };

  const activeFilters =
    categoryFilter !== 'all' || verificationFilter !== 'all' || search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BrainCircuit className="size-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Skills</h2>
              <Badge
                variant="outline"
                className="text-xs border-emerald-500/30 text-emerald-400"
              >
                {skills.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage and visualize your skill graph
            </p>
          </div>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto"
        >
          <Plus className="size-4" />
          Add Skill
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="list" className="gap-1.5">
            <List className="size-3.5" />
            List
          </TabsTrigger>
          <TabsTrigger value="graph" className="gap-1.5">
            <GitBranch className="size-3.5" />
            Graph
          </TabsTrigger>
        </TabsList>

        {/* ── List View ── */}
        <TabsContent value="list" className="mt-6">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <Filter className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={verificationFilter}
                onValueChange={setVerificationFilter}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verifications</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="partially_verified">
                    Partially Verified
                  </SelectItem>
                  <SelectItem value="self_reported">Self Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear filters indicator */}
          {activeFilters && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">
                Showing {filteredSkills.length} of {skills.length} skills
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('all');
                  setVerificationFilter('all');
                }}
              >
                <X className="size-3" />
                Clear filters
              </Button>
            </div>
          )}

          {/* Skills Grid */}
          {loading ? (
            <SkillsLoadingSkeleton />
          ) : filteredSkills.length === 0 ? (
            <EmptyState onAdd={handleAdd} />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={search + categoryFilter + verificationFilter}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </TabsContent>

        {/* ── Graph View ── */}
        <TabsContent value="graph" className="mt-6">
          {loading ? (
            <Skeleton className="w-full h-[600px] rounded-xl" />
          ) : (
            <SkillGraph skills={skills} />
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <SkillDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditSkill(null);
        }}
        editSkill={editSkill}
        allSkills={skills}
      />
    </div>
  );
}