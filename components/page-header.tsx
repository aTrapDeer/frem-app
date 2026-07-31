import { ReactNode } from 'react'

/**
 * The one page header. Title in the display voice, an optional one-line
 * status underneath, chips beside the title, actions on the right.
 * Every signed-in page opens with this — no page invents its own.
 */
export function PageHeader({
  title,
  subtitle,
  chips,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  chips?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="page-title text-2xl sm:text-3xl">{title}</h1>
          {chips}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
