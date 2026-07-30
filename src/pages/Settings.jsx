import { useEffect, useMemo, useState } from 'react'
import { Copy, Download, ExternalLink, QrCode, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const tables = [
  { key: 'categorias', title: 'Categorias' },
  { key: 'marcas', title: 'Marcas' },
  { key: 'localizacoes', title: 'Localizações' }
]

function buildLocationItemsUrl(localizacaoId) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/+$/, '/')
  return `${base}#/itens?localizacao_id=${encodeURIComponent(localizacaoId)}`
}

function buildQrImageUrl(url, size = 360) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=18&data=${encodeURIComponent(url)}`
}

export default function Settings() {
  const [active, setActive] = useState('categorias')
  const [rows, setRows] = useState([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [qrRow, setQrRow] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')

  const qrLink = useMemo(() => qrRow ? buildLocationItemsUrl(qrRow.id) : '', [qrRow])
  const qrImage = useMemo(() => qrLink ? buildQrImageUrl(qrLink, 420) : '', [qrLink])

  async function load() {
    const { data } = await supabase.from(active).select('*').order('nome')
    setRows(data || [])
  }

  useEffect(() => { load() }, [active])

  async function add(e) {
    e.preventDefault()
    if (!nome.trim()) return
    const payload = active === 'marcas' ? { nome } : { nome, descricao }
    const { error } = await supabase.from(active).insert(payload)
    if (error) return alert(error.message)
    setNome(''); setDescricao(''); load()
  }

  async function toggle(row) {
    await supabase.from(active).update({ ativo: !row.ativo }).eq('id', row.id)
    load()
  }

  async function copyQrLink() {
    if (!qrLink) return
    await navigator.clipboard.writeText(qrLink)
    setCopyMessage('Link copiado!')
    setTimeout(() => setCopyMessage(''), 2500)
  }

  async function downloadQrPng() {
    if (!qrImage || !qrRow) return
    const fileName = `qr-localizacao-${qrRow.nome}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase() + '.png'
    try {
      const response = await fetch(qrImage)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(qrImage, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>Cadastros administrativos</h1>
          <p>Gerencie categorias, marcas e localizações. Em localizações, gere QR Codes que abrem os itens daquela localização.</p>
        </div>
      </div>

      <div className="tabs">
        {tables.map(t => <button key={t.key} className={active === t.key ? 'active' : ''} onClick={() => setActive(t.key)}>{t.title}</button>)}
      </div>

      <form className="panel settings-form" onSubmit={add}>
        <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
        {active !== 'marcas' && <input placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} />}
        <button className="btn primary">Adicionar</button>
      </form>

      {active === 'localizacoes' && (
        <div className="import-help">
          <strong>QR Code de localização:</strong> ao escanear, o usuário será direcionado para a aba <code>Itens</code> já filtrada pela localização escolhida. Se não estiver logado, ele faz login e depois é levado para a listagem filtrada.
        </div>
      )}

      <div className="panel responsive-table">
        <table>
          <thead>
            <tr><th>Nome</th><th>Descrição</th><th>Ativo</th><th>Ação</th>{active === 'localizacoes' && <th>QR Code</th>}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td data-label="Nome">{r.nome}</td>
                <td data-label="Descrição">{r.descricao || '-'}</td>
                <td data-label="Ativo">{r.ativo ? 'Sim' : 'Não'}</td>
                <td data-label="Ação"><button className="btn secondary" onClick={() => toggle(r)}>{r.ativo ? 'Desativar' : 'Ativar'}</button></td>
                {active === 'localizacoes' && (
                  <td data-label="QR Code">
                    <button className="btn secondary" type="button" onClick={() => { setQrRow(r); setCopyMessage('') }}>
                      <QrCode size={17} /> Gerar QR
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrRow && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card qr-modal-card">
            <div className="panel-title-row">
              <div>
                <h2>QR Code da localização</h2>
                <p>Escaneie para abrir os itens de <strong>{qrRow.nome}</strong>.</p>
              </div>
              <button className="icon-btn" type="button" onClick={() => setQrRow(null)} aria-label="Fechar"><X size={18} /></button>
            </div>

            <div className="qr-preview-box">
              <img src={qrImage} alt={`QR Code da localização ${qrRow.nome}`} />
              <div>
                <strong>{qrRow.nome}</strong>
                <small>Destino do QR Code:</small>
                <code>{qrLink}</code>
              </div>
            </div>

            {copyMessage && <p className="success-text">{copyMessage}</p>}

            <div className="qr-actions">
              <button className="btn secondary" type="button" onClick={copyQrLink}><Copy size={17} /> Copiar link</button>
              <button className="btn secondary" type="button" onClick={downloadQrPng}><Download size={17} /> Baixar PNG</button>
              <a className="btn primary" href={qrLink} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Testar acesso</a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
