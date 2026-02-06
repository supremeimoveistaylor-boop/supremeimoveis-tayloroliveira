import { useState, useCallback, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  TrendingDown,
  Receipt,
  Search,
  X
} from 'lucide-react';
import { Gasto, DateFilter, TIPOS_GASTO, FORMAS_PAGAMENTO } from './types';
import { useFinancialStore } from './useFinancialStore';
import { 
  formatCurrency, 
  parseCurrency, 
  formatCurrencyInput, 
  formatDate,
  formatDateForInput,
  generateGastosPDF 
} from './utils';
import { toast } from '@/hooks/use-toast';

const initialFormData = {
  tipoGasto: '',
  descricao: '',
  dataGasto: '',
  valorGasto: '',
  formaPagamento: '',
};

export const ExpensesControlPanel = memo(function ExpensesControlPanel() {
  const {
    gastos,
    addGasto,
    updateGasto,
    deleteGasto,
    filterGastos,
    gastosMetrics,
    uniqueTiposGasto,
  } = useFinancialStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [tipoFilter, setTipoFilter] = useState('');

  // Get filtered gastos
  const filteredGastos = useMemo(() => {
    return filterGastos(dateFilter, tipoFilter);
  }, [filterGastos, dateFilter, tipoFilter]);

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredGastos.reduce((sum, g) => sum + (g?.valorGasto ?? 0), 0);
  }, [filteredGastos]);

  const handleOpenDialog = useCallback((gasto?: Gasto) => {
    try {
      if (gasto) {
        setEditingGasto(gasto);
        setFormData({
          tipoGasto: gasto?.tipoGasto ?? '',
          descricao: gasto?.descricao ?? '',
          dataGasto: formatDateForInput(gasto?.dataGasto) ?? '',
          valorGasto: formatCurrency(gasto?.valorGasto) ?? '',
          formaPagamento: gasto?.formaPagamento ?? '',
        });
      } else {
        setEditingGasto(null);
        setFormData(initialFormData);
      }
      setIsDialogOpen(true);
    } catch (e) {
      console.error('Error opening dialog:', e);
    }
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    if (field === 'valorGasto') {
      setFormData(prev => ({ ...prev, [field]: formatCurrencyInput(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      const gastoData = {
        tipoGasto: formData.tipoGasto || 'Outros',
        descricao: formData.descricao || '',
        dataGasto: formData.dataGasto || new Date().toISOString().split('T')[0],
        valorGasto: parseCurrency(formData.valorGasto),
        formaPagamento: formData.formaPagamento || 'Outro',
      };

      if (editingGasto) {
        updateGasto(editingGasto.id, gastoData);
        toast({ title: 'Gasto atualizado', description: 'Os dados foram salvos com sucesso.' });
      } else {
        addGasto(gastoData);
        toast({ title: 'Gasto registrado', description: 'Novo gasto adicionado com sucesso.' });
      }

      setIsDialogOpen(false);
    } catch (e) {
      console.error('Error saving gasto:', e);
      toast({ title: 'Erro ao salvar', description: 'Ocorreu um erro ao salvar os dados.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingGasto, addGasto, updateGasto]);

  const handleDelete = useCallback((id: string) => {
    try {
      if (confirm('Tem certeza que deseja excluir este gasto?')) {
        deleteGasto(id);
        toast({ title: 'Gasto excluído', description: 'O registro foi removido.' });
      }
    } catch (e) {
      console.error('Error deleting gasto:', e);
    }
  }, [deleteGasto]);

  const handleGeneratePDF = useCallback(() => {
    try {
      generateGastosPDF(
        filteredGastos,
        filteredTotal,
        { ...dateFilter, tipo: tipoFilter }
      );
    } catch (e) {
      console.error('Error generating PDF:', e);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  }, [filteredGastos, filteredTotal, dateFilter, tipoFilter]);

  const clearFilters = useCallback(() => {
    setDateFilter({});
    setTipoFilter('');
  }, []);

  const hasFilters = dateFilter.startDate || dateFilter.endDate || tipoFilter;

  // Combine predefined and custom types
  const allTiposGasto = useMemo(() => {
    const combined = new Set([...TIPOS_GASTO, ...uniqueTiposGasto]);
    return Array.from(combined).sort();
  }, [uniqueTiposGasto]);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Gastos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gastosMetrics?.totalGastos ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Gasto</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(gastosMetrics?.valorTotalGasto)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Média por Gasto</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(gastosMetrics?.mediaGasto)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
            <div className="flex gap-2">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
                <FileText className="h-4 w-4 mr-1" />
                Baixar PDF
              </Button>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Gasto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dateFilter.startDate ?? ''}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dateFilter.endDate ?? ''}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Gasto</Label>
              <Select value={tipoFilter || 'all'} onValueChange={(v) => setTipoFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allTiposGasto.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Total */}
      {hasFilters && (
        <div className="flex gap-4 flex-wrap">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {filteredGastos.length} gastos encontrados
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3 text-red-600">
            Total: {formatCurrency(filteredTotal)}
          </Badge>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGastos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum gasto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGastos.map((gasto) => (
                    <TableRow key={gasto?.id ?? Math.random()}>
                      <TableCell>
                        <Badge variant="outline">{gasto?.tipoGasto ?? '-'}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {gasto?.descricao || '-'}
                      </TableCell>
                      <TableCell>{formatDate(gasto?.dataGasto)}</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {formatCurrency(gasto?.valorGasto)}
                      </TableCell>
                      <TableCell>{gasto?.formaPagamento ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(gasto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(gasto?.id ?? '')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingGasto ? 'Editar Gasto' : 'Novo Gasto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipoGasto">Tipo de Gasto</Label>
                <Select
                  value={formData.tipoGasto || 'none'}
                  onValueChange={(v) => handleChange('tipoGasto', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {TIPOS_GASTO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataGasto">Data do Gasto</Label>
                <Input
                  id="dataGasto"
                  type="date"
                  value={formData.dataGasto}
                  onChange={(e) => handleChange('dataGasto', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Detalhes do gasto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorGasto">Valor (R$)</Label>
                <Input
                  id="valorGasto"
                  value={formData.valorGasto}
                  onChange={(e) => handleChange('valorGasto', e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select
                  value={formData.formaPagamento || 'none'}
                  onValueChange={(v) => handleChange('formaPagamento', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
