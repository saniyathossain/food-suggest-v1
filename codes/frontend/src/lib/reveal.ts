// Skeleton to content, for every page at once: when a commit removes a skeleton (a .shimmer bone or an aria-busy block), what
// React put in its place eases in (fade, 6 px rise, a little blur; siblings 30 ms apart) instead of snapping. Content that comes
// from the cache never had a skeleton, so it shows at once. One MutationObserver; its callback runs before the next paint, so the
// new content is never seen at full strength first. Off under reduced motion.
import { reducedMotion } from '@/lib/utils';

const BONE = '.shimmer, [aria-busy="true"]';
const FRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translateY(6px)', filter: 'blur(4px)' },
  { opacity: 1, transform: 'none', filter: 'blur(0)' },
];
const MOST = 16;

function isBone(node: Node): boolean {
  return node instanceof Element && (node.matches(BONE) || node.querySelector(BONE) !== null);
}

function reveal(records: MutationRecord[]): void {
  const emptied = new Set<Node>();
  for (const record of records) {
    if ([...record.removedNodes].some(isBone)) emptied.add(record.target);
  }
  if (emptied.size === 0) return;
  const fresh: HTMLElement[] = [];
  for (const record of records) {
    if (!emptied.has(record.target)) continue;
    for (const node of record.addedNodes) {
      if (node instanceof HTMLElement && node.isConnected && !isBone(node)) fresh.push(node);
    }
  }
  fresh.slice(0, MOST).forEach((node, index) => {
    node.animate(FRAMES, { duration: 300, delay: Math.min(index, 8) * 30, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
  });
}

export function installReveal(root: HTMLElement): void {
  if (reducedMotion() || typeof Element.prototype.animate !== 'function') return;
  new MutationObserver(reveal).observe(root, { childList: true, subtree: true });
}
