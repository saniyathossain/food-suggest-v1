// The island for admin jobs with no known end (the medicine CSV import, an openFDA label sync): a spinner while the request
// runs, then a check for a moment, or a warning that expands when it failed. Jobs share one group, so two at once take turns.
import { useCallback } from 'react';
import { Glyph } from '@/components/islandcn/glyph';
import { CheckGlyph, WarningGlyph } from '@/components/islandcn/glyphs';
import { ExpandedBottom, SensorRow } from '@/components/islandcn/island-layout';
import { ContextLabel, ExpandedSubtitle, ExpandedTitle, MinimalPair } from '@/components/islandcn/island-text';
import { Spinner } from '@/components/islandcn/spinner';
import { islandAccent } from '@/components/islandcn/theme';
import { useIslandActions, type ActivityOptions } from '@/lib/island';
import { useI18n } from '@/lib/i18n';

const DONE_MS = 2500;
const FAILED_MS = 7000;

type Phase = 'running' | 'done' | 'failed';
type Job = { id: string; label: string; title: string; detail?: string | undefined };

function content(job: Job, phase: Phase, words: { done: string; problem: string }): Omit<ActivityOptions, 'id'> {
  const accent = phase === 'failed' ? islandAccent.red : phase === 'done' ? islandAccent.green : islandAccent.sky;
  const mark = phase === 'running' ? <Spinner size={20} color={accent} /> : <Glyph icon={phase === 'done' ? CheckGlyph : WarningGlyph} color={accent} />;
  const small = phase === 'running' ? <Spinner size={18} color={accent} /> : <Glyph icon={phase === 'done' ? CheckGlyph : WarningGlyph} color={accent} size={18} />;
  const status = phase === 'running' ? job.label : phase === 'done' ? words.done : words.problem;
  return {
    label: `${job.title}: ${status}`,
    compact: { leading: mark, trailing: phase === 'running' ? null : mark },
    minimal: <MinimalPair leading={mark} trailing={null} />,
    expanded: {
      leading: (
        <SensorRow glyph={small}>
          <ContextLabel>{status}</ContextLabel>
        </SensorRow>
      ),
      bottom: (
        <ExpandedBottom gap={4} style={{ paddingBottom: 10 }}>
          <ExpandedTitle>{job.title}</ExpandedTitle>
          {job.detail && <ExpandedSubtitle>{job.detail}</ExpandedSubtitle>}
        </ExpandedBottom>
      ),
    },
  };
}

/** `track(job, request)` shows `job` on the island for as long as `request` runs and hands back the request's own result. */
export function useJobIsland() {
  const island = useIslandActions();
  const { t } = useI18n();
  return useCallback(
    async <Result,>(job: Omit<Job, 'id'>, request: Promise<Result>): Promise<Result> => {
      const words = { done: t.island.done, problem: t.island.problem };
      const full: Job = { ...job, id: `job-${crypto.randomUUID()}` };
      const handle = island.start({ id: full.id, group: 'admin-jobs', ...content(full, 'running', words) });
      try {
        const result = await request;
        handle.update({ ...content(full, 'done', words), transition: 'crossfade' });
        window.setTimeout(() => handle.end(), DONE_MS);
        return result;
      } catch (error) {
        handle.update({ ...content(full, 'failed', words), transition: 'crossfade', alert: true });
        window.setTimeout(() => handle.end(), FAILED_MS);
        throw error;
      }
    },
    [island, t],
  );
}
