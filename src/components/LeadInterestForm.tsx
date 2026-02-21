import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackFormSubmit } from "@/lib/analytics";
import { Loader2, CheckCircle } from "lucide-react";

interface LeadInterestFormProps {
  variant?: "default" | "compact";
}

export const LeadInterestForm = ({ variant = "default" }: LeadInterestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    tipo_imovel: "",
    finalidade: "",
    descricao: "",
  });

  const getOrigemFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    
    if (utmSource) {
      return `${utmSource}${utmMedium ? ` - ${utmMedium}` : ""}${utmCampaign ? ` (${utmCampaign})` : ""}`;
    }
    
    const referrer = document.referrer;
    if (referrer.includes("instagram")) return "instagram";
    if (referrer.includes("facebook")) return "facebook";
    if (referrer.includes("google")) return "google";
    if (referrer.includes("whatsapp")) return "whatsapp";
    
    return "site";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    if (!formData.nome.trim() || !formData.telefone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha seu nome e telefone.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("leads_imobiliarios").insert({
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim() || null,
        tipo_imovel: formData.tipo_imovel || null,
        finalidade: formData.finalidade || null,
        descricao: formData.descricao.trim() || null,
        origem: getOrigemFromUrl(),
        pagina_origem: window.location.href,
        status: "novo",
      });

      if (error) throw error;

      setIsSuccess(true);
      trackFormSubmit('lead_interest', { tipo_imovel: formData.tipo_imovel, finalidade: formData.finalidade });
      setFormData({
        nome: "",
        telefone: "",
        email: "",
        tipo_imovel: "",
        finalidade: "",
        descricao: "",
      });

      toast({
        title: "Solicitação enviada!",
        description: "Recebemos sua solicitação. Um especialista entrará em contato em breve.",
      });

      // Reset success state after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error: any) {
      console.error("Error submitting lead:", error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-primary mb-2">Solicitação Enviada!</h3>
          <p className="text-muted-foreground">
            Recebemos sua solicitação. Um especialista entrará em contato em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-primary">Tenho Interesse em um Imóvel</CardTitle>
        <p className="text-muted-foreground">
          Preencha o formulário e entraremos em contato
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input 
              placeholder="Seu nome completo *" 
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
            <Input 
              placeholder="Seu telefone *" 
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              required
            />
          </div>
          <Input 
            placeholder="Seu e-mail" 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              value={formData.tipo_imovel}
              onValueChange={(value) => setFormData({ ...formData, tipo_imovel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="rural">Propriedade Rural</SelectItem>
                <SelectItem value="terreno">Terreno</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={formData.finalidade}
              onValueChange={(value) => setFormData({ ...formData, finalidade: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Finalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprar">Comprar</SelectItem>
                <SelectItem value="alugar">Alugar</SelectItem>
                <SelectItem value="investir">Investir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea 
            placeholder="Descreva o imóvel que você procura (localização, características, orçamento...)" 
            rows={4}
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />
          
          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Interesse"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
