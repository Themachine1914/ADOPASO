import { socialLinks } from '../data/social'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8.75 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.5-3h-3V8.75c0-.87.24-1.46 1.5-1.46H16.5V4.5c-.26-.03-1.15-.1-2.18-.1-2.16 0-3.64 1.32-3.64 3.74V10.5H8v3h2.68V21H13.5Z" />
    </svg>
  )
}

const icons = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
} as const

interface SocialLinksProps {
  className?: string
}

export function SocialLinks({ className = '' }: SocialLinksProps) {
  return (
    <div className={['flex items-center gap-1.5', className].join(' ')}>
      {socialLinks.map((item) => {
        const Icon = icons[item.label]
        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.label} de ADOPASO`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted transition-colors duration-200 hover:bg-surface-elevated hover:text-gold"
          >
            <Icon className="h-5 w-5" />
          </a>
        )
      })}
    </div>
  )
}
