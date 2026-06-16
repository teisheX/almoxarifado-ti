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
    categoria: item.categorias?.nome || '',
    status: item.status,
    localizacao: item.localizacoes?.nome || '',
    quantidade: item.quantidade,
    responsavel_atual: item.responsavel_atual || '',
    criado_por: item.criado_por,
    created_at: item.created_at,
    updated_at: item.updated_at
  }))

  const csv = Papa.unparse(rows, { delimiter: ';' })
  downloadBlob('\ufeff' + csv, `itens-almoxarifado-${Date.now()}.csv`, 'text/csv;charset=utf-8;')
  await registerExportLog({ userId, formato: 'csv', tipoExportacao: 'itens', filtrosAplicados: filtros, quantidadeRegistros: items.length })
}

export async function exportPDF(items, userId, filtros = {}) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Relatório de Itens - Almoxarifado TI', 14, 14)
  doc.setFontSize(9)
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 21)

  autoTable(doc, {
    startY: 28,
    head: [['Modelo', 'Marca', 'Patrimônio', 'Código', 'Categoria', 'Status', 'Localização', 'Qtd.', 'Responsável']],
    body: items.map((item) => [
      item.modelo,
      item.marcas?.nome || '',
      item.patrimonio,
      item.codigo_barras,
      item.categorias?.nome || '',
      item.status,
      item.localizacoes?.nome || '',
      item.quantidade,
      item.responsavel_atual || ''
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] }
  })

  doc.save(`itens-almoxarifado-${Date.now()}.pdf`)
  await registerExportLog({ userId, formato: 'pdf', tipoExportacao: 'itens', filtrosAplicados: filtros, quantidadeRegistros: items.length })
}
