import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OmnichatInboxPanel } from "@/components/admin/OmnichatInboxPanel";
import { RefreshCw } from "lucide-react";

const Conversas = () => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
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
    <div className="min-h-screen bg-background">
      <div className="p-4 h-screen flex flex-col">
        <OmnichatInboxPanel />
      </div>
    </div>
  );
};

export default Conversas;
