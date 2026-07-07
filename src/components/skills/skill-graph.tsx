'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { MarqueeText } from '@/components/ui/marquee-text';
import { Label } from '@/components/ui/label';
import {
  Code2,
  Database,
  Cloud,
  Wrench,
  Layers,
  Ship,
  Users,
  MessageSquare,
  Sparkles,
  X,
  TrendingUp,
  Shield,
  Clock,
  GitBranch,
  Map as MapIcon,
} from 'lucide-react';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SkillData {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  verification: string;
  confidence: number;
  lastSeen?: string;
  parentRelations?: { toSkill: { id: string; name: string } }[];
  childRelations?: { fromSkill: { id: string; name: string } }[];
  isGoal?: boolean;
}

interface SkillGraphProps {
  skills: SkillData[];
}

// â”€â”€ Category Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const categoryIcons: Record<string, React.ReactNode> = {
  Language: <Code2 className="size-3" />,
  Framework: <Layers className="size-3" />,
  Tool: <Wrench className="size-3" />,
  Database: <Database className="size-3" />,
  Cloud: <Cloud className="size-3" />,
  DevOps: <Ship className="size-3" />,
  Domain: <Users className="size-3" />,
  'Soft Skill': <MessageSquare className="size-3" />,
  Other: <Sparkles className="size-3" />,
};

// â”€â”€ Relation Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const relationColors: Record<string, string> = {
  uses: '#34d399',
  built_with: '#fbbf24',
  learned_from: '#38bdf8',
  required_by: '#fb7185',
  related_to: '#94a3b8',
};

const relationLabels: Record<string, string> = {
  uses: 'uses',
  built_with: 'built with',
  learned_from: 'learned from',
  required_by: 'required by',
  related_to: 'related to',
};

// â”€â”€ Proficiency Border Color â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getProficiencyBorderColor(proficiency: number): string {
  if (proficiency >= 70) return '#34d399'; // emerald
  if (proficiency >= 40) return '#fbbf24'; // amber
  return '#94a3b8'; // gray
}

// â”€â”€ Custom Node Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SkillNode({ data, selected }: { data: SkillData; selected: boolean }) {
  const borderColor = data.isGoal ? '#f43f5e' : getProficiencyBorderColor(data.proficiency);
  const icon = categoryIcons[data.category] || <Sparkles className="size-3" />;

  return (
    <div
      className={cn(
        "relative cursor-pointer rounded-xl border-2 bg-card px-3 py-2 shadow-lg transition-all duration-200 hover:shadow-xl min-w-[140px] max-w-[180px]",
        data.isGoal && "border-dashed"
      )}
      style={{
        borderColor: selected ? '#34d399' : borderColor,
        boxShadow: selected
          ? `0 0 20px ${borderColor}40`
          : data.isGoal
          ? '0 0 12px rgba(244,63,94,0.15)'
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-emerald-400 !border-emerald-300"
      />
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
          {data.name}
        </span>
      </div>
      <div className="w-full space-y-1">
        {data.isGoal ? (
          <div className="flex items-center justify-between gap-1 mt-1">
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 border-rose-500/30 text-rose-400 bg-rose-500/5 font-semibold"
            >
              Target Goal
            </Badge>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.proficiency}%`,
                    backgroundColor: borderColor,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">
                {data.proficiency}
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 border-border"
            >
              {data.category}
            </Badge>
          </>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-emerald-400 !border-emerald-300"
      />
    </div>
  );
}

// â”€â”€ Custom Background Track Node Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function BackgroundNode({ data }: { data: { label: string; width: number; height: number; colorClass: string } }) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 flex flex-col justify-start select-none pointer-events-none w-full h-full",
        data.colorClass
      )}
      style={{
        width: data.width,
        height: data.height,
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
      }}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-widest bg-background/80 px-2 py-1 rounded-md self-start border border-border">
        {data.label}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  skillNode: SkillNode,
  backgroundNode: BackgroundNode,
};

function splitCategories(category: string): string[] {
  if (!category) return [];
  const sanitized = category.replace(/AI\/ML/i, '__AI_ML__');
  return sanitized
    .split(/[\/&,+]|\band\b/i)
    .map((c) => {
      const replaced = c.replace('__AI_ML__', 'AI/ML');
      const trimmed = replaced.trim();
      const lower = trimmed.toLowerCase();
      if (lower === 'ml' || lower === 'machine learning') {
        return 'Machine Learning';
      }
      return trimmed;
    })
    .filter((c) => c.length > 0);
}

// â”€â”€ Layout Algorithm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computeLayout(skills: SkillData[], targetSkillNames: Set<string>, filterMode: 'pathway' | 'all'): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Identify missing target skills to inject as virtual goal nodes
  const acquiredSkillNamesLower = new Set(skills.map(s => s.name.toLowerCase().trim()));
  const missingTargets: string[] = [];
  targetSkillNames.forEach(targetName => {
    if (!acquiredSkillNamesLower.has(targetName.toLowerCase().trim())) {
      missingTargets.push(targetName);
    }
  });

  // Limit target goals in simple pathway mode to avoid clutter
  const goalsLimit = filterMode === 'pathway' ? 6 : missingTargets.length;
  const virtualGoalSkills: SkillData[] = missingTargets.slice(0, goalsLimit).map((name, idx) => ({
    id: `goal-${idx}`,
    name,
    category: 'Other',
    proficiency: 0,
    verification: 'target_goal',
    confidence: 0,
    isGoal: true
  } as any));

  const allSkills = [...skills, ...virtualGoalSkills];

  // Group skills into the three tracks (swimlanes)
  const track1: SkillData[] = []; // Track 1: Foundations (acquired, <50)
  const track2: SkillData[] = []; // Track 2: Core Competencies (acquired, >=50, not target)
  const track3: SkillData[] = []; // Track 3: Career Targets & Goals (missing target, or acquired target)

  allSkills.forEach(s => {
    const isTarget = targetSkillNames.has(s.name) || s.isGoal;
    if (isTarget) {
      track3.push(s);
    } else if (s.proficiency < 50) {
      track1.push(s);
    } else {
      track2.push(s);
    }
  });

  // Swimlane columns dimensions & coordinates
  const colWidth = 380;
  const colGap = 40;
  
  const x1 = 0;
  const x2 = colWidth + colGap;
  const x3 = (colWidth + colGap) * 2;

  const yStart = 60;
  const ySpacing = 95;

  // Determine dynamic column layout density per swimlane
  const itemsPerCol1 = track1.length > 4 ? 2 : 1;
  const itemsPerCol2 = track2.length > 4 ? 2 : 1;
  const itemsPerCol3 = track3.length > 4 ? 2 : 1;

  // Calculate maximum height needed to render columns uniformly
  const maxRows = Math.max(
    Math.ceil(track1.length / itemsPerCol1),
    Math.ceil(track2.length / itemsPerCol2),
    Math.ceil(track3.length / itemsPerCol3)
  );
  const trackHeight = Math.max(500, yStart + maxRows * ySpacing + 40);

  // Prepend background nodes (rendered behind skill nodes)
  nodes.push({
    id: 'bg-track-1',
    type: 'backgroundNode',
    position: { x: x1, y: 0 },
    selectable: false,
    draggable: false,
    deletable: false,
    data: {
      label: '1. Foundations',
      width: colWidth,
      height: trackHeight,
      colorClass: 'border-emerald-500/15 text-emerald-400/80 bg-emerald-500/[0.015]'
    }
  });

  nodes.push({
    id: 'bg-track-2',
    type: 'backgroundNode',
    position: { x: x2, y: 0 },
    selectable: false,
    draggable: false,
    deletable: false,
    data: {
      label: '2. Core Strengths',
      width: colWidth,
      height: trackHeight,
      colorClass: 'border-amber-500/15 text-amber-400/80 bg-amber-500/[0.015]'
    }
  });

  nodes.push({
    id: 'bg-track-3',
    type: 'backgroundNode',
    position: { x: x3, y: 0 },
    selectable: false,
    draggable: false,
    deletable: false,
    data: {
      label: '3. Target Goals',
      width: colWidth,
      height: trackHeight,
      colorClass: 'border-rose-500/15 text-rose-400/80 bg-rose-500/[0.015]'
    }
  });

  // Lay out skill nodes inside Column 1
  track1.forEach((s, idx) => {
    const subCol = idx % itemsPerCol1;
    const row = Math.floor(idx / itemsPerCol1);
    const xOffset = itemsPerCol1 === 1 ? (colWidth - 160) / 2 : 15 + subCol * 175;
    nodes.push({
      id: s.id,
      type: 'skillNode',
      position: {
        x: x1 + xOffset,
        y: yStart + row * ySpacing
      },
      data: s as any,
    });
  });

  // Lay out skill nodes inside Column 2
  track2.forEach((s, idx) => {
    const subCol = idx % itemsPerCol2;
    const row = Math.floor(idx / itemsPerCol2);
    const xOffset = itemsPerCol2 === 1 ? (colWidth - 160) / 2 : 15 + subCol * 175;
    nodes.push({
      id: s.id,
      type: 'skillNode',
      position: {
        x: x2 + xOffset,
        y: yStart + row * ySpacing
      },
      data: s as any,
    });
  });

  // Lay out skill nodes inside Column 3
  track3.forEach((s, idx) => {
    const subCol = idx % itemsPerCol3;
    const row = Math.floor(idx / itemsPerCol3);
    const xOffset = itemsPerCol3 === 1 ? (colWidth - 160) / 2 : 15 + subCol * 175;
    nodes.push({
      id: s.id,
      type: 'skillNode',
      position: {
        x: x3 + xOffset,
        y: yStart + row * ySpacing
      },
      data: s as any,
    });
  });

  // Create standard relationship edges
  const skillMap = new Map<string, SkillData>();
  skills.forEach(s => skillMap.set(s.id, s));

  skills.forEach(s => {
    (s.parentRelations || []).forEach((r, idx) => {
      const relType = (r as any).relationType as string || 'related_to';
      edges.push({
        id: `edge-${r.toSkill.id}-${s.id}-${idx}`,
        source: r.toSkill.id,
        target: s.id,
        type: 'default',
        animated: true,
        label: relationLabels[relType] || relType,
        style: {
          stroke: relationColors[relType] || '#94a3b8',
          strokeWidth: 1.5,
        },
        labelStyle: {
          fontSize: 8,
          fill: relationColors[relType] || '#94a3b8',
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: '#0f0f0f',
          fillOpacity: 0.85,
        },
        labelBgPadding: [3, 1.5] as [number, number],
        labelBgBorderRadius: 4,
      });
    });
  });

  // Draw target goal pathway edges from acquired skills of same category to virtual target skills
  virtualGoalSkills.forEach(goal => {
    const relatedAcquired = skills.filter(s => {
      const cats = splitCategories(s.category).map(c => c.toLowerCase());
      return cats.includes(goal.category.toLowerCase()) || s.proficiency >= 50;
    }).slice(0, 2);
    
    relatedAcquired.forEach(source => {
      edges.push({
        id: `target-edge-${source.id}-${goal.id}`,
        source: source.id,
        target: goal.id,
        type: 'default',
        animated: true,
        style: {
          stroke: '#f43f5e',
          strokeWidth: 1.5,
          strokeDasharray: '4,4',
        },
        label: 'Target Path',
        labelStyle: {
          fontSize: 8,
          fill: '#f43f5e',
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#0f0f0f',
          fillOpacity: 0.85,
        },
        labelBgPadding: [3, 1.5] as [number, number],
        labelBgBorderRadius: 4,
      });
    });
  });

  return { nodes, edges };
}

// â”€â”€ Skill Detail Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SkillDetailPanel({
  skill,
  onClose,
}: {
  skill: SkillData;
  onClose: () => void;
}) {
  const borderColor = skill.isGoal ? '#f43f5e' : getProficiencyBorderColor(skill.proficiency);
  const icon = categoryIcons[skill.category] || <Sparkles className="size-4" />;

  const verificationConfig: Record<string, { label: string; color: string }> = {
    verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    partially_verified: { label: 'Partially Verified', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    self_reported: { label: 'Self Reported', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };

  const vConfig = verificationConfig[skill.verification] || verificationConfig.self_reported;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute right-4 top-4 bottom-4 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border group">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <span className="text-emerald-400 shrink-0">{icon}</span>
          <MarqueeText text={skill.name} className="font-semibold text-sm text-foreground" />
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {skill.isGoal ? (
            <div className="space-y-3 bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-lg">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <GitBranch className="size-3.5 animate-pulse" />
                Target Career Goal
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This skill is a required target for your active career target roles. Start learning this skill to improve your job match score!
              </p>
            </div>
          ) : (
            <>
              {/* Category */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Category</span>
                <Badge variant="outline" className="text-xs">
                  {skill.category}
                </Badge>
              </div>

              {/* Proficiency */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    Proficiency
                  </span>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: borderColor }}
                  >
                    {skill.proficiency}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${skill.proficiency}%`,
                      backgroundColor: borderColor,
                    }}
                  />
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="size-3" />
                  Verification
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${vConfig.color}`}
                >
                  {vConfig.label}
                </Badge>
              </div>

              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    Confidence
                  </span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {Math.round(skill.confidence * 100)}%
                  </span>
                </div>
                <Progress value={skill.confidence * 100} className="h-2" />
              </div>

              {/* Last Seen */}
              {skill.lastSeen && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Last Seen
                  </span>
                  <span className="text-xs text-foreground">
                    {new Date(skill.lastSeen).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Relations */}
              {(skill.parentRelations && skill.parentRelations.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <GitBranch className="size-3" />
                    Depends On
                  </span>
                  <div className="space-y-1">
                    {skill.parentRelations.map((r, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] gap-1 w-full justify-start"
                      >
                        <span className="text-emerald-400">&larr;</span>
                        {r.toSkill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(skill.childRelations && skill.childRelations.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <GitBranch className="size-3" />
                    Used By
                  </span>
                  <div className="space-y-1">
                    {skill.childRelations.map((r, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] gap-1 w-full justify-start"
                      >
                        <span className="text-amber-400">&rarr;</span>
                        {r.fromSkill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
// ----------------------------------------------------------------------------------------------------

interface RoadmapViewProps {
  skills: SkillData[];
  targetSkillNames: Set<string>;
  onSwitchToFull: () => void;
}

function RoadmapView({ skills, targetSkillNames, onSwitchToFull }: RoadmapViewProps) {
  const targetNamesLower = new Set(Array.from(targetSkillNames).map(n => n.toLowerCase().trim()));

  // Mastered skills (>=70)
  const mastered = skills
    .filter(s => s.proficiency >= 70 && !s.isGoal)
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 6);

  // In-progress skills (40-69)
  const inProgress = skills
    .filter(s => s.proficiency >= 40 && s.proficiency < 70 && !s.isGoal)
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 6);

  // Target/goal skills (match career targets or proficiency < 40)
  const needsWork = skills
    .filter(s => s.proficiency < 40 && !s.isGoal)
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 4);

  // Missing target skills (not yet acquired)
  const missing = Array.from(targetSkillNames)
    .filter(name => !skills.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim()))
    .slice(0, 4);

  const masteredCount = skills.filter(s => s.proficiency >= 70).length;
  const totalCount = skills.length;
  const progressPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  const SkillPill = ({ name, proficiency, isGoal, isMissing }: { name: string; proficiency?: number; isGoal?: boolean; isMissing?: boolean }) => {
    const color = isMissing || isGoal
      ? 'border-rose-500/40 bg-rose-500/5 text-rose-300'
      : proficiency! >= 70
        ? 'border-emerald-500/40 bg-emerald-500/8 text-emerald-300'
        : proficiency! >= 40
          ? 'border-amber-500/40 bg-amber-500/8 text-amber-300'
          : 'border-slate-500/40 bg-slate-500/8 text-slate-400';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-medium group',
          color
        )}
      >
        <MarqueeText text={name} />
        {typeof proficiency === 'number' && !isMissing && (
          <span className="shrink-0 font-bold tabular-nums">{proficiency}%</span>
        )}
        {isMissing && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-400/80">Acquire</span>
        )}
      </motion.div>
    );
  };

  const stages = [
    {
      step: 1,
      title: 'Mastered',
      subtitle: 'Skills you have nailed',
      color: 'emerald',
      borderClass: 'border-emerald-500/25',
      headerClass: 'text-emerald-400',
      dotClass: 'bg-emerald-500',
      lineClass: 'from-emerald-500/60 to-amber-500/40',
      items: mastered.map(s => ({ name: s.name, proficiency: s.proficiency })),
      emptyText: 'No mastered skills yet. Keep practicing!'
    },
    {
      step: 2,
      title: 'In Progress',
      subtitle: 'Skills you are developing',
      color: 'amber',
      borderClass: 'border-amber-500/25',
      headerClass: 'text-amber-400',
      dotClass: 'bg-amber-500',
      lineClass: 'from-amber-500/60 to-rose-500/40',
      items: inProgress.map(s => ({ name: s.name, proficiency: s.proficiency })),
      emptyText: 'Nothing in progress — you have mastered everything or need to add skills!'
    },
    {
      step: 3,
      title: 'Target Goals',
      subtitle: 'Where you are heading',
      color: 'rose',
      borderClass: 'border-rose-500/25',
      headerClass: 'text-rose-400',
      dotClass: 'bg-rose-500',
      lineClass: null,
      items: [
        ...needsWork.map(s => ({ name: s.name, proficiency: s.proficiency })),
        ...missing.map(name => ({ name, proficiency: undefined, isMissing: true }))
      ],
      emptyText: 'No target goals set yet. Visit Career Targets to set your goals!'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Progress Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-emerald-500/5 via-card to-rose-500/5 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-400" />
              <span className="text-sm font-bold text-foreground">Your Career Progression</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              From where you stand today → to your career target
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {progressPct}<span className="text-base text-muted-foreground">%</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {masteredCount} of {totalCount} mastered
              </div>
            </div>
            <div className="w-24">
              <Progress
                value={progressPct}
                className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Three-stage roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-0 items-start">
        {stages.map((stage, stageIdx) => (
          <React.Fragment key={stage.step}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stageIdx * 0.1, duration: 0.4 }}
              className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-4',
                stage.borderClass
              )}
            >
              {/* Stage header */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0',
                  stage.dotClass
                )}>
                  {stage.step}
                </div>
                <div>
                  <h3 className={cn('text-sm font-bold', stage.headerClass)}>{stage.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{stage.subtitle}</p>
                </div>
              </div>

              {/* Skills list */}
              <div className="flex flex-col gap-1.5 min-h-[120px]">
                {stage.items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic pt-2">{stage.emptyText}</p>
                ) : (
                  stage.items.map((item, idx) => (
                    <SkillPill
                      key={idx}
                      name={item.name}
                      proficiency={item.proficiency}
                      isMissing={(item as any).isMissing}
                    />
                  ))
                )}
              </div>
            </motion.div>

            {/* Arrow between stages */}
            {stageIdx < stages.length - 1 && (
              <div className="hidden md:flex items-start justify-center pt-4 px-2">
                <span className="text-lg text-muted-foreground/40 select-none">→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Switch to full graph */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          onClick={onSwitchToFull}
        >
          <GitBranch className="size-3.5" />
          View full skill graph with all {skills.length} skills
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------------------------

export function SkillGraph({ skills }: SkillGraphProps) {
  const [targetSkillNames, setTargetSkillNames] = useState<Set<string>>(new Set());
  const [showEdges, setShowEdges] = useState(true);
  const [filterMode, setFilterMode] = useState<'pathway' | 'all'>('pathway');

  // Fetch career targets to display roadmap goal placeholders
  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await fetch('/api/career-targets');
        if (res.ok) {
          const targets = await res.json();
          const names = new Set<string>();
          targets.forEach((t: any) => {
            try {
              const list = JSON.parse(t.targetSkills);
              if (Array.isArray(list)) {
                list.forEach((name) => names.add(name));
              }
            } catch {}
          });
          setTargetSkillNames(names);
        }
      } catch (err) {
        console.error('Failed to fetch career targets for graph:', err);
      }
    }
    fetchTargets();
  }, []);

  // Filter skills list dynamically to simplify density
  const displaySkills = useMemo(() => {
    if (filterMode === 'all' || targetSkillNames.size === 0) {
      return skills;
    }

    const targetNamesLower = new Set(Array.from(targetSkillNames).map(n => n.toLowerCase().trim()));
    
    // Select acquired target skills
    const acquiredTargets = skills.filter(s => targetNamesLower.has(s.name.toLowerCase().trim()));

    // Select up to 5 foundational acquired skills
    const otherFoundations = skills.filter(s => s.proficiency < 50 && !targetNamesLower.has(s.name.toLowerCase().trim()))
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 5);

    // Select up to 5 core strengths acquired skills
    const otherStrengths = skills.filter(s => s.proficiency >= 50 && !targetNamesLower.has(s.name.toLowerCase().trim()))
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 5);

    const keptSkills = [...acquiredTargets, ...otherFoundations, ...otherStrengths];

    // Deduplicate by id
    const seen = new Set<string>();
    return keptSkills.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [skills, filterMode, targetSkillNames]);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => computeLayout(displaySkills, targetSkillNames, filterMode),
    [displaySkills, targetSkillNames, filterMode]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);

  // Sync nodes/edges when layout changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // AI Career Roadmap Suggestions computation
  const suggestions = useMemo(() => {
    const missing: string[] = [];
    const inProgress: SkillData[] = [];
    const mastered: SkillData[] = [];

    skills.forEach(s => {
      if (s.proficiency >= 70) mastered.push(s);
      else if (s.proficiency >= 40) inProgress.push(s);
    });

    targetSkillNames.forEach(name => {
      const matchingSkill = skills.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim());
      if (!matchingSkill) {
        missing.push(name);
      } else if (matchingSkill.proficiency < 50) {
        inProgress.push(matchingSkill);
      }
    });

    const recs: { name: string; status: string; text: string }[] = [];
    const addedNames = new Set<string>();

    inProgress.forEach(s => {
      if (!addedNames.has(s.name.toLowerCase())) {
        addedNames.add(s.name.toLowerCase());
        recs.push({
          name: s.name,
          status: 'needs_improvement',
          text: `Boost ${s.name} from ${s.proficiency}% to reach target standard.`
        });
      }
    });

    missing.forEach(name => {
      if (!addedNames.has(name.toLowerCase())) {
        addedNames.add(name.toLowerCase());
        recs.push({
          name,
          status: 'missing',
          text: `Acquire foundational skills in ${name} (target role requirement).`
        });
      }
    });

    return {
      masteredCount: mastered.length,
      totalCount: skills.length,
      recommendations: recs.slice(0, 3)
    };
  }, [skills, targetSkillNames]);

  // Focus Mode selection opacity filters
  const displayNodes = useMemo(() => {
    if (!selectedSkill) return nodes;

    const connectedIds = new Set<string>([selectedSkill.id]);
    if (selectedSkill.isGoal) {
      layoutEdges.forEach(e => {
        if (e.target === selectedSkill.id) {
          connectedIds.add(e.source);
        }
      });
    } else {
      if (selectedSkill.parentRelations) {
        selectedSkill.parentRelations.forEach(r => connectedIds.add(r.toSkill.id));
      }
      if (selectedSkill.childRelations) {
        selectedSkill.childRelations.forEach(r => connectedIds.add(r.fromSkill.id));
      }
    }

    return nodes.map(n => {
      const isBg = n.id.startsWith('bg-track');
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isBg || connectedIds.has(n.id) ? 1 : 0.15,
          pointerEvents: (isBg || connectedIds.has(n.id) ? 'auto' : 'none') as any,
        }
      };
    });
  }, [nodes, selectedSkill, layoutEdges]);

  const displayEdges = useMemo(() => {
    if (!showEdges) return [];
    if (!selectedSkill) return edges;

    return edges.map(e => {
      const isConnected = e.source === selectedSkill.id || e.target === selectedSkill.id;
      return {
        ...e,
        animated: isConnected,
        style: {
          ...e.style,
          opacity: isConnected ? 1 : 0.05,
          strokeWidth: isConnected ? 2.5 : 1,
        }
      };
    });
  }, [edges, selectedSkill, showEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedSkill(node.data as unknown as SkillData);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedSkill(null);
  }, []);

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <GitBranch className="size-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Skills Yet</h3>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            Add skills to see your skill graph and explore relationships between them.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-card border border-border p-3.5 rounded-xl gap-4 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-xs font-bold text-foreground">Skill Roadmap View</h4>
          <p className="text-[10px] text-muted-foreground">
            {filterMode === 'pathway'
              ? 'Simple view: 3 clear stages from your current level to your career goal.'
              : 'Full graph: explore all your skills and their connections interactively.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Segmented view mode buttons */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <Button
              variant={filterMode === 'pathway' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-[11px] font-bold px-3 rounded-md gap-1.5"
              onClick={() => {
                setFilterMode('pathway');
                setSelectedSkill(null);
              }}
            >
              <MapIcon className="size-3.5" />
              Roadmap
            </Button>
            <Button
              variant={filterMode === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-[11px] font-bold px-3 rounded-md gap-1.5"
              onClick={() => {
                setFilterMode('all');
                setSelectedSkill(null);
              }}
            >
              <GitBranch className="size-3.5" />
              Full Graph
            </Button>
          </div>

          {filterMode === 'all' && (
            <>
              <div className="h-4 w-px bg-border/60" />
              <div className="flex items-center gap-2">
                <Switch
                  id="show-relationships"
                  checked={showEdges}
                  onCheckedChange={setShowEdges}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Label htmlFor="show-relationships" className="text-[11px] font-semibold cursor-pointer text-muted-foreground select-none">
                  Show Lines
                </Label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pathway mode: beautiful simple roadmap */}
      {filterMode === 'pathway' && (
        <RoadmapView
          skills={skills}
          targetSkillNames={targetSkillNames}
          onSwitchToFull={() => { setFilterMode('all'); setSelectedSkill(null); }}
        />
      )}

      {/* Full graph mode: React Flow graph */}
      {filterMode === 'all' && (
        <div className="relative w-full h-[700px] rounded-xl border border-border overflow-hidden bg-background shadow-sm">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="!bg-transparent z-10"
          >
            <Background
              color="#334155"
              gap={20}
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <Controls
              className="!bg-card !border !border-border !rounded-lg !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
            />
            <MiniMap
              className="!bg-card !border !border-border !rounded-lg !shadow-lg"
              nodeColor={(node) => {
                const data = node.data as unknown as SkillData;
                return data.isGoal ? '#f43f5e' : getProficiencyBorderColor(data.proficiency);
              }}
              maskColor="rgba(0,0,0,0.6)"
              pannable
              zoomable
            />
          </ReactFlow>

          {/* Legend */}
          <div className="absolute left-4 bottom-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 space-y-2 z-10 max-w-[200px] shadow-lg">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Relations & Goals
            </span>
            <div className="space-y-1.5">
              {Object.entries(relationLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-0.5 rounded-full"
                    style={{ backgroundColor: relationColors[key] }}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-border/50 pt-1.5 mt-1.5">
                <div className="w-4 border-t-2 border-dashed border-rose-500" />
                <span className="text-[10px] text-rose-400 font-medium">Target Goal Path</span>
              </div>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Proficiency
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-sm border-2 border-emerald-400 bg-emerald-500/5" />
                <span className="text-[10px] text-muted-foreground">High (70+)</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-3 h-3 rounded-sm border-2 border-amber-400 bg-amber-500/5" />
                <span className="text-[10px] text-muted-foreground">Medium (40-69)</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-3 h-3 rounded-sm border-2 border-gray-400 bg-gray-500/5" />
                <span className="text-[10px] text-muted-foreground">Low (&lt;40)</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-3 h-3 rounded-sm border-2 border-dashed border-rose-400 bg-rose-500/5" />
                <span className="text-[10px] text-rose-400 font-semibold">Target Goal</span>
              </div>
            </div>
          </div>

          {/* Skill Detail Panel */}
          <AnimatePresence>
            {selectedSkill && (
              <SkillDetailPanel
                skill={selectedSkill}
                onClose={() => setSelectedSkill(null)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}