import { useState, ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

interface AdminLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  unseenCount?: number;
  connected?: boolean;
  onBellClick?: () => void;
  rightSlot?: ReactNode;
  /** Quando true, remove padding da área de conteúdo (útil p/ Omnichat fullscreen). */
  bleed?: boolean;
}

export function AdminLayout({
  title,
  subtitle,
  children,
  unseenCount,
  connected,
  onBellClick,
  rightSlot,
  bleed = false,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          unseenCount={unseenCount}
          connected={connected}
          onBellClick={onBellClick}
          rightSlot={rightSlot}
        />

        <main
          className={
            bleed
              ? "flex-1 min-h-0 flex flex-col"
              : "flex-1 min-h-0 px-4 lg:px-6 py-5 lg:py-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
