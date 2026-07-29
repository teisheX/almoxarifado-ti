import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function registerExportLog({ userId, formato, tipoExportacao, filtrosAplicados, quantidadeRegistros }) {
  await supabase.from('export_logs').insert({
    usuario_id: userId,
    formato,
    tipo_exportacao: tipoExportacao,
    filtros_aplicados: filtrosAplicados || {},
    quantidade_registros: quantidadeRegistros
  })
}

export async function exportCSV(items, userId, filtros = {}) {
  const rows = items.map((item) => ({
    id: item.id,
    modelo: item.modelo,
    marca: item.marcas?.nome || '',
    patrimonio: item.patrimonio,
    codigo_barras: item.codigo_barras,
    setor: item.setor || '',
    time: item.time || '',
    categoria: item.categorias?.nome || '',
    status: item.status,
    localizacao: item.localizacoes?.nome || '',
    quantidade: item.quantidade,
    responsavel_atual: item.responsavel_atual || '',
    valor_estimado_unitario: item.valor_estimado || '',
    valor_estimado_total: Number(item.valor_estimado || 0) * Number(item.quantidade || 1),
    criado_por: item.criado_por,
    created_at: item.created_at,
    updated_at: item.updated_at
  }))

  const csv = Papa.unparse(rows, { delimiter: ';' })
  downloadBlob('\ufeff' + csv, `itens-3rn-ativos-${Date.now()}.csv`, 'text/csv;charset=utf-8;')
  await registerExportLog({ userId, formato: 'csv', tipoExportacao: 'itens', filtrosAplicados: filtros, quantidadeRegistros: items.length })
}

export async function exportPDF(items, userId, filtros = {}) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Relatório de Itens - 3RN Ativos', 14, 14)
  doc.setFontSize(9)
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 21)
  const totalEstimado = items.reduce((sum, item) => sum + (Number(item.valor_estimado || 0) * Number(item.quantidade || 1)), 0)
  doc.text(`Valor estimado total: ${totalEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 27)

  autoTable(doc, {
    startY: 34,
    head: [['Modelo', 'Marca', 'Patrimônio', 'Setor', 'Time', 'Status', 'Localização', 'Qtd.', 'Valor total']],
    body: items.map((item) => [
      item.modelo,
      item.marcas?.nome || '',
      item.patrimonio,
      item.setor || '',
      item.time || '',
      item.status,
      item.localizacoes?.nome || '',
      item.quantidade,
      (Number(item.valor_estimado || 0) * Number(item.quantidade || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] }
  })

  doc.save(`itens-3rn-ativos-${Date.now()}.pdf`)
  await registerExportLog({ userId, formato: 'pdf', tipoExportacao: 'itens', filtrosAplicados: filtros, quantidadeRegistros: items.length })
}
