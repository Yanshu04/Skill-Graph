import { create } from "zustand";

export type AppPage = 
  | "auth" 
  | "dashboard" 
  | "skills" 
  | "projects" 
  | "coach" 
  | "analysis" 
  | "timeline" 
  | "certificates" 
  | "profile"
  | "resume";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  twitter: string | null;
}

export interface SkillNode {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  verification: string;
  confidence: number;
  lastSeen: string;
}

export interface AppState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  currentPage: AppPage;
  sidebarOpen: boolean;
  
  setUser: (user: UserProfile | null) => void;
  setPage: (page: AppPage) => void;
  setSidebarOpen: (open: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  currentPage: "auth",
  sidebarOpen: true,
  
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    currentPage: user ? "dashboard" : "auth" 
  }),
  setPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  logout: () => {
    document.cookie = "session=; path=/; max-age=0";
    set({ user: null, isAuthenticated: false, currentPage: "auth" });
  },
}));