import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

const searchSchema = z.object({ cota: z.string().optional() });

export const Route = createFileRoute("/_authenticated/parcelas")({
  validateSearch: searchSchema,
  component: ParcelasPage,
});

type Status = Database["public"]["Enums"]["parcela_status"];
const ST: { v: Status; l: string; tone: string }[] = [
  { v: "paga", l: "Paga", tone: "bg-success/15 text-success" },
  { v: "em_aberto", l: "Em aberto", tone: "bg-primary/10 text-primary" },
  { v: "atrasada", l: "Atrasada", tone: "bg-destructive/15 text-destructive" },
  { v: "cancelada", l: "Cancelada", tone: "bg-muted text-muted-foreground" },
];

type Parcela = {
  id: string; cota_id: string; numero: number; valor: number | null;
  vencimento: string | null; status: Status; data_pagamento: string | null;
  cota?: { grupo: string | null; cota: string | null; cliente: { nome: string } | null } | null;
};

function ParcelasPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const { cota } = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<string>(cota ? "todas" : "em_aberto");
  const [search, setSearch] = useState("");

  const { data: cotaInfo } = useQuery({
    queryKey: ["cota-info", cota],
    enabled: !!cota,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotas").select("grupo,cota, cliente:clientes(nome)").eq("id", cota!).single();
      if (error) throw error;
      return data as { grupo: string | null; cota: string | null; cliente: { nome: string } | null };
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["parcelas", cota, statusFilter, search],
    queryFn: async () => {
      let q = supabase
        .from("parcelas")
        .select("*, cota:cotas(grupo,cota, cliente:clientes(nome))")
        .order("vencimento", { ascending: true })
        .limit(500);
      if (cota) q = q.eq("cota_id", cota);
      if (statusFilter !== "todas") q = q.eq("status", statusFilter as Status);
      const { data, error } = await q;
      if (error) throw error;
      let list = (data ?? []) as unknown as Parcela[];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        list = list.filter((p) =>
          [p.cota?.cliente?.nome, p.cota?.grupo, p.cota?.cota]
            .filter(Boolean).some((x) => String(x).toLowerCase().includes(s))
        );
      }
      return list;
    },
  });

  const mark = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const payload: { status: Status; data_pagamento: string | null } = {
        status,
        data_pagamento: status === "paga" ? new Date().toISOString().slice(0, 10) : null,
      };
      const { error } = await supabase.from("parcelas").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parcela atualizada");
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {cota && (
              <Button asChild variant="ghost" size="icon"><Link to="/cotas"><ArrowLeft className="h-4 w-4" /></Link></Button>
            )}
            Parcelas
          </h1>
          <p className="text-sm text-muted-foreground">
            {cota && cotaInfo
              ? <>Cota <strong>{cotaInfo.grupo}/{cotaInfo.cota}</strong> — {cotaInfo.cliente?.nome ?? "sem cliente"}</>
              : "Acompanhamento de pagamentos das parcelas."}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Input placeholder="Buscar por cliente, grupo, cota…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[240px]" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                <TableHead className="w-16">Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cota</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma parcela.</TableCell></TableRow>
              ) : rows.map((p) => {
                const s = ST.find((x) => x.v === p.status);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="tabular-nums">{p.numero}</TableCell>
                    <TableCell>{p.cota?.cliente?.nome ?? "-"}</TableCell>
                    <TableCell className="tabular-nums">{p.cota?.grupo ?? "-"}/{p.cota?.cota ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(p.valor)}</TableCell>
                    <TableCell>{fmtDate(p.vencimento)}</TableCell>
                    <TableCell>{fmtDate(p.data_pagamento)}</TableCell>
                    <TableCell><Badge variant="outline" className={s?.tone}>{s?.l ?? p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          {p.status !== "paga" && (
                            <Button size="icon" variant="ghost" className="text-success" title="Marcar paga"
                              onClick={() => mark.mutate({ id: p.id, status: "paga" })}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {p.status === "paga" && (
                            <Button size="icon" variant="ghost" title="Reabrir"
                              onClick={() => mark.mutate({ id: p.id, status: "em_aberto" })}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
