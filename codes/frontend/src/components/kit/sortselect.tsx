// A sort control: the app's own select (frosted trigger, glass list) with a sort icon, used by every list page.
import { ArrowUpDown } from '@/components/icons/page';
import { Select } from '@/components/ui/select';

export function SortSelect<Value extends string>({ value, onChange, options, label }: { value: Value; onChange: (value: Value) => void; options: { value: Value; label: string }[]; label: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ArrowUpDown size={16} className="text-muted-foreground" aria-hidden />
      <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as Value)} className="!h-10 !w-auto min-w-[10.5rem] !rounded-full font-semibold">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
