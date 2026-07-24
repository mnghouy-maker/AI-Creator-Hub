/**
 * Sample dashboard data.
 *
 * The dashboard shell, cards, and charts are real; the numbers here are
 * placeholders shown until the aggregate endpoints exist (usage/stats land in
 * Phase 6 with the AI/credits modules, revenue in Phase 8). Keeping them in one
 * clearly-labeled file means swapping to live data is a single import change.
 */
import type { ProjectType } from '@hub/shared';

export const usageSeries = [
  8, 14, 10, 22, 18, 30, 26, 34, 28, 42, 38, 50, 44, 58, 52, 66, 60, 72, 64, 78,
];

export const stats = {
  creditsRemaining: 1340,
  creditsMonthly: 2000,
  videosTranslated: 126,
  minutesProcessed: 842,
  activeProjects: 48,
};

export interface SampleJob {
  name: string;
  kind: ProjectType;
  progress: number;
  status: 'processing' | 'done';
}

export const jobs: SampleJob[] = [
  { name: 'Launch teaser → Khmer', kind: 'video_translate', progress: 72, status: 'processing' },
  { name: 'Podcast ep.14 voiceover', kind: 'voice', progress: 34, status: 'processing' },
  { name: 'SEO blog: "Best 4K cameras"', kind: 'blog', progress: 100, status: 'done' },
  { name: '30 TikTok hooks', kind: 'social', progress: 100, status: 'done' },
];

export interface SampleProject {
  title: string;
  type: ProjectType;
  typeLabel: string;
  language: string;
  status: 'processing' | 'complete' | 'queued';
  credits: number;
  updated: string;
}

export const projects: SampleProject[] = [
  {
    title: 'Launch teaser',
    type: 'video_translate',
    typeLabel: 'Video translate',
    language: '🇰🇭 Khmer',
    status: 'processing',
    credits: 180,
    updated: 'just now',
  },
  {
    title: 'Podcast ep.14',
    type: 'voice',
    typeLabel: 'Voiceover',
    language: '🇺🇸 English',
    status: 'processing',
    credits: 90,
    updated: '3 min ago',
  },
  {
    title: 'Q3 ad script',
    type: 'script',
    typeLabel: 'Script',
    language: '🇪🇸 Spanish',
    status: 'complete',
    credits: 12,
    updated: '1 h ago',
  },
  {
    title: 'Course intro',
    type: 'video_translate',
    typeLabel: 'Video translate',
    language: '🇯🇵 Japanese',
    status: 'queued',
    credits: 210,
    updated: '5 min ago',
  },
  {
    title: '"Best 4K cameras" blog',
    type: 'blog',
    typeLabel: 'Blog',
    language: '🇺🇸 English',
    status: 'complete',
    credits: 8,
    updated: '2 h ago',
  },
];
