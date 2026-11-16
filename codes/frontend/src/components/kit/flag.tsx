// A country's flag, drawn as a small inline SVG (crisp at any size, and unlike flag emoji it shows on Windows too): rounded
// corners and a hairline so a white or pale flag still has an edge. Unknown codes get a neutral globe-coloured disc.
const FLAGS: Record<string, React.ReactNode> = {
  // Bangladesh: bottle green field, red disc set a little toward the hoist (ratio 10:6, disc radius 2 at 4.5, 3)
  BD: (
    <>
      <rect width="10" height="6" fill="#006a4e" />
      <circle cx="4.5" cy="3" r="2" fill="#f42a41" />
    </>
  ),
};

export function Flag({ code, className, title }: { code: string; className?: string | undefined; title?: string | undefined }) {
  const art = FLAGS[code.toUpperCase()];
  return (
    <svg viewBox="0 0 10 6" className={`flag ${className ?? ''}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {art ?? <rect width="10" height="6" fill="var(--muted)" />}
    </svg>
  );
}
