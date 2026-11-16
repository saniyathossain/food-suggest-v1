// The island before the next meal, on every page: for someone who saved a profile and eats on the everyday clock (a fasting
// mode follows prayer times or its own window, shown on the plan), from 30 minutes before a meal slot. It counts down in
// minutes and expands once when it is time to eat. Same slots and rule as Today's NextMeal pill (components/NextMeal.tsx).
import { useEffect, useRef } from 'react';
import { useNextSlot } from '@/components/NextMeal';
import { Glyph } from '@/components/islandcn/glyph';
import { glyphFrom } from '@/components/islandcn/glyphs';
import { ExpandedBottom, SensorRow } from '@/components/islandcn/island-layout';
import { CompactText, ContextLabel, ExpandedSubtitle, ExpandedValue, MinimalPair, withBubble } from '@/components/islandcn/island-text';
import { islandAccent } from '@/components/islandcn/theme';
import { TickingTime } from '@/components/islandcn/ticking-time';
import { useActivity } from '@/components/islandcn/use-activity';
import { Restaurant01Icon } from '@hugeicons/core-free-icons';
import { clock, digits, useI18n, useT } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import type { Bootstrap } from '@/lib/types';

const MealGlyph = glyphFrom('MealGlyph', Restaurant01Icon);
const AHEAD_MIN = 30;
const NOW_MIN = 5;

function MealActivity({ name, time, until }: { name: string; time: string; until: number }) {
  const { t, lang } = useI18n();
  const translate = useT();
  const accent = islandAccent.green;
  const left = Math.max(0, Math.ceil((until - Date.now()) / 60000));
  const now = left <= NOW_MIN;
  const minutes = (ms: number) => digits(String(Math.max(0, Math.ceil(ms / 60000))), lang);
  const count = <TickingTime source={{ kind: 'remaining', until }} format={minutes} />;
  const at = translate('island.at', name, clock(time, lang));
  const controls = useActivity(
    () => ({
      id: 'next-meal',
      label: `${t.island.nextMeal}: ${at}${now ? `, ${t.island.timeToEat}` : `, ${digits(String(left), lang)} ${t.island.minutes}`}`,
      // "18 min" is wider than the split's capsule: the capsule shows the minutes alone
      compact: withBubble(
        {
          leading: <Glyph icon={MealGlyph} color={accent} />,
          trailing: now ? <CompactText color={accent}>{t.widget.now}</CompactText> : <CompactText>{count} {t.island.minutes}</CompactText>,
        },
        now ? <Glyph icon={MealGlyph} color={accent} /> : <CompactText>{count}</CompactText>,
      ),
      minimal: <MinimalPair leading={<Glyph icon={MealGlyph} color={accent} />} trailing={<CompactText>{now ? t.widget.now : count}</CompactText>} />,
      expanded: {
        leading: (
          <SensorRow glyph={<Glyph icon={MealGlyph} color={accent} size={18} />}>
            <ContextLabel>{t.island.nextMeal}</ContextLabel>
          </SensorRow>
        ),
        bottom: (
          <ExpandedBottom gap={6} style={{ paddingBottom: 10 }}>
            {now ? <ExpandedValue color={accent}>{t.island.timeToEat}</ExpandedValue> : <ExpandedValue unit={t.island.minutes}>{count}</ExpandedValue>}
            <ExpandedSubtitle>{at}</ExpandedSubtitle>
          </ExpandedBottom>
        ),
      },
    }),
    [name, time, until, now, lang, t],
  );
  // expand once when the meal is due
  const told = useRef(false);
  useEffect(() => {
    if (!now || told.current) return;
    told.current = true;
    controls.alert();
  }, [now, controls]);
  return null;
}

export function MealIsland({ boot }: { boot: Bootstrap }) {
  const { profile } = usePrefs();
  const { next, current } = useNextSlot(boot);
  if (!profile || (profile.mode && profile.mode !== 'everyday') || !next) return null;
  const [hour = '0', minute = '0'] = next.time.split(':');
  const target = Number(hour) * 60 + Number(minute) + (Number(hour) * 60 + Number(minute) < current ? 1440 : 0);
  if (target - current > AHEAD_MIN) return null;
  const until = new Date().setHours(0, 0, 0, 0) + target * 60000;
  return <MealActivity key={next.slug} name={next.name} time={next.time} until={until} />;
}
