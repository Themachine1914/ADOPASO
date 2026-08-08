import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
  action?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="typo-eyebrow">{eyebrow}</p>
        <h1 className="typo-page mt-2">{title}</h1>
        {description ? <p className="typo-lead mt-3">{description}</p> : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
