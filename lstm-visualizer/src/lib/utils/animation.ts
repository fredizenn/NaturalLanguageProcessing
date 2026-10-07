/** Helpers for mapping a stage's 0..1 progress onto sub-animations. */

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Local progress of a sub-phase that runs between `start` and `end` of the stage. */
export function phase(progress: number, start: number, end: number): number {
	if (progress <= start) return 0;
	if (progress >= end) return 1;
	return (progress - start) / (end - start);
}

/** Reveal `count` items one after another across the window [start, end]. */
export function stagger(progress: number, index: number, count: number, start = 0, end = 1): number {
	if (count <= 0) return 1;
	const span = (end - start) / count;
	return phase(progress, start + index * span, start + (index + 1) * span);
}

/** Colour for a signed activation value: cyan for positive, amber for negative. */
export function valueColor(v: number, max = 1): string {
	const a = Math.min(1, Math.abs(v) / max);
	const alpha = (0.12 + 0.88 * a).toFixed(3);
	return v >= 0 ? `rgba(79, 209, 255, ${alpha})` : `rgba(232, 161, 92, ${alpha})`;
}

export const fmt = (v: number, digits = 2) => (v >= 0 ? ' ' : '−') + Math.abs(v).toFixed(digits);
