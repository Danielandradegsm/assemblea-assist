import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Tipo = "cotas" | "comissoes" | "parcelas";

type CotaRow = {
  id: string;
  grupo: string | null;
  cota: string | null;
  data_adesao: string | null;
  valor_credito: number | null;
  status: string | null;
  contemplada: boolean | null;
  clientes: { nome: string | null; cpf_cnpj: string | null } | null;
  vendedores: { nome: string | null } | null;
};

type ComissaoRow = {
  id: string;
  total: number | null;
  status_pagamento: string | null;
  created_at: string;
  vendedores: { nome: string | null } | null;
  cotas: { grupo: string | null; cota: string | null; clientes: { nome: string | null } | null } | null;
};

type ParcelaRow = {
  id: string;
  numero: number;
  vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  cotas: { grupo: string | null; cota: string | null; clientes: { nome: string | null } | null } | null;
};

async function loadReport(tipo: Tipo, from: string | null, to: string | null) {
  if (tipo === "cotas") {
    let q = supabase.from("cotas").select("id,grupo,cota,data_adesao,valor_credito,status,contemplada,clientes(nome,cpf_cnpj),vendedores(nome)").order("data_adesao", { ascending: false }).limit(2000);
    if (from) q = q.gte("data_adesao", from);
    if (to) q = q.lte("data_adesao", to);
    const { data, error } = await q;
    if (error) throw error;
    return data as unknown as CotaRow[];
  }
  if (tipo === "comissoes") {
    let q = supabase.from("comissoes").select("id,total,status_pagamento,created_at,vendedores(nome),cotas(grupo,cota,clientes(nome))").order("created_at", { ascending: false }).limit(2000);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to + "T23:59:59");
    const { data, error } = await q;
    if (error) throw error;
    return data as unknown as ComissaoRow[];
  }
  let q = supabase.from("parcelas").select("id,numero,vencimento,data_pagamento,status,cotas(grupo,cota,clientes(nome))").order("vencimento", { ascending: false }).limit(2000);
  if (from) q = q.gte("vencimento", from);
  if (to) q = q.lte("vencimento", to);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as ParcelaRow[];
}

function tableShape(tipo: Tipo, rows: CotaRow[] | ComissaoRow[] | ParcelaRow[]) {
  if (tipo === "cotas") {
    const r = rows as CotaRow[];
    return {
      headers: ["Cliente", "CPF/CNPJ", "Vendedor", "Grupo/Cota", "Adesão", "Crédito", "Status", "Contemplada"],
      body: r.map((x) => [
        x.clientes?.nome ?? "-",
        x.clientes?.cpf_cnpj ?? "-",
        x.vendedores?.nome ?? "-",
        `${x.grupo ?? ""}/${x.cota ?? ""}`,
        fmtDate(x.data_adesao),
        fmtBRL(x.valor_credito),
        x.status ?? "-",
        x.contemplada ? "Sim" : "Não",
      ]),
    };
  }
  if (tipo === "comissoes") {
    const r = rows as ComissaoRow[];
    return {
      headers: ["Vendedor", "Cliente", "Grupo/Cota", "Total", "Status", "Data"],
      body: r.map((x) => [
        x.vendedores?.nome ?? "-",
        x.cotas?.clientes?.nome ?? "-",
        `${x.cotas?.grupo ?? ""}/${x.cotas?.cota ?? ""}`,
        fmtBRL(x.total),
        x.status_pagamento ?? "-",
        fmtDate(x.created_at),
      ]),
    };
  }
  const r = rows as ParcelaRow[];
  return {
    headers: ["Cliente", "Grupo/Cota", "Nº", "Vencimento", "Pagamento", "Status"],
    body: r.map((x) => [
      x.cotas?.clientes?.nome ?? "-",
      `${x.cotas?.grupo ?? ""}/${x.cotas?.cota ?? ""}`,
      x.numero,
      fmtDate(x.vencimento),
      fmtDate(x.data_pagamento),
      x.status,
    ]),
  };
}

function RelatoriosPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10);
  const [tipo, setTipo] = useState<Tipo>("cotas");
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const query = useQuery({
    queryKey: ["report", tipo, from, to],
    queryFn: () => loadReport(tipo, from || null, to || null),
  });

  const shape = useMemo(() => (query.data ? tableShape(tipo, query.data) : { headers: [], body: [] }), [query.data, tipo]);

  function exportXlsx() {
    if (!shape.body.length) return toast.error("Sem dados para exportar");
    const ws = XLSX.utils.aoa_to_sheet([shape.headers, ...shape.body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo.toUpperCase());
    XLSX.writeFile(wb, `ceolin-${tipo}-${from}_a_${to}.xlsx`);
    toast.success("Excel exportado");
  }

  function exportPdf() {
    if (!shape.body.length) return toast.error("Sem dados para exportar");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Ceolin Consórcios — ${tipo.toUpperCase()}`, 40, 36);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Período: ${fmtDate(from)} a ${fmtDate(to)} · ${shape.body.length} registros`, 40, 52);
    autoTable(doc, {
      head: [shape.headers],
      body: shape.body.map((row) => row.map((c) => String(c))),
      startY: 70,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { left: 40, right: 40 },
    });
    doc.save(`ceolin-${tipo}-${from}_a_${to}.pdf`);
    toast.success("PDF exportado");
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Filtre por período e exporte em Excel ou PDF.</p>
      </div>

      <Card className="p-5 grid gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Tipo de relatório</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cotas">Cotas</SelectItem>
              <SelectItem value="comissoes">Comissões</SelectItem>
              <SelectItem value="parcelas">Parcelas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={exportXlsx} className="flex-1"><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button onClick={exportPdf} variant="outline" className="flex-1"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Pré-visualização</h2>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            <FileDown className="h-3 w-3 mr-1" />
            {shape.body.length} registros
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {shape.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shape.body.slice(0, 100).map((row, i) => (
                <TableRow key={i}>
                  {row.map((c, j) => <TableCell key={j} className="text-xs">{String(c)}</TableCell>)}
                </TableRow>
              ))}
              {!shape.body.length && (
                <TableRow><TableCell colSpan={shape.headers.length || 1} className="text-center text-sm text-muted-foreground py-8">
                  {query.isLoading ? "Carregando…" : "Nenhum registro no período"}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
