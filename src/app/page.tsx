"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore, type AppPage } from "@/store/use-app-store";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthPage } from "@/components/auth/auth-page";
import { Dashboard } from "@/components/dashboard/dashboard";
import { SkillManager } from "@/components/skills/skill-manager";
import { AICoach } from "@/components/coach/ai-coach";
import { GapAnalysis } from "@/components/analysis/gap-analysis";
import { ProjectManager } from "@/components/projects/project-manager";
import { LearningTimeline } from "@/components/timeline/learning-timeline";
import { CertificateManager } from "@/components/certificates/certificate-manager";
import { ResumeUpload } from "@/components/resume/resume-upload";
import { PortfolioGenerator } from "@/components/portfolio/portfolio-generator";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { CareerTargetManager } from "@/components/career-targets/career-target-manager";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/store/use-app-store";

const pageComponents: Record<AppPage, React.ComponentType> = {
  dashboard: Dashboard,
  skills: SkillManager,
  projects: ProjectManager,
  coach: AICoach,
  analysis: GapAnalysis,
  timeline: LearningTimeline,
  certificates: CertificateManager,
  resume: ResumeUpload,
  profile: ProfileSettings,
  portfolio: PortfolioGenerator,
  "career-targets": CareerTargetManager,
  auth: AuthPage,
};

export default function Home() {
  const { isAuthenticated, currentPage, setPage, setUser, setSidebarOpen, sidebarOpen } = useAppStore();

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            setUser(data as UserProfile);
          }
        }
      } catch {
        // Not authenticated
      }
    }
    checkSession();
  }, [setUser]);

  // Auth page - no sidebar
  if (!isAuthenticated || currentPage === "auth") {
    return <AuthPage />;
  }

  const PageComponent = pageComponents[currentPage] || Dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open sidebar</TooltipContent>
              </Tooltip>
            )}
            <h1 className="text-lg font-semibold capitalize hidden sm:block">
              {{
                coach: "AI Career Coach",
                resume: "Resume Scanner",
                analysis: "Gap Analysis",
                portfolio: "Portfolio & Resume",
                "career-targets": "Career Targets",
                dashboard: "Dashboard",
                skills: "Skills",
                projects: "Projects",
                timeline: "Learning Timeline",
                certificates: "Certificates",
                profile: "Profile Settings",
                auth: "Sign In",
              }[currentPage] ?? currentPage}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI-Powered
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}