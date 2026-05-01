import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OmnichatInboxPanel } from "@/components/admin/OmnichatInboxPanel";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { NotificationControlPanel } from "@/components/admin/NotificationControlPanel";
import { RefreshCw } from "lucide-react";

const Conversas = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);

  const notifications = useAdminNotifications({
    enabled: !loading && !!user,
    userId: user?.id ?? null,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      <AdminLayout
        title="Omnichat"
        subtitle="Atendimento unificado WhatsApp · Instagram · Chat"
        unseenCount={notifications.unseenCount}
        connected={notifications.connected}
        onBellClick={() => setBellOpen((v) => !v)}
        bleed
      >
        <div className="flex-1 min-h-0 p-3 lg:p-4 flex flex-col">
          <OmnichatInboxPanel />
        </div>
      </AdminLayout>
      <NotificationControlPanel
        prefs={notifications.prefs}
        setPrefs={notifications.setPrefs}
        unseenCount={notifications.unseenCount}
        connected={notifications.connected}
        acknowledge={notifications.acknowledge}
        previewLead={notifications.previewLead}
        previewMessage={notifications.previewMessage}
      />
    </>
  );
};

export default Conversas;
