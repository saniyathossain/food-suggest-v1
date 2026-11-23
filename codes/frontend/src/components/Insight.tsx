// One plain sentence about the numbers on a page, worked out from the data it already holds (never invented, never a diagnosis):
// a soft card with the living orb. The caller builds the sentence from the dictionary, so it follows the language.
import { Orb } from '@/components/charts';

export function Insight({ children }: { children: string }) {
  return (
    <p className="surface-soft flex w-full items-center gap-3 rounded-2xl p-4 text-subhead">
      <Orb />
      <span>{children}</span>
    </p>
  );
}
