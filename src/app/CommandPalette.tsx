import * as React from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Plus, FileUp, Upload } from "lucide-react";
import { navForPortal, NAV } from "./nav";
import { useAppStore } from "./store";
import { SourceTag } from "@/components/common/SourceTag";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Add new vehicle", to: "/vehicles?new=1", icon: Plus },
  { label: "Extract RC card (AI)", to: "/vehicles?rc=1", icon: FileUp },
  { label: "Order a product", to: "/products", icon: Plus },
  { label: "Bulk upload vehicles", to: "/vehicles?bulk=1", icon: Upload },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen, activePortal, activeBrand } = useAppStore();
  const navigate = useNavigate();
  const groups = activePortal ? navForPortal(activePortal, activeBrand) : NAV;
  // Only surface quick actions whose target module lives in this portal.
  const allowed = new Set(groups.flatMap((g) => g.items.map((i) => i.to)));
  const quickActions = QUICK_ACTIONS.filter((a) =>
    allowed.has(a.to.split("?")[0])
  );

  const go = (to: string) => {
    setCommandOpen(false);
    navigate(to);
  };

  if (!commandOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-pop animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Command loop className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search modules, actions, records…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {quickActions.length > 0 && (
              <Command.Group heading="Quick actions">
                {quickActions.map((a) => (
                  <Command.Item
                    key={a.label}
                    value={`action ${a.label}`}
                    onSelect={() => go(a.to)}
                    className={itemCls}
                  >
                    <a.icon className="size-4 text-muted-foreground" />
                    <span>{a.label}</span>
                    <CornerDownLeft className="ml-auto size-3.5 text-muted-foreground opacity-0 aria-selected:opacity-100" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {groups.map((group) => (
              <Command.Group key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <Command.Item
                    key={item.to}
                    value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                    onSelect={() => go(item.to)}
                    className={itemCls}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        · {item.description}
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      {item.sources.map((s) => (
                        <SourceTag key={s} source={s} />
                      ))}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

const itemCls = cn(
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none aria-selected:bg-secondary"
);
