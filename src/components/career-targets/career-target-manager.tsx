'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Target, Plus, Trash2, Building2, Calendar, ChevronRight, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';

interface CareerTarget {
  id: string;
  role: string;
  company: string | null;
  deadline: string | null;
  targetSkills: string;
  matchScore: number | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function CareerTargetManager() {
  const user = useAppStore((s) => s.user);
  const setPage = useAppStore((s) => s.setPage);
  const [targets, setTargets] = useState<CareerTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ role: '', company: '', deadline: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchTargets();
  }, [user]);

  async function fetchTargets() {
    try {
      const res = await fetch('/api/career-targets');
      if (res.ok) setTargets(await res.json());
    } catch {
      toast.error('Failed to load career targets');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!form.role.trim()) return toast.error('Role is required');
    setSubmitting(true);
    try {
      const res = await fetch('/api/career-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role.trim(),
          company: form.company.trim() || null,
          deadline: form.deadline || null,
        }),
      });
      if (!res.ok) throw new Error();
      const newTarget = await res.json();
      setTargets((prev) => [newTarget, ...prev]);
      setForm({ role: '', company: '', deadline: '' });
      setShowForm(false);
      toast.success('Career target added!');
    } catch {
      toast.error('Failed to add career target');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/career-targets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setTargets((prev) => prev.filter((t) => t.id !== id));
      toast.success('Target removed');
    } catch {
      toast.error('Failed to remove target');
    }
  }

  function handleAnalyze(role: string) {
    // Navigate to gap analysis with the role pre-filled via sessionStorage
    sessionStorage.setItem('skillgraph_target_role', role);
    setPage('analysis');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading career targets...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="size-5 text-emerald-400" />
            Career Targets
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Set goals to guide your AI Coach and Gap Analysis</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showForm ? 'Cancel' : 'Add Target'}
        </Button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-emerald-500/20 bg-card/50 p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground">New Career Target</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Role *</Label>
                  <Input
                    placeholder="e.g. Senior DevOps Engineer"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company (optional)</Label>
                  <Input
                    placeholder="e.g. Google, Meta"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Target Date (optional)</Label>
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="h-9 text-sm w-full sm:w-48"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? 'Adding...' : 'Add Target'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Target List */}
      {targets.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-card/20 p-8 text-center space-y-2">
          <Target className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No career targets yet.</p>
          <p className="text-xs text-muted-foreground/70">Add a target role to get personalized gap analysis and coaching.</p>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {targets.map((target) => {
            let skills: string[] = [];
            try { skills = JSON.parse(target.targetSkills); } catch {}

            return (
              <motion.div key={target.id} variants={itemVariants}>
                <Card className="border-border bg-card/40 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 group hover:border-emerald-500/30 transition-colors">
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-foreground">{target.role}</h3>
                      {target.matchScore !== null && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${target.matchScore >= 70 ? 'text-emerald-400 border-emerald-500/30' : target.matchScore >= 40 ? 'text-amber-400 border-amber-500/30' : 'text-rose-400 border-rose-500/30'}`}
                        >
                          {Math.round(target.matchScore)}% match
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {target.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          {target.company}
                        </span>
                      )}
                      {target.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(target.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyze(target.role)}
                      className="h-8 gap-1.5 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Sparkles className="size-3" />
                      Analyze Gap
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(target.id)}
                      className="size-8 text-muted-foreground hover:text-rose-400"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
