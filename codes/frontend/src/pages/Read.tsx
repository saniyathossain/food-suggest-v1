// Articles: short, sourced explainers. The newest leads as a large card; the rest follow as a grid; tags narrow the list.
import { useState } from 'react';
import { BookOpen } from '@/components/icons/page';
import { ArticleListBones } from '@/components/kit/bones';
import { FilterChip } from '@/components/kit/filterchip';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { PostCard } from '@/lib/types';
import { cn } from '@/lib/utils';

const label = (tag: string) => tag.replace(/-/g, ' ');

export function ArticleCard({ post, lead = false }: { post: PostCard; lead?: boolean }) {
  const { t, num } = useI18n();
  return (
    <a href={`/read/${post.slug}`} onClick={onLink} className={cn('surface group grid overflow-hidden rounded-2xl', lead && 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]')}>
      <Photo src={post.image} alt="" ratio={lead ? '16 / 10' : '16 / 9'} sizes={lead ? '(max-width: 768px) 100vw, 720px' : '(max-width: 640px) 100vw, 440px'} zoom tone="#7458c4" eager={lead} />
      <div className={cn('grid content-start gap-2 p-5', lead && 'md:content-center md:p-8')}>
        <p className="flex flex-wrap gap-1.5">
          {post.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold capitalize text-muted-foreground">
              {label(tag)}
            </span>
          ))}
        </p>
        <h2 className={cn('font-bold leading-tight transition-colors group-hover:text-primary', lead ? 'text-title-1' : 'text-title-3')}>{post.title}</h2>
        <p className={cn('text-muted-foreground', lead ? 'text-body' : 'line-clamp-3 text-subhead')}>{post.excerpt}</p>
        <p className="flex items-center gap-1.5 pt-1 text-footnote text-muted-foreground">
          <BookOpen size={14} /> {num(post.reading_minutes)} {t.blog.read}
        </p>
      </div>
    </a>
  );
}

export default function Read() {
  const { t, lang } = useI18n();
  const { data, error } = useResource<PostCard[]>(endpoints.posts(lang));
  const [tag, setTag] = useState('');
  // only tags shared by two or more articles make useful filters
  const counts = new Map<string, number>();
  data?.forEach((post) => post.tags.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1)));
  const tags = [...counts].filter(([, count]) => count > 1).map(([item]) => item);
  const shown = data?.filter((post) => !tag || post.tags.includes(tag));
  const [first, ...rest] = shown ?? [];
  return (
    <main className="page">
      <h1 className="text-large-title">{t.blog.title}</h1>
      <p className="mt-2 max-w-[60ch] text-callout text-muted-foreground">{t.blog.lead}</p>
      {tags.length > 1 && (
        <div className="rail mt-5 gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.foods.filters}>
          <FilterChip on={tag === ''} onClick={() => setTag('')} label={t.blog.all} count={data?.length} />
          {tags.map((item) => (
            <FilterChip key={item} on={tag === item} onClick={() => setTag(item)} label={label(item)} count={counts.get(item)} />
          ))}
        </div>
      )}
      <div className="mt-6 grid gap-5">
        {error && <ErrorBox />}
        {!data && !error && <ArticleListBones />}
        {first && <ArticleCard post={first} lead />}
        {rest.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
