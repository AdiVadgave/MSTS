import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Plus,
  FileUp,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SignageHero } from "@/components/signage/SignageHero";
import { StatStrip } from "@/components/signage/StatStrip";
import { Ticker } from "@/components/signage/Ticker";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plate } from "@/components/common/Plate";
import {
  useActivity,
  useDashboardSummary,
  useDomains,
  useFleetStatus,
  useNotifications,
  useSpendByCountry,
  useSpendTrend,
} from "@/hooks/api";
import { CHART, STATUS_COLORS } from "@/lib/chart";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: trend } = useSpendTrend();
  const { data: byCountry } = useSpendByCountry();
  const { data: fleet } = useFleetStatus();
  const { data: activity } = useActivity();
  const { data: notifications } = useNotifications();
  const { data: domains } = useDomains();

  const alerts = notifications?.filter((n) => n.kind === "warning" || n.kind === "alert") ?? [];

  return (
    <div className="space-y-6">
      {/* Signage hero */}
      <SignageHero
        eyebrow="MSTS One · Unified control"
        title={
          <>
            One fleet. Every road.
            <br />
            One screen.
          </>
        }
        lede="A single cockpit across MyTolls, MyMST and Toll2.0 — vehicles, devices, tolls and billing, reconciled in real time."
        actions={
          <>
            <Button variant="dark" onClick={() => navigate("/vehicles?rc=1")}>
              <FileUp /> Extract RC card
            </Button>
            <Button variant="default" onClick={() => navigate("/vehicles?new=1")}>
              <Plus /> Add vehicle
            </Button>
          </>
        }
      />

      {/* Ticker */}
      {domains && domains.length > 0 && (
        <Ticker
          className="rounded-xl"
          signs={domains.map((d) => ({
            cc: d.country,
            label: d.corridors,
            live: d.status === "active",
          }))}
        />
      )}

      {/* Asphalt stat strip */}
      {isLoading || !summary ? (
        <Skeleton className="h-[120px] rounded-2xl" />
      ) : (
        <StatStrip
          stats={[
            {
              num: formatNumber(summary.activeVehicles),
              label: `Active vehicles · of ${summary.vehicles}`,
              onClick: () => navigate("/vehicles?status=active"),
            },
            {
              num: formatNumber(summary.activeObus),
              label: `Active OBUs · of ${summary.obus}`,
              onClick: () => navigate("/obus?status=active"),
            },
            {
              num: formatCurrency(summary.periodSpend).replace(/\.\d+$/, ""),
              label: "Toll spend · last 90 days",
              onClick: () => navigate("/transactions"),
            },
            {
              num: formatCurrency(summary.openInvoices).replace(/\.\d+$/, ""),
              label: "Open receivables",
              onClick: () => navigate("/finance"),
            },
          ]}
        />
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div className="space-y-1">
              <p className="eyebrow">Reconciled spend</p>
              <CardTitle>Spend trend · 6 months</CardTitle>
            </div>
            <SourceTag source="MyMST" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend ?? []} margin={{ left: -18, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="font-mono text-xs" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="font-mono text-xs"
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                />
                <RTooltip
                  formatter={(v: number) => [formatCurrency(v), "Spend"]}
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="spend" stroke={CHART.primary} strokeWidth={2.5} fill="url(#spend)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="eyebrow">Fleet state</p>
            <CardTitle>Vehicles by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={fleet ?? []} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                  {(fleet ?? []).map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? CHART.slate} />
                  ))}
                </Pie>
                <RTooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(fleet ?? []).map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[f.key] ?? CHART.slate }} />
                  <span className="text-muted-foreground">{f.name}</span>
                  <span className="ml-auto font-mono font-semibold">{f.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <p className="eyebrow">By toll domain</p>
            <CardTitle>Spend by country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCountry ?? []} margin={{ left: -18, right: 8 }}>
                <XAxis dataKey="country" tickLine={false} axisLine={false} className="font-mono text-xs" />
                <YAxis tickLine={false} axisLine={false} className="font-mono text-xs" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: number) => [formatCurrency(v), "Spend"]} contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--secondary))" }} />
                <Bar dataKey="spend" radius={[6, 6, 0, 0]} fill={CHART.ink} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-shell-yellow-deep" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary && summary.missingAttributes > 0 && (
              <AttentionRow
                icon={<CircleAlert className="size-4 text-destructive" />}
                title={`${summary.missingAttributes} vehicles missing attributes`}
                cta="Review"
                onClick={() => navigate("/vehicles?status=missing_attributes")}
              />
            )}
            {summary && summary.exceptions > 0 && (
              <AttentionRow
                icon={<CircleAlert className="size-4 text-shell-yellow-deep" />}
                title={`${summary.exceptions} transaction exceptions`}
                cta="Investigate"
                onClick={() => navigate("/transactions?status=exception")}
              />
            )}
            {alerts.map((a) => (
              <AttentionRow
                key={a.id}
                icon={<AlertTriangle className="size-4 text-shell-yellow-deep" />}
                title={a.title}
                cta="Open"
                onClick={() => navigate("/finance")}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Badge variant="secondary">Across all portals</Badge>
        </CardHeader>
        <CardContent className="divide-y">
          {(activity ?? []).slice(0, 8).map((a) => {
            const isPlate = /\d/.test(a.target) && a.target.length <= 12 && a.target.includes("-");
            return (
              <div key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-md bg-shell-ink font-mono text-[10px] font-bold text-shell-yellow">
                  {a.actor.slice(0, 2).toUpperCase()}
                </div>
                <p className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 truncate text-sm">
                  <span className="font-medium">{a.actor}</span>
                  <span className="text-muted-foreground">{a.action}</span>
                  {isPlate ? <Plate value={a.target} size="sm" /> : <span className="font-medium">{a.target}</span>}
                </p>
                <SourceTag source={a.source} />
                <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
                  {formatDate(a.time, true)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function AttentionRow({
  icon,
  title,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-secondary/40 p-2.5">
      {icon}
      <p className="min-w-0 flex-1 text-sm font-medium">{title}</p>
      <Button variant="ghost" size="sm" className="shrink-0" onClick={onClick}>
        {cta} <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  fontSize: 12,
  fontFamily: "JetBrains Mono, monospace",
  boxShadow: "0 12px 32px -8px rgb(26 23 18 / 0.25)",
} as const;
