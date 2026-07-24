/**
 * Script Writer tool — the representative AI text tool, wired end-to-end to the
 * Phase-6 API: submit a brief → reserve credits + enqueue a job → poll status →
 * render the result. The other text tools (blog, social, title, hashtags) reuse
 * the exact same pattern (useJob + this form), so they slot in with a tool name
 * change. Out-of-credits returns 402 and shows an upgrade prompt.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useJob } from '@/lib/use-job';

const PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'Podcast', 'Ad'];

export default function ScriptToolPage() {
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('YouTube');
  const [tone, setTone] = useState('');
  const { phase, job, result, error, run } = useJob('script');

  const busy = phase === 'running';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/12 text-accent">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Script Writer</h1>
          <p className="text-sm text-muted">Hooks and full scripts for any platform.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Brief</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label htmlFor="prompt">What&apos;s the video about?</Label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. 5 editing tricks that make short videos feel pro"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-faint focus-visible:border-accent"
              />
            </div>
            <div>
              <Label>Platform</Label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      platform === p
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted hover:border-faint'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="tone">Tone (optional)</Label>
              <Input
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="energetic, friendly, authoritative…"
              />
            </div>
            <Button
              onClick={() => run({ prompt, platform, tone: tone || undefined })}
              loading={busy}
              disabled={prompt.trim().length < 3}
              className="w-full"
            >
              <Sparkles className="h-4 w-4" /> Generate script · 12 credits
            </Button>
          </CardBody>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            {job && phase === 'running' && (
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {job.status.toLowerCase()}…
              </span>
            )}
          </CardHeader>
          <CardBody>
            {phase === 'idle' && (
              <p className="py-10 text-center text-sm text-faint">
                Your generated script will appear here.
              </p>
            )}
            {phase === 'running' && (
              <div className="space-y-2 py-6">
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${job?.progress ?? 10}%` }}
                  />
                </div>
                <p className="text-center text-[12px] text-faint">
                  Working… this takes a few seconds.
                </p>
              </div>
            )}
            {phase === 'error' && (
              <div className="py-8 text-center">
                <p className="text-sm text-crit">{error}</p>
                {error.toLowerCase().includes('credit') && (
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-block text-sm font-semibold text-accent"
                  >
                    Upgrade your plan →
                  </Link>
                )}
              </div>
            )}
            {phase === 'done' && (
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {result}
              </pre>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
