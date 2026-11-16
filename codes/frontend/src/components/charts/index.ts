// Charts (Shell Console's components/charts, the generic ones Pathya draws). Plain SVG, no chart library: recharts is installed for
// time series when tracking lands, and must stay in a lazy chunk when it does.
export { Donut, type Slice } from '@/components/charts/Donut';
export { DotMeter } from '@/components/charts/DotMeter';
export { Gauge } from '@/components/charts/Gauge';
export { DayTrack, minutesOf } from '@/components/charts/DayTrack';
