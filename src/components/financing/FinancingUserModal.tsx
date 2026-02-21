import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, User, Phone, Mail, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackSimulatorRegistration } from "@/lib/analytics";

interface FinancingUserModalProps {
  open: boolean;
  onSuccess: (userId: string, userData: UserData) => void;
  onClose?: () => void;
}

export interface UserData {
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  tipo_usuario: "visitante" | "corretor";
}

const API_BASE_URL = "https://SEUDOMINIO.com/api";

// Máscara de telefone brasileiro: (00) 00000-0000
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const FinancingUserModal = ({ open, onSuccess, onClose }: FinancingUserModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    tipo_usuario: "visitante" as "visitante" | "corretor",
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneDigits = formData.telefone.replace(/\D/g, "");
    if (!formData.nome.trim() || phoneDigits.length < 10 || !formData.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: phoneDigits.length < 10 
          ? "Informe um telefone válido com DDD."
          : "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Erro ao cadastrar usuário");
      }

      const data = await response.json();
      const userId = data.user_id || crypto.randomUUID();

      // Save to session storage
      const userData: UserData = {
        user_id: userId,
        ...formData,
      };
      sessionStorage.setItem("financing_user", JSON.stringify(userData));

      trackSimulatorRegistration();
      toast({
        title: "Cadastro realizado!",
        description: "Agora você pode acessar o simulador.",
      });

      onSuccess(userId, userData);
    } catch (error) {
      console.error("Error registering user:", error);
      
      // Fallback: generate local user_id for demo purposes
      const userId = crypto.randomUUID();
      const userData: UserData = {
        user_id: userId,
        ...formData,
      };
      sessionStorage.setItem("financing_user", JSON.stringify(userData));
      
      toast({
        title: "Cadastro realizado!",
        description: "Agora você pode acessar o simulador.",
      });
      
      onSuccess(userId, userData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Building2 className="h-6 w-6 text-accent" />
            <span>Simulador de Financiamento</span>
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Cadastre-se para acessar o simulador e descobrir as melhores condições de financiamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent" />
              Nome completo *
            </Label>
            <Input
              id="nome"
              placeholder="Seu nome completo"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="bg-background border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-accent" />
              Telefone *
            </Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={handlePhoneChange}
              className="bg-background border-border"
              inputMode="numeric"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              E-mail *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background border-border"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              Você é: *
            </Label>
            <RadioGroup
              value={formData.tipo_usuario}
              onValueChange={(value: "visitante" | "corretor") =>
                setFormData({ ...formData, tipo_usuario: value })
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="visitante" id="visitante" />
                <Label htmlFor="visitante" className="cursor-pointer">
                  Visitante
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="corretor" id="corretor" />
                <Label htmlFor="corretor" className="cursor-pointer">
                  Corretor
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold py-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cadastrando...
              </>
            ) : (
              "Acessar Simulador"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
