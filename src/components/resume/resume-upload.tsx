'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  ClipboardPaste,
  Sparkles,
  Loader2,
  CheckSquare,
  Square,
  Brain,
  Briefcase,
  FolderCode,
  Award,
  FileCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtractedSkill {
  name: string;
  category: string;
  proficiency: number;
  confidence: number;
  evidence?: string;
  selected: boolean;
}

interface ExtractedExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
  selected: boolean;
}

interface ExtractedProject {
  name: string;
  description: string;
  selected: boolean;
}

interface ExtractedCertificate {
  title: string;
  issuingOrg?: string;
  completionDate?: string;
  selected: boolean;
}

interface ExtractionResult {
  skills: ExtractedSkill[];
  experiences: ExtractedExperience[];
  projects: ExtractedProject[];
  certificates: ExtractedCertificate[];
  summary: string;
}

interface ResumeFile {
  id: string;
  filename: string;
  content: string;
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

// ─── Component ───────────────────────────────────────────────────────────────

export function ResumeUpload() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadText, setUploadText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [results, setResults] = useState<ExtractionResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing resumes
  useEffect(() => {
    async function fetchResumes() {
      try {
        const res = await fetch('/api/resume');
        if (res.ok) {
          const data = await res.json();
          setResumes(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchResumes();
  }, []);

  // File handling
  const handleFile = useCallback((file: File) => {
    // Client-side validation: reject non-.txt files
    if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
      toast.error('Only .txt files are supported in this phase. PDFs and images are disabled.');
      return;
    }
    // Client-side validation: reject files > 1MB
    if (file.size > 1 * 1024 * 1024) {
      toast.error('File size exceeds the 1MB limit.');
      return;
    }
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setUploadText(text);
        setActiveTab('upload');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Extract skills
  const handleExtract = async () => {
    let text = activeTab === 'upload' ? uploadText : pasteText;
    
    setExtracting(true);
    setResults(null);

    try {
      // If uploading a file, upload to storage first to run server validations and store
      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadRes = await fetch('/api/resume/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Upload failed');
        }

        const uploadData = await uploadRes.json();
        text = uploadData.content;
        setUploadText(text);
      }

      if (!text.trim()) {
        toast.error('Please provide resume text first');
        setExtracting(false);
        return;
      }

      const res = await fetch('/api/ai/extract-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('Extraction failed');

      const data = await res.json();

      // Normalize with selected=true
      const result: ExtractionResult = {
        summary: data.summary ?? '',
        skills: (data.skills ?? []).map((s: Record<string, unknown>) => {
          const rawConf = Number(s.confidence ?? 0.7);
          return {
            name: String(s.name ?? ''),
            category: String(s.category ?? 'General'),
            proficiency: Number(s.proficiency ?? 50),
            confidence: rawConf > 1 ? rawConf / 100 : rawConf,
            evidence: s.evidence ? String(s.evidence) : undefined,
            selected: true,
          };
        }),
        experiences: (data.experiences ?? []).map(
          (exp: Record<string, unknown>) => ({
            title: String(exp.title ?? ''),
            company: String(exp.company ?? ''),
            startDate: String(exp.startDate ?? ''),
            endDate: String(exp.endDate ?? ''),
            description: String(exp.description ?? ''),
            selected: true,
          })
        ),
        projects: (data.projects ?? []).map((p: Record<string, unknown>) => ({
          name: String(p.name ?? ''),
          description: String(p.description ?? ''),
          selected: true,
        })),
        certificates: (data.certificates ?? []).map(
          (c: Record<string, unknown>) => ({
            title: String(c.title ?? ''),
            issuingOrg: c.issuingOrg ? String(c.issuingOrg) : undefined,
            completionDate: c.completionDate ? String(c.completionDate) : undefined,
            selected: true,
          })
        ),
      };

      setResults(result);
      toast.success('Skills extracted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract skills. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  // Toggle selection
  const toggleSkill = (idx: number) => {
    setResults((prev) => {
      if (!prev) return prev;
      const next = { ...prev, skills: [...prev.skills] };
      next.skills[idx] = { ...next.skills[idx], selected: !next.skills[idx].selected };
      return next;
    });
  };

  const toggleExperience = (idx: number) => {
    setResults((prev) => {
      if (!prev) return prev;
      const next = { ...prev, experiences: [...prev.experiences] };
      next.experiences[idx] = { ...next.experiences[idx], selected: !next.experiences[idx].selected };
      return next;
    });
  };

  const toggleProject = (idx: number) => {
    setResults((prev) => {
      if (!prev) return prev;
      const next = { ...prev, projects: [...prev.projects] };
      next.projects[idx] = { ...next.projects[idx], selected: !next.projects[idx].selected };
      return next;
    });
  };

  const toggleCertificate = (idx: number) => {
    setResults((prev) => {
      if (!prev) return prev;
      const next = { ...prev, certificates: [...prev.certificates] };
      next.certificates[idx] = { ...next.certificates[idx], selected: !next.certificates[idx].selected };
      return next;
    });
  };

  // Import selected items
  const handleImport = async () => {
    if (!results) return;

    setImporting(true);

    try {
      // Import skills — filter out any without a name (LLM can return empty strings)
      const selectedSkills = results.skills.filter((s) => s.selected && s.name?.trim());
      const skillResults = selectedSkills.length > 0
        ? await Promise.allSettled(
            selectedSkills.map((s) =>
              fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: s.name,
                  category: s.category,
                  proficiency: s.proficiency,
                  confidence: s.confidence,
                }),
              }).then((r) => { if (!r.ok) throw new Error('skill'); return r; })
            )
          )
        : [];

      // Import experiences — filter out those without a title
      const selectedExp = results.experiences.filter((e) => e.selected && e.title?.trim());
      const expResults = selectedExp.length > 0
        ? await Promise.allSettled(
            selectedExp.map((e) =>
              fetch('/api/experiences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: e.title,
                  company: e.company,
                  startDate: e.startDate || null,
                  endDate: e.endDate || null,
                  description: e.description,
                }),
              }).then((r) => { if (!r.ok) throw new Error('exp'); return r; })
            )
          )
        : [];

      // Import projects — filter out those without a name
      const selectedProjects = results.projects.filter((p) => p.selected && p.name?.trim());
      const projectResults = selectedProjects.length > 0
        ? await Promise.allSettled(
            selectedProjects.map((p) =>
              fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: p.name,
                  description: p.description || null,
                  technologies: [],
                  complexity: 'medium',
                  difficulty: 5,
                }),
              }).then((r) => { if (!r.ok) throw new Error('project'); return r; })
            )
          )
        : [];

      // Import certificates — filter out those without a title
      const selectedCerts = results.certificates.filter((c) => c.selected && c.title?.trim());
      const certResults = selectedCerts.length > 0
        ? await Promise.allSettled(
            selectedCerts.map((c) =>
              fetch('/api/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: c.title,
                  issuingOrg: c.issuingOrg || null,
                  completionDate: c.completionDate || null,
                  skills: [],
                }),
              }).then((r) => { if (!r.ok) throw new Error('cert'); return r; })
            )
          )
        : [];

      // Save resume reference
      const text = activeTab === 'upload' ? uploadText : pasteText;
      await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `Resume ${new Date().toISOString().slice(0, 10)}`,
          content: text,
          skills: JSON.stringify(selectedSkills.map((s) => s.name)),
        }),
      });

      const importedSkills    = skillResults.filter((r) => r.status === 'fulfilled').length;
      const importedExp        = expResults.filter((r) => r.status === 'fulfilled').length;
      const importedProjects   = projectResults.filter((r) => r.status === 'fulfilled').length;
      const importedCerts      = certResults.filter((r) => r.status === 'fulfilled').length;
      const totalFailed        =
        skillResults.filter((r) => r.status === 'rejected').length +
        expResults.filter((r) => r.status === 'rejected').length +
        projectResults.filter((r) => r.status === 'rejected').length +
        certResults.filter((r) => r.status === 'rejected').length;

      const parts = [
        importedSkills   > 0 && `${importedSkills} skill${importedSkills !== 1 ? 's' : ''}`,
        importedExp      > 0 && `${importedExp} experience${importedExp !== 1 ? 's' : ''}`,
        importedProjects > 0 && `${importedProjects} project${importedProjects !== 1 ? 's' : ''}`,
        importedCerts    > 0 && `${importedCerts} certificate${importedCerts !== 1 ? 's' : ''}`,
      ].filter(Boolean).join(', ');

      if (totalFailed > 0) {
        toast.success(
          `Imported ${parts || 'nothing'}. (${totalFailed} item${totalFailed !== 1 ? 's' : ''} skipped — may already exist)`
        );
      } else {
        toast.success(`Imported ${parts || 'nothing'} successfully!`);
      }

      setResults(null);
      setUploadText('');
      setPasteText('');

      // Refresh resumes
      const res = await fetch('/api/resume');
      const data = await res.json();
      setResumes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import items. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
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
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <FileText className="size-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold">Resume Analyzer</h2>
          <p className="text-sm text-muted-foreground">
            Upload or paste your resume to extract skills automatically
          </p>
        </div>
      </motion.div>

      {/* ── Input Tabs ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="size-4" />
              Upload Resume
            </TabsTrigger>
            <TabsTrigger value="paste">
              <ClipboardPaste className="size-4" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4 space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors',
                dragOver
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-border hover:border-emerald-500/30 hover:bg-emerald-500/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload
                className={cn(
                  'size-10 mb-3',
                  dragOver ? 'text-emerald-400' : 'text-muted-foreground/50'
                )}
              />
              <p className="text-sm font-medium">
                {dragOver
                  ? 'Drop your file here'
                  : 'Drag & drop a .txt file or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Only .txt files are supported
              </p>
            </div>

            {/* Textarea after upload */}
            {uploadText && (
              <div className="space-y-3">
                <Textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  rows={10}
                  placeholder="Resume text will appear here..."
                  className="max-h-96 overflow-y-auto font-mono text-xs"
                />
                <Button
                  onClick={handleExtract}
                  disabled={extracting || !uploadText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {extracting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {extracting ? 'Extracting...' : 'Extract Skills'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Paste Tab */}
          <TabsContent value="paste" className="mt-4 space-y-3">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              placeholder="Paste your resume text here..."
              className="max-h-96 overflow-y-auto font-mono text-xs"
            />
            <Button
              onClick={handleExtract}
              disabled={extracting || !pasteText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {extracting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {extracting ? 'Extracting...' : 'Extract Skills'}
            </Button>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Extraction Loading ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {extracting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-4"
          >
            <Sparkles className="size-10 text-emerald-400 animate-pulse" />
            <p className="text-muted-foreground text-sm">
              AI is analyzing your resume...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results Section ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {results && (
          <motion.div
            key="results"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex flex-col gap-0"
          >
            {/* Scrollable content area */}
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1 pb-2">
            {/* Summary */}
            {results.summary && (
              <motion.div variants={itemVariants}>
                <Card className="card-hover bg-card border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4 text-amber-400" />
                    <h3 className="text-sm font-semibold">AI Summary</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {results.summary}
                  </p>
                </Card>
              </motion.div>
            )}

            <Separator className="bg-border" />

            {/* Skills */}
            {results.skills.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="size-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold">
                    Extracted Skills ({results.skills.length})
                  </h3>
                </div>
                <div className="space-y-2">
                    {results.skills.map((skill, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          skill.selected
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border bg-card hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={skill.selected}
                          onCheckedChange={() => toggleSkill(idx)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {skill.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-emerald-400 border-emerald-500/30"
                            >
                              {skill.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              Proficiency: {skill.proficiency}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Confidence: {Math.round(skill.confidence * 100)}%
                            </span>
                          </div>
                          {skill.evidence && (
                            <div className="text-[10px] text-muted-foreground/80 mt-2 bg-secondary/30 px-2 py-1 rounded border border-border/30 italic">
                              "{skill.evidence}"
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
              </motion.div>
            )}

            {/* Experiences */}
            {results.experiences.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="size-5 text-sky-400" />
                  <h3 className="text-sm font-semibold">
                    Extracted Experiences ({results.experiences.length})
                  </h3>
                </div>
                <div className="space-y-2">
                    {results.experiences.map((exp, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          exp.selected
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border bg-card hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={exp.selected}
                          onCheckedChange={() => toggleExperience(idx)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{exp.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {exp.company}
                            {exp.startDate && (
                              <span className="ml-2">
                                {exp.startDate}
                                {exp.endDate ? ` – ${exp.endDate}` : ''}
                              </span>
                            )}
                          </div>
                          {exp.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
              </motion.div>
            )}

            {/* Projects */}
            {results.projects.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderCode className="size-5 text-violet-400" />
                  <h3 className="text-sm font-semibold">
                    Extracted Projects ({results.projects.length})
                  </h3>
                </div>
                <div className="space-y-2">
                    {results.projects.map((proj, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          proj.selected
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border bg-card hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={proj.selected}
                          onCheckedChange={() => toggleProject(idx)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{proj.name}</div>
                          {proj.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
              </motion.div>
            )}

            {/* Certificates */}
            {results.certificates.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-amber-400" />
                  <h3 className="text-sm font-semibold">
                    Extracted Certificates ({results.certificates.length})
                  </h3>
                </div>
                <div className="space-y-2">
                    {results.certificates.map((cert, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          cert.selected
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border bg-card hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={cert.selected}
                          onCheckedChange={() => toggleCertificate(idx)}
                        />
                        <span className="text-sm font-medium">{cert.title}</span>
                      </label>
                    ))}
                  </div>
              </motion.div>
            )}
            </div>{/* end scrollable content */}

            {/* Import Button — sticky footer, always visible */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4 mt-4 z-10">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <FileCheck className="size-4 inline mr-1.5 text-emerald-400" />
                  Select items above, then import to your profile
                </p>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckSquare className="size-4" />
                  )}
                  {importing ? 'Importing...' : 'Import Selected'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Previous Resumes ────────────────────────────────────────────────── */}
      {resumes.length > 0 && !results && (
        <motion.div variants={itemVariants} className="space-y-3">
          <Separator className="bg-border" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Previously Uploaded
          </h3>
          <div className="space-y-2">
            {resumes.map((r) => (
              <Card
                key={r.id}
                className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="size-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.skills
                        ? (() => {
                            try {
                              return `${JSON.parse(r.skills).length} skills extracted`;
                            } catch {
                              return '';
                            }
                          })()
                        : ''}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}