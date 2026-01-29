import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FinancingDashboard } from "@/components/financing/FinancingDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldCheck } from "lucide-react";

const FinancingAdmin = () => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      
      // Check if user has admin access
      if (isAdmin || isSuperAdmin) {
        setIsAuthorized(true);
      } else {
        navigate("/");
      }
    }
  }, [user, loading, isAdmin, isSuperAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard <span className="text-accent">Financiamento</span>
          </h1>
          <p className="text-muted-foreground">
            Painel administrativo do simulador de financiamento imobiliário
          </p>
        </div>
        
        <FinancingDashboard />
      </main>
      <Footer />
    </div>
  );
};

export default FinancingAdmin;
