import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BarcodeScanner from '../components/BarcodeScanner'

const initialForm = {
  modelo: '',
  marca_id: '',
  patrimonio: '',
  numero_serie: '',
  codigo_barras: '',
  categoria_id: '',
  tipo: '',
  status: 'disponivel',
  quantidade: 1,
  localizacao_id: '',
  setor: '',
  time: '',
  responsavel_atual: '',
  observacoes: '',
  data_aquisicao: '',
  valor_estimado: '',
  fornecedor: '',
  garantia_ate: ''
}

function toText(value) {
  return String(value ?? '').trim()
}

function toNullableText(value) {
  const normalized = toText(value)
  return normalized || null
}

function toDateOrNull(value) {
  const normalized = toText(value)
  return normalized || null
}

function toNumberOrNull(value) {
  const normalized = String(value ?? '').replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeItemToForm(item) {
  return {
    modelo: item?.modelo ?? '',
    marca_id: item?.marca_id ?? '',
    patrimonio: item?.patrimonio ?? '',
    numero_serie: item?.numero_serie ?? '',
    codigo_barras: item?.codigo_barras ?? '',
    categoria_id: item?.categoria_id ?? '',
    tipo: item?.tipo ?? '',
    status: item?.status ?? 'disponivel',
    quantidade: item?.quantidade ?? 1,
    localizacao_id: item?.localizacao_id ?? '',
    setor: item?.setor ?? '',
    time: item?.time ?? '',
    responsavel_atual: item?.responsavel_atual ?? '',
    observacoes: item?.observacoes ?? '',
    data_aquisicao: item?.data_aquisicao ?? '',
    valor_estimado: item?.valor_estimado ?? '',
    fornecedor: item?.fornecedor ?? '',
    garantia_ate: item?.garantia_ate ?? ''
  }
}

export default function ItemForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [refs, setRefs] = useState({ categorias: [], marcas: [], localizacoes: [] })
  const [loading, setLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const editing = Boolean(id)

  useEffect(() => {
    async function load() {
      const [categorias, marcas, localizacoes] = await Promise.all([
        supabase.from('categorias').select('*').eq('ativo', true).order('nome'),
        supabase.from('marcas').select('*').eq('ativo', true).order('nome'),
        supabase.from('localizacoes').select('*').eq('ativo', true).order('nome')
      ])

      setRefs({
        categorias: categorias.data || [],
        marcas: marcas.data || [],
        localizacoes: localizacoes.data || []
      })

      if (editing) {
        const { data, error } = await supabase.from('itens').select('*').eq('id', id).single()
        if (error) {
          alert(error.message || 'Erro ao carregar item.')
          return
        }
        if (data) setForm(normalizeItemToForm(data))
      } else {
        setForm(initialForm)
      }
    }

    load()
  }, [id, editing])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value ?? '' }))
  }

  async function validateDuplicity() {
    const modelo = toText(form.modelo)
    const patrimonio = toText(form.patrimonio)
    const codigoBarras = toText(form.codigo_barras)

    if (!modelo) throw new Error('Nome/modelo do item é obrigatório.')
    if (!form.marca_id) throw new Error('Marca é obrigatória.')
    if (!patrimonio) throw new Error('Patrimônio é obrigatório.')

    const filters = [`patrimonio.eq.${patrimonio}`]
    if (codigoBarras) filters.push(`codigo_barras.eq.${codigoBarras}`)

    const { data, error } = await supabase
      .from('itens')
      .select('id, patrimonio, codigo_barras')
      .or(filters.join(','))
      .is('deleted_at', null)

    if (error) throw error

    const duplicated = (data || []).find(row => row.id !== id)
    if (duplicated?.patrimonio === patrimonio) throw new Error('Número de patrimônio já cadastrado.')
    if (codigoBarras && duplicated?.codigo_barras === codigoBarras) throw new Error('Código de barras já cadastrado.')
  }

  function buildPayload() {
    return {
      modelo: toText(form.modelo),
      marca_id: form.marca_id || null,
      patrimonio: toText(form.patrimonio),
      numero_serie: toNullableText(form.numero_serie),
      codigo_barras: toNullableText(form.codigo_barras),
      categoria_id: form.categoria_id || null,
      tipo: toNullableText(form.tipo),
      status: form.status || 'disponivel',
      quantidade: Number(form.quantidade || 1),
      localizacao_id: form.localizacao_id || null,
      setor: toNullableText(form.setor),
      time: toNullableText(form.time),
      responsavel_atual: toNullableText(form.responsavel_atual),
      observacoes: toNullableText(form.observacoes),
      data_aquisicao: toDateOrNull(form.data_aquisicao),
      valor_estimado: toNumberOrNull(form.valor_estimado),
      fornecedor: toNullableText(form.fornecedor),
      garantia_ate: toDateOrNull(form.garantia_ate),
      atualizado_por: user?.id || null
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      await validateDuplicity()
      const payload = buildPayload()

      if (editing) {
        if (!isAdmin) throw new Error('Apenas administrador pode editar itens.')
        const { error } = await supabase.from('itens').update(payload).eq('id', id)
        if (error) throw error

        await supabase.from('audit_logs').insert({
          usuario_id: user.id,
          acao: 'update_item',
          tabela_afetada: 'itens',
          registro_id: id,
          detalhes: payload
        })
      } else {
        const { data, error } = await supabase
          .from('itens')
          .insert({ ...payload, criado_por: user.id })
          .select('id')
          .single()

        if (error) throw error

        await supabase.from('audit_logs').insert({
          usuario_id: user.id,
          acao: 'create_item',
          tabela_afetada: 'itens',
          registro_id: data.id,
          detalhes: payload
        })
      }

      navigate('/itens')
    } catch (err) {
      alert(err?.message || 'Erro ao salvar item.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>{editing ? 'Editar item' : 'Cadastrar item'}</h1>
          <p>Preencha os dados do bem ou ativo patrimonial.</p>
        </div>
      </div>

      <form className="form-grid panel" onSubmit={handleSubmit}>
        <Input label="Nome do item / Modelo *" value={form.modelo} onChange={v => update('modelo', v)} required />
        <Select label="Marca *" value={form.marca_id} onChange={v => update('marca_id', v)} options={refs.marcas} required />
        <Input label="Patrimônio *" value={form.patrimonio} onChange={v => update('patrimonio', v)} required />
        <Input label="Número de série" value={form.numero_serie} onChange={v => update('numero_serie', v)} placeholder="Ex.: SN123456789, ABC-2026-001" />
        <Input label="Setor" value={form.setor} onChange={v => update('setor', v)} placeholder="Ex.: Financeiro, Operações, Administração" />
        <Input label="Time" value={form.time} onChange={v => update('time', v)} placeholder="Ex.: Suporte, Infraestrutura, Administrativo" />

        <div className="field">
          <label>Código de barras</label>
          <div className="inline-input">
            <input value={form.codigo_barras ?? ''} onChange={e => update('codigo_barras', e.target.value)} />
            <button type="button" className="btn secondary" onClick={() => setScannerOpen(true)}><Camera size={16} /></button>
          </div>
        </div>

        <Select label="Categoria" value={form.categoria_id} onChange={v => update('categoria_id', v)} options={refs.categorias} />
        <Select label="Localização" value={form.localizacao_id} onChange={v => update('localizacao_id', v)} options={refs.localizacoes} />
        <SelectSimple label="Status" value={form.status} onChange={v => update('status', v)} options={[["disponivel", "Disponível"], ["em_uso", "Em uso"], ["manutencao", "Manutenção"], ["descartado", "Descartado"]]} />
        <Input label="Tipo do item" value={form.tipo} onChange={v => update('tipo', v)} />
        <Input label="Quantidade" type="number" min="0" value={form.quantidade} onChange={v => update('quantidade', v)} />
        <Input label="Responsável atual" value={form.responsavel_atual} onChange={v => update('responsavel_atual', v)} />
        <Input label="Fornecedor" value={form.fornecedor} onChange={v => update('fornecedor', v)} />
        <Input label="Valor estimado unitário" type="number" step="0.01" value={form.valor_estimado} onChange={v => update('valor_estimado', v)} />
        <Input label="Data de aquisição" type="date" value={form.data_aquisicao} onChange={v => update('data_aquisicao', v)} />
        <Input label="Garantia até" type="date" value={form.garantia_ate} onChange={v => update('garantia_ate', v)} />

        <div className="field full">
          <label>Observações</label>
          <textarea value={form.observacoes ?? ''} onChange={e => update('observacoes', e.target.value)} />
        </div>

        <div className="form-actions full">
          <button className="btn primary" disabled={loading}><Save size={18} /> {loading ? 'Salvando...' : 'Salvar item'}</button>
        </div>
      </form>

      {scannerOpen && <BarcodeScanner onDetected={(code) => update('codigo_barras', code)} onClose={() => setScannerOpen(false)} />}
    </section>
  )
}

function Input({ label, value, onChange, ...props }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} />
    </div>
  )
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} required={required}>
        <option value="">Selecione</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </div>
  )
}

function SelectSimple({ label, value, onChange, options }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value || 'disponivel'} onChange={e => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}
