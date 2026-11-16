// The island while the admin uploads photos to the media library (components/admin/uploads.ts): one activity for the whole
// batch, a ring filling with the bytes sent, then a check (or a warning that expands, when one failed) for a few seconds.
import { useEffect, useRef, useState } from 'react';
import type { Upload } from '@/components/admin/uploads';
import { Glyph } from '@/components/islandcn/glyph';
import { CheckGlyph, UploadGlyph, WarningGlyph } from '@/components/islandcn/glyphs';
import { BottomBar, ExpandedBottom, SensorRow } from '@/components/islandcn/island-layout';
import { CompactText, ContextLabel, ExpandedSubtitle, ExpandedValue, MinimalPair, NumberText } from '@/components/islandcn/island-text';
import { LinearProgress } from '@/components/islandcn/linear-progress';
import { ProgressRing } from '@/components/islandcn/progress-ring';
import { islandAccent, islandInk } from '@/components/islandcn/theme';
import { useActivity } from '@/components/islandcn/use-activity';
import { useI18n, useT } from '@/lib/i18n';

const LINGER_MS = 3500;

type Batch = { progress: number; total: number; failed: number; running: boolean };

function UploadActivity({ batch }: { batch: Batch }) {
  const { t, num } = useI18n();
  const translate = useT();
  const percent = Math.round(batch.progress * 100);
  const accent = batch.failed > 0 ? islandAccent.red : batch.running ? islandAccent.blue : islandAccent.green;
  const mark = batch.running ? UploadGlyph : batch.failed > 0 ? WarningGlyph : CheckGlyph;
  const title = batch.running ? t.island.uploading : batch.failed > 0 ? t.island.problem : t.island.uploaded;
  const detail = batch.failed > 0 ? translate('island.failed', batch.failed) : translate('island.photos', batch.total);
  const controls = useActivity(
    () => ({
      id: 'media-upload',
      label: `${title}: ${detail}, ${num(percent)}%`,
      compact: {
        leading: <Glyph icon={mark} color={accent} />,
        trailing: batch.running ? <ProgressRing value={batch.progress} color={accent} size={20} /> : <Glyph icon={mark} color={accent} />,
      },
      minimal: <MinimalPair leading={<ProgressRing value={batch.progress} color={accent} />} trailing={<CompactText><NumberText value={`${num(percent)}%`} /></CompactText>} />,
      expanded: {
        leading: (
          <SensorRow glyph={<Glyph icon={mark} color={accent} size={18} />}>
            <ContextLabel>{title}</ContextLabel>
          </SensorRow>
        ),
        bottom: (
          <ExpandedBottom gap={6}>
            {batch.running ? (
              <ExpandedValue unit="%">
                <NumberText value={num(percent)} />
              </ExpandedValue>
            ) : (
              // over: how many made it, not a percentage that reads as success
              <ExpandedValue>
                <NumberText value={`${num(batch.total - batch.failed)}/${num(batch.total)}`} />
              </ExpandedValue>
            )}
            <ExpandedSubtitle color={batch.failed > 0 ? accent : islandInk.primary}>{detail}</ExpandedSubtitle>
            <BottomBar>
              <LinearProgress value={batch.progress} color={accent} height={5} />
            </BottomBar>
          </ExpandedBottom>
        ),
      },
    }),
    [batch.progress, batch.total, batch.failed, batch.running, title, detail, accent],
  );
  // a failure is the one thing to notice now: expand once per new failure
  const failures = useRef(0);
  useEffect(() => {
    if (batch.failed > failures.current) controls.alert();
    failures.current = batch.failed;
  }, [batch.failed, controls]);
  return null;
}

/** Shows the island from the first byte of a batch until a few seconds after its last file ends. */
export function UploadIsland({ items }: { items: Upload[] }) {
  const running = items.some((item) => item.state === 'uploading');
  const batchIds = useRef(new Set<string>());
  const [lingering, setLingering] = useState(false);
  if (running && !lingering) items.filter((item) => item.state === 'uploading').forEach((item) => batchIds.current.add(item.id));
  useEffect(() => {
    if (running) {
      setLingering(false);
      return;
    }
    if (batchIds.current.size === 0) return;
    setLingering(true);
    const timer = window.setTimeout(() => {
      setLingering(false);
      batchIds.current = new Set();
    }, LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [running]);
  if (!running && !lingering) return null;
  const batch = items.filter((item) => batchIds.current.has(item.id));
  const total = batch.length;
  const progress = total === 0 ? 0 : batch.reduce((sum, item) => sum + (item.state === 'uploading' ? item.progress : 1), 0) / total;
  return <UploadActivity batch={{ progress, total, failed: batch.filter((item) => item.state === 'error').length, running }} />;
}
