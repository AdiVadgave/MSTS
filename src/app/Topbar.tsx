import { Menu, Search, Bell, Sun, Moon, Check, ChevronsUpDown, LogOut, User as UserIcon, Building, CheckCheck, ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppStore } from "./store";
import { PORTALS, PORTAL_LIST } from "./portals";
import { useEntities, useNotifications, useMarkNotificationsRead } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import * as React from "react";

const DOT: Record<string, string> = {
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  alert: "bg-destructive",
};

export function Topbar() {
  const {
    entity,
    setEntity,
    setCommandOpen,
    setMobileNavOpen,
    theme,
    toggleTheme,
    signOut,
    user,
    activePortal,
    selectPortal,
    activeBrand,
  } = useAppStore();
  const navigate = useNavigate();
  const { data: entities } = useEntities();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [entityOpen, setEntityOpen] = React.useState(false);
  const portal = activePortal ? PORTALS[activePortal] : null;
  // Post-merge there are exactly two portals, so the switcher is a single
  // toggle: it shows the *other* portal and hops straight to it.
  const otherPortal = PORTAL_LIST.find((p) => p.id !== activePortal) ?? null;

  // Entities visible in this portal: a partner sees only the customer
  // entities it owns (tenant isolation); MSTS sees everything.
  const visibleEntities = React.useMemo(
    () =>
      activeBrand
        ? (entities ?? []).filter((e) => activeBrand.entityIds.includes(e.id))
        : entities ?? [],
    [entities, activeBrand]
  );

  // Restore the last-selected entity on load (when it's visible),
  // else default to the first visible one. Also corrects the selection
  // whenever the active brand changes.
  React.useEffect(() => {
    if (!visibleEntities.length) return;
    if (entity && visibleEntities.some((e) => e.id === entity.id)) return;
    const savedId = localStorage.getItem("msts-entity");
    setEntity(visibleEntities.find((e) => e.id === savedId) ?? visibleEntities[0]);
  }, [visibleEntities, entity, setEntity]);

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu />
      </Button>

      {/* Portal switcher — one-tap toggle to the other portal */}
      {portal && otherPortal && (
        <button
          onClick={() => {
            selectPortal(otherPortal.id);
            navigate(otherPortal.home);
          }}
          title={`Switch to ${otherPortal.name}`}
          className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm shadow-sm transition-colors hover:bg-secondary"
        >
          <ArrowLeftRight className="size-3.5 text-muted-foreground" />
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: otherPortal.accent }} />
          <span className="font-semibold">{otherPortal.name}</span>
        </button>
      )}

      {/* Entity switcher */}
      <Popover open={entityOpen} onOpenChange={setEntityOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-secondary">
            <Building className="size-4 text-muted-foreground" />
            <span className="max-w-[10rem] truncate font-medium sm:max-w-[16rem]">
              {entity?.displayId ?? "Select entity"}
            </span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-1.5">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Switch entity
          </p>
          {visibleEntities.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setEntity(e);
                localStorage.setItem("msts-entity", e.id);
                setEntityOpen(false);
              }}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-secondary"
            >
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0 text-primary",
                  entity?.id === e.id ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.displayId}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {e.name} · {e.vatNumber}
                </span>
              </span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Global search → command palette */}
      <button
        onClick={() => setCommandOpen(true)}
        className="ml-1 hidden items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-secondary md:flex md:w-64 lg:w-80"
      >
        <Search className="size-4" />
        <span>Search anything…</span>
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setCommandOpen(true)}
        >
          <Search />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-center justify-between border-b p-3">
              <p className="font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                {unread > 0 && <Badge variant="destructive">{unread} new</Badge>}
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={markRead.isPending}
                    onClick={() =>
                      markRead.mutate(undefined, {
                        onSuccess: () => toast.success("All notifications marked as read"),
                      })
                    }
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </Button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications?.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 border-b p-3 last:border-0",
                    !n.read && "bg-accent/40"
                  )}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[n.kind])} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(n.time, true)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{initials(user?.name ?? "Lars Jansen")}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="normal-case">
              <p className="text-sm font-semibold text-foreground">{user?.name ?? "Lars Jansen"}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user?.email ?? "lars@nvd-transport.nl"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/account?tab=profile")}>
              <UserIcon /> My account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/account?tab=entity")}>
              <Building /> Company settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                signOut();
                toast.success("You've been signed out");
                navigate(activeBrand ? `/login?partner=${activeBrand.slug}` : "/login");
              }}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
