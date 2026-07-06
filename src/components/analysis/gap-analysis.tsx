'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Search,
  Check,
  X,
  Loader2,
  Trash2,
  Star,
  AlertTriangle,
  BookOpen,
  Zap,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  proficiency: number;
  category: string;
}

interface CareerTarget {
  id: string;
  role: string;
  targetSkills: string;
  matchScore: number | null;
}

interface AnalysisResult {
  targetSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  strengths: string[];
  weaknesses: string[];
  suggestedLearningOrder: {
    skill: string;
    priority: 'high' | 'medium' | 'low';
    estimatedWeeks: number;
    reason: string;
  }[];
  recommendedProjects: {
    name: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    skillsNeeded: string[];
    description: string;
  }[];
  overallAssessment: string;
  readinessLevel: 'high' | 'medium' | 'low';
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

function ReadinessBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: {
      label: 'High Readiness',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    medium: {
      label: 'Medium Readiness',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    low: {
      label: 'Low Readiness',
      className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    },
  };
  const c = config[level] ?? config.low;
  return (
    <Badge variant="outline" className={cn('text-xs px-3 py-1', c.className)}>
      {c.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string }> = {
    high: { className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
    medium: { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    low: { className: 'bg-muted text-muted-foreground border-border' },
  };
  const c = config[priority] ?? config.low;
  return (
    <Badge variant="outline" className={cn('text-[10px] px-2 py-0', c.className)}>
      {priority}
    </Badge>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, { className: string }> = {
    beginner: { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    intermediate: { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    advanced: { className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  };
  const c = config[difficulty] ?? config.beginner;
  return (
    <Badge variant="outline" className={cn('text-[10px] px-2 py-0', c.className)}>
      {difficulty}
    </Badge>
  );
}

function CircularProgress({
  value,
  size = 160,
  strokeWidth = 10,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color =
    value >= 75
      ? 'text-emerald-400'
      : value >= 40
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-1000 ease-out', color)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('text-3xl font-bold', color)}>
          {Math.round(value)}%
        </span>
        <span className="text-xs text-muted-foreground">Match</span>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GapAnalysis() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [targets, setTargets] = useState<CareerTarget[]>([]);
  const [roleInput, setRoleInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('');

  // Fetch data
  useEffect(() => {
    async function fetchAll() {
      try {
        const [skillsRes, targetsRes] = await Promise.allSettled([
          fetch('/api/skills'),
          fetch('/api/career-targets'),
        ]);
        if (skillsRes.status === 'fulfilled') {
          const data = await skillsRes.value.json();
          setSkills(Array.isArray(data) ? data : []);
        }
        if (targetsRes.status === 'fulfilled') {
          const data = await targetsRes.value.json();
          setTargets(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const handleAnalyze = async () => {
    const role = roleInput.trim();
    if (!role) {
      toast.error('Please enter a target role');
      return;
    }

    setAnalyzing(true);
    setResults(null);
    setCurrentRole(role);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, skills }),
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data: AnalysisResult = await res.json();
      setResults(data);

      // Save as target
      await fetch('/api/career-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          targetSkills: data.targetSkills,
        }),
      }).then(() => {
        // refresh targets
        fetch('/api/career-targets')
          .then((r) => r.json())
          .then((d) => setTargets(Array.isArray(d) ? d : []))
          .catch(() => {});
      });

      toast.success(`Analysis complete for ${role}`);
    } catch {
      toast.error('Failed to analyze. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteTarget = async (id: string) => {
    try {
      await fetch('/api/career-targets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setTargets((prev) => prev.filter((t) => t.id !== id));
      toast.success('Target removed');
    } catch {
      toast.error('Failed to remove target');
    }
  };

  const handleLoadTarget = (target: CareerTarget) => {
    setRoleInput(target.role);
    if (target.matchScore) {
      setCurrentRole(target.role);
    }
    toast.info(`Loaded target: ${target.role}`);
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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
      {/* ── Target Role Input ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="card-hover bg-card border border-border rounded-xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="size-5 text-emerald-400" />
                <h3 className="text-lg font-semibold">Set Target Role</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter a role you&apos;re aiming for and we&apos;ll analyze your skill gaps
              </p>
              <Input
                placeholder="e.g., AI Engineer, Full Stack Developer, Data Scientist..."
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="max-w-md"
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !roleInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {analyzing ? 'Analyzing...' : 'Analyze Gap'}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* ── Saved Targets ──────────────────────────────────────────────────── */}
      {targets.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Saved Targets
          </h4>
          <div className="flex flex-wrap gap-2">
            {targets.map((t) => (
              <Card
                key={t.id}
                className="card-hover group flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2 cursor-pointer"
                onClick={() => handleLoadTarget(t)}
              >
                <Target className="size-4 text-emerald-400" />
                <span className="text-sm font-medium">{t.role}</span>
                {t.matchScore !== null && t.matchScore !== undefined && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      t.matchScore >= 75
                        ? 'text-emerald-400 border-emerald-500/30'
                        : t.matchScore >= 40
                          ? 'text-amber-400 border-amber-500/30'
                          : 'text-rose-400 border-rose-500/30'
                    )}
                  >
                    {Math.round(t.matchScore)}%
                  </Badge>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTarget(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Analysis Results ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {analyzing && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="relative">
              <Sparkles className="size-10 text-emerald-400 animate-pulse" />
            </div>
            <p className="text-muted-foreground">
              AI is analyzing your skills against &quot;{currentRole}&quot;...
            </p>
          </motion.div>
        )}

        {results && (
          <motion.div
            key="results"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            {/* Top row: Score + Readiness + Assessment */}
            <div className="grid gap-6 md:grid-cols-[auto_auto_1fr]">
              {/* Match Score */}
              <motion.div variants={itemVariants} className="flex items-center justify-center">
                <CircularProgress value={results.matchPercentage} />
              </motion.div>

              {/* Readiness */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col items-center justify-center gap-3"
              >
                <ReadinessBadge level={results.readinessLevel} />
                <div className="text-center text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="text-emerald-400 font-semibold">
                      {results.matchedSkills.length}
                    </span>{' '}
                    matched
                  </p>
                  <p>
                    <span className="text-rose-400 font-semibold">
                      {results.missingSkills.length}
                    </span>{' '}
                    missing
                  </p>
                </div>
              </motion.div>

              {/* Assessment */}
              <motion.div variants={itemVariants}>
                <Card className="card-hover bg-card border border-border rounded-xl p-6 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4 text-amber-400" />
                    <h4 className="text-sm font-semibold">Overall Assessment</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {results.overallAssessment}
                  </p>
                </Card>
              </motion.div>
            </div>

            {/* Matched & Missing Skills */}
            <div className="grid gap-6 md:grid-cols-2">
              <motion.div variants={itemVariants}>
                <Card className="card-hover bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="size-4 text-emerald-400" />
                    <h4 className="text-sm font-semibold">Matched Skills</h4>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] text-emerald-400 border-emerald-500/30"
                    >
                      {results.matchedSkills.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.matchedSkills.map((s) => (
                      <Badge
                        key={s}
                        className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                      >
                        <Check className="size-3" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="card-hover bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <X className="size-4 text-rose-400" />
                    <h4 className="text-sm font-semibold">Missing Skills</h4>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] text-rose-400 border-rose-500/30"
                    >
                      {results.missingSkills.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.missingSkills.map((s) => (
                      <Badge
                        key={s}
                        className="bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                      >
                        <X className="size-3" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 md:grid-cols-2">
              <motion.div variants={itemVariants}>
                <Card className="card-hover bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="size-4 text-amber-400" />
                    <h4 className="text-sm font-semibold">Strengths</h4>
                  </div>
                  <ul className="space-y-3">
                    {results.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 flex-shrink-0 rounded-full bg-emerald-500/15 p-1">
                          <Check className="size-3 text-emerald-400" />
                        </div>
                        <span className="text-muted-foreground">{s}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="card-hover bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="size-4 text-rose-400" />
                    <h4 className="text-sm font-semibold">Weaknesses</h4>
                  </div>
                  <ul className="space-y-3">
                    {results.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 flex-shrink-0 rounded-full bg-rose-500/15 p-1">
                          <X className="size-3 text-rose-400" />
                        </div>
                        <span className="text-muted-foreground">{w}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </div>

            <Separator className="bg-border" />

            {/* Suggested Learning Order */}
            {results.suggestedLearningOrder.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold">Suggested Learning Order</h3>
                </div>
                <div className="space-y-3">
                  {results.suggestedLearningOrder.map((item, idx) => (
                    <motion.div
                      key={item.skill}
                      variants={itemVariants}
                      className="card-hover bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {item.skill}
                              </span>
                              <PriorityBadge priority={item.priority} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:flex-shrink-0">
                          <Clock className="size-3.5" />
                          ~{item.estimatedWeeks} week
                          {item.estimatedWeeks !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommended Projects */}
            {results.recommendedProjects.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-amber-400" />
                  <h3 className="text-lg font-semibold">Recommended Projects</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {results.recommendedProjects.map((proj) => (
                    <motion.div
                      key={proj.name}
                      variants={itemVariants}
                      className="card-hover bg-card border border-border rounded-xl p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{proj.name}</h4>
                        <DifficultyBadge difficulty={proj.difficulty} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {proj.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {proj.skillsNeeded.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-[10px] text-emerald-400 border-emerald-500/30"
                          >
                            <ChevronRight className="size-2.5" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}