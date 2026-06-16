import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Receipt, Trophy } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/cotas")({
  component: CotasPage,
});

type CotaStatus = Database["public"]["Enums"]["cota_status"];

const STATUS: { v: CotaStatus; l: string; tone: string }[] = [
  { v: "ativa", l: "Ativa", tone: "bg-primary/15 text-primary" },
  { v: "aguardando_pagamento", l: "Aguardando pagto", tone: "bg-warning/20 text-warning-foreground" },
  { v: "aguardando_estorno", l: "Aguardando estorno", tone: "bg-warning/20 text-warning-foreground" },
  { v: "finalizada", l: "Finalizada", tone: "bg-success/15 text-success" },
  { v: "estorno_realizado", l: "Estorno realizado", tone: "bg-muted text-muted-foreground" },
  { v: "contemplada", l: "Contemplada", tone: "bg-success/15 text-success" },
  { v: "cancelada", l: "Cancelada", tone: "bg-destructive/15 text-destructive" },
];

type Cota = {
  id: string; cliente_id: string | null; vendedor_id: string | null;
  grupo: string | null; cota: string | null; proposta: string | null;
  assembleia: string | null; data_adesao: string | null;
  valor_credito: number | null; valor_parcela: number | null;
  qtd_parcelas: number | null; vencimento: number | null;
  status: CotaStatus; contemplada: boolean;
  data_contemplacao: string | null; observacoes: string | null;
  cliente?: { nome: string } | null; vendedor?: { nome: string } | null;
};

const schema = z.object({
  cliente_id: z.string().uuid().optional().or(z.literal("")),
  vendedor_id: z.string().uuid().optional().or(z.literal("")),
  grupo: z.string().max(50).optional().or(z.literal("")),
  cota: z.string().max(50).optional().or(z.literal("")),
  proposta: z.string().max(50).optional().or(z.literal("")),
  assembleia: z.string().optional().or(z.literal("")),
  data_adesao: z.string().optional().or(z.literal("")),
  valor_credito: z.string().optional().or(z.literal("")),
  valor_parcela: z.string().optional().or(z.literal("")),
  qtd_parcelas: z.string().optional().or(z.literal("")),
  vencimento: z.string().optional().or(z.literal("")),
  status: z.enum(["ativa","aguardando_pagamento","aguardando_estorno","finalizada","estorno_realizado","contemplada","cancelada"]),
  contemplada: z.boolean(),
  data_contemplacao: z.string().optional().or(z.literal("")),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
});

const empty = {
  cliente_id: "", vendedor_id: "", grupo: "", cota: "", proposta: "",
  assembleia: "", data_adesao: "", valor_credito: "", valor_parcela: "",
  qtd_parcelas: "", vencimento: "10", status: "ativa" as CotaStatus,
  contemplada: false, data_contemplacao: "", observacoes: "",
};

function CotasPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cota | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nome").order("nome").limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendedores").select("id,nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cotas", search, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("cotas")
        .select("*, cliente:clientes(nome), vendedor:vendedores(nome)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (statusFilter !== "todas") q = q.eq("status", statusFilter as CotaStatus);
      const { data, error } = await q;
      if (error) throw error;
      let list = (data ?? []) as unknown as Cota[];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        list = list.filter((c) =>
          [c.grupo, c.cota, c.proposta, c.cliente?.nome, c.vendedor?.nome]
            .filter(Boolean).some((x) => String(x).toLowerCase().includes(s))
        );
      }
      return list;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const p = schema.parse(form);
      const payload = {
        cliente_id: p.cliente_id || null,
        vendedor_id: p.vendedor_id || null,
        grupo: p.grupo || null,
        cota: p.cota || null,
        proposta: p.proposta || null,
        assembleia: p.assembleia || null,
        data_adesao: p.data_adesao || null,
        valor_credito: p.valor_credito ? Number(p.valor_credito) : null,
        valor_parcela: p.valor_parcela ? Number(p.valor_parcela) : null,
        qtd_parcelas: p.qtd_parcelas ? Number(p.qtd_parcelas) : null,
        vencimento: p.vencimento ? Number(p.vencimento) : null,
        status: p.status,
        contemplada: p.contemplada,
        data_contemplacao: p.data_contemplacao || null,
        observacoes: p.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from("cotas").update(payload).eq("id", editing.id);
        if (error) throw error;
        return editing.id;
      } else {
        const { data, error } = await supabase.from("cotas").insert(payload).select("id").single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cota atualizada" : "Cota cadastrada");
      qc.invalidateQueries({ queryKey: ["cotas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cotas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cota excluída");
      qc.invalidateQueries({ queryKey: ["cotas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerarParcelas = useMutation({
    mutationFn: async (c: Cota) => {
      if (!c.qtd_parcelas || c.qtd_parcelas <= 0) throw new Error("Defina qtd. de parcelas na cota");
      const valor = Number(c.valor_parcela ?? 0);
      const dia = Number(c.vencimento ?? 10);
      const base = c.data_adesao ? new Date(c.data_adesao + "T00:00:00") : new Date();
      const { data: existing } = await supabase.from("parcelas").select("numero").eq("cota_id", c.id);
      const have = new Set((existing ?? []).map((p) => p.numero));
      const rows: Database["public"]["Tables"]["parcelas"]["Insert"][] = [];
      for (let i = 1; i <= c.qtd_parcelas; i++) {
        if (have.has(i)) continue;
        const d = new Date(base.getFullYear(), base.getMonth() + i, Math.min(dia, 28));
        rows.push({
          cota_id: c.id, numero: i, valor: valor,
          vencimento: d.toISOString().slice(0, 10), status: "em_aberto",
        });
      }
      if (rows.length === 0) throw new Error("Parcelas já geradas");
      const { error } = await supabase.from("parcelas").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} parcelas geradas`);
      qc.invalidateQueries({ queryKey: ["parcelas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(c: Cota) {
    setEditing(c);
    setForm({
      cliente_id: c.cliente_id ?? "", vendedor_id: c.vendedor_id ?? "",
      grupo: c.grupo ?? "", cota: c.cota ?? "", proposta: c.proposta ?? "",
      assembleia: c.assembleia ?? "", data_adesao: c.data_adesao ?? "",
      valor_credito: c.valor_credito?.toString() ?? "",
      valor_parcela: c.valor_parcela?.toString() ?? "",
      qtd_parcelas: c.qtd_parcelas?.toString() ?? "",
      vencimento: c.vencimento?.toString() ?? "10",
      status: c.status, contemplada: c.contemplada,
      data_contemplacao: c.data_contemplacao ?? "",
      observacoes: c.observacoes ?? "",
    });
    setOpen(true);
  }

  const stMap = useMemo(() => Object.fromEntries(STATUS.map((s) => [s.v, s])), []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Cotas</h1>
          <p className="text-sm text-muted-foreground">Gestão de cotas, contemplações e geração de parcelas.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova cota</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar cota" : "Nova cota"}</DialogTitle>
              </DialogHeader>
              <form
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
              >
                <div className="space-y-2 md:col-span-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— sem cliente —</SelectItem>
                      {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendedor</Label>
                  <Select value={form.vendedor_id || "none"} onValueChange={(v) => setForm({ ...form, vendedor_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— sem vendedor —</SelectItem>
                      {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Grupo</Label>
                  <Input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cota</Label>
                  <Input value={form.cota} onChange={(e) => setForm({ ...form, cota: e.target.value })} /></div>
                <div className="space-y-2"><Label>Proposta</Label>
                  <Input value={form.proposta} onChange={(e) => setForm({ ...form, proposta: e.target.value })} /></div>
                <div className="space-y-2"><Label>Data adesão</Label>
                  <Input type="date" value={form.data_adesao} onChange={(e) => setForm({ ...form, data_adesao: e.target.value })} /></div>
                <div className="space-y-2"><Label>Assembleia</Label>
                  <Input type="date" value={form.assembleia} onChange={(e) => setForm({ ...form, assembleia: e.target.value })} /></div>
                <div className="space-y-2"><Label>Dia vencimento</Label>
                  <Input type="number" min={1} max={31} value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor crédito (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_credito} onChange={(e) => setForm({ ...form, valor_credito: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor parcela (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_parcela} onChange={(e) => setForm({ ...form, valor_parcela: e.target.value })} /></div>
                <div className="space-y-2"><Label>Qtd. parcelas</Label>
                  <Input type="number" value={form.qtd_parcelas} onChange={(e) => setForm({ ...form, qtd_parcelas: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CotaStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Data contemplação</Label>
                  <Input type="date" value={form.data_contemplacao} onChange={(e) => setForm({ ...form, data_contemplacao: e.target.value, contemplada: !!e.target.value })} /></div>
                <div className="space-y-2 md:col-span-3"><Label>Observações</Label>
                  <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
                <DialogFooter className="md:col-span-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por grupo, cota, proposta, cliente, vendedor…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo/Cota</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
                <TableHead>Adesão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma cota.</TableCell></TableRow>
              ) : rows.map((c) => {
                const s = stMap[c.status];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium tabular-nums">{c.grupo ?? "-"} / {c.cota ?? "-"}</TableCell>
                    <TableCell>{c.cliente?.nome ?? "-"}</TableCell>
                    <TableCell>{c.vendedor?.nome ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_credito)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_parcela)}</TableCell>
                    <TableCell>{fmtDate(c.data_adesao)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={s?.tone}>
                        {c.contemplada && <Trophy className="h-3 w-3 mr-1" />}
                        {s?.l ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" title="Ver parcelas">
                          <Link to="/parcelas" search={{ cota: c.id }}><Receipt className="h-4 w-4" /></Link>
                        </Button>
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" title="Gerar parcelas" onClick={() => gerarParcelas.mutate(c)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir cota</AlertDialogTitle>
                                  <AlertDialogDescription>Parcelas e comissões vinculadas também serão removidas.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove.mutate(c.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
