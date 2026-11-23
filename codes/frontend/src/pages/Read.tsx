// Articles: short, sourced explainers. The newest leads as a large card; the rest follow as a grid; tags narrow the list.
import { useDeferredValue } from 'react';
import { Search } from '@/components/icons';
import { BookOpen } from '@/components/icons/page';
import { EmptyState } from '@/components/journey/EmptyState';
import { RevealMore, useReveal } from '@/components/kit/reveal';
import { SortSelect } from '@/components/kit/sortselect';
import { POST_SORTS, postOrder, type PostSort } from '@/lib/sorts';
import { ArticleListBones } from '@/components/kit/bones';
import { FilterChip } from '@/components/kit/filterchip';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { endpoints, useResource } from '@/lib/api';
import { toggle } from '@/lib/foodfilters';
import { useI18n, useT } from '@/lib/i18n';
import { usePersisted } from '@/lib/persisted';
import { onLink } from '@/lib/router';
import type { PostCard } from '@/lib/types';
import { cn } from '@/lib/utils';

const label = (tag: string) => tag.replace(/-/g, ' ');

export function ArticleCard({ post, lead = false }: { post: PostCard; lead?: boolean }) {
  const { t, num } = useI18n();
  return (
    <a href={`/read/${post.slug}`} onClick={onLink} className={cn('surface group grid h-full overflow-hidden rounded-2xl', lead ? 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]' : 'grid-rows-[auto_1fr]')}>
      <Photo src={post.image} alt="" ratio={lead ? '16 / 10' : '16 / 9'} sizes={lead ? '(max-width: 768px) 100vw, 720px' : '(max-width: 640px) 100vw, 440px'} zoom tone="#7458c4" eager={lead} />
      <div className={cn('gap-2 p-5', lead ? 'grid content-start md:content-center md:p-8' : 'flex flex-col')}>
        <p className="flex flex-wrap gap-1.5">
          {post.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold capitalize text-muted-foreground">
              {label(tag)}
            </span>
          ))}
        </p>
        <h2 className={cn('font-bold leading-tight transition-colors group-hover:text-primary', lead ? 'text-title-1' : 'text-title-3')}>{post.title}</h2>
        <p className={cn('text-muted-foreground', lead ? 'text-body' : 'line-clamp-3 text-subhead')}>{post.excerpt}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-1 text-footnote text-muted-foreground">
          <BookOpen size={14} /> {num(post.reading_minutes)} {t.blog.read}
        </p>
      </div>
    </a>
  );
}

export default function Read() {
  const { t, lang } = useI18n();
  const translate = useT();
  const { data, error } = useResource<PostCard[]>(endpoints.posts(lang));
  const [query, setQuery] = usePersisted('pathya.read.q', '');
  const [tags, setTags] = usePersisted<string[]>('pathya.read.tags', []);
  const [sort, setSort] = usePersisted<PostSort>('pathya.read.sort', 'newest');
  const needle = useDeferredValue(query.trim().toLowerCase());
  const matches = (post: PostCard) => !needle || `${post.title} ${post.excerpt}`.toLowerCase().includes(needle);
  // a topic's count is what choosing it would show now (the search words kept), and only topics two articles share are offered
  const counts = new Map<string, number>();
  data?.filter(matches).forEach((post) => post.tags.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1)));
  const topics = [...new Set(data?.flatMap((post) => post.tags).filter((item) => (data?.filter((post) => post.tags.includes(item)).length ?? 0) > 1))];
  const shown = data?.filter((post) => matches(post) && (tags.length === 0 || post.tags.some((item) => tags.includes(item)))).sort(postOrder[sort]);
  const filtering = needle !== '' || tags.length > 0;
  const active = Number(needle !== '') + tags.length;
  const reveal = useReveal(shown, `${needle}${tags.join()}${sort}`, 9);
  const reset = () => {
    setQuery('');
    setTags([]);
  };
  const [first, ...rest] = reveal.visible ?? [];
  const lead = !filtering && sort === 'newest' ? first : undefined;
  const grid = lead ? rest : reveal.visible ?? [];
  return (
    <main className="page">
      <h1 className="text-large-title">{t.blog.title}</h1>
      <p className="mt-2 max-w-[60ch] text-callout text-muted-foreground">{t.blog.lead}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="field flex h-11 min-w-[14rem] flex-1 items-center gap-2 rounded-full px-4">
          <Search size={18} className="text-muted-foreground" />
          <span className="sr-only">{t.blog.title}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.list.articleSearch} className="min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
        </label>
        <SortSelect label={t.list.sort} value={sort} onChange={setSort} options={POST_SORTS.map((item) => ({ value: item, label: t.list.sorts[item] }))} />
      </div>
      {topics.length > 1 && (
        <div className="rail mt-3 gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.list.topics}>
          <FilterChip on={tags.length === 0} onClick={() => setTags([])} label={t.blog.all} count={data?.filter(matches).length} />
          {topics.map((item) => (
            <FilterChip key={item} on={tags.includes(item)} onClick={() => setTags(toggle(tags, item))} label={label(item)} count={counts.get(item) ?? 0} />
          ))}
        </div>
      )}
      {active > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-footnote text-muted-foreground">
          <span aria-live="polite">{translate('list.filtersOn', active)}</span>
          <button type="button" onClick={reset} className="press inline-flex h-8 items-center rounded-full border px-3 font-semibold text-foreground hover:bg-accent">
            {t.list.reset}
          </button>
        </p>
      )}
      <div className="mt-6 grid gap-5">
        {error && <ErrorBox />}
        {!data && !error && <ArticleListBones />}
        {shown?.length === 0 && <EmptyState icon={BookOpen} title={t.journey.empty.articlesTitle} lead={t.journey.empty.articlesLead} primary={{ label: t.list.reset, onClick: reset }} />}
        {lead && <ArticleCard post={lead} lead />}
        {grid.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        )}
        <RevealMore {...reveal} />
      </div>
    </main>
  );
}
