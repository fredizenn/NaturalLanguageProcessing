<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE, MODEL } from '#lib/data/model';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { easeOutCubic, phase, stagger, valueColor } from '#lib/utils/animation';

	const SHOW = 5;
	const r = $derived(pipeline.result!);
	const enc = $derived(r.encoded);
	const p = $derived(pipeline.progress);

	// the last few real tokens (what the LSTM sees right before the output) plus the pad row
	const cards = $derived.by(() => {
		const tail = enc.keptIds
			.map((id, i) => ({ id, word: enc.keptWords[i] as string | null, t: enc.padCount + i + 1 }))
			.slice(-SHOW);
		const list = enc.padCount > 0 ? [{ id: 0, word: null, t: 0 }, ...tail] : tail;
		return list.map((c) => ({ ...c, vec: r.activations.embeddings.get(c.id) ?? [] }));
	});
	const hiddenTokens = $derived(Math.max(0, enc.keptIds.length - SHOW));

	const TABLE_H = 300;
	const rowY = (id: number) => 6 + (id / (MODEL.embeddingRows - 1)) * (TABLE_H - 12);
	const uniqueIds = $derived([...new Set(enc.sequence)]);
	const tableIn = $derived(easeOutCubic(phase(p, 0, 0.3)));
</script>

<Stage
	index={4}
	title="Embedding lookup"
	summary="Each ID selects one row of a learned 1001 × 64 table. Row 0 belongs to padding and is learned like any other row, so all 500 positions, including the padding, become 64-dimensional vectors."
	code={CODE.embedding}
	inShape="[500]"
	outShape="[500, 64]"
	kind="mixed"
>
	<div class="grid items-start gap-8 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
		<figure class="hidden sm:block">
			<svg viewBox="0 0 104 {TABLE_H}" class="w-full" role="img"
				aria-label="Embedding table with {MODEL.embeddingRows} rows; {uniqueIds.length} rows are used by this review">
				<rect x="24" y="0" width="56" height={TABLE_H} rx="4" fill="var(--color-surface)" stroke="var(--color-rule-strong)" />
				{#each Array.from({ length: 16 }) as _, k (k)}
					<line x1="24" x2="80" y1={(k * TABLE_H) / 16} y2={(k * TABLE_H) / 16} stroke="var(--color-rule)" />
				{/each}
				{#each uniqueIds as id (id)}
					<rect
						x="24"
						y={rowY(id) - 1}
						width={56 * tableIn}
						height="2.5"
						fill={id === 0 ? 'var(--color-soft)' : 'var(--color-signal)'}
					/>
				{/each}
				<text x="20" y="10" text-anchor="end" class="axis">0</text>
				<text x="20" y={TABLE_H - 2} text-anchor="end" class="axis">1000</text>
				<text x="84" y={TABLE_H / 2} class="axis" transform="rotate(90 84 {TABLE_H / 2})" dx="-22">64 cols</text>
			</svg>
			<figcaption class="mt-2 text-center text-xs text-muted">{uniqueIds.length} of 1001 rows used</figcaption>
		</figure>

		<div>
			<ul class="flex flex-wrap gap-5">
				{#each cards as c, i (c.id + ':' + c.t)}
					{@const t = easeOutCubic(stagger(p, i, cards.length, 0.25, 0.95))}
					<li class="card" style="opacity: {0.2 + 0.8 * t}">
						<div class="mb-2 flex items-baseline justify-between gap-3">
							<span class="min-w-0 truncate font-mono text-sm {c.word ? 'text-text' : 'text-muted'}">{c.word ?? 'pad'}</span>
							<span class="shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular">id {c.id}</span>
						</div>
						<svg viewBox="0 0 8 8" class="grid8" style="clip-path: inset(0 0 {(1 - t) * 100}% 0)" role="img"
							aria-label="64-dimensional embedding of {c.word ?? 'padding'}, drawn as an 8 by 8 grid">
							{#each c.vec as v, k (k)}
								<rect x={k % 8 + 0.06} y={Math.floor(k / 8) + 0.06} width="0.88" height="0.88" rx="0.12" fill={valueColor(v, 0.9)} />
							{/each}
						</svg>
						<p class="mt-2 font-mono text-[0.68rem] text-muted">
							{c.id === 0 ? `used at ${enc.padCount} positions` : `t = ${c.t}`}
						</p>
					</li>
				{/each}
			</ul>
			{#if hiddenTokens > 0}
				<p class="mt-4 text-sm text-muted">Showing the last {SHOW} words; {hiddenTokens} earlier words are embedded the same way.</p>
			{/if}
			<div class="mt-6 flex items-center gap-3 text-xs text-muted">
				<span>negative</span>
				<span class="legend" aria-hidden="true"></span>
				<span>positive</span>
			</div>
		</div>
	</div>

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>Table</dt>
			<dd>1001 × 64</dd>
			<dt>Parameters</dt>
			<dd>64,064</dd>
			<dt>padding_idx</dt>
			<dd>not set</dd>
		</dl>
		<p>
			Because <code class="font-mono">padding_idx</code> isn't set, the pad row is trained like a word. Each 64-value
			vector is drawn as an 8 × 8 grid. The values are illustrative; the trained table wasn't exported.
		</p>
	{/snippet}
</Stage>

<style>
	.card {
		width: 8.5rem;
	}
	.grid8 {
		width: 100%;
		aspect-ratio: 1;
		display: block;
	}
	.axis {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--color-muted);
	}
	.legend {
		width: 7rem;
		height: 0.5rem;
		border-radius: 2px;
		background: linear-gradient(90deg, rgb(232 161 92), rgb(232 161 92 / 0.12) 50%, rgb(79 209 255 / 0.12) 50%, rgb(79 209 255));
	}
</style>
