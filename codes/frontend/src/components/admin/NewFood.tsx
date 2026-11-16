// Add a food: its slug, group and name in both languages. Nutrition, season and photos come from the seeders or the API.
import { useState } from 'react';
import { Plus } from '@/components/icons/page';
import { toast } from '@/components/kit/toast';
import { ActionButton } from '@/components/ui/action-button';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { FoodCreate } from '@/lib/types';
import { refusalText, type Admin } from './useAdmin';

const blank = { slug: '', category: '', en: '', bn: '' };

export function NewFood({ admin }: { admin: Admin }) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState(blank);
  const ready = /^[a-z0-9-]{2,60}$/.test(draft.slug) && draft.category !== '' && draft.en.trim() !== '';
  const create = () => {
    const body: FoodCreate = { slug: draft.slug, category: draft.category, name: { en: draft.en, bn: draft.bn } };
    return send('/api/v1/admin/foods', 'POST', body, admin.token)
      .then(() => {
        setDraft(blank);
        admin.saved();
      })
      .catch((error: unknown) => {
        toast(refusalText(error), 'bad');
        throw error;
      });
  };
  return (
    <section className="surface grid gap-5 rounded-2xl p-5 sm:p-6">
      <h2 className="text-title-3">{t.admin.newFood}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="food-slug">{t.admin.slug}</Label>
          <Input id="food-slug" placeholder={t.ph.slug} pattern="[a-z0-9-]{2,60}" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="food-category">{t.admin.category}</Label>
          <Select id="food-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            <option value="" />
            {admin.snapshot?.categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name[lang] || item.name.en}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="food-en">{t.admin.nameEn}</Label>
          <Input id="food-en" placeholder={t.ph.nameEn} value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="food-bn">{t.admin.nameBn}</Label>
          <Input id="food-bn" placeholder={t.ph.nameBn} lang="bn" value={draft.bn} onChange={(event) => setDraft({ ...draft, bn: event.target.value })} />
        </div>
      </div>
      <ActionButton icon={Plus} disabled={!ready} onClick={create} className="w-fit">
        {t.admin.create}
      </ActionButton>
    </section>
  );
}
