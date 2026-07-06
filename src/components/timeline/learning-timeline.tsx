'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  FolderCode,
  Award,
  TrendingUp,
  GitBranch,
  CalendarDays,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LearningEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  metadata: Record<string, unknown> | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const eventTypeConfig: Record<
  string,
  { icon: typeof PlusCircle; color: string; bg: string; border: string; label: string }
> = {
  skill_added: {
    icon: PlusCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    label: 'Skill Added',
  },
  project_completed: {
    icon: FolderCode,
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    label: 'Project Completed',
  },
  certification_earned: {
    icon: Award,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    label: 'Certification Earned',
  },
  career_growth: {
    icon: TrendingUp,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    label: 'Career Growth',
  },
  github_milestone: {
    icon: GitBranch,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    label: 'GitHub Milestone',
  },
};

// ─── Animation Variants ─────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const },
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface GroupedEvents {
  monthKey: string;
  monthLabel: string;
  events: LearningEvent[];
}

function groupEventsByMonth(events: LearningEvent[]): GroupedEvents[] {
  const groups: Map<string, LearningEvent[]> = new Map();

  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const event of sorted) {
    try {
      const d = parseISO(event.date);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy');
      const existing = groups.get(key);
      if (existing) {
        existing.push(event);
      } else {
        groups.set(key, [event]);
      }
    } catch {
      // skip invalid dates
    }
  }

  return Array.from(groups.entries())
    .map(([monthKey, evts]) => ({
      monthKey,
      monthLabel: evts[0] ? (() => {
        try {
          return format(parseISO(evts[0].date), 'MMMM yyyy');
        } catch {
          return monthKey;
        }
      })() : monthKey,
      events: evts,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LearningTimeline() {
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/learning-events');
        if (res.ok) {
          const data = await res.json();
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const grouped = useMemo(() => {
    if (events.length <= 1) return null;
    return groupEventsByMonth(events);
  }, [events]);

  // ─── Loading Skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-8 w-56" />
        <div className="relative pl-8 md:pl-32 space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-20 flex-shrink-0" />
              <Skeleton className="h-24 w-full max-w-lg rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────────

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarDays className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No activity yet
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Your learning timeline will appear here as you add skills, complete
          projects, and earn certifications
        </p>
      </div>
    );
  }

  // ─── Render with grouping ────────────────────────────────────────────────

  const renderEventCard = (event: LearningEvent, index: number) => {
    const config = eventTypeConfig[event.type] ?? eventTypeConfig.skill_added;
    const Icon = config.icon;
    let formattedDate = '';
    try {
      formattedDate = format(parseISO(event.date), 'MMM d, yyyy');
    } catch {
      formattedDate = event.date;
    }

    return (
      <motion.div
        key={event.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        viewport={{ once: true }}
        className="relative flex gap-4 md:gap-8 group"
      >
        {/* ── Date Label (left, hidden on mobile) ─────────────────────────── */}
        <div className="hidden md:flex flex-col items-end w-24 flex-shrink-0 pt-3">
          <span className="text-sm font-medium text-muted-foreground">
            {formattedDate}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[10px] mt-1', config.border, config.color)}
          >
            {config.label}
          </Badge>
        </div>

        {/* ── Center Dot + Line ──────────────────────────────────────────── */}
        <div className="relative flex flex-col items-center flex-shrink-0">
          {/* Dot */}
          <div
            className={cn(
              'relative z-10 mt-3 flex h-10 w-10 items-center justify-center rounded-full border',
              config.bg,
              config.border
            )}
          >
            <Icon className={cn('size-4', config.color)} />
          </div>
          {/* Vertical line */}
          {index < (grouped ? events.length - 1 : events.length - 1) && (
            <div className="w-px flex-1 bg-border mt-2" />
          )}
        </div>

        {/* ── Event Card (right) ──────────────────────────────────────────── */}
        <Card className="card-hover bg-card border border-border rounded-xl p-4 flex-1 max-w-xl mb-6">
          {/* Mobile date */}
          <div className="md:hidden flex items-center gap-2 mb-2">
            <Clock className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            <Badge
              variant="outline"
              className={cn('text-[10px]', config.border, config.color)}
            >
              {config.label}
            </Badge>
          </div>

          <h4 className="font-semibold text-sm">{event.title}</h4>

          {event.description && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Metadata badges if present */}
          {event.metadata && typeof event.metadata === 'object' && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.entries(event.metadata)
                .filter(([, v]) => typeof v === 'string' && v.trim())
                .slice(0, 3)
                .map(([key, val]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={cn('text-[10px]', config.border, config.color)}
                  >
                    {String(val)}
                  </Badge>
                ))}
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Clock className="size-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold">Learning Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Track your journey and milestones
          </p>
        </div>
      </motion.div>

      {/* Timeline */}
      {grouped && grouped.length > 1 ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.monthKey}>
              {/* Month header */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 mb-4 md:ml-0"
              >
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  {group.monthLabel}
                </span>
                <div className="h-px flex-1 bg-border" />
              </motion.div>

              <div className="relative pl-8 md:pl-32">
                <div className="absolute left-4 md:left-[7.25rem] top-0 bottom-0 w-px bg-border" />
                {group.events.map((event, idx) => (
                  <div key={event.id} className="relative">
                    {renderEventCard(event, idx)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative pl-8 md:pl-32">
          <div className="absolute left-4 md:left-[7.25rem] top-0 bottom-0 w-px bg-border" />
          {events.map((event, idx) => (
            <div key={event.id} className="relative">
              {renderEventCard(event, idx)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}