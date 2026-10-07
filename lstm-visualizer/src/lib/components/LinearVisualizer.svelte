<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE } from '#lib/data/model';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { easeOutCubic, fmt, phase, valueColor } from '#lib/utils/animation';

	const r = $derived(pipeline.result!);
	const lin = $derived(r.activations.linear);
	const h = $derived(r.activations.finalH);
	const p = $derived(pipeline.progress);
	const draw = $derived(easeOutCubic(phase(p, 0, 0.6)));
	const sumIn = $derived(easeOutCubic(phase(p, 0.55, 0.95)));

	const N = $derived(h.length);
	const hMax = $derived(Math.max(1e-6, ...h.map(Math.abs)));
	const H = 360;
	const ny = (k: number) => 14 + (k / (N - 1)) * (H - 28);
	const maxC = $derived(Math.max(...lin.contributions.map(Math.abs), 1e-6));
	const pos = $derived(lin.contributions.filter((c) => c > 0).reduce((a, b) => a + b, 0));
	const neg = $derived(lin.contributions.filter((c) => c < 0).reduce((a, b) => a + b, 0));
	const shownZ = $derived(lin.logit * sumIn);
</script>

<Stage
	index={7}
	title="Linear layer, 256 → 1"
	summary="A single weighted sum collapses the 256-dimensional state into one number, the logit z. Each unit contributes its value times a learned weight; the sign of the total decides which way the prediction leans."
	code={CODE.linear}
	inShape="[256]"
	outShape="z [1]"
	kind="illustrative"
>
	<div class="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_14rem]">
		<svg viewBox="0 0 520 {H + 22}" class="w-full max-w-[34rem]" role="img"
			aria-label="16 representative hidden units connected to a single output z. Line colour shows the sign of each unit's contribution, thickness its size.">
			{#each h as v, k (k)}
				{@const c = lin.contributions[k]}
				{@const y = ny(k)}
				<path d="M40 {y} C 240 {y}, 300 {H / 2}, 440 {H / 2}" fill="none"
					stroke={c >= 0 ? 'var(--color-signal)' : 'var(--color-amber)'}
					stroke-width={0.6 + 3.4 * (Math.abs(c) / maxC)}
					stroke-opacity={0.25 + 0.6 * (Math.abs(c) / maxC)}
					pathLength="1" stroke-dasharray="1" stroke-dashoffset={1 - draw} />
				<circle cx="30" cy={y} r="8" fill={valueColor(v, hMax)} stroke="var(--color-rule-strong)" />
			{/each}
			<text x="30" y={H + 16} text-anchor="middle" class="lbl">h₅₀₀</text>
			<circle cx="466" cy={H / 2} r="26" fill="var(--color-surface)" stroke={lin.logit >= 0 ? 'var(--color-signal)' : 'var(--color-amber)'} stroke-width="1.5" />
			<text x="466" y={H / 2 + 6} text-anchor="middle" class="z">z</text>
		</svg>

		<div>
			<dl class="readout text-sm">
				<dt>Positive terms</dt><dd class="!text-signal">{fmt(pos * sumIn)}</dd>
				<dt>Negative terms</dt><dd class="!text-amber">{fmt(neg * sumIn)}</dd>
				<dt>Bias b</dt><dd>{fmt(lin.bias * sumIn)}</dd>
			</dl>
			<div class="mt-4 flex items-baseline justify-between border-t border-rule pt-4">
				<span class="text-sm text-muted">z = w · h + b</span>
				<span class="font-mono text-3xl tabular {lin.logit >= 0 ? 'text-signal' : 'text-amber'}">{fmt(shownZ)}</span>
			</div>
		</div>
	</div>

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>Weights</dt><dd>256</dd>
			<dt>Bias</dt><dd>1</dd>
			<dt>Parameters</dt><dd>257</dd>
		</dl>
		<p>
			16 of the 256 connections are drawn. Line thickness shows each unit's share of z. Values are illustrative,
			scaled so that they add up to this page's logit.
		</p>
	{/snippet}
</Stage>

<style>
	.lbl {
		font-family: var(--font-mono);
		font-size: 12px;
		fill: var(--color-muted);
	}
	.z {
		font-family: var(--font-mono);
		font-size: 20px;
		fill: var(--color-text);
	}
</style>
