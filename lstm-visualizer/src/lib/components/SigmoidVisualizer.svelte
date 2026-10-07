<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE } from '#lib/data/model';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { easeInOut, fmt, phase } from '#lib/utils/animation';
	import { sigmoid } from '#lib/utils/random';

	const r = $derived(pipeline.result!);
	const z = $derived(r.prediction.logit ?? 0);
	const p = $derived(pipeline.progress);
	const travel = $derived(easeInOut(phase(p, 0.1, 0.85)));
	const zNow = $derived(z * travel);
	const pNow = $derived(sigmoid(zNow));

	const W = 560;
	const H = 300;
	const PAD = { l: 44, r: 16, t: 16, b: 34 };
	const ZMAX = 6;
	const sx = (v: number) => PAD.l + ((v + ZMAX) / (2 * ZMAX)) * (W - PAD.l - PAD.r);
	const sy = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
	const curve = Array.from({ length: 121 }, (_, k) => {
		const v = -ZMAX + (k / 120) * 2 * ZMAX;
		return `${k ? 'L' : 'M'}${sx(v).toFixed(1)},${sy(sigmoid(v)).toFixed(1)}`;
	}).join('');
	const zc = $derived(Math.max(-ZMAX, Math.min(ZMAX, zNow)));
</script>

<Stage
	index={8}
	title="Sigmoid"
	summary="The sigmoid squashes the logit into a probability between 0 and 1. A logit of 0 maps to exactly 0.5, the decision threshold. Larger positive logits approach 1 (positive), larger negative logits approach 0 (negative)."
	code={CODE.sigmoid}
	inShape="z [1]"
	outShape="p ∈ (0, 1)"
	kind="illustrative"
>
	<div class="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_13rem]">
		<svg viewBox="0 0 {W} {H}" class="w-full max-w-[36rem]" role="img"
			aria-label="Sigmoid curve. The logit {z.toFixed(2)} maps to probability {sigmoid(z).toFixed(3)}.">
			<rect x={PAD.l} y={sy(1)} width={W - PAD.l - PAD.r} height={sy(0.5) - sy(1)} fill="rgb(79 209 255 / 0.05)" />
			<rect x={PAD.l} y={sy(0.5)} width={W - PAD.l - PAD.r} height={sy(0) - sy(0.5)} fill="rgb(232 161 92 / 0.05)" />
			{#each [0, 0.5, 1] as g (g)}
				<line x1={PAD.l} x2={W - PAD.r} y1={sy(g)} y2={sy(g)} stroke="var(--color-rule)" stroke-dasharray={g === 0.5 ? '4 4' : undefined} />
				<text x={PAD.l - 8} y={sy(g) + 4} text-anchor="end" class="ax">{g}</text>
			{/each}
			{#each [-6, -3, 0, 3, 6] as g (g)}
				<text x={sx(g)} y={H - 10} text-anchor="middle" class="ax">{g}</text>
			{/each}
			<line x1={sx(0)} x2={sx(0)} y1={sy(1)} y2={sy(0)} stroke="var(--color-rule)" />
			<text x={W - PAD.r} y={sy(0.5) - 6} text-anchor="end" class="ax">threshold 0.5</text>
			<text x={W - PAD.r} y={H - 10} text-anchor="end" class="ax" dx="0" dy="-14">z</text>
			<path d={curve} fill="none" stroke="var(--color-text)" stroke-width="2" />

			<line x1={sx(zc)} x2={sx(zc)} y1={sy(0)} y2={sy(pNow)} stroke="var(--color-soft)" stroke-dasharray="3 3" />
			<line x1={PAD.l} x2={sx(zc)} y1={sy(pNow)} y2={sy(pNow)} stroke="var(--color-soft)" stroke-dasharray="3 3" />
			<circle cx={sx(zc)} cy={sy(pNow)} r="9" fill={pNow >= 0.5 ? 'rgb(79 209 255 / 0.25)' : 'rgb(232 161 92 / 0.25)'} />
			<circle cx={sx(zc)} cy={sy(pNow)} r="4.5" fill={pNow >= 0.5 ? 'var(--color-signal)' : 'var(--color-amber)'} />
		</svg>

		<div class="flex flex-col gap-5">
			<div>
				<p class="text-xs text-muted">Logit z</p>
				<p class="font-mono text-2xl tabular">{fmt(zNow)}</p>
			</div>
			<div>
				<p class="text-xs text-muted">σ(z) = 1 / (1 + e<sup>−z</sup>)</p>
				<p class="font-mono text-4xl tabular {pNow >= 0.5 ? 'text-signal' : 'text-amber'}">{pNow.toFixed(4)}</p>
			</div>
		</div>
	</div>

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>Loss in training</dt><dd>BCELoss</dd>
			<dt>Threshold</dt><dd>0.5</dd>
		</dl>
		<p>
			The model outputs one number: the probability that the review is positive. The probability of negative is
			1 − p.
		</p>
	{/snippet}
</Stage>

<style>
	.ax {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--color-muted);
	}
</style>
