// A recipe video, ported from prep-v1's player. The poster is our own photo with a play button: nothing is asked of YouTube until
// it is pressed. Then youtube-nocookie plays in one layer on <body> laid over its place (so it scrolls with the page); when its
// place scrolls out of view it floats in the corner as a small player with a bar (ring of progress, play / pause, back to the
// recipe, shrink to a pill, close). The iframe is never moved in the page (a moved iframe restarts): only its style changes. It
// is driven through YouTube's own message channel (enablejsapi); no script is loaded from anyone. One video plays at a time.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownSmall, ChevronUp, ExternalLink, Pause, Play, PopOut, X, Youtube } from '@/components/icons/page';
import { Photo } from '@/components/kit/photo';
import { useI18n } from '@/lib/i18n';

const ORIGIN = 'https://www.youtube-nocookie.com';
const RING = 11;

type Mode = 'inline' | 'mini' | 'pill';
type State = 'idle' | 'playing' | 'paused' | 'ended';
type Playback = { state: State; current: number; duration: number };
type Box = { top: number; left: number; width: number; height: number };

let closeCurrent: (() => void) | undefined;

/** The video id of a YouTube watch / short / embed link. */
export function youtubeId(url: string): string | null {
  const match = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/.exec(url);
  return match?.[1] ?? null;
}

function stateOf(code: unknown): State | undefined {
  if (code === 1) return 'playing';
  if (code === 2) return 'paused';
  return code === 0 ? 'ended' : undefined;
}

function read(raw: unknown): Partial<Playback> | undefined {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (typeof data !== 'object' || data === null || !('info' in data)) return undefined;
  const info = (data as { info: unknown }).info;
  if (typeof info === 'number') {
    const state = stateOf(info);
    return state ? { state } : {};
  }
  if (typeof info !== 'object' || info === null) return undefined;
  const { playerState, currentTime, duration } = info as Record<string, unknown>;
  const state = stateOf(playerState);
  return {
    ...(state ? { state } : {}),
    ...(typeof currentTime === 'number' ? { current: currentTime } : {}),
    ...(typeof duration === 'number' && duration > 0 ? { duration } : {}),
  };
}

function usePlayback(frame: RefObject<HTMLIFrameElement | null>, active: boolean) {
  const [playback, setPlayback] = useState<Playback>({ state: 'idle', current: 0, duration: 0 });
  useEffect(() => {
    if (!active) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== ORIGIN || event.source !== frame.current?.contentWindow) return;
      const update = read(event.data);
      if (update) setPlayback((was) => ({ ...was, ...update }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [active, frame]);
  const post = useCallback((message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), ORIGIN), [frame]);
  // told twice: the player's script may not be ready when the frame says it loaded
  const listen = useCallback(() => {
    post({ event: 'listening', id: 1, channel: 'widget' });
    window.setTimeout(() => post({ event: 'listening', id: 1, channel: 'widget' }), 600);
  }, [post]);
  const command = useCallback((name: 'playVideo' | 'pauseVideo') => post({ event: 'command', func: name, args: '' }), [post]);
  return { playback, listen, command };
}

function useAnchor(place: RefObject<HTMLElement | null>, active: boolean): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    const element = place.current;
    if (!active || !element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = rect.width > 0 ? { top: Math.round(rect.top + window.scrollY), left: Math.round(rect.left + window.scrollX), width: Math.round(rect.width), height: Math.round(rect.height) } : null;
      setBox((was) => (was && next && was.top === next.top && was.left === next.left && was.width === next.width && was.height === next.height ? was : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    const until = performance.now() + 900;
    let frameId = 0;
    const settle = () => {
      measure();
      if (performance.now() < until) frameId = requestAnimationFrame(settle);
    };
    frameId = requestAnimationFrame(settle);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(frameId);
    };
  }, [place, active]);
  return box;
}

function useOffscreen(place: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const element = place.current;
    if (!active || !element) return;
    const observer = new IntersectionObserver((entries) => setOffscreen(entries.some((entry) => !entry.isIntersecting)), { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [place, active]);
  return active && offscreen;
}

function Ring({ fraction }: { fraction: number }) {
  const length = 2 * Math.PI * RING;
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden className="shrink-0">
      <circle cx="14" cy="14" r={RING} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
      <circle cx="14" cy="14" r={RING} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - fraction)} transform="rotate(-90 14 14)" className="transition-[stroke-dashoffset] duration-500" />
    </svg>
  );
}

const barShape = 'press grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors';
const barButton = `${barShape} text-foreground hover:bg-accent`;
const playButton = `${barShape} bg-ink text-ink-foreground hover:opacity-85`;

function frameStyle(mode: Mode, box: Box | null): CSSProperties | undefined {
  if (mode !== 'inline') return undefined;
  return box === null ? { visibility: 'hidden', top: 0, left: 0, width: 1, height: 1 } : { top: box.top, left: box.left, width: box.width, height: box.height };
}

export function VideoPlayer({ url, title, channel, poster }: { url: string; title: string; channel?: string | null | undefined; poster: string | null | undefined }) {
  const { t, num } = useI18n();
  const id = youtubeId(url);
  const [playing, setPlaying] = useState(false);
  const [pin, setPin] = useState<Mode | null>(null);
  const place = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const offscreen = useOffscreen(place, playing);
  const box = useAnchor(place, playing);
  const { playback, listen, command } = usePlayback(frame, playing);
  const mode: Mode = pin ?? (offscreen ? 'mini' : 'inline');
  const close = useCallback(() => {
    setPlaying(false);
    setPin(null);
  }, []);
  useEffect(() => () => {
    if (closeCurrent === close) closeCurrent = undefined;
  }, [close]);
  if (!id) return null;
  const begin = () => {
    closeCurrent?.();
    closeCurrent = close;
    setPlaying(true);
  };
  const dockBack = () => {
    setPin(null);
    place.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const floating = mode !== 'inline';
  const fraction = playback.duration > 0 ? Math.min(1, playback.current / playback.duration) : 0;
  const query = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1', autoplay: '1', enablejsapi: '1', origin: window.location.origin });
  const isPlaying = playback.state === 'playing';
  return (
    <figure className="m-0 grid gap-2.5">
      <div ref={place} className="relative aspect-video overflow-hidden rounded-[24px] bg-muted">
        {playing ? (
          <button type="button" onClick={floating ? dockBack : undefined} disabled={!floating} className="absolute inset-0 grid cursor-pointer place-items-center bg-muted text-subhead font-semibold text-muted-foreground disabled:cursor-default">
            {floating && (
              <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-[var(--sh-sm)]">
                <PopOut size={16} /> {t.video.inCorner}
              </span>
            )}
          </button>
        ) : (
          <button type="button" onClick={begin} aria-label={`${t.video.play}: ${title}`} className="promo group absolute inset-0 grid cursor-pointer grid-rows-[1fr_auto] overflow-hidden rounded-[24px] p-5 text-left sm:p-7">
            {poster && <Photo src={poster} alt="" ratio="1 / 1" sizes="320px" className="pointer-events-none !absolute -right-10 -top-10 w-[46%] rotate-6 rounded-[28px] opacity-90 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] transition-transform duration-700 ease-[var(--ease-out)] group-hover:rotate-3 group-hover:scale-105" />}
            <span className="relative grid place-items-start content-center">
              <span className="grid size-16 place-items-center rounded-full bg-cta text-cta-ink shadow-[0_14px_34px_-12px_rgb(0_0_0/0.55)] transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 sm:size-20">
                <Play size={30} className="translate-x-0.5" />
              </span>
            </span>
            <span className="relative grid max-w-[70%] gap-1">
              <span className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-white/80">
                <Youtube size={15} /> {t.video.label}
              </span>
              <span className="text-title-2 font-extrabold leading-tight">{title}</span>
              {channel && <span className="text-footnote text-white/80">{t.video.by.replace('{channel}', channel)}</span>}
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-muted-foreground">
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground">
          {t.video.openOn} <ExternalLink size={13} />
        </a>
        {playing && !floating && (
          <button type="button" onClick={() => setPin('mini')} className="inline-flex cursor-pointer items-center gap-1 font-semibold transition-colors hover:text-foreground">
            <PopOut size={14} /> {t.video.popOut}
          </button>
        )}
      </figcaption>
      {playing &&
        createPortal(
          <div role="group" aria-label={title} data-mode={mode} className="video-frame" style={frameStyle(mode, box)}>
            <div className="video-screen">
              <iframe ref={frame} src={`${ORIGIN}/embed/${id}?${query.toString()}`} title={title} onLoad={listen} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="size-full border-0" />
            </div>
            {floating && (
              <div className="video-bar">
                {mode === 'mini' && <Ring fraction={fraction} />}
                <span className="min-w-0 flex-1 truncate text-footnote font-semibold" title={title}>
                  {title}
                </span>
                {mode === 'mini' && <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{num(Math.round(fraction * 100))}%</span>}
                <button type="button" onClick={() => command(isPlaying ? 'pauseVideo' : 'playVideo')} aria-label={isPlaying ? t.video.pause : t.video.play} title={isPlaying ? t.video.pause : t.video.play} className={playButton}>
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>
                {mode === 'mini' ? (
                  <>
                    <button type="button" onClick={dockBack} aria-label={t.video.dockBack} title={t.video.dockBack} className={barButton}>
                      <ChevronUp size={16} />
                    </button>
                    <button type="button" onClick={() => setPin('pill')} aria-label={t.video.minimize} title={t.video.minimize} className={barButton}>
                      <ChevronDownSmall size={16} />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setPin('mini')} aria-label={t.video.expand} title={t.video.expand} className={barButton}>
                    <ChevronUp size={16} />
                  </button>
                )}
                <button type="button" onClick={close} aria-label={t.video.close} title={t.video.close} className={barButton}>
                  <X size={15} />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </figure>
  );
}
