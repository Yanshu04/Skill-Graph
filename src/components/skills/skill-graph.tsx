'use client';

import { useMemo, useCallback, useState } from 'react';
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
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

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
}

interface SkillGraphProps {
  skills: SkillData[];
}

// ── Category Icons ───────────────────────────────────────────────────────────

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

// ── Relation Colors ──────────────────────────────────────────────────────────

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

// ── Proficiency Border Color ─────────────────────────────────────────────────

function getProficiencyBorderColor(proficiency: number): string {
  if (proficiency >= 70) return '#34d399'; // emerald
  if (proficiency >= 40) return '#fbbf24'; // amber
  return '#94a3b8'; // gray
}

// ── Custom Node Component ────────────────────────────────────────────────────

function SkillNode({ data, selected }: { data: SkillData; selected: boolean }) {
  const borderColor = getProficiencyBorderColor(data.proficiency);
  const icon = categoryIcons[data.category] || <Sparkles className="size-3" />;

  return (
    <div
      className="relative cursor-pointer rounded-xl border-2 bg-card px-3 py-2 shadow-lg transition-all duration-200 hover:shadow-xl min-w-[140px] max-w-[180px]"
      style={{
        borderColor: selected ? '#34d399' : borderColor,
        boxShadow: selected
          ? `0 0 20px ${borderColor}40`
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-emerald-400 !border-emerald-300"
      />
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
          {data.name}
        </span>
      </div>
      <div className="w-full space-y-1">
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
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-emerald-400 !border-emerald-300"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  skillNode: SkillNode,
};

// ── Layout Algorithm ─────────────────────────────────────────────────────────

function computeLayout(skills: SkillData[]): { nodes: Node[]; edges: Edge[] } {
  const skillMap = new Map<string, SkillData>();
  skills.forEach((s) => skillMap.set(s.id, s));

  // Find root nodes (skills that are not children of any other skill)
  const childIds = new Set<string>();
  skills.forEach((s) => {
    (s.parentRelations || []).forEach((r) => childIds.add(s.id));
  });

  const rootSkills = skills.filter((s) => !childIds.has(s.id));
  const orphanSkills = skills.filter(
    (s) =>
      !childIds.has(s.id) &&
      (!s.parentRelations || s.parentRelations.length === 0) &&
      (!s.childRelations || s.childRelations.length === 0)
  );

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  // BFS to assign levels
  const levels: Map<string, number> = new Map();
  const queue: string[] = [];

  // Start with roots
  rootSkills.forEach((s) => {
    queue.push(s.id);
    levels.set(s.id, 0);
  });

  // Also include orphans
  orphanSkills.forEach((s) => {
    if (!levels.has(s.id)) {
      levels.set(s.id, 0);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const skill = skillMap.get(currentId);
    if (!skill) continue;

    (skill.childRelations || []).forEach((r) => {
      if (!visited.has(r.fromSkill.id)) {
        levels.set(r.fromSkill.id, (levels.get(currentId) || 0) + 1);
        queue.push(r.fromSkill.id);
      }
    });
  }

  // Add any unvisited skills
  skills.forEach((s) => {
    if (!visited.has(s.id)) {
      levels.set(s.id, 0);
    }
  });

  // Group by level
  const levelGroups: Map<number, string[]> = new Map();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });

  // Position nodes
  const xSpacing = 280;
  const ySpacing = 120;
  let maxLevel = 0;

  levels.forEach((l) => {
    if (l > maxLevel) maxLevel = l;
  });

  // If there are no relations at all, use a grid layout
  if (maxLevel === 0 && skills.length > 1) {
    const cols = Math.min(4, Math.ceil(Math.sqrt(skills.length)));
    skills.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodes.push({
        id: s.id,
        type: 'skillNode',
        position: { x: col * xSpacing, y: row * ySpacing },
        data: s as unknown as Record<string, unknown>,
      });
    });
  } else {
    levelGroups.forEach((ids, level) => {
      ids.forEach((id, index) => {
        const skill = skillMap.get(id);
        if (skill) {
          nodes.push({
            id,
            type: 'skillNode',
            position: {
              x: level * xSpacing,
              y: index * ySpacing + (level % 2 === 0 ? 0 : ySpacing / 2),
            },
            data: skill as unknown as Record<string, unknown>,
          });
        }
      });
    });
  }

  // Create edges
  skills.forEach((s) => {
    (s.parentRelations || []).forEach((r, idx) => {
      const relType = (r as Record<string, unknown>).relationType as string || 'related_to';
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
          fontSize: 10,
          fill: relationColors[relType] || '#94a3b8',
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: '#0f0f0f',
          fillOpacity: 0.8,
        },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      });
    });
  });

  return { nodes, edges };
}

// ── Skill Detail Panel ───────────────────────────────────────────────────────

function SkillDetailPanel({
  skill,
  onClose,
}: {
  skill: SkillData;
  onClose: () => void;
}) {
  const borderColor = getProficiencyBorderColor(skill.proficiency);
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
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">{icon}</span>
          <span className="font-semibold text-sm text-foreground truncate">
            {skill.name}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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
                    <span className="text-emerald-400">←</span>
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
                    <span className="text-amber-400">→</span>
                    {r.fromSkill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// ── Main SkillGraph Component ────────────────────────────────────────────────

export function SkillGraph({ skills }: SkillGraphProps) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => computeLayout(skills),
    [skills]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);

  // Sync nodes/edges when skills change
  useMemo(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

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
    <div className="relative w-full h-[600px] md:h-[700px] rounded-xl border border-border overflow-hidden bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        className="!bg-background"
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
            return getProficiencyBorderColor(data.proficiency);
          }}
          maskColor="rgba(0,0,0,0.6)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute left-4 bottom-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 space-y-2 z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Relations
        </span>
        <div className="space-y-1.5">
          {Object.entries(relationLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-4 h-0.5 rounded-full"
                style={{ backgroundColor: relationColors[key] }}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Proficiency
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-sm border-2 border-emerald-400" />
            <span className="text-[10px] text-muted-foreground">High (70+)</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-3 h-3 rounded-sm border-2 border-amber-400" />
            <span className="text-[10px] text-muted-foreground">Medium (40-69)</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-3 h-3 rounded-sm border-2 border-gray-400" />
            <span className="text-[10px] text-muted-foreground">Low (&lt;40)</span>
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
  );
}