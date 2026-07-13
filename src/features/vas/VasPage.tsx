import * as React from "react";
import { motion } from "framer-motion";
import {
  ConciergeBell,
  Droplets,
  GraduationCap,
  LifeBuoy,
  ListChecks,
  Percent,
  Route,
  Ship,
  SquareParking,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useVasRequests, useVasServices } from "@/hooks/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { VasRequest, VasService } from "@/lib/types";
import { RequestVasDialog } from "./RequestVasDialog";

const ICONS: Record<string, LucideIcon> = {
  route: Route,
  droplets: Droplets,
  "square-parking": SquareParking,
  "life-buoy": LifeBuoy,
  wrench: Wrench,
  percent: Percent,
  ship: Ship,
  "graduation-cap": GraduationCap,
};

export default function VasPage() {
  const { data: services, isLoading } = useVasServices();
  const [selected, setSelected] = React.useState<VasService | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Services · Beyond tolling"
        title="Value Added Services"
        description="Request fleet services along your routes — route planning, truck cleaning, secure parking and more."
        badge={<SourceTag source="MyTolls" />}
      />

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services"><ConciergeBell /> Services</TabsTrigger>
          <TabsTrigger value="requests"><ListChecks /> My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))
              : services?.map((s, i) => {
                  const Icon = ICONS[s.icon] ?? ConciergeBell;
                  return (
                    <motion.div
                      key={s.code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                    >
                      <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                        <CardContent className="flex h-full flex-col p-5">
                          <div className="flex items-start justify-between">
                            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="size-5" />
                            </div>
                            <Badge variant="secondary">{s.category}</Badge>
                          </div>
                          <h3 className="mt-3 font-semibold">{s.name}</h3>
                          <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                            {s.description}
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                            Provider: {s.provider}
                          </p>
                          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                            <span className="text-muted-foreground">
                              {s.priceFrom > 0
                                ? `From ${formatCurrency(s.priceFrom)} · ${s.unit}`
                                : `Quoted ${s.unit}`}
                            </span>
                            <Button size="sm" onClick={() => setSelected(s)}>
                              <ConciergeBell className="size-4" /> Request
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <RequestsTab />
        </TabsContent>
      </Tabs>

      <RequestVasDialog service={selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function RequestsTab() {
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("-requestedAt");
  const { data, isLoading } = useVasRequests({ page, pageSize: 10, sort });

  const columns: Column<VasRequest>[] = [
    { key: "reference", header: "Reference", sortable: true, cell: (r) => <span className="font-semibold">{r.reference}</span> },
    { key: "serviceName", header: "Service", cell: (r) => r.serviceName },
    {
      key: "vehiclePlate",
      header: "Vehicle",
      cell: (r) =>
        r.vehiclePlate ?? <span className="text-muted-foreground">Fleet-wide</span>,
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "requestedAt", header: "Requested", sortable: true, cell: (r) => <span className="text-muted-foreground">{formatDate(r.requestedAt)}</span> },
    { key: "updatedAt", header: "Updated", sortable: true, cell: (r) => <span className="text-muted-foreground">{formatDate(r.updatedAt)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.rows ?? []}
      loading={isLoading}
      getRowId={(r) => r.id}
      total={data?.total ?? 0}
      page={page}
      pageSize={10}
      onPageChange={setPage}
      sort={sort}
      onSortChange={setSort}
      emptyTitle="No service requests yet"
      emptyDescription="Request a value added service from the catalogue to see it here."
    />
  );
}
