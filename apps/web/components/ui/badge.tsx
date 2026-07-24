/**
 * Status pill. Encodes state in FORM as well as color (a leading dot) so job/
 * project status reads at a glance and stays legible for color-blind users
 * (dataviz principle: state in form, not color alone).
 */
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'run' | 'wait' | 'fail' | 'neutral';

const tones: Record<Tone, string> = {
  ok: 'text-good bg-good/12',
  run: 'text-accent bg-accent/12',
  wait: 'text-warn bg-warn/12',
  fail: 'text-crit bg-crit/12',
  neutral: 'text-muted bg-muted/12',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
