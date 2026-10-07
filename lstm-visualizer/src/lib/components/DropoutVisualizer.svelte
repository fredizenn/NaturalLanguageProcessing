<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE } from '#lib/data/model';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { easeOutCubic, phase } from '#lib/utils/animation';
	import DropoutGrid from './DropoutGrid.svelte';

	const r = $derived(pipeline.result!);
	const p = $derived(pipeline.progress);
	const pass = $derived(easeOutCubic(phase(p, 0.1, 0.8)));
	// the 32 drawn units: 16 representative values, repeated with a sign flip so the grid isn't uniform
	const units = $derived.by(() => {
		const h = r.activations.finalH;
		const m = Math.max(1e-6, ...h.map(Math.abs));
		return [...h, ...h.map((v) => -v * 0.6)].map((v) => v / m);
	});
</script>

<Stage
	index={6}
	title="Dropout, switched off"
	summary="Dropout is a training-time regulariser. During training it zeroes a random 30% of the 256 values on every forward pass. At inference the model runs in eval mode and dropout passes h₅₀₀ through unchanged, so in this prediction nothing is dropped."
	code={CODE.dropout}
	inShape="[256]"
	outShape="[256] unchanged"
	kind="illustrative"
>
	<div class="flex flex-col gap-10">
		<figure>
			<div class="flex flex-wrap items-center gap-6">
				<DropoutGrid {units} label="h₅₀₀ in" />
				<div class="relative flex flex-col items-center gap-2">
					<svg width="120" height="40" viewBox="0 0 120 40" aria-hidden="true">
						<line x1="0" x2="114" y1="20" y2="20" stroke="var(--color-rule-strong)" stroke-width="1.5" />
						<line x1="0" x2={114 * pass} y1="20" y2="20" stroke="var(--color-signal)" stroke-width="1.5" />
						<path d="M110 15l6 5-6 5" fill="none" stroke={pass > 0.95 ? 'var(--color-signal)' : 'var(--color-rule-strong)'} stroke-width="1.5" />
					</svg>
					<span class="rounded-full border border-dashed border-rule-strong px-3 py-1 font-mono text-xs text-muted">identity · × 1</span>
				</div>
				<div style="opacity: {0.3 + 0.7 * pass}">
					<DropoutGrid {units} label="h₅₀₀ out" />
				</div>
			</div>
			<figcaption class="mt-4 text-sm text-soft">
				<span class="font-medium text-text">Now: eval mode.</span> All 256 values continue to the linear layer.
			</figcaption>
		</figure>

		<figure class="rounded-xl border border-rule p-5">
			<figcaption class="mb-4 text-sm text-soft">
				<span class="font-medium text-text">For comparison: training mode.</span> A fresh random mask on every batch.
				Survivors are scaled by 1 / (1 − 0.3) ≈ 1.43 so the expected sum is unchanged.
			</figcaption>
			<div class="flex flex-wrap items-center gap-6">
				<DropoutGrid {units} mask={r.activations.dropoutMask} scale={1 / 0.7} label="training example" small />
				<p class="max-w-[34ch] text-sm text-muted">
					Crossed units are zeroed for that step only. The mask is not used when predicting, and switching to
					<button type="button" class="text-signal underline underline-offset-2" onclick={() => (pipeline.mode = 'training')}>Training</button>
					shows it in the training loop.
				</p>
			</div>
		</figure>
	</div>

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>p</dt><dd>0.3</dd>
			<dt>Training</dt><dd>active</dd>
			<dt>Inference</dt><dd>identity</dd>
		</dl>
		<p>
			The constructor takes <code class="font-mono">drop_prob=0.5</code> but never uses it; the layer is
			hard-coded to 0.3.
		</p>
	{/snippet}
</Stage>
