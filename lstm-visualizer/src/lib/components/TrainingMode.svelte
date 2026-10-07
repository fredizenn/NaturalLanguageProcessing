<script lang="ts">
	import { DATASET, TOTAL_PARAMS, TRAINING } from '#lib/data/model';
	import { BEST_EPOCH, HISTORY } from '#lib/data/training';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { rng } from '#lib/utils/random';
	import { onDestroy } from 'svelte';
	import DropoutGrid from './DropoutGrid.svelte';

	const steps = [
		{ name: 'Batch of 50', code: 'for inputs, labels in train_loader', body: `50 shuffled, padded reviews: a [50, 500] tensor of IDs plus 50 labels (1 = positive, 0 = negative). One epoch is ${TRAINING.batchesPerEpoch} batches.` },
		{ name: 'Forward pass', code: 'output, h = model(inputs, h)', body: 'model.train() is on, so this is the one place dropout is active: a fresh random 30% of h₅₀₀ is zeroed for every review in the batch.' },
		{ name: 'Prediction', code: 'sig_out[:, -1]', body: '50 probabilities, one per review, each read from the last timestep.' },
		{ name: 'BCELoss', code: 'criterion(output.squeeze(), labels.float())', body: 'Binary cross-entropy, −[y·log p + (1 − y)·log(1 − p)], averaged over the batch. Confident wrong answers cost the most.' },
		{ name: 'Backpropagation', code: 'loss.backward()', body: `Gradients for all ${TOTAL_PARAMS.toLocaleString('en-US')} parameters, flowing back through all 500 timesteps of both LSTM layers.` },
		{ name: 'Clip gradients', code: 'clip_grad_norm_(model.parameters(), 5)', body: 'If the combined gradient norm is above 5, all gradients are scaled down to norm 5. This keeps long recurrent chains from producing exploding updates.' },
		{ name: 'Adam update', code: 'optimizer.step()', body: 'Adam adjusts every weight using the clipped gradients, with learning rate 0.001. Then the next batch begins.' }
	];

	let active = $state(0);
	let auto = $state(true);
	let cycle = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	$effect(() => {
		clearInterval(timer);
		if (auto && !pipeline.reducedMotion) {
			timer = setInterval(() => {
				active = (active + 1) % steps.length;
				if (active === 0) cycle++;
			}, 2200);
		}
		return () => clearInterval(timer);
	});
	onDestroy(() => clearInterval(timer));

	function pick(i: number) {
		auto = false;
		active = i;
	}

	// a new illustrative dropout mask on every loop
	const mask = $derived.by(() => {
		const r = rng(0xbeef + cycle * 101);
		return Array.from({ length: 32 }, () => r() >= 0.3);
	});
	const units = $derived.by(() => {
		const r = rng(0xcafe);
		return Array.from({ length: 32 }, () => r() * 2 - 1);
	});

	// loop geometry: 4 nodes on top (left→right), 3 on the bottom (right→left)
	const NW = 150;
	const NH = 52;
	const pos = [
		{ x: 20, y: 30 },
		{ x: 230, y: 30 },
		{ x: 440, y: 30 },
		{ x: 650, y: 30 },
		{ x: 545, y: 170 },
		{ x: 335, y: 170 },
		{ x: 125, y: 170 }
	];
	const rec = $derived(HISTORY[pipeline.selectedEpoch - 1]);
</script>

<section aria-labelledby="train-mode-title" class="flex flex-col gap-12">
	<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
		<div>
			<h2 id="train-mode-title" class="text-2xl font-semibold tracking-tight sm:text-3xl">How the weights were learned</h2>
			<p class="mt-4 max-w-[62ch] text-[0.98rem] leading-relaxed text-soft">
				The training loop the notebook ran {TRAINING.epochs} times over {DATASET.train.toLocaleString('en-US')} reviews. This is
				an explanation of that loop; nothing is being trained in your browser.
			</p>
		</div>
		<dl class="readout self-end lg:border-l lg:border-rule lg:pl-8">
			<dt>Batch size</dt><dd>{TRAINING.batchSize}</dd>
			<dt>Batches / epoch</dt><dd>{TRAINING.batchesPerEpoch}</dd>
			<dt>Optimizer</dt><dd>Adam, lr {TRAINING.learningRate}</dd>
			<dt>Gradient clip</dt><dd>{TRAINING.gradClip}</dd>
		</dl>
	</div>

	<div>
		<div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
			<svg viewBox="0 0 820 250" class="mx-auto block w-full max-w-[60rem] min-w-[40rem]" role="group" aria-label="Training loop with 7 steps">
				<defs>
					<marker id="loop-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
						<path d="M0 0L8 4L0 8z" fill="var(--color-rule-strong)" />
					</marker>
				</defs>
				<!-- arrows -->
				{#each pos as p, i (i)}
					{@const q = pos[(i + 1) % pos.length]}
					{#if i < 3}
						<line x1={p.x + NW} x2={q.x - 4} y1={p.y + NH / 2} y2={q.y + NH / 2} stroke="var(--color-rule-strong)" stroke-width="1.5" marker-end="url(#loop-arr)" />
					{:else if i === 3}
						<path d="M{p.x + NW / 2} {p.y + NH} C {p.x + NW / 2} {p.y + NH + 50}, {q.x + NW + 40} {q.y + NH / 2}, {q.x + NW + 4} {q.y + NH / 2}" fill="none" stroke="var(--color-rule-strong)" stroke-width="1.5" marker-end="url(#loop-arr)" />
					{:else if i < 6}
						<line x1={p.x} x2={q.x + NW + 4} y1={p.y + NH / 2} y2={q.y + NH / 2} stroke="var(--color-rule-strong)" stroke-width="1.5" marker-end="url(#loop-arr)" />
					{:else}
						<path d="M{p.x} {p.y + NH / 2} C {p.x - 80} {p.y + NH / 2}, {q.x + 10} {q.y + NH + 60}, {q.x + NW / 2} {q.y + NH + 4}" fill="none" stroke="var(--color-rule-strong)" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#loop-arr)" />
						<text x={q.x + 4} y={q.y + NH + 34} class="lp-note">next batch</text>
					{/if}
				{/each}
				{#each steps as s, i (s.name)}
					{@const p = pos[i]}
					<g
						role="button"
						tabindex="0"
						aria-pressed={active === i}
						aria-label="{i + 1}. {s.name}"
						class="lp-node"
						onclick={() => pick(i)}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick(i))}
					>
						<rect x={p.x} y={p.y} width={NW} height={NH} rx="10"
							fill={active === i ? 'rgb(79 209 255 / 0.1)' : 'var(--color-surface)'}
							stroke={active === i ? 'var(--color-signal)' : 'var(--color-rule-strong)'} />
						<text x={p.x + 14} y={p.y + 21} class="lp-num">{i + 1}</text>
						<text x={p.x + 14} y={p.y + 39} class="lp-name" class:lp-on={active === i}>{s.name}</text>
						{#if i === 1}
							<text x={p.x + NW - 12} y={p.y + 21} text-anchor="end" class="lp-badge">dropout on</text>
						{/if}
					</g>
				{/each}
			</svg>
		</div>

		<div class="mt-6 grid gap-8 rounded-xl border border-rule bg-surface p-6 md:grid-cols-[minmax(0,1fr)_auto]">
			<div aria-live="polite">
				<p class="text-sm text-muted">Step {active + 1} of {steps.length}</p>
				<h3 class="mt-1 text-xl font-semibold">{steps[active].name}</h3>
				<p class="mt-3 max-w-[60ch] text-sm leading-relaxed text-soft">{steps[active].body}</p>
				<pre class="code-block mt-4 inline-block"><code>{steps[active].code}</code></pre>
			</div>
			{#if active === 1}
				<div class="flex flex-col gap-2">
					<DropoutGrid {units} {mask} scale={1 / 0.7} label="dropout mask, this batch" />
					<p class="max-w-[16rem] text-xs text-muted">Illustrative mask. Survivors are scaled by 1 / 0.7.</p>
				</div>
			{/if}
		</div>
		<div class="mt-4 flex flex-wrap gap-3">
			<button type="button" class="btn" onclick={() => (auto = !auto)} aria-pressed={auto} disabled={pipeline.reducedMotion}>
				{auto && !pipeline.reducedMotion ? 'Pause loop' : 'Play loop'}
			</button>
			<button type="button" class="btn" onclick={() => pick((active + 1) % steps.length)}>Next step</button>
		</div>
	</div>

	<div>
		<h3 class="mb-4 text-lg font-semibold tracking-tight">Five epochs</h3>
		<ol class="grid grid-cols-5 gap-2" aria-label="Epochs">
			{#each HISTORY as e (e.epoch)}
				<li>
					<button type="button" class="epoch" aria-pressed={pipeline.selectedEpoch === e.epoch}
						onclick={() => (pipeline.selectedEpoch = e.epoch)}>
						<span class="text-xs text-muted">Epoch</span>
						<span class="text-xl font-semibold">{e.epoch}</span>
						<span class="mt-1 font-mono text-[0.72rem] text-soft tabular">{e.valAcc.toFixed(1)}%</span>
						{#if e.epoch === BEST_EPOCH}<span class="mt-1 text-[0.7rem] text-signal">saved</span>{/if}
					</button>
				</li>
			{/each}
		</ol>
		<p class="mt-4 max-w-[64ch] text-sm leading-relaxed text-soft">
			Epoch {rec.epoch}: training accuracy {rec.trainAcc.toFixed(2)}%, validation accuracy {rec.valAcc.toFixed(2)}%,
			validation loss {rec.valLoss.toFixed(4)}.
			{#if rec.epoch === BEST_EPOCH}
				Lowest validation loss of the run, so these are the weights kept in <code class="font-mono">state_dict.pt</code>.
			{:else if rec.epoch === 5}
				Validation loss went up, so this epoch was not saved.
			{:else}
				Saved, then replaced by a later, better epoch.
			{/if}
			The charts below follow your selection.
		</p>
	</div>
</section>

<style>
	.lp-node {
		cursor: pointer;
		outline: none;
	}
	.lp-node:focus-visible rect {
		stroke: var(--color-text);
		stroke-width: 2;
	}
	.lp-num {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--color-muted);
	}
	.lp-name {
		font-size: 14px;
		font-weight: 600;
		fill: var(--color-soft);
	}
	.lp-on {
		fill: var(--color-text);
	}
	.lp-badge {
		font-size: 10.5px;
		fill: var(--color-amber);
	}
	.lp-note {
		font-size: 11px;
		fill: var(--color-muted);
	}
	.epoch {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		border: 1px solid var(--color-rule-strong);
		border-radius: 0.6rem;
		padding: 0.75rem;
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		text-align: left;
	}
	.epoch[aria-pressed='true'] {
		border-color: var(--color-signal);
		background: rgb(79 209 255 / 0.06);
	}
</style>
