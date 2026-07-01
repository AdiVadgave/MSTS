import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV } from "./nav";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { useAppStore } from "./store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAppStore();

  return (
    <div className="flex h-full flex-col sidebar-bg">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-2 border-b px-4",
          "border-[hsl(var(--sidebar-border))]",
          collapsed && "justify-center px-2"
        )}
      >
        {collapsed ? (
          <LogoMark />
        ) : (
          <div className="flex items-center gap-2">
            <Logo className="h-6" />
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
              One
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--sidebar-muted))]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const link = (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        "text-[hsl(var(--sidebar-foreground))] hover:bg-white/5 hover:text-white",
                        collapsed && "justify-center px-0",
                        isActive &&
                          "bg-shell-yellow/15 text-white ring-1 ring-inset ring-shell-yellow/40"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive
                              ? "text-shell-yellow"
                              : "text-[hsl(var(--sidebar-muted))] group-hover:text-white"
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
                return collapsed ? (
                  <Tooltip key={item.to} delayDuration={0}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="size-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
