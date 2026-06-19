import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileSpreadsheet, DollarSign, TrendingUp, Trophy, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, fmtNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type MesTotal = { mes: string; itauCredito: number; tradicaoCredito: number; totalGeral: number; itauComissao: number; tradicaoComissao: number; totalComissao: number };

const MES_ORDER = ["JANEIRO","FEVEREIRO","MARCO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
function mesKey(mes: string): number {
  const m = mes.toUpperCase().match(/([A-ZÇÃ]+)\s*(\d{4})/);
  if (!m) return 0;
  const idx = MES_ORDER.indexOf(m[1]);
  return Number(m[2]) * 100 + (idx >= 0 ? idx : 99);
}

async function loadStats() {
  const [clientes, cotas, cotasAll, comissoes, contemplados, parcelasAtrasadas, vendedores, parcelasStatus, comissoesMes] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("cotas").select("id", { count: "exact", head: true }),
    supabase.from("cotas").select("valor_credito,data_adesao,vendedor_id,status"),
    supabase.from("comissoes").select("total,vendedor_id"),
    supabase.from("cotas").select("id", { count: "exact", head: true }).eq("contemplada", true),
    supabase.from("parcelas").select("cota_id", { count: "exact", head: true }).eq("status", "atrasada"),
    supabase.from("vendedores").select("id,nome"),
    supabase.from("parcelas").select("status"),
    supabase.from("comissoes").select("total,mes_referencia,administradora,cota:cotas(valor_credito)"),
  ]);
...
    statusParcelas,
    totaisMes,
  };
}

function Kpi({ icon: Icon, label, value, tone = "primary" }: { icon: React.ElementType; label: string; value: string; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums truncate">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: loadStats });
  const s = data ?? {
    clientes: 0, cotas: 0, totalVendido: 0, totalComissoes: 0, contemplados: 0, inadimplentes: 0,
    vendasMes: [] as { mes: string; total: number }[],
    comissoesVend: [] as { vendedor: string; total: number }[],
    statusParcelas: [] as { name: string; value: number }[],
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do consórcio em tempo real.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="Clientes" value={fmtNumber(s.clientes)} />
        <Kpi icon={FileSpreadsheet} label="Cotas" value={fmtNumber(s.cotas)} />
        <Kpi icon={DollarSign} label="Total Vendido" value={fmtBRL(s.totalVendido)} tone="success" />
        <Kpi icon={TrendingUp} label="Comissões" value={fmtBRL(s.totalComissoes)} tone="primary" />
        <Kpi icon={Trophy} label="Contemplados" value={fmtNumber(s.contemplados)} tone="warning" />
        <Kpi icon={AlertTriangle} label="Inadimplentes" value={fmtNumber(s.inadimplentes)} tone="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Vendas por mês (R$)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.vendasMes} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v as number)} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtBRL(v)}
                />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Top vendedores · comissões (R$)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.comissoesVend} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v as number)} />
                <YAxis type="category" dataKey="vendedor" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtBRL(v)}
                />
                <Bar dataKey="total" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3">Distribuição de parcelas</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={s.statusParcelas} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {s.statusParcelas.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {isLoading && <p className="text-xs text-muted-foreground">Atualizando indicadores…</p>}
    </div>
  );
}
