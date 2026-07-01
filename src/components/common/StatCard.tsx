import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  accent?: "primary" | "brand" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

const ACCENT: Record<string, string> = {
  // asphalt tile with yellow icon — the signature "signage" look
  primary: "text-shell-yellow bg-[hsl(var(--sidebar))]",
  brand: "text-shell-ink bg-shell-yellow",
  success: "text-success bg-success/12",
  warning: "text-shell-ink bg-shell-yellow/25",
  destructive: "text-destructive bg-destructive/10",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  accent = "primary",
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        onClick={onClick}
        className={cn(
          "p-5 transition-all",
          onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="eyebrow">{label}</p>
            <p className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          <div className={cn("grid size-11 place-items-center rounded-xl", ACCENT[accent])}>
            <Icon className="size-5" />
          </div>
        </div>
        {(trend || hint) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-mono font-semibold",
                  trend.direction === "up" && "text-success",
                  trend.direction === "down" && "text-destructive",
                  trend.direction === "flat" && "text-muted-foreground"
                )}
              >
                {trend.direction === "up" && <ArrowUpRight className="size-3.5" />}
                {trend.direction === "down" && <ArrowDownRight className="size-3.5" />}
                {trend.value}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
