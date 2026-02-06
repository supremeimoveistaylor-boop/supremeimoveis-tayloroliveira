// Financial Control Types - All state managed locally

export interface Venda {
  id: string;
  nomeCliente: string;
  imovel: string;
  dataVenda: string;
  valorVenda: number;
  nomeCorretor: string;
  valorComissao: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Gasto {
  id: string;
  tipoGasto: string;
  descricao?: string;
  dataGasto: string;
  valorGasto: number;
  formaPagamento: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendasMetrics {
  totalVendas: number;
  valorTotalVendido: number;
  totalComissoes: number;
  mediaVenda: number;
}

export interface GastosMetrics {
  totalGastos: number;
  valorTotalGasto: number;
  mediaGasto: number;
}

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Transferência Bancária',
  'Cheque',
  'Financiamento',
  'Outro',
];

export const TIPOS_GASTO = [
  'Aluguel',
  'Marketing',
  'Salários',
  'Comissões',
  'Material de Escritório',
  'Internet/Telefone',
  'Energia',
  'Água',
  'Manutenção',
  'Transporte',
  'Software/Assinaturas',
  'Impostos',
  'Contabilidade',
  'Outros',
];
