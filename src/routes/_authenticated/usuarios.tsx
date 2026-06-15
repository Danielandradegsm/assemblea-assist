import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/lib/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

type Profile = { id: string; email: string; nome: string };

const ROLES: AppRole[] = ["admin", "gerente", "vendedor", "consulta"];

function UsuariosPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>("vendedor");

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, nome").order("nome");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data as { user_id: string; role: AppRole }[];
    },
    enabled: isAdmin,
  });

  const addRole = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const { error } = await supabase.from("user_roles").insert({ user_id: target.id, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil atribuído"); qc.invalidateQueries({ queryKey: ["all-roles"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil removido"); qc.invalidateQueries({ queryKey: ["all-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return (
      <Card className="p-6 max-w-lg">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-warning-foreground" />
          <div>
            <h2 className="font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
          </div>
        </div>
      </Card>
    );
  }

  const rolesOf = (id: string) => allRoles.filter((r) => r.user_id === id).map((r) => r.role);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Usuários e Permissões</h1>
        <p className="text-sm text-muted-foreground">Gerencie os perfis de acesso da equipe.</p>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfis</TableHead>
              <TableHead className="text-right w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário.</TableCell></TableRow>
            ) : profiles.map((p) => {
              const userRoles = rolesOf(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome || "-"}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userRoles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sem perfis</span>
                      ) : userRoles.map((r) => (
                        <Badge key={r} variant="secondary" className="gap-1">
                          {ROLE_LABELS[r]}
                          <button
                            type="button"
                            onClick={() => removeRole.mutate({ user_id: p.id, role: r })}
                            className="ml-1 hover:text-destructive"
                            aria-label="Remover"
                          ><Trash2 className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => { setTarget(p); setRole("vendedor"); setOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Atribuir
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Atribuir perfil</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usuário</Label>
              <Input readOnly value={target?.email ?? ""} />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => addRole.mutate()} disabled={addRole.isPending}>
              {addRole.isPending ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
