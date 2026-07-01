import * as React from "react";
import type { Entity } from "@/lib/types";
import type { PortalId } from "./portals";

export interface AuthUser {
  name: string;
  email: string;
}

interface AppState {
  // Auth / session
  user: AuthUser | null;
  mfaVerified: boolean;
  activePortal: PortalId | null;
  login: (user: AuthUser) => void;
  verifyMfa: () => void;
  selectPortal: (p: PortalId) => void;
  leavePortal: () => void;
  signOut: () => void;
  // App shell
  entity: Entity | null;
  setEntity: (e: Entity) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const AppContext = React.createContext<AppState | null>(null);

const THEME_KEY = "msts-theme";
const SESSION_KEY = "msts-session";

interface PersistedSession {
  user: AuthUser | null;
  mfaVerified: boolean;
  activePortal: PortalId | null;
}

function loadSession(): PersistedSession {
  if (typeof window === "undefined")
    return { user: null, mfaVerified: false, activePortal: null };
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as PersistedSession;
  } catch {
    /* ignore malformed session */
  }
  return { user: null, mfaVerified: false, activePortal: null };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useRef(loadSession()).current;
  const [user, setUser] = React.useState<AuthUser | null>(initial.user);
  const [mfaVerified, setMfaVerified] = React.useState(initial.mfaVerified);
  const [activePortal, setActivePortal] = React.useState<PortalId | null>(
    initial.activePortal
  );

  const [entity, setEntity] = React.useState<Entity | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    return saved === "dark" ? "dark" : "light";
  });

  // Persist the session so a refresh keeps you where you were.
  React.useEffect(() => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ user, mfaVerified, activePortal })
    );
  }, [user, mfaVerified, activePortal]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Global ⌘K / Ctrl+K to open the command palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value: AppState = {
    user,
    mfaVerified,
    activePortal,
    login: (u) => {
      setUser(u);
      setMfaVerified(false);
      setActivePortal(null);
    },
    verifyMfa: () => setMfaVerified(true),
    selectPortal: (p) => setActivePortal(p),
    leavePortal: () => setActivePortal(null),
    signOut: () => {
      setUser(null);
      setMfaVerified(false);
      setActivePortal(null);
    },
    entity,
    setEntity,
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((c) => !c),
    mobileNavOpen,
    setMobileNavOpen,
    commandOpen,
    setCommandOpen,
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
