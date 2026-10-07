<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE, MODEL } from '#lib/data/model';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { easeOutCubic, phase } from '#lib/utils/animation';

	const ZOOM = 10;
	const L = MODEL.seqLen;
	const enc = $derived(pipeline.result!.encoded);
	const p = $derived(pipeline.progress);
	const fillIn = $derived(easeOutCubic(phase(p, 0, 0.45)));
	const zoomIn = $derived(easeOutCubic(phase(p, 0.45, 0.8)));
	const marker = $derived(phase(p, 0.8, 1));

	const tokens = $derived(L - enc.padCount);
	const zoom = $derived(
		Array.from({ length: ZOOM }, (_, k) => {
			const t = L - ZOOM + k + 1; // 1-based
			const id = enc.sequence[t - 1];
			const realIndex = t - enc.padCount - 1;
			return { t, id, word: id === 0 ? null : enc.keptWords[realIndex] };
		})
	);
	// strip geometry, in viewBox units (1000 wide -> 2 units per position)
	const unit = 1000 / L;
</script>

<Stage
	index={3}
	title="Left-pad to 500"
	summary="Every review becomes exactly 500 integers. Zeros go first and the real IDs sit at the end, because the model reads its prediction from the very last timestep. With left-padding, that step is always the review's final word."
	code={CODE.padding}
	inShape="{enc.ids.length} ids"
	outShape="[500]"
	kind="computed"
>
	<div class="flex flex-col gap-3">
		<div class="flex items-baseline justify-between text-xs text-muted">
			<span>t = 1</span>
			<span>t = 500</span>
		</div>
		<svg viewBox="0 0 1000 28" preserveAspectRatio="none" class="h-7 w-full" role="img"
			aria-label="Sequence of 500 positions: {enc.padCount} padding zeros followed by {tokens} word IDs">
			<rect x="0" y="4" width="1000" height="20" fill="var(--color-surface)" />
			<rect x="0" y="4" width={enc.padCount * unit * fillIn} height="20" fill="url(#pad-hatch)" />
			{#if tokens > 0}
				<rect
					x={1000 - tokens * unit * fillIn}
					y="4"
					width={tokens * unit * fillIn}
					height="20"
					fill="var(--color-signal)"
				/>
			{/if}
			<rect
				x={1000 - ZOOM * unit}
				y="0.5"
				width={ZOOM * unit}
				height="27"
				fill="none"
				stroke="var(--color-text)"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
				opacity={zoomIn}
			/>
			<defs>
				<pattern id="pad-hatch" width="4" height="20" patternUnits="userSpaceOnUse">
					<rect width="4" height="20" fill="var(--color-pad)" />
					<rect width="0.6" height="20" fill="var(--color-ink)" />
				</pattern>
			</defs>
		</svg>
		<div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
			<span class="flex items-center gap-2 text-soft">
				<span class="inline-block h-2.5 w-4 rounded-sm bg-pad"></span>
				<span class="font-mono tabular text-text">{enc.padCount}</span> padding
			</span>
			<span class="flex items-center gap-2 text-soft">
				<span class="inline-block h-2.5 w-4 rounded-sm bg-signal"></span>
				<span class="font-mono tabular text-text">{tokens}</span> word IDs
			</span>
			{#if enc.truncated > 0}
				<span class="text-amber">kept the first 500 of {enc.ids.length} IDs</span>
			{/if}
		</div>

		<!-- zoomed tail -->
		<div class="mt-6" style="opacity: {zoomIn}; transform: translateY({(1 - zoomIn) * 8}px)">
			<p class="mb-3 text-xs text-muted">The last positions of the sequence</p>
			<div class="pb-2">
				<ol class="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
					{#each zoom as cell, k (cell.t)}
						<li class={['cell', k < ZOOM / 2 && 'hidden sm:block']} class:pad={cell.id === 0} class:last={cell.t === L}>
							<span class="font-mono text-base tabular">{cell.id}</span>
							<span class="mt-1 block truncate font-mono text-[0.68rem] text-muted">{cell.word ?? 'pad'}</span>
							<span class="mt-2 block font-mono text-[0.65rem] text-muted">t={cell.t}</span>
						</li>
					{/each}
				</ol>
				<div class="grid grid-cols-5 gap-1.5 sm:grid-cols-10" style="opacity: {marker}">
					<div class="col-start-5 flex sm:col-start-10 flex-col items-center pt-2 text-center">
						<svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
							<path d="M5 14V2M1 6l4-4 4 4" fill="none" stroke="var(--color-signal)" stroke-width="1.5" />
						</svg>
						<span class="mt-1 text-[0.7rem] leading-tight text-signal">output read here</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>Sequence length</dt>
			<dd>500</dd>
			<dt>Padding</dt>
			<dd>left, value 0</dd>
			<dt>Truncation</dt>
			<dd>keep first 500</dd>
		</dl>
		<p>
			Padding is not skipped. The LSTM runs over all 500 positions, padding included. Right-padding would put
			hundreds of zeros between the last word and the output.
		</p>
	{/snippet}
</Stage>

<style>
	.cell {
		border: 1px solid rgb(79 209 255 / 0.5);
		background: rgb(79 209 255 / 0.08);
		border-radius: 0.4rem;
		padding: 0.5rem 0.5rem 0.45rem;
		color: var(--color-text);
		min-width: 0;
	}
	.cell.pad {
		border-color: var(--color-rule-strong);
		background: var(--color-surface);
		color: var(--color-muted);
	}
	.cell.last {
		box-shadow: 0 0 0 1px var(--color-signal), 0 0 16px rgb(79 209 255 / 0.25);
	}
</style>
