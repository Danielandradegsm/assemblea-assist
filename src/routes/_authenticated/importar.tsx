import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/importar")({
  component: ImportarPage,
});

// Layout do template (linha de cabeçalho = linha 2; dados a partir da linha 3)
// Colunas: A processo, B data_baixa, C assembleia, D cliente, E cpf, F grupo,
// G cota, H venc, I vendedor, J valor_carta, K comissao, L telefone,
// M nascimento, N cep, O situacao, P parc1, Q parc3, R parc4, S parc5,
// T contemplacao, U boletos
type Parsed = {
  cliente_nome: string;
  cpf_cnpj: string;
  vendedor_nome: string;
  grupo: string;
  cota: string;
  proposta: string;
  data_adesao: string | null;
  assembleia: string | null;
  vencimento: number | null;
  valor_credito: number | null;
  comissao_total: number | null;
  telefone: string;
  nascimento: string | null;
  cep: string;
  situacao: string;
  contemplada: boolean;
  data_contemplacao: string | null;
  parcelas: { numero: number; data: string | null }[];
};

function toDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
    return dt.toISOString().slice(0, 10);
  }
  return null;
}
function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : null;
}
function toStr(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}
function normalizeCpf(v: unknown): string {
  return toStr(v).replace(/\D/g, "");
}

function normHeader(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildColMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  const set = (k: string, i: number) => { if (map[k] === undefined) map[k] = i; };
  headerRow.forEach((h, i) => {
    const n = normHeader(h);
    if (!n) return;
    if (n.includes("processo") || n === "fdi" || n.includes("processo fdi")) set("processo", i);
    else if (n.includes("data baixa") || n.includes("baixa credline") || n === "recebido") set("data_baixa", i);
    else if (n.includes("assembleia") || n.includes("data assembleia")) set("assembleia", i);
    else if (n === "cliente" || n.startsWith("cliente ")) set("cliente", i);
    else if (n.includes("cpf")) set("cpf", i);
    else if (n === "grupo") set("grupo", i);
    else if (n === "cota") set("cota", i);
    else if (n === "venc" || n.startsWith("venc ") || n === "vencimento") set("vencimento", i);
    else if (n === "vendedor") set("vendedor", i);
    else if (n.includes("valor carta") || n === "valor") set("valor", i);
    else if (n.includes("comissao vendedor") || n === "comissao" || n.includes("comissao 1")) set("comissao", i);
    else if (n.includes("telefone")) set("telefone", i);
    else if (n.includes("dt nasc") || n.includes("nascimento")) set("nascimento", i);
    else if (n === "cep" || n.startsWith("cep ")) set("cep", i);
    else if (n.includes("situacao")) set("situacao", i);
    else if (n.includes("1 parcela") || n.startsWith("1o parcela") || n.startsWith("1 o parcela")) set("p1", i);
    else if (n.includes("2 parcela") || n.startsWith("2o parcela")) set("p2", i);
    else if (n.includes("3 parcela") || n.startsWith("3o parcela")) set("p3", i);
    else if (n.includes("4 parcela") || n.startsWith("4o parcela")) set("p4", i);
    else if (n.includes("5 parcela") || n.startsWith("5o parcela")) set("p5", i);
    else if (n.includes("contemplacao")) set("contemplacao", i);
  });
  return map;
}

function parseSheet(ws: XLSX.WorkSheet): Parsed[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  // Detect header row: scan up to first 15 rows for one containing "cliente" + "cpf"
  let hi = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const norm = (rows[i] ?? []).map(normHeader);
    if (norm.some((x) => x === "cliente") && norm.some((x) => x.includes("cpf"))) {
      hi = i; break;
    }
  }

  if (hi < 0) return [];
  const col = buildColMap(rows[hi] ?? []);
  const get = (r: unknown[], key: string) => (col[key] !== undefined ? r[col[key]] : null);

  const out: Parsed[] = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const nome = toStr(get(r, "cliente"));
    const cpf = normalizeCpf(get(r, "cpf"));
    if (!nome && !cpf) continue;
    const situacao = toStr(get(r, "situacao")).toLowerCase();
    const contempl = toStr(get(r, "contemplacao"));
    const parcelas = [
      { numero: 1, data: toDate(get(r, "p1")) },
      { numero: 2, data: toDate(get(r, "p2")) },
      { numero: 3, data: toDate(get(r, "p3")) },
      { numero: 4, data: toDate(get(r, "p4")) },
      { numero: 5, data: toDate(get(r, "p5")) },
    ].filter((p) => p.data);
    out.push({
      cliente_nome: nome || "(sem nome)",
      cpf_cnpj: cpf,
      vendedor_nome: toStr(get(r, "vendedor")).toUpperCase(),
      grupo: toStr(get(r, "grupo")),
      cota: toStr(get(r, "cota")),
      proposta: toStr(get(r, "processo")),
      data_adesao: toDate(get(r, "data_baixa")),
      assembleia: toDate(get(r, "assembleia")),
      vencimento: toNum(get(r, "vencimento")),
      valor_credito: toNum(get(r, "valor")),
      comissao_total: toNum(get(r, "comissao")),
      telefone: toStr(get(r, "telefone")),
      nascimento: toDate(get(r, "nascimento")),
      cep: toStr(get(r, "cep")),
      situacao,
      contemplada: /contempl/i.test(contempl) || /contempl/i.test(situacao),
      data_contemplacao: toDate(get(r, "contemplacao")),
      parcelas,
    });
  }
  return out;
}

function statusFromSituacao(s: string, contemplada: boolean) {
  const t = s.toLowerCase();
  if (contemplada) return "contemplada" as const;
  if (t.includes("cancel")) return "cancelada" as const;
  if (t.includes("estorno")) return "estorno_realizado" as const;
  if (t.includes("atraso")) return "aguardando_pagamento" as const;
  if (t.includes("pago")) return "ativa" as const;
  return "ativa" as const;
}

function ImportarPage() {
  const { canEdit } = useAuth();
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState("");
  const [preview, setPreview] = useState<Parsed[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ criados: number; atualizados: number; erros: number; mensagens: string[] } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const w = XLSX.read(data, { type: "array", cellDates: true });
      setWb(w);
      const first = w.SheetNames[0];
      setSheet(first);
      setPreview(parseSheet(w.Sheets[first]));
      setResult(null);
    };
    reader.readAsArrayBuffer(f);
  }

  function onSheetChange(name: string) {
    setSheet(name);
    if (wb) setPreview(parseSheet(wb.Sheets[name]));
    setResult(null);
  }

  async function runImport() {
    if (!preview.length) return;
    setImporting(true);
    let criados = 0, atualizados = 0, erros = 0;
    const mensagens: string[] = [];

    const { data: vendList } = await supabase.from("vendedores").select("id,nome");
    const vendMap = new Map<string, string>((vendList ?? []).map((v) => [v.nome.toUpperCase().trim(), v.id]));

    try {
      for (const row of preview) {
        try {
          // Vendedor: cria se não existe
          let vendedorId: string | null = null;
          if (row.vendedor_nome) {
            const key = row.vendedor_nome.trim();
            if (vendMap.has(key)) vendedorId = vendMap.get(key)!;
            else {
              const { data, error } = await supabase.from("vendedores")
                .insert({ nome: key, ativo: true }).select("id").single();
              if (error) throw error;
              vendedorId = data.id;
              vendMap.set(key, data.id);
            }
          }

          // Cliente: dedupe por CPF; se sem CPF, por nome (case-insensitive)
          let clienteId: string | null = null;
          if (row.cpf_cnpj) {
            const { data: ex } = await supabase.from("clientes").select("id").eq("cpf_cnpj", row.cpf_cnpj).maybeSingle();
            if (ex) clienteId = ex.id;
          }
          if (!clienteId && row.cliente_nome) {
            const { data: ex } = await supabase.from("clientes").select("id")
              .ilike("nome", row.cliente_nome).limit(1).maybeSingle();
            if (ex) clienteId = ex.id;
          }
          const clientePayload = {
            nome: row.cliente_nome,
            cpf_cnpj: row.cpf_cnpj || null,
            telefone: row.telefone || null,
            cep: row.cep || null,
            data_nascimento: row.nascimento,
          };
          if (clienteId) {
            await supabase.from("clientes").update(clientePayload).eq("id", clienteId);
          } else {
            const { data, error } = await supabase.from("clientes").insert(clientePayload).select("id").single();
            if (error) throw error;
            clienteId = data.id;
          }

          // Cota: dedupe por grupo+cota
          let cotaId: string | null = null;
          if (row.grupo && row.cota) {
            const { data: ex } = await supabase.from("cotas").select("id")
              .eq("grupo", row.grupo).eq("cota", row.cota).maybeSingle();
            if (ex) cotaId = ex.id;
          }
          const cotaPayload = {
            cliente_id: clienteId,
            vendedor_id: vendedorId,
            grupo: row.grupo || null,
            cota: row.cota || null,
            proposta: row.proposta || null,
            data_adesao: row.data_adesao,
            assembleia: row.assembleia,
            vencimento: row.vencimento ? Math.min(31, Math.max(1, Math.round(row.vencimento))) : null,
            valor_credito: row.valor_credito,
            status: statusFromSituacao(row.situacao, row.contemplada),
            contemplada: row.contemplada,
            data_contemplacao: row.contemplada ? row.data_contemplacao : null,
          };
          if (cotaId) {
            await supabase.from("cotas").update(cotaPayload).eq("id", cotaId);
            atualizados++;
          } else {
            const { data, error } = await supabase.from("cotas").insert(cotaPayload).select("id").single();
            if (error) throw error;
            cotaId = data.id;
            criados++;
          }

          // Parcelas conhecidas (upsert por cota+numero)
          for (const p of row.parcelas) {
            const { data: ex } = await supabase.from("parcelas")
              .select("id").eq("cota_id", cotaId).eq("numero", p.numero).maybeSingle();
            const pay = { cota_id: cotaId, numero: p.numero, vencimento: p.data, status: "paga" as const, data_pagamento: p.data };
            if (ex) await supabase.from("parcelas").update(pay).eq("id", ex.id);
            else await supabase.from("parcelas").insert(pay);
          }

          // Comissão (1 por cota) — atualiza primeira_parcela com total importado
          if (row.comissao_total != null) {
            const { data: ex } = await supabase.from("comissoes").select("id").eq("cota_id", cotaId).maybeSingle();
            const pay = {
              cota_id: cotaId, vendedor_id: vendedorId,
              primeira_parcela: row.comissao_total, total: row.comissao_total,
              status_pagamento: "pendente" as const,
            };
            if (ex) await supabase.from("comissoes").update(pay).eq("id", ex.id);
            else await supabase.from("comissoes").insert(pay);
          }
        } catch (e) {
          erros++;
          mensagens.push(`${row.cliente_nome}: ${(e as Error).message}`);
        }
      }

      await supabase.from("import_logs").insert({
        arquivo: `${fileName} :: ${sheet}`,
        linhas_processadas: preview.length,
        registros_criados: criados,
        registros_atualizados: atualizados,
        erros,
        detalhes: { mensagens: mensagens.slice(0, 50) },
      });

      setResult({ criados, atualizados, erros, mensagens });
      toast.success(`Importação concluída: ${criados} criadas, ${atualizados} atualizadas, ${erros} erros`);
    } finally {
      setImporting(false);
    }
  }

  if (!canEdit) {
    return <Card className="p-6 text-sm text-muted-foreground">Você não tem permissão para importar dados.</Card>;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Importar Excel</h1>
        <p className="text-sm text-muted-foreground">
          Importe a planilha mensal (modelo <em>ACOMPAN.COMISSOES_PARCELA</em>). Clientes são deduplicados por CPF; cotas por grupo + cota.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Arquivo .xlsx</Label>
            <Input type="file" accept=".xlsx,.xls" onChange={onFile} />
            {fileName && <p className="text-xs text-muted-foreground flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" /> {fileName}</p>}
          </div>
          {wb && (
            <div className="space-y-2">
              <Label>Aba (mês)</Label>
              <Select value={sheet} onValueChange={onSheetChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wb.SheetNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {preview.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 border-t pt-4">
            <div className="text-sm">
              <Badge variant="outline" className="bg-primary/10 text-primary">{preview.length} linhas válidas</Badge>
              <span className="text-muted-foreground ml-2">na aba <strong>{sheet}</strong></span>
            </div>
            <Button onClick={runImport} disabled={importing}>
              <Upload className="h-4 w-4 mr-1" />
              {importing ? "Importando…" : "Importar para o sistema"}
            </Button>
          </div>
        )}
      </Card>

      {result && (
        <Card className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="bg-success/15 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />{result.criados} criadas</Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary">{result.atualizados} atualizadas</Badge>
            {result.erros > 0 && <Badge variant="outline" className="bg-destructive/15 text-destructive"><AlertCircle className="h-3 w-3 mr-1" />{result.erros} erros</Badge>}
          </div>
          {result.mensagens.length > 0 && (
            <ul className="mt-3 text-xs text-muted-foreground space-y-1 max-h-40 overflow-auto">
              {result.mensagens.slice(0, 20).map((m, i) => <li key={i}>• {m}</li>)}
            </ul>
          )}
        </Card>
      )}

      {preview.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Pré-visualização (primeiras 50 linhas)</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="tabular-nums">Grupo/Cota</TableHead>
                  <TableHead>Adesão</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.cliente_nome}</TableCell>
                    <TableCell className="tabular-nums">{r.cpf_cnpj || "-"}</TableCell>
                    <TableCell>{r.vendedor_nome || "-"}</TableCell>
                    <TableCell className="tabular-nums">{r.grupo}/{r.cota}</TableCell>
                    <TableCell>{fmtDate(r.data_adesao)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.valor_credito)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.comissao_total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.situacao || "-"}{r.contemplada ? " · contemplada" : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
