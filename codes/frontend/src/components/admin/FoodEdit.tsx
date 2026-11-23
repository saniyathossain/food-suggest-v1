// Admin: change a food (its name in both languages, its group, whether the public site shows it) in a dialog, from a row's pencil.
import { useEffect, useState } from 'react';
import { toast } from '@/components/kit/toast';
import { ActionButton } from '@/components/ui/action-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { FoodPatch } from '@/lib/types';
import { refusalText, type Admin, type RawFood } from './useAdmin';

export function FoodEdit({ admin, slug, onClose }: { admin: Admin; slug: string | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const food: RawFood | undefined = admin.snapshot?.foods.find((item) => item.slug === slug);
  const [draft, setDraft] = useState({ en: '', bn: '', category: '', active: true });
  useEffect(() => {
    if (!food) return;
    const category = admin.snapshot?.categories.find((item) => item.id === food.category_id)?.slug ?? '';
    setDraft({ en: food.name.en ?? '', bn: food.name.bn ?? '', category, active: food.active ?? true });
  }, [food?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const body: FoodPatch = { name: { en: draft.en, bn: draft.bn }, category: draft.category, active: draft.active };
    return send(`/api/v1/admin/foods/${slug}`, 'PATCH', body, admin.token)
      .then(() => {
        onClose();
        admin.saved();
      })
      .catch((error: unknown) => {
        toast(refusalText(error), 'bad');
        throw error;
      });
  };
  return (
    <Dialog open={slug !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.editFood}</DialogTitle>
          <DialogDescription className="font-mono text-footnote">{slug}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-en">{t.admin.nameEn}</Label>
            <Input id="edit-en" value={draft.en} maxLength={120} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-bn">{t.admin.nameBn}</Label>
            <Input id="edit-bn" lang="bn" value={draft.bn} maxLength={120} onChange={(event) => setDraft({ ...draft, bn: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-category">{t.admin.category}</Label>
            <Select id="edit-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
              {admin.snapshot?.categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name[lang] || item.name.en}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-active">{t.admin.modeStatus}</Label>
            <Select id="edit-active" value={draft.active ? 'on' : 'off'} onChange={(event) => setDraft({ ...draft, active: event.target.value === 'on' })}>
              <option value="on">{t.admin.on}</option>
              <option value="off">{t.admin.draft}</option>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <ActionButton disabled={!draft.en.trim() || !draft.category} onClick={save}>
            {t.admin.save}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
