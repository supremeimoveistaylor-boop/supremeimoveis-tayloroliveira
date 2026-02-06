import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle2, XCircle, TrendingDown, Award, Percent } from "lucide-react";
import type { BankResult } from "./FinancingSimulator";

interface BankComparisonProps {
  results: BankResult[];
}

export const BankComparison = ({ results }: BankComparisonProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Sort by parcela (lowest first)
  const sortedResults = [...results].sort((a, b) => a.parcela - b.parcela);
  const bestBank = sortedResults.find(r => r.status === "aprovável") || sortedResults[0];
  
  // Find bank with lowest CET (interest rate)
  const lowestRateBank = [...results].sort((a, b) => a.cet - b.cet)[0];

  return (
    <Card className="border-accent/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-accent" />
          Comparativo de Bancos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ordenado por menor parcela mensal
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {/* Best Bank Highlight */}
        {bestBank && (
          <div className="mb-6 p-4 bg-accent/10 border-2 border-accent rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-6 w-6 text-accent" />
              <span className="text-lg font-bold text-accent">
                🟢 Melhor banco para seu perfil hoje
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-2xl font-bold">{bestBank.banco}</p>
                <p className="text-sm text-muted-foreground">Menor parcela disponível</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-accent">
                  {formatCurrency(bestBank.parcela)}
                </p>
                <p className="text-sm text-muted-foreground">por mês</p>
              </div>
            </div>
          </div>
        )}

        {/* Bank List */}
        <div className="space-y-4">
          {sortedResults.map((bank, index) => {
            const isApproved = bank.status === "aprovável";
            const isBest = bank.banco === bestBank.banco;
            const isLowestRate = bank.banco === lowestRateBank.banco;

            return (
              <div
                key={bank.banco}
                className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                  isBest
                    ? "border-accent/50 bg-accent/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                      {index + 1}º
                    </div>
                    <div>
                      <p className="font-bold text-lg flex items-center gap-2 flex-wrap">
                        {bank.banco}
                        {isBest && <TrendingDown className="h-4 w-4 text-green-500" />}
                        {isLowestRate && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Menor Taxa
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        CET: <span className={isLowestRate ? "text-blue-400 font-semibold" : ""}>{bank.cet}% a.a.</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatCurrency(bank.parcela)}</p>
                      <p className="text-xs text-muted-foreground">parcela mensal</p>
                    </div>
                    <Badge
                      className={`flex items-center gap-1 ${
                        isApproved
                          ? "bg-green-500/20 text-green-500 border-green-500/30"
                          : "bg-red-500/20 text-red-500 border-red-500/30"
                      }`}
                      variant="outline"
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Aprovável
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Renda Insuf.
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Legenda:</strong> 🟢 Menor parcela • <span className="text-blue-400">Menor Taxa</span> = CET mais baixo • ✅ Aprovável = até 30% da renda
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
