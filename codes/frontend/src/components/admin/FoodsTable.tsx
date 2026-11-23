// Admin: every food in the catalogue in one table: group and kind, energy, glycemic index, the age a baby food suits, how many conditions
// have a rule for it, and whether it has a picture and nutrition figures, so gaps are easy to find. Filter by group, by "no photo", by "no
// nutrition"; sort any column; export what is filtered as CSV. Reads the public food list (no extra endpoint).
import { useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { FoodThumb } from '@/components/FoodRow';
import { CategoryIcon } from '@/components/icons';
import { groupTone } from '@/components/kit/artwork';
import { FilterChip } from '@/components/kit/filterchip';
import { ErrorBox } from '@/components/kit/loaderror';
import { FoodEdit } from '@/components/admin/FoodEdit';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { toast } from '@/components/kit/toast';
import { Pencil, Trash } from '@/components/icons/page';
import { IconButton } from '@/components/ui/icon-button';
import { confirmDialog } from '@/lib/confirm';
import { endpoints, send, useResource } from '@/lib/api';
import { toggle } from '@/lib/foodfilters';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Bootstrap, FoodSearch } from '@/lib/types';
import { cn } from '@/lib/utils';

const noPhoto = (food: FoodSearch) => !food.image && !food.cutout;

function Flag({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <span className={cn('rounded-full px-2.5 py-0.5 text-caption font-bold', ok ? 'bg-success-soft text-recommended-ink' : 'bg-warning-soft text-limit-ink')}>{ok ? yes : no}</span>;
}

export function FoodsTable({ admin }: { admin: Admin }) {
  const { t, lang, num } = useI18n();
  const { data, error } = useResource<FoodSearch[]>(endpoints.foods(lang, '', ''));
  const { data: boot } = useResource<Bootstrap>(endpoints.bootstrap(lang));
  const [groups, setGroups] = useState<string[]>([]);
  const [missingPhoto, setMissingPhoto] = useState(false);
  const [missingNutrition, setMissingNutrition] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const remove = async (food: FoodSearch) => {
    if (!(await confirmDialog({ title: t.admin.deleteFoodTitle, body: `${food.name}: ${t.admin.deleteFoodBody}`, tone: 'danger' }))) return;
    try {
      await send(`/api/v1/admin/foods/${food.slug}`, 'DELETE', undefined, admin.token);
      admin.saved();
    } catch (failure) {
      toast(refusalText(failure), 'bad');
    }
  };
  if (error) return <ErrorBox />;
  if (!data || !boot) return <span className="shimmer block h-72 rounded-2xl" aria-busy="true" />;
  const names = new Map(boot.categories.map((item) => [item.slug, item.name]));
  const kinds = new Map(boot.subcategories.map((item) => [item.slug, item.name]));
  const rows = data.filter((food) => (groups.length === 0 || groups.includes(food.category)) && (!missingPhoto || noPhoto(food)) && (!missingNutrition || food.macros === null));
  const columns: Column<FoodSearch>[] = [
    {
      key: 'name',
      label: t.admin.foodsTable.food,
      sort: (first, second) => first.name.localeCompare(second.name),
      text: (food) => food.name,
      cell: (food) => (
        <a href={`/food/${food.slug}`} onClick={onLink} className="flex items-center gap-3 font-semibold hover:text-primary">
          <FoodThumb image={food.image} cutout={food.cutout} name={food.name} category={food.category} size="size-10" />
          <span className="min-w-0 truncate">{food.name}</span>
        </a>
      ),
    },
    { key: 'group', label: t.admin.foodsTable.group, sort: (first, second) => (names.get(first.category) ?? '').localeCompare(names.get(second.category) ?? ''), text: (food) => names.get(food.category) ?? food.category, hideBelow: 'sm', cell: (food) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: groupTone(food.category) }}><CategoryIcon slug={food.category} size={15} /><span className="text-foreground">{names.get(food.category)}</span></span> },
    { key: 'kind', label: t.admin.foodsTable.kind, text: (food) => (food.subcategory ? kinds.get(food.subcategory) ?? '' : ''), hideBelow: 'lg', cell: (food) => <span className="whitespace-nowrap text-muted-foreground">{food.subcategory ? kinds.get(food.subcategory) : '—'}</span> },
    { key: 'kcal', label: t.food.kcal, align: 'end', sort: (first, second) => (first.macros?.kcal ?? -1) - (second.macros?.kcal ?? -1), text: (food) => food.macros?.kcal ?? '', hideBelow: 'md', cell: (food) => (food.macros ? num(Math.round(food.macros.kcal)) : '—') },
    { key: 'gi', label: 'GI', align: 'end', sort: (first, second) => (first.gi ?? -1) - (second.gi ?? -1), text: (food) => food.gi ?? '', hideBelow: 'md', cell: (food) => (food.gi === null ? '—' : num(food.gi)) },
    { key: 'age', label: t.admin.foodsTable.age, align: 'end', sort: (first, second) => (first.age_from_months ?? 999) - (second.age_from_months ?? 999), text: (food) => food.age_from_months ?? '', hideBelow: 'lg', cell: (food) => (food.age_from_months === null ? '—' : food.age_from_months === 0 ? t.baby.fromBirth : t.baby.fromMonths.replace('{n}', num(food.age_from_months))) },
    { key: 'rules', label: t.admin.foodsTable.rules, align: 'end', sort: (first, second) => first.verdicts.length - second.verdicts.length, text: (food) => food.verdicts.length, hideBelow: 'sm', cell: (food) => num(food.verdicts.length) },
    { key: 'photo', label: t.admin.foodsTable.photo, sort: (first, second) => Number(noPhoto(second)) - Number(noPhoto(first)), text: (food) => (noPhoto(food) ? 'no' : 'yes'), cell: (food) => <Flag ok={!noPhoto(food)} yes={t.admin.foodsTable.has} no={t.admin.foodsTable.missing} /> },
    { key: 'nutrition', label: t.admin.foodsTable.nutrition, sort: (first, second) => Number(second.macros === null) - Number(first.macros === null), text: (food) => (food.macros ? 'yes' : 'no'), hideBelow: 'sm', cell: (food) => <Flag ok={food.macros !== null} yes={t.admin.foodsTable.has} no={t.admin.foodsTable.missing} /> },
    {
      key: 'actions',
      label: '',
      align: 'end',
      cell: (food) => (
        <span className="flex justify-end gap-1">
          <IconButton icon={Pencil} label={t.admin.edit} onClick={() => setEditing(food.slug)} />
          <IconButton icon={Trash} label={t.admin.delete} tone="danger" onClick={() => void remove(food)} />
        </span>
      ),
    },
  ];
  return (
    <>
    <FoodEdit admin={admin} slug={editing} onClose={() => setEditing(null)} />
    <DataTable
      label={t.admin.foodsTable.title}
      rows={rows}
      columns={columns}
      rowKey={(food) => food.slug}
      searchText={(food) => `${food.name} ${food.slug} ${names.get(food.category) ?? ''}`.toLowerCase()}
      initialSort={{ key: 'name', dir: 'asc' }}
      exportName="foods"
      empty={<p className="text-center text-subhead text-muted-foreground">{t.table.noRows}</p>}
      filters={
        <div className="grid gap-2">
          <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.foods.filters}>
            <FilterChip on={missingPhoto} onClick={() => setMissingPhoto(!missingPhoto)} label={t.admin.foodsTable.noPhoto} count={data.filter(noPhoto).length} color="var(--limit)" />
            <FilterChip on={missingNutrition} onClick={() => setMissingNutrition(!missingNutrition)} label={t.admin.foodsTable.noNutrition} count={data.filter((food) => food.macros === null).length} color="var(--limit)" />
            {boot.categories.map((item) => (
              <FilterChip key={item.slug} on={groups.includes(item.slug)} onClick={() => setGroups(toggle(groups, item.slug))} label={item.name} color={groupTone(item.slug)} count={data.filter((food) => food.category === item.slug).length}>
                <CategoryIcon slug={item.slug} size={16} />
              </FilterChip>
            ))}
          </div>
        </div>
      }
    />
    </>
  );
}
