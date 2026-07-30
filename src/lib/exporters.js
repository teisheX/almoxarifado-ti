import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'
import grupo3rnLogo from '../assets/images/grupo-3rn-logo.png'

const SISTEMA_NOME = '3RN Ativos'
const SISTEMA_SLOGAN = 'Sistema de Gestão Patrimonial do Grupo 3RN'

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function formatFilterValue(value) {
  if (value === null || value === undefined || value === '') return 'Todos'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function buildFiltrosText(filtros = {}) {
  const entries = Object.entries(filtros)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${formatFilterValue(value)}`)

  return entries.length ? entries.join(' | ') : 'Nenhum filtro aplicado'
}

function getItemTotalValue(item) {
  return Number(item.valor_estimado || 0) * Number(item.quantidade || 1)
}

async function imageToDataUrl(url) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('Não foi possível carregar a logo no PDF:', error)
    return null
  }
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
    numero_serie: item.numero_serie || '',
    codigo_barras: item.codigo_barras || '',
    setor: item.setor || '',
    time: item.time || '',
    categoria: item.categorias?.nome || '',
    status: item.status || '',
    localizacao: item.localizacoes?.nome || '',
    quantidade: item.quantidade || 1,
    responsavel_atual: item.responsavel_atual || '',
    valor_estimado_unitario: item.valor_estimado || '',
    valor_estimado_total: getItemTotalValue(item),
    criado_por: item.criado_por,
    created_at: item.created_at,
    updated_at: item.updated_at
  }))

  const csv = Papa.unparse(rows, { delimiter: ';' })
  downloadBlob('\ufeff' + csv, `itens-3rn-ativos-${Date.now()}.csv`, 'text/csv;charset=utf-8;')
  await registerExportLog({ userId, formato: 'csv', tipoExportacao: 'itens', filtrosAplicados: filtros, quantidadeRegistros: items.length })
}

export async function exportPDF(items, userId, filtros = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const emittedAt = new Date().toLocaleString('pt-BR')
  const totalEstimado = items.reduce((sum, item) => sum + getItemTotalValue(item), 0)
  const filtrosTexto = buildFiltrosText(filtros)
  const logoDataUrl = await imageToDataUrl(grupo3rnLogo)

  // Cabeçalho visual
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 30, 'F')

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 12, 6, 22, 18)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(`Relatório de Ativos - ${SISTEMA_NOME}`, logoDataUrl ? 40 : 14, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(SISTEMA_SLOGAN, logoDataUrl ? 40 : 14, 18)
  doc.text(`Emitido em: ${emittedAt}`, logoDataUrl ? 40 : 14, 24)

  // Cards de resumo
  doc.setTextColor(15, 23, 42)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 36, 58, 18, 3, 3, 'F')
  doc.roundedRect(78, 36, 58, 18, 3, 3, 'F')
  doc.roundedRect(142, 36, 70, 18, 3, 3, 'F')

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Itens no relatório', 18, 43)
  doc.text('Quantidade total', 82, 43)
  doc.text('Valor estimado total', 146, 43)

  const quantidadeTotal = items.reduce((sum, item) => sum + Number(item.quantidade || 1), 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(String(items.length), 18, 50)
  doc.text(String(quantidadeTotal), 82, 50)
  doc.text(formatCurrency(totalEstimado), 146, 50)

  // Filtros
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Filtros aplicados:', 14, 63)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const filtrosLinhas = doc.splitTextToSize(filtrosTexto, pageWidth - 28)
  doc.text(filtrosLinhas, 14, 68)

  const startY = 74 + Math.max(0, filtrosLinhas.length - 1) * 4

  autoTable(doc, {
    startY,
    head: [['Modelo/Nome', 'Marca', 'Patrimônio', 'Nº Série', 'Setor', 'Time', 'Status', 'Localização', 'Qtd.', 'Valor unit.', 'Valor total']],
    body: items.map((item) => [
      item.modelo || '',
      item.marcas?.nome || '',
      item.patrimonio || '',
      item.numero_serie || '',
      item.setor || '',
      item.time || '',
      item.status || '',
      item.localizacoes?.nome || '',
      item.quantidade || 1,
      formatCurrency(item.valor_estimado || 0),
      formatCurrency(getItemTotalValue(item))
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 25 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24 },
      7: { cellWidth: 28 },
      8: { halign: 'center', cellWidth: 12 },
      9: { halign: 'right', cellWidth: 22 },
      10: { halign: 'right', cellWidth: 24 }
    },
    didDrawPage: () => {
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`${SISTEMA_NOME} • ${SISTEMA_SLOGAN}`, 14, pageHeight - 10)
      doc.text(`Página ${pageNumber}`, pageWidth - 30, pageHeight - 10)
    }
  })

  doc.save(`relatorio-ativos-3rn-${Date.now()}.pdf`)
  await registerExportLog({ userId, formato: 'pdf', tipoExportacao: 'itens', filtrosAplicados: filtros, quantidadeRegistros: items.length })
}
