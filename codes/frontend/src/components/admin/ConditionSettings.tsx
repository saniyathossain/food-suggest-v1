// One condition's settings: names in both languages, colour, icon and whether users see it. Text saves when the field is left.
import { iconNames } from '@/components/icons/names';
import { toast } from '@/components/kit/toast';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ConditionPatch } from '@/lib/types';
import { refusalText, type Admin, type RawCondition } from './useAdmin';

export function usePatchCondition(admin: Admin, condition: RawCondition | undefined) {
  return async (patch: Partial<ConditionPatch>) => {
    if (!condition) return;
    try {
      await send(`/api/v1/admin/conditions/${condition.slug}`, 'PATCH', patch, admin.token);
      admin.saved();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
}

export function ConditionSettings({ admin, condition }: { admin: Admin; condition: RawCondition }) {
  const { t } = useI18n();
  const patch = usePatchCondition(admin, condition);
  return (
    <section className="surface grid gap-5 rounded-2xl p-5 sm:p-6">
      <h2 className="text-title-3">{t.admin.condition}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_200px]">
        <div className="grid gap-2">
          <Label htmlFor="name-en">{t.admin.nameEn}</Label>
          <Input id="name-en" placeholder={t.ph.nameEn} defaultValue={condition.name.en} onBlur={(event) => event.target.value !== condition.name.en && void patch({ name: { ...condition.name, en: event.target.value } })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name-bn">{t.admin.nameBn}</Label>
          <Input id="name-bn" placeholder={t.ph.nameBn} lang="bn" defaultValue={condition.name.bn} onBlur={(event) => event.target.value !== condition.name.bn && void patch({ name: { ...condition.name, bn: event.target.value } })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="color">{t.admin.color}</Label>
          <input id="color" type="color" defaultValue={condition.color} onBlur={(event) => event.target.value !== condition.color && void patch({ color: event.target.value })} className="field h-11 w-16 cursor-pointer rounded-md p-1" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="icon">{t.admin.icon}</Label>
          <Select id="icon" value={condition.icon} onChange={(event) => void patch({ icon: event.target.value })}>
            {iconNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="active" checked={condition.active} onCheckedChange={(active) => void patch({ active })} />
        <Label htmlFor="active">{t.admin.active}</Label>
      </div>
    </section>
  );
}
