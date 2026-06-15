import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { fmtDate, maskCpfCnpj, maskPhone } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

type Cliente = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  rg: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
};

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(200),
  cpf_cnpj: z.string().max(20).optional().or(z.literal("")),
  rg: z.string().max(20).optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  telefone: z.string().max(20).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().max(255).optional().or(z.literal("")),
  cep: z.string().max(10).optional().or(z.literal("")),
  cidade: z.string().max(100).optional().or(z.literal("")),
  estado: z.string().max(2).optional().or(z.literal("")),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
});

const empty = {
  nome: "", cpf_cnpj: "", rg: "", data_nascimento: "", telefone: "", whatsapp: "",
  email: "", endereco: "", cep: "", cidade: "", estado: "", observacoes: "",
};

function ClientesPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(empty);

  const { data = [], isLoading } = useQuery({
    queryKey: ["clientes", search],
    queryFn: async () => {
      let q = supabase.from("clientes").select("*").order("nome");
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`nome.ilike.${s},cpf_cnpj.ilike.${s},email.ilike.${s},telefone.ilike.${s}`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed)) payload[k] = v === "" ? null : v;
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(c: Cliente) {
    setEditing(c);
    setForm({
      nome: c.nome ?? "", cpf_cnpj: c.cpf_cnpj ?? "", rg: c.rg ?? "",
      data_nascimento: c.data_nascimento ?? "", telefone: c.telefone ?? "", whatsapp: c.whatsapp ?? "",
      email: c.email ?? "", endereco: c.endereco ?? "", cep: c.cep ?? "",
      cidade: c.cidade ?? "", estado: c.estado ?? "", observacoes: c.observacoes ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastre e gerencie os clientes do consórcio.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              </DialogHeader>
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
              >
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="space-y-2"><Label>CPF/CNPJ</Label>
                  <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: maskCpfCnpj(e.target.value) })} /></div>
                <div className="space-y-2"><Label>RG</Label>
                  <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nascimento</Label>
                  <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></div>
                <div className="space-y-2"><Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} /></div>
                <div className="space-y-2"><Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                <div className="space-y-2"><Label>CEP</Label>
                  <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                <div className="space-y-2"><Label>UF</Label>
                  <Input value={form.estado} maxLength={2} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Observações</Label>
                  <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
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
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Nascimento</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
              ) : data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="tabular-nums">{c.cpf_cnpj ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{c.telefone ?? c.whatsapp ?? "-"}</TableCell>
                  <TableCell>{[c.cidade, c.estado].filter(Boolean).join("/") || "-"}</TableCell>
                  <TableCell>{fmtDate(c.data_nascimento)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. As cotas vinculadas perderão a referência ao cliente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(c.id)}>Excluir</AlertDialogAction>
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
        </div>
      </Card>
    </div>
  );
}
