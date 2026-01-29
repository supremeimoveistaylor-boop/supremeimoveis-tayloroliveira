import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Banknote, Percent, PieChart } from "lucide-react";
import type { SimulationResult } from "./FinancingSimulator";

interface FinancingResultProps {
  result: SimulationResult;
}

export const FinancingResult = ({ result }: FinancingResultProps) => {
  const isApproved = result.status === "aprovável";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className={`border-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${
      isApproved ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-3">
            {isApproved ? (
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            ) : (
              <XCircle className="h-7 w-7 text-red-500" />
            )}
            <span className="text-xl">
              {result.banco ? `Resultado - ${result.banco}` : "Resultado da Simulação"}
            </span>
          </CardTitle>
          <Badge
            className={`text-sm px-4 py-1 ${
              isApproved
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {isApproved ? "Aprovável" : "Renda Insuficiente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Parcela */}
          <div className="p-6 bg-card rounded-xl border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Banknote className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Parcela Mensal</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(result.parcela)}
            </p>
          </div>

          {/* CET */}
          <div className="p-6 bg-card rounded-xl border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Percent className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">CET (Custo Efetivo Total)</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {result.cet}% <span className="text-lg font-normal">a.a.</span>
            </p>
          </div>

          {/* Percentual da Renda */}
          <div className="p-6 bg-card rounded-xl border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <PieChart className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">% da Renda</span>
            </div>
            <p className={`text-3xl font-bold ${
              result.percentual_renda <= 30 ? "text-green-500" : "text-red-500"
            }`}>
              {result.percentual_renda}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.percentual_renda <= 30
                ? "Dentro do limite recomendado (30%)"
                : "Acima do limite recomendado (30%)"}
            </p>
          </div>
        </div>

        {!isApproved && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              <strong>Atenção:</strong> A parcela representa mais de 30% da sua renda mensal, 
              o que pode dificultar a aprovação do financiamento. Considere aumentar a entrada 
              ou escolher um prazo maior.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
