import { useState, useEffect } from "react";
import { FinancingUserModal, type UserData } from "./FinancingUserModal";
import { FinancingSimulator } from "./FinancingSimulator";
import { Building2, Calculator, TrendingUp, Shield } from "lucide-react";

export const FinancingSection = () => {
  const [showModal, setShowModal] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Check if user is already registered
    const storedUser = sessionStorage.getItem("financing_user");
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser));
      } catch {
        sessionStorage.removeItem("financing_user");
      }
    }
  }, []);

  const handleUserSuccess = (userId: string, data: UserData) => {
    setUserData(data);
    setShowModal(false);
  };

  const handleStartSimulation = () => {
    if (!userData) {
      setShowModal(true);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simulador de <span className="text-accent">Financiamento</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra as melhores condições de financiamento para o seu imóvel. 
            Compare taxas e encontre o banco ideal para você.
          </p>
        </div>

        {!userData ? (
          // Show CTA when user is not registered
          <div className="max-w-4xl mx-auto">
            <div 
              onClick={handleStartSimulation}
              className="group cursor-pointer bg-card border-2 border-accent/30 rounded-2xl p-8 md:p-12 shadow-2xl hover:shadow-accent/20 hover:border-accent transition-all duration-300"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4">
                    <Calculator className="h-4 w-4" />
                    Simulação Gratuita
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">
                    Calcule seu Financiamento Imobiliário
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Compare as melhores taxas dos principais bancos e descubra 
                    qual oferece as condições ideais para o seu perfil.
                  </p>
                  <button className="bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors group-hover:scale-105 transform duration-300">
                    Iniciar Simulação
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/50 rounded-xl text-center">
                    <Building2 className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium">5+ Bancos</p>
                    <p className="text-xs text-muted-foreground">Para comparar</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-xl text-center">
                    <TrendingUp className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium">Melhores Taxas</p>
                    <p className="text-xs text-muted-foreground">Do mercado</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-xl text-center">
                    <Calculator className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium">Resultado</p>
                    <p className="text-xs text-muted-foreground">Instantâneo</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-xl text-center">
                    <Shield className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium">100% Seguro</p>
                    <p className="text-xs text-muted-foreground">Seus dados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Show simulator when user is registered
          <div className="max-w-4xl mx-auto">
            <FinancingSimulator userData={userData} />
          </div>
        )}

        {/* User registration modal */}
        <FinancingUserModal 
          open={showModal} 
          onSuccess={handleUserSuccess}
          onClose={() => setShowModal(false)}
        />
      </div>
    </section>
  );
};
