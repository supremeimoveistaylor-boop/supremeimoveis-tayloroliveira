import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, Building, Percent, Clock, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackSimulatorStarted, trackSimulatorCompleted } from "@/lib/analytics";
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

  // Formatar valor para exibição no formato brasileiro (R$ 10.000,00)
  const formatCurrency = (value: string): string => {
    // Remove tudo que não é número
    const numericOnly = value.replace(/\D/g, "");
    
    if (!numericOnly || numericOnly === "") return "";
    
    // Converte para número (centavos)
    const cents = parseInt(numericOnly, 10);
    
    // Divide por 100 para obter o valor real
    const realValue = cents / 100;
    
    // Formata para pt-BR
    return realValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Converter valor formatado para número (float)
  // "R$ 10.000.000,00" → 10000000.00
  const parseCurrency = (value: string): number => {
    if (!value || value === "") return 0;
    
    let str = String(value).trim();
    
    // Remove símbolo de moeda e espaços
    str = str.replace(/[R$\s]/g, "");
    
    // Formato brasileiro: ponto é milhar, vírgula é decimal
    // Remove pontos (separador de milhar)
    str = str.replace(/\./g, "");
    
    // Substitui vírgula (separador decimal) por ponto
    str = str.replace(",", ".");
    
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
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
    trackSimulatorStarted();

    try {
      const rendaValue = parseCurrency(formData.renda_mensal);
      const valorImovelValue = parseCurrency(formData.valor_imovel);
      const entradaValue = parseCurrency(formData.entrada);
      const fgtsValue = formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0;

      // Validação de valores mínimos
      if (valorImovelValue <= 0 || rendaValue <= 0) {
        toast({
          title: "Valores inválidos",
          description: "O valor do imóvel e a renda devem ser maiores que zero.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const payload = {
        user_id: userData.user_id,
        valor_imovel: valorImovelValue,
        entrada: entradaValue,
        fgts: fgtsValue,
        renda: rendaValue,
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
      // Fallback: Cálculo SAC local
      const rendaValue = parseCurrency(formData.renda_mensal);
      const valorImovelValue = parseCurrency(formData.valor_imovel);
      const valorFinanciado = valorImovelValue - parseCurrency(formData.entrada) - (formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0);
      const prazoMeses = Number(formData.prazo_anos) * 12;
      const bancoId = Number(formData.banco_id);
      
      // Taxas CET anuais fixas por banco
      const cetAnualPorBanco: Record<number, number> = {
        1: 12.00,  // Caixa Econômica
        2: 12.00,  // Banco do Brasil
        3: 11.60,  // Itaú
        4: 11.70,  // Bradesco
        5: 11.79,  // Santander
      };
      
      const cetAnual = cetAnualPorBanco[bancoId] || 12.00;
      // Conversão CET anual para mensal: CET / 12 (conforme especificado)
      const taxaMensal = cetAnual / 100 / 12;
      
      // Sistema SAC - Cálculo da PRIMEIRA parcela
      // Amortização fixa = Valor Financiado / Prazo em meses
      const amortizacao = valorFinanciado / prazoMeses;
      
      // Juros sobre saldo devedor (primeira parcela = saldo total)
      const jurosPrimeiraParcela = valorFinanciado * taxaMensal;
      
      // Seguro MIP: 0,03% ao mês sobre saldo devedor
      const seguroMIP = valorFinanciado * 0.0003;
      
      // Seguro DFI: 0,02% ao mês sobre valor do imóvel
      const seguroDFI = valorImovelValue * 0.0002;
      
      // Primeira parcela SAC = Amortização + Juros + MIP + DFI
      const primeiraParcela = amortizacao + jurosPrimeiraParcela + seguroMIP + seguroDFI;
      
      const percentualRenda = rendaValue > 0 ? (primeiraParcela / rendaValue) * 100 : 0;
      
      setResult({
        parcela: Math.round(primeiraParcela * 100) / 100,
        cet: cetAnual,
        percentual_renda: Math.round(percentualRenda * 10) / 10,
        status: percentualRenda <= 30 ? "aprovável" : "renda_insuficiente",
        banco: BANCOS.find(b => b.id === bancoId)?.nome,
      });
      trackSimulatorCompleted(BANCOS.find(b => b.id === bancoId)?.nome, valorImovelValue);
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
      const rendaValue = parseCurrency(formData.renda_mensal);
      const valorImovelValue = parseCurrency(formData.valor_imovel);
      const entradaValue = parseCurrency(formData.entrada);
      const fgtsValue = formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0;

      // Validação de valores mínimos
      if (valorImovelValue <= 0 || rendaValue <= 0) {
        toast({
          title: "Valores inválidos",
          description: "O valor do imóvel e a renda devem ser maiores que zero.",
          variant: "destructive",
        });
        setIsComparing(false);
        return;
      }

      const payload = {
        user_id: userData.user_id,
        valor_imovel: valorImovelValue,
        entrada: entradaValue,
        fgts: fgtsValue,
        renda: rendaValue,
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
      // Fallback: Cálculo SAC local para todos os bancos
      const rendaValue = parseCurrency(formData.renda_mensal);
      const valorImovelValue = parseCurrency(formData.valor_imovel);
      const valorFinanciado = valorImovelValue - parseCurrency(formData.entrada) - (formData.usar_fgts ? parseCurrency(formData.valor_fgts) : 0);
      const prazoMeses = Number(formData.prazo_anos) * 12;
      
      // Taxas CET anuais fixas por banco
      const cetAnualPorBanco: Record<number, number> = {
        1: 12.00,  // Caixa Econômica
        2: 12.00,  // Banco do Brasil
        3: 11.60,  // Itaú
        4: 11.70,  // Bradesco
        5: 11.79,  // Santander
      };
      
      const demoResults: BankResult[] = BANCOS.map((banco) => {
        const cetAnual = cetAnualPorBanco[banco.id] || 12.00;
        // Conversão CET anual para mensal: CET / 12
        const taxaMensal = cetAnual / 100 / 12;
        
        // Sistema SAC - Cálculo da PRIMEIRA parcela
        // Amortização fixa = Valor Financiado / Prazo em meses
        const amortizacao = valorFinanciado / prazoMeses;
        
        // Juros sobre saldo devedor (primeira parcela = saldo total)
        const jurosPrimeiraParcela = valorFinanciado * taxaMensal;
        
        // Seguro MIP: 0,03% ao mês sobre saldo devedor
        const seguroMIP = valorFinanciado * 0.0003;
        
        // Seguro DFI: 0,02% ao mês sobre valor do imóvel
        const seguroDFI = valorImovelValue * 0.0002;
        
        // Primeira parcela SAC = Amortização + Juros + MIP + DFI
        const primeiraParcela = amortizacao + jurosPrimeiraParcela + seguroMIP + seguroDFI;
        
        const percentualRenda = rendaValue > 0 ? (primeiraParcela / rendaValue) * 100 : 0;
        
        return {
          banco: banco.nome,
          parcela: Math.round(primeiraParcela * 100) / 100,
          cet: cetAnual,
          status: percentualRenda <= 30 ? "aprovável" : "renda_insuficiente",
        };
      });

      // Ordena por parcela (menor primeiro) - agora bancos com CET diferente terão parcelas diferentes
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

            {/* Renda Mensal - Agora é input livre */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Renda Mensal Familiar
              </Label>
              <Input
                placeholder="R$ 0,00"
                value={formData.renda_mensal}
                onChange={(e) => setFormData({ ...formData, renda_mensal: formatCurrency(e.target.value) })}
                className="bg-background border-border text-lg"
              />
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
