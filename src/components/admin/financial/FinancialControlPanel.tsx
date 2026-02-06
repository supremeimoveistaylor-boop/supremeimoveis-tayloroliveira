import { useState, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SalesControlPanel } from './SalesControlPanel';
import { ExpensesControlPanel } from './ExpensesControlPanel';

export const FinancialControlPanel = memo(function FinancialControlPanel() {
  const [activeTab, setActiveTab] = useState<'vendas' | 'gastos'>('vendas');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Controle Financeiro</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie vendas e gastos com cálculos automáticos e relatórios em PDF
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="vendas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Gastos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-6">
          <SalesControlPanel />
        </TabsContent>

        <TabsContent value="gastos" className="mt-6">
          <ExpensesControlPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
});
