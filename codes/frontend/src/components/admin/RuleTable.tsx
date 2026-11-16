// The food rules of one condition as an editable table: verdict and reason in both languages per food, save and delete per row, and
// a last row to add a rule for a food that has none yet.
import { useState } from 'react';
import { Save, Trash, Plus } from '@/components/icons/page';
import { toast } from '@/components/kit/toast';
import { Select, Textarea } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { VERDICTS } from '@/components/Verdict';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { RuleUpsert, Verdict } from '@/lib/types';
import { refusalText, type Admin, type RawCondition, type RawFood, type RawRule } from './useAdmin';

const cell = 'px-3 py-2.5 align-top';

function VerdictSelect({ value, onChange }: { value: Verdict; onChange: (verdict: Verdict) => void }) {
  const { t } = useI18n();
  return (
    <Select aria-label={t.admin.verdict} className="min-w-36" value={value} onChange={(event) => onChange(event.target.value as Verdict)}>
      {VERDICTS.map((verdict) => (
        <option key={verdict} value={verdict}>
          {t.verdict[verdict]}
        </option>
      ))}
    </Select>
  );
}

async function upsert(admin: Admin, rule: RuleUpsert) {
  try {
    await send('/api/v1/admin/food-rules', 'PUT', rule, admin.token);
    admin.saved();
  } catch (error) {
    toast(refusalText(error), 'bad');
  }
}

function RuleRow({ admin, rule, food, condition }: { admin: Admin; rule: RawRule; food: RawFood | undefined; condition: RawCondition }) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState(rule);
  const [confirming, setConfirming] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rule);
  const remove = async () => {
    await send(`/api/v1/admin/food-rules/${rule.id}`, 'DELETE', undefined, admin.token);
    admin.saved();
  };
  return (
    <tr className="border-t transition-colors hover:bg-accent/40">
      <td className={`${cell} pt-4 font-semibold`}>{food?.name[lang] || food?.name.en}</td>
      <td className={cell}>
        <VerdictSelect value={draft.verdict} onChange={(verdict) => setDraft({ ...draft, verdict })} />
      </td>
      <td className={cell}>
        <Textarea aria-label={t.admin.reasonEn} rows={2} value={draft.reason.en} onChange={(event) => setDraft({ ...draft, reason: { ...draft.reason, en: event.target.value } })} />
      </td>
      <td className={cell}>
        <Textarea aria-label={t.admin.reasonBn} lang="bn" rows={2} value={draft.reason.bn} onChange={(event) => setDraft({ ...draft, reason: { ...draft.reason, bn: event.target.value } })} />
      </td>
      <td className={`${cell} whitespace-nowrap`}>
        <span className="flex gap-1">
          <IconButton icon={Save} label={t.admin.save} tone="soft" disabled={!dirty} onClick={() => void upsert(admin, { condition: condition.slug, food: food?.slug ?? '', verdict: draft.verdict, reason: draft.reason })} />
          <IconButton icon={Trash} label={confirming ? t.admin.confirmDelete : t.admin.delete} tone={confirming ? 'confirm' : 'danger'} onBlur={() => setConfirming(false)} onClick={() => (confirming ? void remove() : setConfirming(true))} />
        </span>
      </td>
    </tr>
  );
}

function NewRule({ admin, condition, unused }: { admin: Admin; condition: RawCondition; unused: RawFood[] }) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState({ food: '', verdict: 'limit' as Verdict, en: '', bn: '' });
  const add = async () => {
    await upsert(admin, { condition: condition.slug, food: draft.food, verdict: draft.verdict, reason: { en: draft.en, bn: draft.bn } });
    setDraft({ food: '', verdict: 'limit', en: '', bn: '' });
  };
  return (
    <tr className="border-t bg-muted/50">
      <td className={cell}>
        <Select aria-label={t.admin.addRule} value={draft.food} onChange={(event) => setDraft({ ...draft, food: event.target.value })}>
          <option value="">+ {t.admin.food}</option>
          {unused.map((food) => (
            <option key={food.id} value={food.slug}>
              {food.name[lang] || food.name.en}
            </option>
          ))}
        </Select>
      </td>
      <td className={cell}>
        <VerdictSelect value={draft.verdict} onChange={(verdict) => setDraft({ ...draft, verdict })} />
      </td>
      <td className={cell}>
        <Textarea aria-label={t.admin.reasonEn} rows={2} value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
      </td>
      <td className={cell}>
        <Textarea aria-label={t.admin.reasonBn} lang="bn" rows={2} value={draft.bn} onChange={(event) => setDraft({ ...draft, bn: event.target.value })} />
      </td>
      <td className={cell}>
        <IconButton icon={Plus} label={t.admin.addRule} tone="solid" disabled={!draft.food || !draft.en.trim()} onClick={() => void add()} />
      </td>
    </tr>
  );
}

export function RuleTable({ admin, condition }: { admin: Admin; condition: RawCondition }) {
  const { t, num } = useI18n();
  const snapshot = admin.snapshot;
  if (!snapshot) return null;
  const foods = new Map(snapshot.foods.map((food) => [food.id, food]));
  const rules = snapshot.rules.filter((rule) => rule.condition_id === condition.id);
  const unused = snapshot.foods.filter((food) => !rules.some((rule) => rule.food_id === food.id));
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <h2 className="text-title-3">
        {t.admin.rules} · {num(rules.length)}
      </h2>
      <div className="-mx-5 overflow-x-auto sm:-mx-6" data-lenis-prevent>
        <table className="data-table w-full min-w-[860px] text-subhead">
          <thead>
            <tr className="text-left text-footnote text-muted-foreground">
              <th className="px-3 py-2 font-semibold">{t.admin.food}</th>
              <th className="px-3 py-2 font-semibold">{t.admin.verdict}</th>
              <th className="px-3 py-2 font-semibold">{t.admin.reasonEn}</th>
              <th className="px-3 py-2 font-semibold">{t.admin.reasonBn}</th>
              <th className="px-3 py-2">
                <span className="sr-only">{t.admin.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <RuleRow key={`${rule.id}-${rule.verdict}-${rule.reason.en}`} admin={admin} rule={rule} food={foods.get(rule.food_id)} condition={condition} />
            ))}
            <NewRule admin={admin} condition={condition} unused={unused} />
          </tbody>
        </table>
      </div>
    </section>
  );
}
