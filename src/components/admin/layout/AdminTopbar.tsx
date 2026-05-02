import { Bell, Menu, LogOut, Zap, Users, MessageSquare, Building2, Plus, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminTopbarProps {
  title?: string;
  subtitle?: string;
  onMenuClick: () => void;
  unseenCount?: number;
  connected?: boolean;
  onBellClick?: () => void;
  rightSlot?: React.ReactNode;
}

export function AdminTopbar({
  title = "Painel Administrativo",
  subtitle,
  onMenuClick,
  unseenCount = 0,
  connected = true,
  onBellClick,
  rightSlot,
}: AdminTopbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center px-4 lg:px-6 gap-3 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 text-slate-600"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold text-slate-800 truncate">{title}</h1>
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              connected
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              )}
            />
            {connected ? "Online" : "Reconectando"}
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {rightSlot}

        {/* Central de Ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
              aria-label="Central de Ações"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold">Ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">
              Atalhos rápidos
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/leads")} className="cursor-pointer">
              <Users className="w-4 h-4 mr-2 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">Leads</div>
                <div className="text-[10px] text-slate-500">Gerenciar contatos e CRM</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/conversas")} className="cursor-pointer">
              <MessageSquare className="w-4 h-4 mr-2 text-emerald-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">Conversas</div>
                <div className="text-[10px] text-slate-500">Omnichat unificado</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
              <Building2 className="w-4 h-4 mr-2 text-amber-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">Imóveis</div>
                <div className="text-[10px] text-slate-500">Painel de propriedades</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">
              Criar
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/add-property")} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2 text-slate-600" />
              <span className="text-sm">Novo imóvel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/super-admin")} className="cursor-pointer">
              <BarChart3 className="w-4 h-4 mr-2 text-slate-600" />
              <span className="text-sm">Visão geral</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/super-admin?tab=visits")} className="cursor-pointer">
              <Calendar className="w-4 h-4 mr-2 text-slate-600" />
              <span className="text-sm">Agendamentos</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {rightSlot ? null : null}
          onClick={onBellClick}
          className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Notificações"
        >
          <Bell className={cn("w-5 h-5", unseenCount > 0 && "text-amber-600")} />
          {unseenCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unseenCount > 99 ? "99+" : unseenCount}
            </span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-2 pl-3 ml-1 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
            {(user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="leading-tight max-w-[160px]">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {user?.email?.split("@")[0] ?? "Usuário"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50"
          aria-label="Sair"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
