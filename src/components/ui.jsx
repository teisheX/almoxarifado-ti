import { AlertCircle } from 'lucide-react'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header premium-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

export function StatCard({ title, value, subtitle, icon, tone = 'primary' }) {
  return (
    <article className={`stat-card premium-stat stat-${tone}`}>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className="stat-icon">{icon}</div>
    </article>
  )
}

export function DashboardCard({ title, action, children, className = '' }) {
  return (
    <article className={`panel dashboard-card ${className}`}>
      <div className="dashboard-card-header">
        <h2>{title}</h2>
        {action && <div>{action}</div>}
      </div>
      {children}
    </article>
  )
}

export function EmptyState({ title = 'Nenhum registro encontrado', description = 'Quando houver dados disponíveis, eles aparecerão aqui.' }) {
  return (
    <div className="empty-state premium-empty">
      <AlertCircle size={22} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}

const statusLabels = {
  disponivel: 'Disponível',
  em_uso: 'Em uso',
  manutencao: 'Manutenção',
  baixado: 'Baixado',
  descartado: 'Baixado',
  enviado: 'Enviado',
  assinado: 'Assinado',
  recusado: 'Recusado',
  expirado: 'Expirado',
  pendente: 'Pendente',
  atualizado: 'Atualizado'
}

export function StatusBadge({ status }) {
  const normalized = String(status || 'pendente').toLowerCase()
  return <span className={`badge ${normalized}`}>{statusLabels[normalized] || normalized}</span>
}

export function DataTable({ columns, rows, emptyTitle, emptyDescription }) {
  if (!rows?.length) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return (
    <div className="responsive-table data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map(column => (
                <td key={column.key} data-label={column.label}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
