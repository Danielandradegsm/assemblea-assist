import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/comissoes")({
  component: ComissoesPage,
});

type Status = Database["public"]["Enums"]["comissao_status"];
const ST: { v: Status; l: string; tone: string }[] = [
  { v: "pendente", l: "Pendente", tone: "bg-warning/20 text-warning-foreground" },
  { v: "parcial", l: "Parcial", tone: "bg-primary/10 text-primary" },
  { v: "paga", l: "Paga", tone: "bg-success/15 text-success" },
  { v: "cancelada", l: "Cancelada", tone: "bg-destructive/15 text-destructive" },
];

type Row = {
  id: string; cota_id: string; vendedor_id: string | null;
  primeira_parcela: number | null; segunda_parcela: number | null; terceira_parcela: number | null;
  total: number | null; status_pagamento: Status; data_pagamento: string | null;
  cota: { grupo: string | null; cota: string | null; cliente: { nome: string } | null } | null;
  vendedor: { nome: string } | null;
};

function ComissoesPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todas");
  const [vendedorId, setVendedorId] = useState("todos");

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores-lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("vendedores").select("id,nome").order("nome");
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["comissoes", search, status, vendedorId],
    queryFn: async () => {
      let q = supabase
        .from("comissoes")
        .select("*, cota:cotas(grupo,cota, cliente:clientes(nome)), vendedor:vendedores(nome)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (status !== "todas") q = q.eq("status_pagamento", status as Status);
      if (vendedorId !== "todos") q = q.eq("vendedor_id", vendedorId);
      const { data, error } = await q;
      if (error) throw error;
      let list = (data ?? []) as unknown as Row[];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        list = list.filter((r) =>
          [r.cota?.cliente?.nome, r.cota?.grupo, r.cota?.cota, r.vendedor?.nome]
            .filter(Boolean).some((x) => String(x).toLowerCase().includes(s))
        );
      }
      return list;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, st }: { id: string; st: Status }) => {
      const { error } = await supabase.from("comissoes").update({
        status_pagamento: st,
        data_pagamento: st === "paga" ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comissão atualizada");
      qc.invalidateQueries({ queryKey: ["comissoes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalGeral = rows.reduce((a, r) => a + Number(r.total ?? 0), 0);
  const totalPago = rows.filter((r) => r.status_pagamento === "paga").reduce((a, r) => a + Number(r.total ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Comissões</h1>
        <p className="text-sm text-muted-foreground">Acompanhe comissões por vendedor, parcela e status de pagamento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="kpi-card"><p className="text-xs uppercase tracking-wider text-muted-foreground">Comissões (filtradas)</p><p className="text-2xl font-semibold tabular-nums mt-1">{fmtBRL(totalGeral)}</p></Card>
        <Card className="kpi-card"><p className="text-xs uppercase tracking-wider text-muted-foreground">Pagas</p><p className="text-2xl font-semibold tabular-nums mt-1 text-success">{fmtBRL(totalPago)}</p></Card>
        <Card className="kpi-card"><p className="text-xs uppercase tracking-wider text-muted-foreground">A pagar</p><p className="text-2xl font-semibold tabular-nums mt-1 text-primary">{fmtBRL(totalGeral - totalPago)}</p></Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[240px]" />
          <Select value={vendedorId} onValueChange={setVendedorId}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              {ST.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente / Cota</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">1ª</TableHead>
                <TableHead className="text-right">2ª</TableHead>
                <TableHead className="text-right">3ª</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Pagto</TableHead>
                <TableHead className="w-44">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma comissão.</TableCell></TableRow>
              ) : rows.map((r) => {
                const s = ST.find((x) => x.v === r.status_pagamento);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.cota?.cliente?.nome ?? "-"}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{r.cota?.grupo ?? "-"}/{r.cota?.cota ?? "-"}</div>
                    </TableCell>
                    <TableCell>{r.vendedor?.nome ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.primeira_parcela)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.segunda_parcela)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.terceira_parcela)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtBRL(r.total)}</TableCell>
                    <TableCell>{fmtDate(r.data_pagamento)}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={r.status_pagamento} onValueChange={(v) => update.mutate({ id: r.id, st: v as Status })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ST.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={s?.tone}>{s?.l}</Badge>
                      )}
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
