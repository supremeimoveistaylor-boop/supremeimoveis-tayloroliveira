import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
  CalendarCheck,
  Wallet,
  Phone,
  Headphones,
  BarChart3,
  TrendingUp,
  Search,
  Newspaper,
  Home,
  Globe,
  HardDrive,
  Archive,
  BellRing,
  Zap,
  UserCog,
  FileText,
  Shield,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: any;
  search?: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    defaultOpen: true,
    items: [
      { label: "Dashboard", to: "/super-admin", icon: LayoutDashboard, search: "?tab=admin-dashboard" },
      { label: "Visão Geral", to: "/super-admin", icon: Shield, search: "?tab=overview" },
    ],
  },
  {
    label: "Atendimento",
    defaultOpen: true,
    items: [
      { label: "Omnichat", to: "/conversas", icon: MessageSquare },
      { label: "Sessões de Chat", to: "/super-admin", icon: Phone, search: "?tab=sessions" },
      { label: "Atendentes", to: "/super-admin", icon: Headphones, search: "?tab=attendants" },
      { label: "Follow-ups", to: "/super-admin", icon: BellRing, search: "?tab=followup-alerts" },
      { label: "Performance Chat", to: "/super-admin", icon: Zap, search: "?tab=chat-performance" },
    ],
  },
  {
    label: "CRM & Leads",
    defaultOpen: true,
    items: [
      { label: "Leads", to: "/leads", icon: Users },
      { label: "Leads do Site", to: "/super-admin", icon: MessageSquare, search: "?tab=leads" },
      { label: "CRM Kanban", to: "/super-admin", icon: Kanban, search: "?tab=crm" },
      { label: "Agendamentos", to: "/super-admin", icon: CalendarCheck, search: "?tab=visits" },
      { label: "Conversões", to: "/super-admin", icon: TrendingUp, search: "?tab=conversions" },
      { label: "Métricas", to: "/super-admin", icon: BarChart3, search: "?tab=metrics" },
    ],
  },
  {
    label: "Imóveis",
    items: [
      { label: "Meus Imóveis", to: "/dashboard", icon: Home },
      { label: "Captação", to: "/super-admin", icon: Home, search: "?tab=captacao" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Controle Financeiro", to: "/super-admin", icon: Wallet, search: "?tab=financial" },
    ],
  },
  {
    label: "Marketing & SEO",
    items: [
      { label: "SEO Inteligente", to: "/super-admin", icon: Search, search: "?tab=seo" },
      { label: "Blog", to: "/admin", icon: Newspaper, search: "?tab=blog" },
      { label: "Origens", to: "/admin", icon: Globe, search: "?tab=sources" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Conexões Meta", to: "/super-admin", icon: MessageSquare, search: "?tab=connections" },
      { label: "Usuários", to: "/super-admin", icon: UserCog, search: "?tab=users" },
      { label: "Auditoria", to: "/super-admin", icon: FileText, search: "?tab=audit" },
      { label: "Arquivamento", to: "/admin", icon: Archive, search: "?tab=archive" },
      { label: "Storage", to: "/admin", icon: HardDrive, search: "?tab=storage" },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { pathname, search } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_GROUPS.map((g) => [g.label, g.defaultOpen ?? false]))
  );

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isItemActive = (item: NavItem) => {
    if (pathname !== item.to) return false;
    if (!item.search) return search === "" || search === "?";
    return search.includes(item.search.replace("?", ""));
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 shrink-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-500/20">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800">Supreme</p>
              <p className="text-[10px] text-slate-500 font-medium">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups[group.label];
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-2 mb-1.5 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 text-slate-400 transition-transform",
                      isOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={`${item.to}${item.search ?? ""}-${item.label}`}
                          to={`${item.to}${item.search ?? ""}`}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                            active
                              ? "bg-amber-50 text-amber-700 shadow-sm"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0",
                              active ? "text-amber-600" : "text-slate-400"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                          {active && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            Supreme Empreendimentos
            <br />
            CRECI 20.316
          </p>
        </div>
      </aside>
    </>
  );
}
