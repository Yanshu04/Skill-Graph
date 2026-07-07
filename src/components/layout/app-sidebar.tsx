"use client";

import { useAppStore, type AppPage } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  BrainCircuit,
  FolderKanban,
  Sparkles,
  Target,
  Clock,
  Award,
  FileText,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Crosshair,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems: { id: AppPage; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "skills", label: "Skills", icon: BrainCircuit },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "coach", label: "AI Coach", icon: Sparkles },
  { id: "analysis", label: "Gap Analysis", icon: Target },
  { id: "career-targets", label: "Career Targets", icon: Crosshair },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "portfolio", label: "Portfolio/Resume", icon: Share2 },
  { id: "profile", label: "Profile", icon: UserCircle },
];

export function AppSidebar() {
  const { currentPage, setPage, sidebarOpen, setSidebarOpen, user, logout } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden",
          "md:relative md:z-auto"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 h-16 shrink-0">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <BrainCircuit className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-lg font-bold gradient-text">SkillGraph</span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;
              return (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setPage(item.id);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "text-sidebar-foreground/70"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-emerald-400")} />
                      <AnimatePresence mode="wait">
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {isActive && sidebarOpen && (
                        <motion.div
                          layoutId="activeTab"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* User section */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 shrink-0"
          >
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-400 shrink-0"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign Out</TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </motion.aside>
    </>
  );
}