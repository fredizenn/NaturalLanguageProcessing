<script lang="ts">
	import { BEST_EPOCH, HISTORY, type EpochRecord } from '#lib/data/training';
	import { pipeline } from '#lib/state/pipeline.svelte';

	interface Props {
		title: string;
		train: (e: EpochRecord) => number;
		val: (e: EpochRecord) => number;
		domain: [number, number];
		ticks: number[];
		format: (v: number) => string;
		unit?: string;
	}
	let { title, train, val, domain, ticks, format, unit = '' }: Props = $props();

	const W = 480;
	const H = 250;
	const M = { l: 48, r: 92, t: 18, b: 36 };
	const x = (epoch: number) => M.l + ((epoch - 1) / (HISTORY.length - 1)) * (W - M.l - M.r);
	const y = (v: number) => M.t + (1 - (v - domain[0]) / (domain[1] - domain[0])) * (H - M.t - M.b);
	const path = (f: (e: EpochRecord) => number) => HISTORY.map((e, i) => `${i ? 'L' : 'M'}${x(e.epoch)},${y(f(e))}`).join('');

	let hover = $state<number | null>(null);
	const active = $derived(hover ?? pipeline.selectedEpoch);
	const rec = $derived(HISTORY[active - 1]);

	function onmove(ev: PointerEvent) {
		const svg = ev.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const px = ((ev.clientX - rect.left) / rect.width) * W;
		const ep = Math.round(((px - M.l) / (W - M.l - M.r)) * (HISTORY.length - 1)) + 1;
		hover = Math.min(HISTORY.length, Math.max(1, ep));
	}

	const last = HISTORY[HISTORY.length - 1];
	// direct labels: keep them apart vertically
	const labelY = $derived.by(() => {
		let a = y(train(last));
		let b = y(val(last));
		if (Math.abs(a - b) < 16) {
			const mid = (a + b) / 2;
			const up = a < b;
			a = mid + (up ? -8 : 8);
			b = mid + (up ? 8 : -8);
		}
		return { train: a, val: b };
	});
</script>

<figure class="min-w-0">
	<figcaption class="mb-3 flex items-baseline justify-between gap-3">
		<span class="text-base font-semibold">{title}</span>
		<span class="font-mono text-xs text-muted tabular">
			epoch {active} · <span class="text-signal">train {format(train(rec))}{unit}</span> ·
			<span class="text-[#b3a9ff]">val {format(val(rec))}{unit}</span>
		</span>
	</figcaption>
	<svg
		viewBox="0 0 {W} {H}"
		class="block w-full touch-none select-none"
		role="img"
		aria-label="{title} over 5 epochs for training and validation. Table view available below."
		onpointermove={onmove}
		onpointerleave={() => (hover = null)}
	>
		{#each ticks as t (t)}
			<line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--color-rule)" />
			<text x={M.l - 8} y={y(t) + 4} text-anchor="end" class="ax">{format(t)}</text>
		{/each}
		{#each HISTORY as e (e.epoch)}
			<text x={x(e.epoch)} y={H - 12} text-anchor="middle" class="ax">{e.epoch}</text>
		{/each}
		<text x={W - M.r} y={H - 12} dx="18" class="ax">epoch</text>

		<!-- checkpoint -->
		<line x1={x(BEST_EPOCH)} x2={x(BEST_EPOCH)} y1={M.t} y2={H - M.b} stroke="var(--color-soft)" stroke-dasharray="2 3" />
		<text x={x(BEST_EPOCH)} y={M.t - 6} text-anchor="middle" class="ax">saved</text>

		<!-- crosshair -->
		<line x1={x(active)} x2={x(active)} y1={M.t} y2={H - M.b} stroke="var(--color-text)" stroke-opacity="0.35" />

		<path d={path(train)} fill="none" stroke="var(--color-signal)" stroke-width="2" />
		<path d={path(val)} fill="none" stroke="var(--color-memory)" stroke-width="2" stroke-dasharray="6 4" />
		{#each HISTORY as e (e.epoch)}
			<circle cx={x(e.epoch)} cy={y(train(e))} r={e.epoch === active ? 5 : 4} fill="var(--color-signal)" stroke="var(--color-ink)" stroke-width="2" />
			<rect x={x(e.epoch) - 4} y={y(val(e)) - 4} width="8" height="8" fill="var(--color-memory)" stroke="var(--color-ink)" stroke-width="2"
				transform="rotate(45 {x(e.epoch)} {y(val(e))})" />
		{/each}

		<text x={W - M.r + 10} y={labelY.train + 4} class="lbl">train</text>
		<text x={W - M.r + 10} y={labelY.val + 4} class="lbl">validation</text>
	</svg>
</figure>

<style>
	.ax {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--color-muted);
	}
	.lbl {
		font-size: 12px;
		fill: var(--color-soft);
	}
	svg {
		cursor: crosshair;
	}
</style>
