// One article on the page's full width, lined up with the bar: a hero (title + excerpt beside the cover; alone when the post
// has no cover), then the body in a reading measure ("## " subheadings, "- " bullets grouped into lists) with its sources and
// the disclaimer in a sticky side column, and more to read.
import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, ExternalLink } from '@/components/icons/page';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { PageBones } from '@/components/kit/routeskeleton';
import { Disclaimer } from '@/components/Sources';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { onLink } from '@/lib/router';
import type { Post, PostCard } from '@/lib/types';
import { ArticleCard } from '@/pages/Read';

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
    if (line.startsWith('## ')) blocks.push(<h2 key={index} className="mt-4 text-title-2 font-bold">{line.slice(3)}</h2>);
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
  return (
    <main className="page grid gap-14">
      <article className="grid gap-10">
        <header className={cn('grid items-center gap-8', data.image && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12')}>
          <div className="grid max-w-[760px] content-center gap-5">
            <a href="/read" onClick={onLink} className="inline-flex w-fit items-center gap-1.5 text-subhead font-semibold text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft size={16} /> {t.blog.back}
            </a>
            <p className="flex items-center gap-1.5 text-footnote font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <BookOpen size={14} /> {num(data.reading_minutes)} {t.blog.read}
            </p>
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
    </main>
  );
}
