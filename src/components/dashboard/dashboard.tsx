'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import {
  Brain,
  FolderCode,
  Award,
  Briefcase,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  verification: string;
  confidence: number;
  lastSeen: string;
  parentRelations?: unknown[];
  childRelations?: unknown[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string;
  complexity: string;
  difficulty: string;
  githubUrl: string | null;
  skills: unknown[];
}

interface Certificate {
  id: string;
  [key: string]: unknown;
}

interface Experience {
  id: string;
  [key: string]: unknown;
}

interface LearningEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  [key: string]: unknown;
}

interface CareerTarget {
  id: string;
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Frontend': '#10b981',
  'Backend': '#f59e0b',
  'DevOps': '#8b5cf6',
  'Database': '#ec4899',
  'Language': '#06b6d4',
  'Framework': '#f97316',
  'Tool': '#14b8a6',
  'Soft Skill': '#a78bfa',
  'Design': '#fb7185',
  'Testing': '#38bdf8',
  'Security': '#fbbf24',
  'AI/ML': '#c084fc',
};

const FALLBACK_CATEGORY_COLOR = '#6b7280';

const DONUT_COLORS = [
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#a78bfa',
  '#fb7185',
  '#38bdf8',
  '#fbbf24',
  '#c084fc',
];

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Skill Score skeleton - hero */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center col-span-1 md:col-span-2 lg:col-span-1 lg:row-span-2">
        <Skeleton className="h-48 w-48 rounded-full" />
        <Skeleton className="mt-4 h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Career Readiness skeleton */}
      <div className="bg-card border border-border rounded-xl p-6">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-2 w-full rounded-full mb-3" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* AI Insight skeleton */}
      <div className="bg-card border border-border rounded-xl p-6">
        <Skeleton className="h-5 w-28 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Quick Stats skeleton - 4 cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
        </div>
      ))}

      {/* Skills Overview skeleton */}
      <div className="bg-card border border-border rounded-xl p-6 md:col-span-2">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>

      {/* Skills by Category skeleton */}
      <div className="bg-card border border-border rounded-xl p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[200px] w-full rounded-full" />
      </div>

      {/* Recent Activity skeleton */}
      <div className="bg-card border border-border rounded-xl p-6 md:col-span-2 lg:col-span-1">
        <Skeleton className="h-5 w-36 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full max-w-[200px] mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Verification Breakdown skeleton */}
      <div className="bg-card border border-border rounded-xl p-6 md:col-span-2 lg:col-span-2">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-6 w-full rounded-full mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

// ─── Widget 1: Overall Skill Score (Hero) ───────────────────────────────────

function OverallSkillScore({ skills }: { skills: Skill[] }) {
  const avgProficiency = useMemo(() => {
    if (skills.length === 0) return 0;
    return Math.round(skills.reduce((sum, s) => sum + s.proficiency, 0) / skills.length);
  }, [skills]);

  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (avgProficiency / 100) * circumference;

  return (
    <motion.div
      variants={itemVariants}
      className="glass rounded-xl p-6 flex flex-col items-center justify-center col-span-1 md:col-span-2 lg:col-span-1 lg:row-span-2 min-h-[320px]"
    >
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          <defs>
            <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Progress ring */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="url(#emeraldGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-5xl font-bold text-emerald-400 tabular-nums">
            {avgProficiency}
          </span>
          <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            out of 100
          </span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mt-4">Overall Skill Score</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Average across {skills.length} skill{skills.length !== 1 ? 's' : ''}
      </p>
    </motion.div>
  );
}

// ─── Widget 2: Career Readiness ─────────────────────────────────────────────

function CareerReadiness({
  skills,
  projects,
  certificates,
}: {
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
}) {
  const { score, label, description } = useMemo(() => {
    const s = skills.length;
    const p = projects.length;
    const c = certificates.length;
    const raw =
      Math.min(s * 2, 40) +
      Math.min(p * 10, 30) +
      Math.min(c * 10, 20) +
      (s > 0 ? Math.min(Math.round(skills.filter((sk) => sk.verification === 'verified').length / s * 10), 10) : 0);

    const score = Math.min(raw, 100);

    if (score < 20) return { score, label: 'Getting Started', description: 'Add more skills and projects to build your profile' };
    if (score < 40) return { score, label: 'Building Foundation', description: 'Good start! Keep adding skills and earn certificates' };
    if (score < 60) return { score, label: 'Growing Strong', description: 'Solid progress! Focus on skill verification' };
    if (score < 80) return { score, label: 'Career Ready', description: 'Impressive portfolio! Fine-tune your skills' };
    return { score, label: 'Expert Level', description: 'Outstanding profile! You are industry-ready' };
  }, [skills, projects, certificates]);

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Career Readiness</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-amber-400 tabular-nums">{score}%</span>
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25">
            {label}
          </Badge>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Widget 3: Skills Overview (Bar Chart) ──────────────────────────────────

const skillsChartConfig = {
  proficiency: {
    label: 'Proficiency',
    color: '#10b981',
  },
} satisfies ChartConfig;

function SkillsOverview({ skills }: { skills: Skill[] }) {
  const chartData = useMemo(() => {
    return [...skills]
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 8)
      .map((s) => ({
        name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name,
        fullName: s.name,
        proficiency: s.proficiency,
        fill: CATEGORY_COLORS[s.category] || FALLBACK_CATEGORY_COLOR,
        category: s.category,
      }));
  }, [skills]);

  if (chartData.length === 0) {
    return (
      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover md:col-span-2">
        <h3 className="text-sm font-semibold text-foreground mb-4">Skills Overview</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No skills data yet
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover md:col-span-2">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Skills by Proficiency</h3>
      <ChartContainer config={skillsChartConfig} className="h-[200px] w-full">
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
          <YAxis
            dataKey="name"
            type="category"
            width={90}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.payload.fill }} />
                    <span className="text-muted-foreground">{item.payload.fullName}</span>
                    <span className="text-foreground font-mono font-medium tabular-nums">{value}%</span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="proficiency" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </motion.div>
  );
}

// ─── Widget 4: Recent Activity ──────────────────────────────────────────────

function getActivityIcon(type: string) {
  switch (type) {
    case 'skill_added':
      return <PlusCircle className="h-4 w-4 text-emerald-400" />;
    case 'project_completed':
      return <CheckCircle2 className="h-4 w-4 text-cyan-400" />;
    case 'certification_earned':
      return <GraduationCap className="h-4 w-4 text-amber-400" />;
    case 'career_growth':
      return <TrendingUp className="h-4 w-4 text-purple-400" />;
    default:
      return <Sparkles className="h-4 w-4 text-pink-400" />;
  }
}

function getActivityBgColor(type: string) {
  switch (type) {
    case 'skill_added':
      return 'bg-emerald-500/10';
    case 'project_completed':
      return 'bg-cyan-500/10';
    case 'certification_earned':
      return 'bg-amber-500/10';
    case 'career_growth':
      return 'bg-purple-500/10';
    default:
      return 'bg-pink-500/10';
  }
}

function RecentActivity({ events }: { events: LearningEvent[] }) {
  if (events.length === 0) {
    return (
      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No recent activity
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
      <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {events.slice(0, 5).map((event) => {
          let relativeTime = '';
          try {
            relativeTime = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });
          } catch {
            relativeTime = 'recently';
          }

          return (
            <div key={event.id} className="flex items-center gap-3 group">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors', getActivityBgColor(event.type))}>
                {getActivityIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate group-hover:text-emerald-400 transition-colors">
                  {event.title}
                </p>
                <p className="text-xs text-muted-foreground">{relativeTime}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Widget 5: Skills by Category (Donut) ───────────────────────────────────

const categoryChartConfig: ChartConfig = {
  count: { label: 'Skills' },
};

const MAX_SLICES = 7; // show top N categories; the rest become "Other"

function SkillsByCategory({ skills }: { skills: Skill[] }) {
  const { chartData, totalSkills } = useMemo(() => {
    const catMap = new Map<string, number>();
    skills.forEach((s) => {
      catMap.set(s.category, (catMap.get(s.category) || 0) + 1);
    });

    const sorted = Array.from(catMap.entries())
      .map(([category, count], idx) => ({
        category,
        count,
        fill: CATEGORY_COLORS[category] || DONUT_COLORS[idx % DONUT_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);

    // Group tail categories into "Other"
    if (sorted.length > MAX_SLICES) {
      const top = sorted.slice(0, MAX_SLICES);
      const otherCount = sorted.slice(MAX_SLICES).reduce((sum, d) => sum + d.count, 0);
      top.push({ category: 'Other', count: otherCount, fill: FALLBACK_CATEGORY_COLOR });
      return { chartData: top, totalSkills: skills.length };
    }

    return { chartData: sorted, totalSkills: skills.length };
  }, [skills]);

  const dynamicConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    chartData.forEach((d) => {
      cfg[d.category] = { label: d.category, color: d.fill };
    });
    return cfg;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
        <h3 className="text-sm font-semibold text-foreground mb-4">Skills by Category</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No skills data yet
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
      <h3 className="text-sm font-semibold text-foreground mb-4">Skills by Category</h3>
      <div className="flex flex-col gap-4">
        {/* Donut chart */}
        <ChartContainer config={dynamicConfig} className="h-[160px] w-full">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="category" hideLabel={false} />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Custom compact legend — wraps into rows, never overflows */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
          {chartData.map((entry) => (
            <div key={entry.category} className="flex items-center gap-1.5 min-w-0">
              <span
                className="flex-shrink-0 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {entry.category}
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {entry.count}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <p className="text-center text-xs text-muted-foreground">
          {totalSkills} skill{totalSkills !== 1 ? 's' : ''} across {chartData.length} categor{chartData.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Widget 6: Quick Stats ──────────────────────────────────────────────────

const statItems = [
  { key: 'skills', label: 'Total Skills', icon: Brain, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'projects', label: 'Projects', icon: FolderCode, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'certificates', label: 'Certificates', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'experiences', label: 'Experiences', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10' },
] as const;

function QuickStats({
  skills,
  projects,
  certificates,
  experiences,
}: {
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
  experiences: Experience[];
}) {
  const counts = {
    skills: skills.length,
    projects: projects.length,
    certificates: certificates.length,
    experiences: experiences.length,
  };

  return (
    <>
      {statItems.map((stat) => {
        const Icon = stat.icon;
        return (
          <motion.div key={stat.key} variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', stat.bg)}>
                <Icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className={cn('text-2xl font-bold tabular-nums', stat.color)}>{counts[stat.key]}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}

// ─── Widget 7: AI Insight ───────────────────────────────────────────────────

function generateInsight(
  skills: Skill[],
  projects: Project[],
  certificates: Certificate[]
): string {
  if (skills.length === 0) {
    return "Start by adding your first skill to build your career intelligence profile. Every skill you track helps paint a clearer picture of your strengths.";
  }

  const categories = new Set(skills.map((s) => s.category));
  const verifiedCount = skills.filter((s) => s.verification === 'verified').length;
  const avgProficiency = Math.round(skills.reduce((s, sk) => s + sk.proficiency, 0) / skills.length);

  // Check for skills without verification
  if (verifiedCount === 0 && skills.length > 3) {
    return `You have ${skills.length} skills tracked but none are verified. Consider getting certifications or building projects to validate your expertise — verified skills carry more weight with employers.`;
  }

  // Check for category imbalances
  const categoryCounts = skills.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  const dominant = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  if (dominant.length >= 1 && categories.size <= 2 && skills.length > 5) {
    return `Your skills are concentrated in ${categories.size} categor${categories.size === 1 ? 'y' : 'ies'} (${dominant[0][0]}). Diversifying across more categories can make you a more well-rounded professional.`;
  }

  // Check for low proficiency skills
  const lowProfSkills = skills.filter((s) => s.proficiency < 40);
  if (lowProfSkills.length > 3) {
    return `You have ${lowProfSkills.length} skills below 40% proficiency. Focus on deepening your expertise in these areas rather than adding new skills — depth often beats breadth.`;
  }

  // Check for project-to-skill ratio
  if (skills.length > 5 && projects.length < 2) {
    return `You've tracked ${skills.length} skills but only have ${projects.length} project${projects.length === 1 ? '' : 's'}. Building real projects is the best way to demonstrate your skills to potential employers.`;
  }

  // Check for certificates
  if (skills.length > 8 && certificates.length === 0) {
    return `With ${skills.length} skills in your profile, formal certifications could significantly boost your credibility. Consider earning certificates in your strongest areas.`;
  }

  // Positive feedback
  if (avgProficiency > 70 && verifiedCount > 2) {
    return `Impressive! Your average proficiency is ${avgProficiency}% with ${verifiedCount} verified skills. You're building a strong, validated skill set. Keep pushing toward expert-level mastery.`;
  }

  return `You're tracking ${skills.length} skills across ${categories.size} categor${categories.size === 1 ? 'y' : 'ies'}. ${projects.length > 0 ? `With ${projects.length} project${projects.length === 1 ? '' : 's'} completed, ` : ''}you're building a solid professional profile. Consistency is key!`;
}

function AIInsight({
  skills,
  projects,
  certificates,
}: {
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
}) {
  const insight = useMemo(
    () => generateInsight(skills, projects, certificates),
    [skills, projects, certificates]
  );

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <h3 className="text-sm font-semibold text-foreground">AI Insight</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
    </motion.div>
  );
}

// ─── Widget 8: Verification Breakdown ───────────────────────────────────────

function VerificationBreakdown({ skills }: { skills: Skill[] }) {
  const breakdown = useMemo(() => {
    const verified = skills.filter((s) => s.verification === 'verified').length;
    const partial = skills.filter((s) => s.verification === 'partially_verified').length;
    const self = skills.filter((s) => s.verification === 'self_reported').length;
    const total = skills.length;
    return { verified, partial, self, total };
  }, [skills]);

  if (breakdown.total === 0) {
    return (
      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-foreground">Verification Breakdown</h3>
        </div>
        <p className="text-sm text-muted-foreground">No skills to display</p>
      </motion.div>
    );
  }

  const verifiedPct = Math.round((breakdown.verified / breakdown.total) * 100);
  const partialPct = Math.round((breakdown.partial / breakdown.total) * 100);
  const selfPct = 100 - verifiedPct - partialPct;

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 card-hover">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
        <h3 className="text-sm font-semibold text-foreground">Verification Breakdown</h3>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/50 mb-3">
        {breakdown.verified > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-700"
            style={{ width: `${verifiedPct}%` }}
          />
        )}
        {breakdown.partial > 0 && (
          <div
            className="bg-amber-500 transition-all duration-700"
            style={{ width: `${partialPct}%` }}
          />
        )}
        {breakdown.self > 0 && (
          <div
            className="bg-muted-foreground/40 transition-all duration-700"
            style={{ width: `${selfPct}%` }}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-muted-foreground">
            Verified <span className="text-foreground font-medium tabular-nums">{breakdown.verified}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-muted-foreground">
            Partial <span className="text-foreground font-medium tabular-nums">{breakdown.partial}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Self-reported <span className="text-foreground font-medium tabular-nums">{breakdown.self}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([]);
  const [careerTargets, setCareerTargets] = useState<CareerTarget[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const endpoints = [
          { url: '/api/skills', setter: setSkills as (d: unknown[]) => void },
          { url: '/api/projects', setter: setProjects as (d: unknown[]) => void },
          { url: '/api/certificates', setter: setCertificates as (d: unknown[]) => void },
          { url: '/api/experiences', setter: setExperiences as (d: unknown[]) => void },
          { url: '/api/learning-events', setter: setLearningEvents as (d: unknown[]) => void },
          { url: '/api/career-targets', setter: setCareerTargets as (d: unknown[]) => void },
        ];

        await Promise.allSettled(
          endpoints.map(async ({ url, setter }) => {
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setter(Array.isArray(data) ? data : []);
            }
          })
        );
      } catch {
        // Silently handle errors — widgets will show empty states
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your career intelligence at a glance
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Hero: Overall Skill Score */}
        <OverallSkillScore skills={skills} />

        {/* Career Readiness */}
        <CareerReadiness skills={skills} projects={projects} certificates={certificates} />

        {/* AI Insight */}
        <AIInsight skills={skills} projects={projects} certificates={certificates} />

        {/* Quick Stats */}
        <QuickStats
          skills={skills}
          projects={projects}
          certificates={certificates}
          experiences={experiences}
        />

        {/* Skills Overview (Bar Chart) */}
        <SkillsOverview skills={skills} />

        {/* Skills by Category (Donut) */}
        <SkillsByCategory skills={skills} />

        {/* Recent Activity */}
        <RecentActivity events={learningEvents} />

        {/* Verification Breakdown */}
        <VerificationBreakdown skills={skills} />
      </div>
    </motion.div>
  );
}