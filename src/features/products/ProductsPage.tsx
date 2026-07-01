import * as React from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Sticker,
  Radio,
  Mountain,
  Tag,
  Route,
  Percent,
  ShoppingCart,
  Ban,
  Package,
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
import { useOrders, useProducts } from "@/hooks/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, TollProduct } from "@/lib/types";
import { OrderDialog } from "./OrderDialog";

const ICONS: Record<string, LucideIcon> = {
  "credit-card": CreditCard,
  sticker: Sticker,
  radio: Radio,
  mountain: Mountain,
  tag: Tag,
  route: Route,
  percent: Percent,
};

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const [selected, setSelected] = React.useState<TollProduct | null>(null);
  const [mode, setMode] = React.useState<"order" | "block">("order");

  const openOrder = (p: TollProduct, m: "order" | "block") => {
    setMode(m);
    setSelected(p);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tolling · Catalogue"
        title="Products & Ordering"
        description="Browse the tolling catalogue and order or block products per vehicle."
        badge={<SourceTag source="MyTolls" />}
      />

      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue"><Package /> Catalogue</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart /> Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))
              : products?.map((p, i) => {
                  const Icon = ICONS[p.icon] ?? Package;
                  return (
                    <motion.div
                      key={p.code}
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
                            <Badge variant="secondary">{p.category}</Badge>
                          </div>
                          <h3 className="mt-3 font-semibold">{p.name}</h3>
                          <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                            {p.description}
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                            Eligible: {p.eligibleTypes.join(", ")}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.countries.map((c) => (
                              <span
                                key={c}
                                className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                            <span className="text-muted-foreground">
                              {p.deposit > 0 ? `Deposit ${formatCurrency(p.deposit)}` : "No deposit"}
                            </span>
                            <div className="flex gap-1.5">
                              <Button
                                variant="outline"
                                size="icon-sm"
                                title="Block"
                                onClick={() => openOrder(p, "block")}
                              >
                                <Ban className="size-4" />
                              </Button>
                              <Button size="sm" onClick={() => openOrder(p, "order")}>
                                <ShoppingCart className="size-4" /> Order
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
      </Tabs>

      <OrderDialog product={selected} mode={mode} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function OrdersTab() {
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("-createdAt");
  const { data, isLoading } = useOrders({ page, pageSize: 10, sort });

  const columns: Column<Order>[] = [
    { key: "reference", header: "Reference", sortable: true, cell: (o) => <span className="font-semibold">{o.reference}</span> },
    { key: "productName", header: "Product", cell: (o) => o.productName },
    {
      key: "mode",
      header: "Mode",
      cell: (o) => (
        <Badge variant={o.mode === "block" ? "destructive" : "default"}>
          {o.mode === "block" ? "Block" : "Order"}
        </Badge>
      ),
    },
    { key: "vehiclePlate", header: "Vehicle", cell: (o) => o.vehiclePlate },
    { key: "quantity", header: "Qty", align: "center", cell: (o) => o.quantity },
    { key: "total", header: "Total", align: "right", sortable: true, cell: (o) => formatCurrency(o.total) },
    { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
    { key: "createdAt", header: "Placed", sortable: true, cell: (o) => <span className="text-muted-foreground">{formatDate(o.createdAt)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.rows ?? []}
      loading={isLoading}
      getRowId={(o) => o.id}
      total={data?.total ?? 0}
      page={page}
      pageSize={10}
      onPageChange={setPage}
      sort={sort}
      onSortChange={setSort}
      emptyTitle="No orders yet"
      emptyDescription="Order a product from the catalogue to see it here."
    />
  );
}
