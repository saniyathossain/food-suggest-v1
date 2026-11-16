// Every file Pathya takes goes in through this (Shell Console's Dropzone): a calm dashed panel that lights up when a file is dragged
// over it, opens the file picker on click or Enter, and takes a file pasted into it. It checks type and size itself (a drop ignores
// the picker's `accept`), says what was wrong in words, and shows a busy state while the caller uploads. What it says and its icon
// blur into each other as the state changes. What is done with the files is the caller's.
import { useId, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Loader } from '@/components/icons';
import { ImageUp as FileUpGlyph, UploadCloud } from '@/components/icons/page';
import { SwapSlot } from '@/components/motion';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** "1.4 MB", "820 KB". */
export function fileSize(count: number): string {
  if (count >= 1 << 20) return `${(count / (1 << 20)).toFixed(count >= 10 << 20 ? 0 : 1)} MB`;
  if (count >= 1 << 10) return `${Math.round(count / (1 << 10))} KB`;
  return `${count} B`;
}

function matches(rule: string, name: string, type: string): boolean {
  if (rule.startsWith('.')) return name.endsWith(rule);
  if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
  return type === rule;
}

/** Whether a file matches an `accept` list ("image/jpeg,image/png"); an empty list takes anything. */
export function accepts(accept: string | undefined, file: File): boolean {
  const rules = (accept ?? '').split(',').map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (rules.length === 0) return true;
  return rules.some((rule) => matches(rule, file.name.toLowerCase(), file.type.toLowerCase()));
}

function refusal(file: File, accept: string | undefined, maxBytes: number | undefined): string {
  if (!accepts(accept, file)) return t('kit.dropzone.wrongType', file.name);
  if (maxBytes && file.size > maxBytes) return t('kit.dropzone.tooBig', file.name, fileSize(maxBytes));
  return '';
}

type Mood = { busy: boolean; over: boolean; multiple: boolean };

function headline(mood: Mood): string {
  if (mood.busy) return t('kit.dropzone.busy');
  if (mood.over) return t('kit.dropzone.release');
  return mood.multiple ? t('kit.dropzone.titleMany') : t('kit.dropzone.title');
}

function look(mood: Mood): string {
  if (mood.busy) return 'busy';
  return mood.over ? 'over' : 'idle';
}

function MoodIcon({ mood }: { mood: Mood }) {
  if (mood.busy) return <Loader size={24} className="animate-spin" />;
  if (mood.over) return <FileUpGlyph size={24} />;
  return <UploadCloud size={24} />;
}

type Props = Readonly<{
  onFiles: (files: File[]) => void;
  accept?: string | undefined;
  maxBytes?: number | undefined;
  multiple?: boolean | undefined;
  busy?: boolean | undefined;
  hint?: string | undefined;
  className?: string | undefined;
}>;

export function Dropzone({ onFiles, accept, maxBytes, multiple = false, busy = false, hint, className }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState('');

  const take = (list: FileList | File[] | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length === 0 || busy) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const why = chosen.map((file) => refusal(file, accept, maxBytes)).find(Boolean) ?? '';
    setProblem(why);
    const fine = chosen.filter((file) => !refusal(file, accept, maxBytes));
    if (fine.length > 0) onFiles(fine);
  };
  const drag = (event: DragEvent, on: boolean) => {
    event.preventDefault();
    if (!busy) setOver(on);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files);
  };
  const key = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    input.current?.click();
  };
  const paste = (event: ClipboardEvent) => take(event.clipboardData.files);
  const mood: Mood = { busy, over, multiple };

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-describedby={id}
        data-over={over || undefined}
        onClick={() => input.current?.click()}
        onKeyDown={key}
        onDragEnter={(event) => drag(event, true)}
        onDragOver={(event) => drag(event, true)}
        onDragLeave={(event) => drag(event, false)}
        onDrop={drop}
        onPaste={paste}
        className={cn(
          'group/dz relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-input bg-card/60 px-6 py-9 text-center transition-[border-color,background-color,transform] duration-200 sm:flex-row sm:text-left',
          'hover:border-primary/50 hover:bg-primary-soft/40 focus-visible:border-primary',
          'data-[over=true]:scale-[1.01] data-[over=true]:border-primary data-[over=true]:bg-primary-soft',
        )}
      >
        <span aria-hidden className="tone-soft grid size-12 shrink-0 place-items-center rounded-lg [--tone:var(--violet)]">
          <SwapSlot id={look(mood)}>
            <MoodIcon mood={mood} />
          </SwapSlot>
        </span>
        <div id={id} className="grid min-w-0 gap-1">
          <SwapSlot id={headline(mood)} className="grid place-items-start">
            <span className="text-callout font-semibold">{headline(mood)}</span>
          </SwapSlot>
          {hint && <span className="text-footnote text-muted-foreground">{hint}</span>}
        </div>
        <input
          ref={input}
          type="file"
          tabIndex={-1}
          accept={accept}
          multiple={multiple}
          className="sr-only"
          aria-label={headline({ busy: false, over: false, multiple })}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            take(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      <p role="status" aria-live="polite" className={cn('text-footnote text-avoid-ink', !problem && 'sr-only')}>
        {problem}
      </p>
    </div>
  );
}
