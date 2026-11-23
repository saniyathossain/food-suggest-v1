// One article on the page's full width, lined up with the bar: a hero (title + excerpt beside the cover; alone when the post
// has no cover), then the body in a reading measure ("## " subheadings, "- " bullets grouped into lists) with its sources and
// the disclaimer in a sticky side column, and more to read.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, ExternalLink } from '@/components/icons/page';
import { Crumbs } from '@/components/journey/Crumbs';
import { PlanNext } from '@/components/journey/NextStep';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { PageBones } from '@/components/kit/routeskeleton';
import { Disclaimer } from '@/components/Sources';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Post, PostCard } from '@/lib/types';
import { ArticleCard } from '@/pages/Read';

const headingId = (index: number) => `h-${index}`;

/** The article's own subheadings ("## " lines), as a list to jump by. */
function headingsOf(lines: string[]): { id: string; text: string }[] {
  return lines.flatMap((line, index) => (line.startsWith('## ') ? [{ id: headingId(index), text: line.slice(3) }] : []));
}

/** A thin bar at the top that fills as the article is read (transform only, one passive scroll listener, one frame at a time). */
function ReadingProgress() {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <span aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <span ref={bar} className="block h-full w-full origin-left bg-[var(--primary)]" style={{ transform: 'scaleX(0)' }} />
    </span>
  );
}

/** "On this page": the subheadings, the one being read marked. */
function Contents({ items, title }: { items: { id: string; text: string }[]; title: string }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  useEffect(() => {
    const seen = new IntersectionObserver((entries) => {
      const top = entries.filter((entry) => entry.isIntersecting).sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    }, { rootMargin: '-96px 0px -65% 0px' });
    items.forEach((item) => {
      const node = document.getElementById(item.id);
      if (node) seen.observe(node);
    });
    return () => seen.disconnect();
  }, [items]);
  return (
    <nav aria-label={title} className="hidden gap-2 lg:grid">
      <h2 className="text-headline">{title}</h2>
      <ol className="grid gap-0.5 border-s">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="-ms-px block border-s-2 border-transparent py-1.5 ps-3 text-subhead text-muted-foreground transition-colors hover:text-foreground aria-[current=location]:border-primary aria-[current=location]:font-semibold aria-[current=location]:text-foreground"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Body({ lines }: { lines: string[] }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="grid gap-2 pl-5 marker:text-primary [list-style:disc]">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  lines.forEach((line, index) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      return;
    }
    flush();
    if (line.startsWith('## ')) blocks.push(<h2 key={index} id={headingId(index)} className="mt-4 scroll-mt-28 text-title-2 font-bold">{line.slice(3)}</h2>);
    else blocks.push(<p key={index}>{line}</p>);
  });
  flush();
  return <div className="grid gap-5 text-[18px] leading-[1.7] [&_li]:leading-[1.6]">{blocks}</div>;
}

export default function Article({ slug }: { slug: string }) {
  const { t, lang, num } = useI18n();
  const { data, error } = useResource<Post>(endpoints.post(slug, lang));
  const { data: all } = useResource<PostCard[]>(endpoints.posts(lang));
  if (error) return <main className="page"><ErrorBox message={error.message} /></main>;
  if (!data) return <PageBones shape="article" />;
  const more = (all ?? []).filter((post) => post.slug !== data.slug).slice(0, 3);
  // the excerpt already leads the page; an opening paragraph that repeats it is dropped
  const lines = data.body[0] === data.excerpt ? data.body.slice(1) : data.body;
  const headings = headingsOf(lines);
  const published = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${data.published_on}T00:00:00`));
  return (
    <main className="page grid gap-14">
      <ReadingProgress />
      <Crumbs trail={[{ href: '/read', label: t.nav.read }]} here={data.title} />
      <article className="grid gap-10">
        <header className={cn('grid items-center gap-8', data.image && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12')}>
          <div className="grid max-w-[760px] content-center gap-5">
            <p className="flex items-center gap-1.5 text-footnote font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <BookOpen size={14} /> {num(data.reading_minutes)} {t.blog.read}
              <span aria-hidden>·</span>
              <time dateTime={data.published_on} className="normal-case tracking-normal">{published}</time>
            </p>
            {data.tags.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold capitalize text-muted-foreground">{tag.replace(/-/g, ' ')}</span>
                ))}
              </p>
            )}
            <h1 className="text-[clamp(32px,4.2vw,56px)] font-bold leading-[1.06] tracking-[-0.03em]">{data.title}</h1>
            <p className="text-[19px] leading-[1.6] text-muted-foreground">{data.excerpt}</p>
          </div>
          {data.image && (
            <Photo src={data.image} alt="" eager ratio="4 / 3" sizes="(max-width: 1024px) 100vw, 840px" tone="#7458c4" className="rounded-[28px]" />
          )}
        </header>
        <div className="grid gap-10 border-t pt-10 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)] lg:gap-16">
          <Body lines={lines} />
          <aside className="grid content-start gap-6 lg:sticky lg:top-28 lg:self-start">
            {headings.length >= 3 && <Contents items={headings} title={t.blog.toc} />}
            {data.sources.length > 0 && (
              <section className="grid gap-3">
                <h2 className="text-headline">{t.blog.sources}</h2>
                <ul className="grid gap-2">
                  {data.sources.map((source) => (
                    <li key={source.title} className="text-subhead">
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-semibold text-primary">
                          {source.publisher}: {source.title} <ExternalLink size={13} className="mt-1 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-semibold">
                          {source.publisher}: {source.title}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <Disclaimer />
          </aside>
        </div>
      </article>
      {more.length > 0 && (
        <section className="grid gap-4">
          <h2 className="text-title-2 font-bold">{t.blog.more}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}
      <PlanNext kind="article" />
    </main>
  );
}
