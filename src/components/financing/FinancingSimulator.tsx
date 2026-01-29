import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, Building, Percent, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinancingResult } from "./FinancingResult";
import { BankComparison } from "./BankComparison";
import type { UserData } from "./FinancingUserModal";

interface FinancingSimulatorProps {
  userData: UserData;
}

export interface SimulationResult {
  parcela: number;
  cet: number;
  percentual_renda: number;
  status: "aprovável" | "renda_insuficiente";
  banco?: string;
}

export interface BankResult {
  banco: string;
  parcela: number;
  cet: number;
  status: "aprovável" | "renda_insuficiente";
}

const API_BASE_URL = "https://SEUDOMINIO.com/api";

const BANCOS = [
  { id: 1, nome: "Caixa Econômica" },
  { id: 2, nome: "Banco do Brasil" },
  { id: 3, nome: "Itaú" },
  { id: 4, nome: "Bradesco" },
  { id: 5, nome: "Santander" },
];

const RENDAS = [
  { value: 10000, label: "R$ 10.000" },
  { value: 20000, label: "R$ 20.000" },
  { value: 50000, label: "R$ 50.000+" },
];

const PRAZOS = [
  { value: 20, label: "20 anos" },
  { value: 25, label: "25 anos" },
  { value: 30, label: "30 anos" },
];

export const FinancingSimulator = ({ userData }: FinancingSimulatorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [bankResults, setBankResults] = useState<BankResult[] | null>(null);
  
  const [formData, setFormData] = useState({
    valor_imovel: "",
    renda_mensal: "",
    entrada: "",
    usar_fgts: false,
    valor_fgts: "",
    prazo_anos: "",
    banco_id: "",
  });

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(Number(numericValue) / 100);
    return formatted;
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, "")) / 100;
  };

  const handleSimulate = async () => {
    if (!formData.valor_imovel || !formData.renda_mensal || !formData.entrada || !formData.prazo_anos || !formData.banco_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para simular.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setBankResults(null);

    try {
      const payload = {
        user_id: userData.user_id,
        valor_imovel: parseCurrency(formData.valor_imovel),
        entrada: parseCurrency(formData.entrada),
        fgts: formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0,
        renda: Number(formData.renda_mensal),
        prazo: Number(formData.prazo_anos),
        banco_id: Number(formData.banco_id),
      };

      const response = await fetch(`${API_BASE_URL}/simulador/calcular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erro ao calcular");

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error calculating:", error);
      // Demo fallback
      const valorFinanciado = parseCurrency(formData.valor_imovel) - parseCurrency(formData.entrada) - (formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0);
      const taxa = 0.0085; // 0.85% a.m.
      const prazoMeses = Number(formData.prazo_anos) * 12;
      const parcela = valorFinanciado * (taxa * Math.pow(1 + taxa, prazoMeses)) / (Math.pow(1 + taxa, prazoMeses) - 1);
      const percentualRenda = (parcela / Number(formData.renda_mensal)) * 100;
      
      setResult({
        parcela: Math.round(parcela),
        cet: 10.5,
        percentual_renda: Math.round(percentualRenda * 10) / 10,
        status: percentualRenda <= 30 ? "aprovável" : "renda_insuficiente",
        banco: BANCOS.find(b => b.id === Number(formData.banco_id))?.nome,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareAll = async () => {
    if (!formData.valor_imovel || !formData.renda_mensal || !formData.entrada || !formData.prazo_anos) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para comparar.",
        variant: "destructive",
      });
      return;
    }

    setIsComparing(true);
    setResult(null);

    try {
      const payload = {
        user_id: userData.user_id,
        valor_imovel: parseCurrency(formData.valor_imovel),
        entrada: parseCurrency(formData.entrada),
        fgts: formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0,
        renda: Number(formData.renda_mensal),
        prazo: Number(formData.prazo_anos),
      };

      const response = await fetch(`${API_BASE_URL}/simulador/comparar-bancos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erro ao comparar");

      const data = await response.json();
      setBankResults(data);
    } catch (error) {
      console.error("Error comparing:", error);
      // Demo fallback
      const valorFinanciado = parseCurrency(formData.valor_imovel) - parseCurrency(formData.entrada) - (formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0);
      const prazoMeses = Number(formData.prazo_anos) * 12;
      
      const demoResults: BankResult[] = BANCOS.map((banco, index) => {
        const taxa = 0.0075 + (index * 0.001);
        const parcela = valorFinanciado * (taxa * Math.pow(1 + taxa, prazoMeses)) / (Math.pow(1 + taxa, prazoMeses) - 1);
        const percentualRenda = (parcela / Number(formData.renda_mensal)) * 100;
        
        return {
          banco: banco.nome,
          parcela: Math.round(parcela),
          cet: 9.5 + (index * 0.5),
          status: percentualRenda <= 30 ? "aprovável" : "renda_insuficiente",
        };
      });

      setBankResults(demoResults.sort((a, b) => a.parcela - b.parcela));
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Calculator className="h-6 w-6 text-accent" />
            Simulador de Financiamento Imobiliário
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, <span className="text-accent font-medium">{userData.nome}</span>! Preencha os dados abaixo.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Valor do Imóvel */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4 text-accent" />
                Valor do Imóvel
              </Label>
              <Input
                placeholder="R$ 0,00"
                value={formData.valor_imovel}
                onChange={(e) => setFormData({ ...formData, valor_imovel: formatCurrency(e.target.value) })}
                className="bg-background border-border text-lg"
              />
            </div>

            {/* Renda Mensal */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Renda Mensal Familiar
              </Label>
              <Select
                value={formData.renda_mensal}
                onValueChange={(value) => setFormData({ ...formData, renda_mensal: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione sua renda" />
                </SelectTrigger>
                <SelectContent>
                  {RENDAS.map((renda) => (
                    <SelectItem key={renda.value} value={String(renda.value)}>
                      {renda.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entrada */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-accent" />
                Valor da Entrada
              </Label>
              <Input
                placeholder="R$ 0,00"
                value={formData.entrada}
                onChange={(e) => setFormData({ ...formData, entrada: formatCurrency(e.target.value) })}
                className="bg-background border-border"
              />
            </div>

            {/* Prazo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Prazo do Financiamento
              </Label>
              <Select
                value={formData.prazo_anos}
                onValueChange={(value) => setFormData({ ...formData, prazo_anos: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent>
                  {PRAZOS.map((prazo) => (
                    <SelectItem key={prazo.value} value={String(prazo.value)}>
                      {prazo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* FGTS */}
          <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <span className="text-accent font-medium">Usar FGTS?</span>
              </Label>
              <Switch
                checked={formData.usar_fgts}
                onCheckedChange={(checked) => setFormData({ ...formData, usar_fgts: checked })}
              />
            </div>
            {formData.usar_fgts && (
              <Input
                placeholder="Valor do FGTS disponível"
                value={formData.valor_fgts}
                onChange={(e) => setFormData({ ...formData, valor_fgts: formatCurrency(e.target.value) })}
                className="bg-background border-border"
              />
            )}
          </div>

          {/* Banco */}
          <div className="space-y-2">
            <Label>Banco para Simulação</Label>
            <Select
              value={formData.banco_id}
              onValueChange={(value) => setFormData({ ...formData, banco_id: value })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione um banco ou compare todos" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS.map((banco) => (
                  <SelectItem key={banco.id} value={String(banco.id)}>
                    {banco.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleSimulate}
              disabled={isLoading || isComparing}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold py-6 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5 mr-2" />
                  Simular
                </>
              )}
            </Button>
            
            <Button
              onClick={handleCompareAll}
              disabled={isLoading || isComparing}
              variant="outline"
              className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold py-6 text-lg"
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Comparando...
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Comparar Todos os Bancos
                </>
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-4 bg-secondary/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Aviso Legal:</strong> Valores estimados. Sujeitos à análise de crédito do banco. 
              As taxas e condições podem variar conforme o perfil do cliente e políticas vigentes de cada instituição financeira.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && <FinancingResult result={result} />}
      {bankResults && <BankComparison results={bankResults} />}
    </div>
  );
};
