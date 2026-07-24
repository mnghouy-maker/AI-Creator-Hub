/** Brand mark — gradient play button, reused in nav, sidebar, footer, auth. */
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2.5 font-extrabold tracking-tight', className)}
    >
      <span
        className="relative grid h-8 w-8 place-items-center rounded-[9px] shadow-card"
        style={{ background: 'linear-gradient(140deg, hsl(var(--accent)), hsl(var(--accent-2)))' }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M4 5h11l5 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z"
            stroke="#fff"
            strokeWidth="1.6"
          />
          <path d="M9 12l3 2-3 2v-4z" fill="#fff" />
        </svg>
      </span>
      <span>Creator&nbsp;Hub</span>
    </Link>
  );
}
