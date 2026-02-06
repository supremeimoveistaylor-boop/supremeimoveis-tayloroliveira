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
  DollarSign,
  TrendingUp,
  Users,
  Search,
  X
} from 'lucide-react';
import { Venda, DateFilter } from './types';
import { useFinancialStore } from './useFinancialStore';
import { 
  formatCurrency, 
  parseCurrency, 
  formatCurrencyInput, 
  formatDate,
  formatDateForInput,
  generateVendasPDF 
} from './utils';
import { toast } from '@/hooks/use-toast';

const initialFormData = {
  nomeCliente: '',
  imovel: '',
  dataVenda: '',
  valorVenda: '',
  nomeCorretor: '',
  valorComissao: '',
};

export const SalesControlPanel = memo(function SalesControlPanel() {
  const {
    vendas,
    addVenda,
    updateVenda,
    deleteVenda,
    filterVendas,
    vendasMetrics,
    uniqueCorretores,
  } = useFinancialStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [clienteFilter, setClienteFilter] = useState('');
  const [corretorFilter, setCorretorFilter] = useState('');

  // Get filtered vendas
  const filteredVendas = useMemo(() => {
    return filterVendas(dateFilter, clienteFilter, corretorFilter);
  }, [filterVendas, dateFilter, clienteFilter, corretorFilter]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const valorTotal = filteredVendas.reduce((sum, v) => sum + (v?.valorVenda ?? 0), 0);
    const totalComissoes = filteredVendas.reduce((sum, v) => sum + (v?.valorComissao ?? 0), 0);
    return { valorTotal, totalComissoes };
  }, [filteredVendas]);

  const handleOpenDialog = useCallback((venda?: Venda) => {
    try {
      if (venda) {
        setEditingVenda(venda);
        setFormData({
          nomeCliente: venda?.nomeCliente ?? '',
          imovel: venda?.imovel ?? '',
          dataVenda: formatDateForInput(venda?.dataVenda) ?? '',
          valorVenda: formatCurrency(venda?.valorVenda) ?? '',
          nomeCorretor: venda?.nomeCorretor ?? '',
          valorComissao: formatCurrency(venda?.valorComissao) ?? '',
        });
      } else {
        setEditingVenda(null);
        setFormData(initialFormData);
      }
      setIsDialogOpen(true);
    } catch (e) {
      console.error('Error opening dialog:', e);
    }
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    if (field === 'valorVenda' || field === 'valorComissao') {
      setFormData(prev => ({ ...prev, [field]: formatCurrencyInput(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      const vendaData = {
        nomeCliente: formData.nomeCliente || 'Não informado',
        imovel: formData.imovel || 'Não informado',
        dataVenda: formData.dataVenda || new Date().toISOString().split('T')[0],
        valorVenda: parseCurrency(formData.valorVenda),
        nomeCorretor: formData.nomeCorretor || 'Não informado',
        valorComissao: parseCurrency(formData.valorComissao),
      };

      if (editingVenda) {
        updateVenda(editingVenda.id, vendaData);
        toast({ title: 'Venda atualizada', description: 'Os dados foram salvos com sucesso.' });
      } else {
        addVenda(vendaData);
        toast({ title: 'Venda registrada', description: 'Nova venda adicionada com sucesso.' });
      }

      setIsDialogOpen(false);
    } catch (e) {
      console.error('Error saving venda:', e);
      toast({ title: 'Erro ao salvar', description: 'Ocorreu um erro ao salvar os dados.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingVenda, addVenda, updateVenda]);

  const handleDelete = useCallback((id: string) => {
    try {
      if (confirm('Tem certeza que deseja excluir esta venda?')) {
        deleteVenda(id);
        toast({ title: 'Venda excluída', description: 'O registro foi removido.' });
      }
    } catch (e) {
      console.error('Error deleting venda:', e);
    }
  }, [deleteVenda]);

  const handleGeneratePDF = useCallback(() => {
    try {
      generateVendasPDF(
        filteredVendas,
        filteredTotals,
        { ...dateFilter, cliente: clienteFilter }
      );
    } catch (e) {
      console.error('Error generating PDF:', e);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  }, [filteredVendas, filteredTotals, dateFilter, clienteFilter]);

  const clearFilters = useCallback(() => {
    setDateFilter({});
    setClienteFilter('');
    setCorretorFilter('');
  }, []);

  const hasFilters = dateFilter.startDate || dateFilter.endDate || clienteFilter || corretorFilter;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{vendasMetrics?.totalVendas ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Vendido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(vendasMetrics?.valorTotalVendido)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissões</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(vendasMetrics?.totalComissoes)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Média por Venda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(vendasMetrics?.mediaVenda)}
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
                Nova Venda
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar por cliente..."
                value={clienteFilter}
                onChange={(e) => setClienteFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Corretor</Label>
              <Select value={corretorFilter || 'all'} onValueChange={(v) => setCorretorFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueCorretores.map((c) => (
                    <SelectItem key={c} value={c ?? ''}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Totals */}
      {hasFilters && (
        <div className="flex gap-4 flex-wrap">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {filteredVendas.length} vendas encontradas
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3 text-green-600">
            Total: {formatCurrency(filteredTotals.valorTotal)}
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3 text-purple-600">
            Comissões: {formatCurrency(filteredTotals.totalComissoes)}
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendas.map((venda) => (
                    <TableRow key={venda?.id ?? Math.random()}>
                      <TableCell className="font-medium">{venda?.nomeCliente ?? '-'}</TableCell>
                      <TableCell>{venda?.imovel ?? '-'}</TableCell>
                      <TableCell>{formatDate(venda?.dataVenda)}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(venda?.valorVenda)}
                      </TableCell>
                      <TableCell>{venda?.nomeCorretor ?? '-'}</TableCell>
                      <TableCell className="text-purple-600">
                        {formatCurrency(venda?.valorComissao)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(venda)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(venda?.id ?? '')}
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
              {editingVenda ? 'Editar Venda' : 'Nova Venda'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeCliente">Nome do Cliente</Label>
                <Input
                  id="nomeCliente"
                  value={formData.nomeCliente}
                  onChange={(e) => handleChange('nomeCliente', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVenda">Data da Venda</Label>
                <Input
                  id="dataVenda"
                  type="date"
                  value={formData.dataVenda}
                  onChange={(e) => handleChange('dataVenda', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imovel">Imóvel</Label>
              <Input
                id="imovel"
                value={formData.imovel}
                onChange={(e) => handleChange('imovel', e.target.value)}
                placeholder="Descrição do imóvel"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorVenda">Valor da Venda (R$)</Label>
                <Input
                  id="valorVenda"
                  value={formData.valorVenda}
                  onChange={(e) => handleChange('valorVenda', e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorComissao">Comissão (R$)</Label>
                <Input
                  id="valorComissao"
                  value={formData.valorComissao}
                  onChange={(e) => handleChange('valorComissao', e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeCorretor">Nome do Corretor</Label>
              <Input
                id="nomeCorretor"
                value={formData.nomeCorretor}
                onChange={(e) => handleChange('nomeCorretor', e.target.value)}
                placeholder="Nome do corretor"
              />
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
