<script lang="ts">
	import { EXAMPLES } from '#lib/data/examples';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const r = $derived(pipeline.result!);
	const pred = $derived(r.prediction);
	const positive = $derived(pred.sentiment === 'positive');
	const recordedExample = $derived(EXAMPLES.find((e) => e.recorded && e.text.trim() === r.text.trim()));

	const shown = new Tween(0.5, { duration: 900, easing: cubicOut });
	$effect(() => {
		shown.set(pred.probability, { duration: pipeline.reducedMotion ? 0 : 900 });
	});

	const R = 92;
	const C = 2 * Math.PI * R;
	const seen = $derived(r.encoded.keptWords);
</script>

<section aria-labelledby="result-title" class="grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
	<div class="relative mx-auto w-56 sm:w-64">
		<svg viewBox="0 0 220 236" class="block w-full" role="img"
			aria-label="Probability positive {pred.probability.toFixed(4)}, negative {(1 - pred.probability).toFixed(4)}">
			<circle cx="110" cy="110" r={R} fill="none" stroke="rgb(232 161 92 / 0.55)" stroke-width="10" />
			<circle cx="110" cy="110" r={R} fill="none" stroke="var(--color-signal)" stroke-width="10"
				stroke-dasharray="{C * shown.current} {C}" transform="rotate(-90 110 110)" stroke-linecap="butt" />
			<line x1="110" x2="110" y1="196" y2="210" stroke="var(--color-text)" stroke-width="1.5" />
			<text x="110" y="228" text-anchor="middle" class="th">0.5</text>
		</svg>
		<div class="absolute inset-x-0 top-0 flex aspect-square flex-col items-center justify-center">
			<p id="result-title" class="text-sm font-semibold {positive ? 'text-signal' : 'text-amber'}">
				{positive ? 'Positive' : 'Negative'}
			</p>
			<p class="font-mono text-4xl sm:text-[2.75rem] leading-none font-medium tracking-tight tabular">{shown.current.toFixed(4)}</p>
			<p class="mt-2 text-xs text-muted">P(positive)</p>
		</div>
	</div>

	<div class="flex min-w-0 flex-col justify-center gap-6">
		<div>
			<span class="tag {pred.source === 'recorded' ? 'tag-recorded' : pred.source === 'model' ? 'tag-computed' : 'tag-illustrative'}">
				{pred.source === 'recorded' ? 'Recorded output from the notebook' : pred.source === 'model' ? 'Trained model output' : 'Illustrative output'}
			</span>
			<p class="mt-3 max-w-[60ch] text-sm leading-relaxed text-soft">
				{#if pred.source === 'recorded'}
					The trained model scored this exact review {pred.probability.toFixed(4)} when the notebook was run; the
					true label is {recordedExample?.recorded?.actual}. Intermediate values on earlier stages are still
					illustrative.
				{:else if pred.source === 'model'}
					This probability came from the trained model.
				{:else}
					This page doesn't run the trained weights. The number comes from a small stand-in scorer that only sees
					the words the real pipeline keeps, so it shows how the output behaves, not what the model would say.
				{/if}
			</p>
		</div>

		<dl class="flex flex-col gap-3">
			{#each [{ k: 'P(positive)', v: pred.probability, c: 'bg-signal' }, { k: 'P(negative)', v: 1 - pred.probability, c: 'bg-amber' }] as row (row.k)}
				<div class="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3">
					<dt class="text-sm text-soft">{row.k}</dt>
					<dd class="relative h-2 overflow-hidden rounded-full bg-surface">
						<span class="absolute inset-y-0 left-0 rounded-full {row.c}" style="width: {row.v * 100}%"></span>
						<span class="absolute inset-y-[-2px] left-1/2 w-px bg-text/60" aria-hidden="true"></span>
					</dd>
					<dd class="text-right font-mono text-sm tabular">{row.v.toFixed(4)}</dd>
				</div>
			{/each}
			<div class="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3">
				<dt class="text-sm text-soft">Logit z</dt>
				<dd></dd>
				<dd class="text-right font-mono text-sm tabular">{(pred.logit ?? 0).toFixed(3)}</dd>
			</div>
		</dl>

		<div>
			<p class="mb-2 text-sm text-muted">What the model actually received ({seen.length} of {r.encoded.words.length} words)</p>
			<p class="font-mono text-sm leading-relaxed text-text">
				{#if seen.length}
					{seen.length > 40 ? '… ' : ''}{seen.slice(-40).join(' ')}
				{:else}
					<span class="text-muted">nothing but padding</span>
				{/if}
			</p>
		</div>

		<div class="flex flex-wrap gap-3">
			<button type="button" class="btn" onclick={() => pipeline.replay()}>Replay from the start</button>
			<button type="button" class="btn" onclick={() => document.getElementById('review')?.focus()}>Try another review</button>
		</div>
	</div>
</section>

<style>
	.th {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: var(--color-muted);
	}
</style>
