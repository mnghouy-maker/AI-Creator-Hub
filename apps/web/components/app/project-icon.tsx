/** Maps a ProjectType to its icon + accent tone, so projects/jobs render
 *  consistently everywhere they appear (dashboard, library, palette). */
import {
  Film,
  AudioWaveform,
  FileText,
  Newspaper,
  Hash,
  Captions,
  Image as ImageIcon,
} from 'lucide-react';
import type { ProjectType } from '@hub/shared';
import { cn } from '@/lib/utils';

const MAP: Record<ProjectType, { icon: typeof Film; tone: string }> = {
  video_translate: { icon: Film, tone: 'bg-accent/12 text-accent' },
  subtitles: { icon: Captions, tone: 'bg-accent-2/12 text-accent-2' },
  voice: { icon: AudioWaveform, tone: 'bg-accent-2/12 text-accent-2' },
  script: { icon: FileText, tone: 'bg-accent/12 text-accent' },
  blog: { icon: Newspaper, tone: 'bg-good/14 text-good' },
  social: { icon: Hash, tone: 'bg-accent-2/12 text-accent-2' },
  image: { icon: ImageIcon, tone: 'bg-accent/12 text-accent' },
};

export function ProjectIcon({ type, className }: { type: ProjectType; className?: string }) {
  const { icon: Icon, tone } = MAP[type];
  return (
    <span
      className={cn(
        'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg',
        tone,
        className,
      )}
    >
      <Icon className="h-[15px] w-[15px]" />
    </span>
  );
}
