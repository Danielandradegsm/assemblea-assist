import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCog,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  Upload,
  FileBarChart,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/lib/use-auth";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Vendedores", url: "/vendedores", icon: UserCog },
];

const opItems = [
  { title: "Cotas", url: "/cotas", icon: FileSpreadsheet },
  { title: "Parcelas", url: "/parcelas", icon: Receipt },
  { title: "Comissões", url: "/comissoes", icon: TrendingUp },
];

const toolItems = [
  { title: "Importar Excel", url: "/importar", icon: Upload },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart, disabled: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { user, roles, isAdmin } = useAuth();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">Ceolin Consórcios</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Gestão Inteligente</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      {!collapsed && <span>{i.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operacional</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {opItems.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      {!collapsed && <span>{i.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((i) => (
                <SidebarMenuItem key={i.url}>
                  {i.disabled ? (
                    <SidebarMenuButton disabled className="opacity-60 cursor-not-allowed">
                      <i.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          {i.title}
                          <span className="text-[9px] uppercase tracking-wide text-sidebar-foreground/50">em breve</span>
                        </span>
                      )}
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive(i.url)}>
                      <Link to={i.url} className="flex items-center gap-2">
                        <i.icon className="h-4 w-4" />
                        {!collapsed && <span>{i.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/usuarios")}>
                    <Link to="/usuarios" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Usuários</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-sidebar-border">
        <div className="px-2 py-2 space-y-2">
          {!collapsed && user && (
            <div className="px-2 text-xs">
              <div className="font-medium text-sidebar-foreground truncate">{user.email}</div>
              <div className="text-sidebar-foreground/60">
                {roles.length ? roles.map((r) => ROLE_LABELS[r]).join(", ") : "Sem perfil"}
              </div>
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} className="text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sair</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
