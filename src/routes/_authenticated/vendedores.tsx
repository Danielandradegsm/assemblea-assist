import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { fmtBRL, maskCpfCnpj, maskPhone } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/vendedores")({
  component: VendedoresPage,
});

type Vendedor = {
  id: string; nome: string; cpf: string | null; telefone: string | null; email: string | null;
  cargo: string | null; meta_mensal: number | null; percentual_comissao: number | null; ativo: boolean;
};

const schema = z.object({
  nome: z.string().min(2).max(200),
  cpf: z.string().max(20).optional().or(z.literal("")),
  telefone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  cargo: z.string().max(100).optional().or(z.literal("")),
  meta_mensal: z.number().min(0).default(0),
  percentual_comissao: z.number().min(0).max(100).default(0),
  ativo: z.boolean().default(true),
});

const empty = { nome: "", cpf: "", telefone: "", email: "", cargo: "", meta_mensal: 0, percentual_comissao: 0, ativo: true };

function VendedoresPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendedor | null>(null);
  const [form, setForm] = useState(empty);

  const { data = [], isLoading } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendedores").select("*").order("nome");
      if (error) throw error;
      return data as Vendedor[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const payload = {
        nome: parsed.nome,
        cpf: parsed.cpf || null,
        telefone: parsed.telefone || null,
        email: parsed.email || null,
        cargo: parsed.cargo || null,
        meta_mensal: parsed.meta_mensal,
        percentual_comissao: parsed.percentual_comissao,
        ativo: parsed.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("vendedores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendedores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Vendedor atualizado" : "Vendedor cadastrado");
      qc.invalidateQueries({ queryKey: ["vendedores"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vendedor excluído"); qc.invalidateQueries({ queryKey: ["vendedores"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(v: Vendedor) {
    setEditing(v);
    setForm({
      nome: v.nome, cpf: v.cpf ?? "", telefone: v.telefone ?? "", email: v.email ?? "",
      cargo: v.cargo ?? "", meta_mensal: Number(v.meta_mensal ?? 0),
      percentual_comissao: Number(v.percentual_comissao ?? 0), ativo: v.ativo,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Vendedores</h1>
          <p className="text-sm text-muted-foreground">Equipe comercial, metas e percentual de comissão.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo vendedor</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editing ? "Editar vendedor" : "Novo vendedor"}</DialogTitle></DialogHeader>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
                <div className="space-y-2 md:col-span-2"><Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
                <div className="space-y-2"><Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpfCnpj(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} /></div>
                <div className="space-y-2"><Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div className="space-y-2"><Label>Meta mensal (R$)</Label>
                  <Input type="number" step="0.01" value={form.meta_mensal}
                    onChange={(e) => setForm({ ...form, meta_mensal: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>% Comissão</Label>
                  <Input type="number" step="0.001" value={form.percentual_comissao}
                    onChange={(e) => setForm({ ...form, percentual_comissao: Number(e.target.value) })} /></div>
                <div className="flex items-center gap-3 md:col-span-2 pt-2">
                  <Switch checked={form.ativo} onCheckedChange={(c) => setForm({ ...form, ativo: c })} />
                  <Label>Ativo</Label>
                </div>
                <DialogFooter className="md:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">% Com.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum vendedor cadastrado.</TableCell></TableRow>
            ) : data.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.nome}</TableCell>
                <TableCell>{v.cargo ?? "-"}</TableCell>
                <TableCell className="tabular-nums">{v.telefone ?? "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(v.meta_mensal)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(v.percentual_comissao ?? 0).toFixed(2)}%</TableCell>
                <TableCell>
                  <Badge variant={v.ativo ? "default" : "secondary"}>{v.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir vendedor</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(v.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
