// The custom-headers editor of the sync source form: a name and a value per header, and a switch that makes the value a secret
// (sealed on the server, never shown again; blank keeps the saved one).
import type { Header } from '@/components/admin/syncDraft';
import { Plus, Trash } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';

type Props = { headers: Header[]; vaultReady: boolean; onChange: (headers: Header[]) => void };

export function SyncHeaders({ headers, vaultReady, onChange }: Props) {
  const { t } = useI18n();
  const copy = t.admin.syncSources;
  const change = (at: number, part: Partial<Header>) => onChange(headers.map((header, index) => (index === at ? { ...header, ...part } : header)));
  return (
    <fieldset className="grid content-start gap-3 rounded-2xl bg-muted/60 p-4">
      <legend className="px-1 text-footnote font-semibold">{copy.headers}</legend>
      {!vaultReady && <p role="alert" className="text-footnote font-semibold text-avoid-ink">{copy.vaultMissing}</p>}
      {headers.map((header, at) => (
        <div key={at} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 max-sm:grid-cols-[1fr_auto_auto]">
          <Input aria-label={copy.headerName} placeholder={copy.ph.headerName} value={header.name} onChange={(event) => change(at, { name: event.target.value })} />
          <Input aria-label={copy.headerValue} className="max-sm:order-last max-sm:col-span-3" type={header.secret ? 'password' : 'text'} autoComplete="new-password" placeholder={header.secret ? copy.secretSet : copy.ph.headerValue} value={header.value} onChange={(event) => change(at, { value: event.target.value })} />
          <label className="flex items-center gap-2 text-footnote"><Switch checked={header.secret} onCheckedChange={(on) => change(at, { secret: on })} aria-label={`${header.name}: ${copy.secret}`} />{copy.secret}</label>
          <IconButton icon={Trash} label={copy.removeHeader} tone="danger" onClick={() => onChange(headers.filter((_, index) => index !== at))} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" icon={Plus} className="w-fit" onClick={() => onChange([...headers, { name: '', value: '', secret: false }])}>{copy.addHeader}</Button>
    </fieldset>
  );
}
