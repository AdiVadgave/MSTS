import * as React from "react";
import type { Entity, Partner } from "@/lib/types";
import type { PortalId } from "./portals";
import { applyBrandVars, templateOf } from "@/lib/brand";

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
  /** Active whitelabel partner brand; null = MSTS default. */
  activeBrand: Partner | null;
  setActiveBrand: (b: Partner | null) => void;
  /** Sign-in destination: true = Partner Solution Studio, false = portal. */
  studioIntent: boolean;
  setStudioIntent: (v: boolean) => void;
  /** MSTS Tolls One replica: identical app, Classic (blue) color theme only. */
  classicReplica: boolean;
  setClassicReplica: (v: boolean) => void;
}

const AppContext = React.createContext<AppState | null>(null);

const THEME_KEY = "msts-theme";
const SESSION_KEY = "msts-session";

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // Auth is intentionally NOT persisted across loads — opening the app always
  // starts at the login screen. (Business data still persists via the mock DB.)
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [mfaVerified, setMfaVerified] = React.useState(false);
  const [activePortal, setActivePortal] = React.useState<PortalId | null>(null);

  const [entity, setEntity] = React.useState<Entity | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  // Whitelabel: not persisted — like auth, every load starts as MSTS
  // until the login flow resolves a partner from the URL.
  const [activeBrand, setActiveBrand] = React.useState<Partner | null>(null);

  // MSTS-internal: the login screen can target the Partner Solution Studio
  // instead of the customer portal. Session-only, reset at sign-out.
  const [studioIntent, setStudioIntent] = React.useState(false);

  // "MSTS Tolls One — Classic": the SAME application (activeBrand stays null, so
  // nav/data/behavior are identical) with only the color theme swapped.
  const [classicReplica, setClassicReplica] = React.useState(false);

  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    return saved === "dark" ? "dark" : "light";
  });

  // Clear any session persisted by earlier builds so the app always opens
  // on the login screen.
  React.useEffect(() => {
    localStorage.removeItem(SESSION_KEY);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    // A carbon-template partner session must not overwrite the user's
    // persisted preference — carbon's dark-first is session-scoped.
    if (!(activeBrand && templateOf(activeBrand) === "carbon")) {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme, activeBrand]);

  const preCarbonTheme = React.useRef<"light" | "dark" | null>(null);

  React.useEffect(() => {
    applyBrandVars(activeBrand);
    // Classic replica: only when NO partner brand is active (a brand's own
    // template always wins), re-skin via the `classic` token block.
    if (!activeBrand && classicReplica) {
      document.documentElement.setAttribute("data-theme", "classic");
    }
    // Carbon is dark-first: entering a carbon-branded session defaults to
    // dark; leaving it restores the previous preference. Session-scoped —
    // the persisted preference is never overwritten by this.
    if (activeBrand && templateOf(activeBrand) === "carbon") {
      if (preCarbonTheme.current === null) preCarbonTheme.current = theme;
      setTheme("dark");
    } else if (preCarbonTheme.current !== null) {
      setTheme(preCarbonTheme.current);
      preCarbonTheme.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand, classicReplica]);

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
    verifyMfa: () => {
      setMfaVerified(true);
      // Portal selection has been removed — land straight in the app on a
      // default portal. The top bar toggle switches between MyTolls and MyMST.
      setActivePortal((p) => p ?? "MyTolls");
    },
    selectPortal: (p) => setActivePortal(p),
    leavePortal: () => setActivePortal(null),
    signOut: () => {
      setUser(null);
      setMfaVerified(false);
      setActivePortal(null);
      setStudioIntent(false);
      // classicReplica intentionally survives sign-out: like a partner
      // brand, the replica session returns to ITS login screen.
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
    activeBrand,
    setActiveBrand,
    studioIntent,
    setStudioIntent,
    classicReplica,
    setClassicReplica,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
