import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileSpreadsheet, DollarSign, TrendingUp, Trophy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, fmtNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

async function loadStats() {
  const [clientes, cotas, cotasAgg, comissoes, contemplados, parcelasAtrasadas] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("cotas").select("id", { count: "exact", head: true }),
    supabase.from("cotas").select("valor_credito"),
    supabase.from("comissoes").select("total"),
    supabase.from("cotas").select("id", { count: "exact", head: true }).eq("contemplada", true),
    supabase.from("parcelas").select("cota_id", { count: "exact", head: true }).eq("status", "atrasada"),
  ]);
  const totalVendido = (cotasAgg.data ?? []).reduce((a, r) => a + Number(r.valor_credito ?? 0), 0);
  const totalComissoes = (comissoes.data ?? []).reduce((a, r) => a + Number(r.total ?? 0), 0);
  return {
    clientes: clientes.count ?? 0,
    cotas: cotas.count ?? 0,
    totalVendido,
    totalComissoes,
    contemplados: contemplados.count ?? 0,
    inadimplentes: parcelasAtrasadas.count ?? 0,
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
  const s = data ?? { clientes: 0, cotas: 0, totalVendido: 0, totalComissoes: 0, contemplados: 0, inadimplentes: 0 };

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

      <Card className="p-6">
        <h2 className="text-base font-semibold mb-2">Próximas etapas</h2>
        <p className="text-sm text-muted-foreground">
          Esta é a Fase 1 do <strong>Ceolin Consórcios</strong>: fundação, autenticação, dashboard e cadastros de
          Clientes e Vendedores. As próximas fases incluirão Cotas, Parcelas, Comissões, Importação de Excel mensal,
          Relatórios em PDF/Excel e Gráficos interativos.
        </p>
        {isLoading && <p className="text-xs text-muted-foreground mt-3">Atualizando indicadores…</p>}
      </Card>
    </div>
  );
}
