import * as React from "react";
import { UserPlus, MoreHorizontal, Trash2, ShieldCheck, Loader2, Mail } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/hooks/api";
import { formatDate, initials } from "@/lib/utils";
import type { User } from "@/lib/types";
import { toast } from "sonner";

const ROLES: User["role"][] = ["Admin", "Fleet Manager", "Finance", "Viewer"];

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const update = useUpdateUser();
  const del = useDeleteUser();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · Access"
        title="Users & Access"
        description="Invite team members, assign roles and manage permissions."
        badge={<SourceTag source="Toll2.0" />}
        actions={<Button onClick={() => setOpen(true)}><UserPlus /> Invite user</Button>}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/40">
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              : users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar><AvatarFallback>{initials(u.name)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === "Admin" ? "default" : "secondary"} className="gap-1">
                        {u.role === "Admin" && <ShieldCheck className="size-3" />}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.lastActive, true)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change role</DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={u.role}
                            onValueChange={(role) => {
                              update.mutate({ id: u.id, role: role as User["role"] });
                              toast.success(`${u.name} is now ${role}`);
                            }}
                          >
                            {ROLES.map((r) => (
                              <DropdownMenuRadioItem key={r} value={r}>{r}</DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          {u.status === "invited" && (
                            <DropdownMenuItem onClick={() => toast.success(`Invite re-sent to ${u.email}`)}>
                              <Mail /> Resend invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              del.mutate(u.id);
                              toast.success(`${u.name} removed`);
                            }}
                          >
                            <Trash2 /> Remove user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      <InviteDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateUser();
  const [form, setForm] = React.useState({ name: "", email: "", role: "Viewer" as User["role"] });

  const submit = async () => {
    if (!form.email) return toast.error("Email is required");
    await create.mutateAsync(form);
    toast.success(`Invite sent to ${form.email}`);
    onOpenChange(false);
    setForm({ name: "", email: "", role: "Viewer" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>They'll receive an email invitation to join this entity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as User["role"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
