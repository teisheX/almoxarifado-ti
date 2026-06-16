import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BarcodeScanner from '../components/BarcodeScanner'

const initialForm = {
  modelo: '', marca_id: '', patrimonio: '', codigo_barras: '', categoria_id: '', tipo: '', status: 'disponivel', quantidade: 1,
  localizacao_id: '', responsavel_atual: '', observacoes: '', data_aquisicao: '', valor_estimado: '', fornecedor: '', garantia_ate: ''
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
      setRefs({ categorias: categorias.data || [], marcas: marcas.data || [], localizacoes: localizacoes.data || [] })
      if (editing) {
        const { data } = await supabase.from('itens').select('*').eq('id', id).single()
        if (data) setForm({ ...initialForm, ...data, data_aquisicao: data.data_aquisicao || '', garantia_ate: data.garantia_ate || '', valor_estimado: data.valor_estimado || '' })
      }
    }
    load()
  }, [id])

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  async function validateDuplicity() {
    let query = supabase.from('itens').select('id, patrimonio, codigo_barras').or(`patrimonio.eq.${form.patrimonio},codigo_barras.eq.${form.codigo_barras}`).is('deleted_at', null)
    const { data } = await query
    const duplicated = (data || []).find(row => row.id !== id)
    if (duplicated?.patrimonio === form.patrimonio) throw new Error('Número de patrimônio já cadastrado.')
    if (duplicated?.codigo_barras === form.codigo_barras) throw new Error('Código de barras já cadastrado.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await validateDuplicity()
      const payload = {
        ...form,
        quantidade: Number(form.quantidade || 0),
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        data_aquisicao: form.data_aquisicao || null,
        garantia_ate: form.garantia_ate || null,
        atualizado_por: user.id
      }

      if (editing) {
        if (!isAdmin) throw new Error('Apenas administrador pode editar itens.')
        const { error } = await supabase.from('itens').update(payload).eq('id', id)
        if (error) throw error
        await supabase.from('audit_logs').insert({ usuario_id: user.id, acao: 'update_item', tabela_afetada: 'itens', registro_id: id, detalhes: payload })
      } else {
        const { data, error } = await supabase.from('itens').insert({ ...payload, criado_por: user.id }).select('id').single()
        if (error) throw error
        await supabase.from('audit_logs').insert({ usuario_id: user.id, acao: 'create_item', tabela_afetada: 'itens', registro_id: data.id, detalhes: payload })
      }
      navigate('/itens')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section">
      <div className="page-header"><div><h1>{editing ? 'Editar item' : 'Cadastrar item'}</h1><p>Preencha os dados do equipamento ou ativo de TI.</p></div></div>
      <form className="form-grid panel" onSubmit={handleSubmit}>
        <Input label="Modelo *" value={form.modelo} onChange={v => update('modelo', v)} required />
        <Select label="Marca *" value={form.marca_id} onChange={v => update('marca_id', v)} options={refs.marcas} required />
        <Input label="Patrimônio *" value={form.patrimonio} onChange={v => update('patrimonio', v)} required />
        <div className="field">
          <label>Código de barras *</label>
          <div className="inline-input"><input value={form.codigo_barras} onChange={e => update('codigo_barras', e.target.value)} required /><button type="button" className="btn secondary" onClick={() => setScannerOpen(true)}><Camera size={16} /></button></div>
        </div>
        <Select label="Categoria *" value={form.categoria_id} onChange={v => update('categoria_id', v)} options={refs.categorias} required />
        <Select label="Localização *" value={form.localizacao_id} onChange={v => update('localizacao_id', v)} options={refs.localizacoes} required />
        <SelectSimple label="Status *" value={form.status} onChange={v => update('status', v)} options={[['disponivel','Disponível'], ['em_uso','Em uso'], ['manutencao','Manutenção'], ['descartado','Descartado']]} />
        <Input label="Tipo do item" value={form.tipo} onChange={v => update('tipo', v)} />
        <Input label="Quantidade" type="number" min="0" value={form.quantidade} onChange={v => update('quantidade', v)} />
        <Input label="Responsável atual" value={form.responsavel_atual} onChange={v => update('responsavel_atual', v)} />
        <Input label="Fornecedor" value={form.fornecedor} onChange={v => update('fornecedor', v)} />
        <Input label="Valor estimado" type="number" step="0.01" value={form.valor_estimado} onChange={v => update('valor_estimado', v)} />
        <Input label="Data de aquisição" type="date" value={form.data_aquisicao} onChange={v => update('data_aquisicao', v)} />
        <Input label="Garantia até" type="date" value={form.garantia_ate} onChange={v => update('garantia_ate', v)} />
        <div className="field full"><label>Observações</label><textarea value={form.observacoes || ''} onChange={e => update('observacoes', e.target.value)} /></div>
        <div className="form-actions full"><button className="btn primary" disabled={loading}><Save size={18} /> {loading ? 'Salvando...' : 'Salvar item'}</button></div>
      </form>
      {scannerOpen && <BarcodeScanner onDetected={(code) => update('codigo_barras', code)} onClose={() => setScannerOpen(false)} />}
    </section>
  )
}

function Input({ label, value, onChange, ...props }) { return <div className="field"><label>{label}</label><input value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} /></div> }
function Select({ label, value, onChange, options, required }) { return <div className="field"><label>{label}</label><select value={value || ''} onChange={e => onChange(e.target.value)} required={required}><option value="">Selecione</option>{options.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div> }
function SelectSimple({ label, value, onChange, options }) { return <div className="field"><label>{label}</label><select value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div> }
