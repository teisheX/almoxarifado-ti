function normalize(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || ''
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  return semicolonCount >= commaCount ? ';' : ','
}

function parseLine(line, delimiter) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function parseCSV(text) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '').trim()
  if (!cleanText) return []

  const delimiter = detectDelimiter(cleanText)
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim())
  const headers = parseLine(lines[0], delimiter).map(normalize)

  return lines.slice(1).map((line, index) => {
    const values = parseLine(line, delimiter)
    const row = { __linha: index + 2 }

    headers.forEach((header, i) => {
      row[header] = values[i] ?? ''
    })

    return row
  })
}

export function buildLookup(list) {
  return new Map((list || []).map(item => [normalize(item.nome), item.id]))
}

export function getCSVValue(row, keys) {
  for (const key of keys) {
    const value = row[normalize(key)]
    if (value !== undefined && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

export function normalizeStatus(value) {
  const status = normalize(value)
  const map = {
    disponivel: 'disponivel',
    disponivel_: 'disponivel',
    emestoque: 'disponivel',
    estoque: 'disponivel',
    em_uso: 'em_uso',
    emuso: 'em_uso',
    uso: 'em_uso',
    manutencao: 'manutencao',
    emmanutencao: 'manutencao',
    descartado: 'descartado',
    descarte: 'descartado'
  }
  return map[status.replace(/\s+/g, '').replace(/-/g, '_')] || 'disponivel'
}

export function downloadCSVTemplate() {
  const headers = [
    'modelo',
    'marca',
    'patrimonio',
    'codigo_barras',
    'categoria',
    'status',
    'quantidade',
    'localizacao',
    'tipo',
    'responsavel_atual',
    'observacoes',
    'fornecedor',
    'data_aquisicao',
    'valor_estimado',
    'garantia_ate'
  ]

  const example = [
    'Notebook Latitude 3420',
    'Dell',
    'PAT-0001',
    '789000000001',
    'Notebook',
    'disponivel',
    '1',
    'Almoxarifado TI',
    'Notebook',
    '',
    'Item importado via CSV',
    'Fornecedor Exemplo',
    '2026-06-17',
    '3500.00',
    '2027-06-17'
  ]

  const csv = `${headers.join(';')}\n${example.join(';')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-importacao-itens.csv'
  link.click()
  URL.revokeObjectURL(url)
}
