// Currency and PDF utilities

/**
 * Format number to Brazilian currency (R$ 10.000,00)
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R$ ${value?.toFixed(2) ?? '0,00'}`;
  }
};

/**
 * Parse Brazilian currency string to number
 */
export const parseCurrency = (value: string | undefined | null): number => {
  if (!value) return 0;
  try {
    // Remove currency symbol, dots (thousands separator), and replace comma with dot
    const cleaned = value
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
};

/**
 * Format input value as currency while typing
 */
export const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  
  // Remove everything except digits
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  
  // Convert to number with 2 decimal places
  const number = parseInt(digits, 10) / 100;
  
  // Format as Brazilian currency
  return formatCurrency(number);
};

/**
 * Format date for display (DD/MM/YYYY)
 */
export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr ?? 'N/A';
  }
};

/**
 * Format date for input (YYYY-MM-DD)
 */
export const formatDateForInput = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate PDF for sales report
 */
export const generateVendasPDF = (
  vendas: Array<{
    nomeCliente?: string;
    imovel?: string;
    dataVenda?: string;
    valorVenda?: number;
    nomeCorretor?: string;
    valorComissao?: number;
  }>,
  totals: { valorTotal: number; totalComissoes: number },
  filters?: { startDate?: string; endDate?: string; cliente?: string }
): void => {
  try {
    const safeVendas = vendas?.filter(Boolean) ?? [];
    
    const filterText = [];
    if (filters?.startDate) filterText.push(`De: ${formatDate(filters.startDate)}`);
    if (filters?.endDate) filterText.push(`Até: ${formatDate(filters.endDate)}`);
    if (filters?.cliente) filterText.push(`Cliente: ${filters.cliente}`);

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Vendas</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
          .header h1 { color: #1a365d; font-size: 24px; margin-bottom: 10px; }
          .header .date { color: #666; font-size: 12px; }
          .filters { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
          th { background: #1a365d; color: white; padding: 12px 8px; text-align: left; }
          td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f7fafc; }
          .totals { background: #ebf8ff; padding: 20px; border-radius: 8px; }
          .totals h3 { color: #1a365d; margin-bottom: 15px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .total-value { font-weight: bold; color: #2b6cb0; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Relatório de Vendas</h1>
          <div class="date">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        ${filterText.length > 0 ? `<div class="filters"><strong>Filtros:</strong> ${filterText.join(' | ')}</div>` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Imóvel</th>
              <th>Data</th>
              <th>Valor Venda</th>
              <th>Corretor</th>
              <th>Comissão</th>
            </tr>
          </thead>
          <tbody>
            ${safeVendas.map(v => `
              <tr>
                <td>${v?.nomeCliente ?? '-'}</td>
                <td>${v?.imovel ?? '-'}</td>
                <td>${formatDate(v?.dataVenda)}</td>
                <td>${formatCurrency(v?.valorVenda)}</td>
                <td>${v?.nomeCorretor ?? '-'}</td>
                <td>${formatCurrency(v?.valorComissao)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <h3>Resumo</h3>
          <div class="total-row">
            <span>Total de Vendas:</span>
            <span class="total-value">${safeVendas.length}</span>
          </div>
          <div class="total-row">
            <span>Valor Total Vendido:</span>
            <span class="total-value">${formatCurrency(totals?.valorTotal ?? 0)}</span>
          </div>
          <div class="total-row">
            <span>Total de Comissões:</span>
            <span class="total-value">${formatCurrency(totals?.totalComissoes ?? 0)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Documento gerado automaticamente pelo sistema administrativo</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  } catch (e) {
    console.error('Error generating PDF:', e);
  }
};

/**
 * Generate PDF for expenses report
 */
export const generateGastosPDF = (
  gastos: Array<{
    tipoGasto?: string;
    descricao?: string;
    dataGasto?: string;
    valorGasto?: number;
    formaPagamento?: string;
  }>,
  total: number,
  filters?: { startDate?: string; endDate?: string; tipo?: string }
): void => {
  try {
    const safeGastos = gastos?.filter(Boolean) ?? [];
    
    const filterText = [];
    if (filters?.startDate) filterText.push(`De: ${formatDate(filters.startDate)}`);
    if (filters?.endDate) filterText.push(`Até: ${formatDate(filters.endDate)}`);
    if (filters?.tipo) filterText.push(`Tipo: ${filters.tipo}`);

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Gastos</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #742a2a; padding-bottom: 20px; }
          .header h1 { color: #742a2a; font-size: 24px; margin-bottom: 10px; }
          .header .date { color: #666; font-size: 12px; }
          .filters { background: #fff5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
          th { background: #742a2a; color: white; padding: 12px 8px; text-align: left; }
          td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #fff5f5; }
          .totals { background: #fed7d7; padding: 20px; border-radius: 8px; }
          .totals h3 { color: #742a2a; margin-bottom: 15px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .total-value { font-weight: bold; color: #c53030; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📉 Relatório de Gastos</h1>
          <div class="date">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        ${filterText.length > 0 ? `<div class="filters"><strong>Filtros:</strong> ${filterText.join(' | ')}</div>` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Forma de Pagamento</th>
            </tr>
          </thead>
          <tbody>
            ${safeGastos.map(g => `
              <tr>
                <td>${g?.tipoGasto ?? '-'}</td>
                <td>${g?.descricao ?? '-'}</td>
                <td>${formatDate(g?.dataGasto)}</td>
                <td>${formatCurrency(g?.valorGasto)}</td>
                <td>${g?.formaPagamento ?? '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <h3>Resumo</h3>
          <div class="total-row">
            <span>Total de Registros:</span>
            <span class="total-value">${safeGastos.length}</span>
          </div>
          <div class="total-row">
            <span>Valor Total Gasto:</span>
            <span class="total-value">${formatCurrency(total ?? 0)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Documento gerado automaticamente pelo sistema administrativo</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  } catch (e) {
    console.error('Error generating PDF:', e);
  }
};
