import * as React from "react";
import type { Entity } from "@/lib/types";

interface AppState {
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

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [entity, setEntity] = React.useState<Entity | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    return saved === "dark" ? "dark" : "light";
  });

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
