<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import ArchitecturePanel from '#lib/components/ArchitecturePanel.svelte';
	import CleaningStage from '#lib/components/CleaningStage.svelte';
	import DropoutVisualizer from '#lib/components/DropoutVisualizer.svelte';
	import EmbeddingVisualizer from '#lib/components/EmbeddingVisualizer.svelte';
	import LinearVisualizer from '#lib/components/LinearVisualizer.svelte';
	import LSTMVisualizer from '#lib/components/LSTMVisualizer.svelte';
	import PaddingSequence from '#lib/components/PaddingSequence.svelte';
	import Pipeline from '#lib/components/Pipeline/Pipeline.svelte';
	import PlaybackControls from '#lib/components/PlaybackControls.svelte';
	import PredictionResult from '#lib/components/PredictionResult.svelte';
	import SigmoidVisualizer from '#lib/components/SigmoidVisualizer.svelte';
	import TextInput from '#lib/components/TextInput.svelte';
	import TrainingCharts from '#lib/components/TrainingCharts.svelte';
	import TrainingMode from '#lib/components/TrainingMode.svelte';
	import VocabularyMap from '#lib/components/VocabularyMap.svelte';
	import { NOTEBOOK_URL, SOURCE_URL } from '#lib/data/site';
	import { pipeline, STAGES } from '#lib/state/pipeline.svelte';

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => (pipeline.reducedMotion = mq.matches);
		sync();
		mq.addEventListener('change', sync);
		pipeline.run();
		return () => mq.removeEventListener('change', sync);
	});

	const stageLabel = $derived(
		pipeline.stageIndex >= 0 ? `Stage ${pipeline.stageIndex + 1} of ${STAGES.length}: ${STAGES[pipeline.stageIndex].name}` : 'Ready'
	);
</script>

<svelte:head>
	<title>Inside an LSTM sentiment classifier</title>
	<meta
		name="description"
		content="An interactive visualization of how a PyTorch Embedding + 2-layer LSTM classifier turns a movie review into a sentiment probability."
	/>
</svelte:head>

<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-signal focus:px-3 focus:py-2 focus:text-ink">
	Skip to content
</a>

<header class="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-4 pt-6 sm:px-8">
	<div class="flex items-baseline gap-3">
		<span class="text-[0.95rem] font-semibold tracking-tight">Sentiment analysis</span>
		<span class="hidden text-sm text-muted sm:inline">PyTorch · LSTM · NLP</span>
	</div>
	<a href={SOURCE_URL} class="btn" target="_blank" rel="noopener noreferrer">
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
		View source
	</a>
</header>

<main id="main" class="mx-auto max-w-[88rem] px-4 sm:px-8">
	<!-- hero -->
	<section class="grid gap-10 pt-14 pb-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-20 lg:pb-20">
		<div class="flex flex-col justify-between gap-8">
			<h1 class="text-display font-semibold text-balance">Inside an LSTM sentiment classifier</h1>
			<p class="max-w-[46ch] text-lg leading-relaxed text-soft">
				An interactive visualization of how a PyTorch recurrent neural network transforms text into sentiment.
				Follow one review from raw text, through an embedding and two LSTM layers, to a single probability.
			</p>
		</div>
		<div class="lg:pt-2">
			<TextInput />
		</div>
	</section>

	<!-- instrument -->
	<section aria-label="Model visualization" class="rounded-2xl border border-rule bg-surface/60">
		<div class="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-6">
			<div class="flex rounded-full border border-rule-strong p-1" role="group" aria-label="Mode">
				{#each [{ id: 'explore', label: 'Explore' }, { id: 'training', label: 'Training' }] as m (m.id)}
					<button
						type="button"
						class="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
						class:bg-text={pipeline.mode === m.id}
						class:text-ink={pipeline.mode === m.id}
						class:text-soft={pipeline.mode !== m.id}
						aria-pressed={pipeline.mode === m.id}
						onclick={() => {
							pipeline.mode = m.id as 'explore' | 'training';
							if (m.id === 'training') pipeline.pause();
						}}
					>
						{m.label}
					</button>
				{/each}
			</div>
			{#if pipeline.mode === 'explore'}
				<PlaybackControls />
			{/if}
		</div>

		{#if pipeline.mode === 'explore'}
			<div class="border-b border-rule px-4 py-6 sm:px-6 lg:py-8">
				<Pipeline />
				<div class="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
					<span aria-live="polite">{stageLabel}</span>
					{#if pipeline.stale}
						<span class="text-amber">The review has changed. Run the model to update.</span>
					{/if}
				</div>
			</div>

			<div class="min-h-[34rem] px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
				{#if pipeline.result}
					{#key pipeline.stage + pipeline.result.text}
						<div in:fade={{ duration: pipeline.reducedMotion ? 0 : 220 }}>
							{#if pipeline.stage === 'clean'}<CleaningStage />
							{:else if pipeline.stage === 'vocabulary'}<VocabularyMap />
							{:else if pipeline.stage === 'padding'}<PaddingSequence />
							{:else if pipeline.stage === 'embedding'}<EmbeddingVisualizer />
							{:else if pipeline.stage === 'lstm'}<LSTMVisualizer />
							{:else if pipeline.stage === 'dropout'}<DropoutVisualizer />
							{:else if pipeline.stage === 'linear'}<LinearVisualizer />
							{:else if pipeline.stage === 'sigmoid'}<SigmoidVisualizer />
							{:else if pipeline.stage === 'result'}<PredictionResult />
							{:else}
								<p class="text-soft">Run the model to follow your review through each layer.</p>
							{/if}
						</div>
					{/key}
				{:else}
					<p class="text-soft">Run the model to follow your review through each layer.</p>
				{/if}
			</div>
		{:else}
			<div class="px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
				<TrainingMode />
			</div>
		{/if}
	</section>

	<!-- what is real -->
	<section aria-labelledby="honesty-title" class="grid gap-8 py-16 md:grid-cols-3 lg:py-20">
		<h2 id="honesty-title" class="sr-only">What on this page is real</h2>
		<div>
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold"><span class="tag tag-computed">Computed</span></p>
			<p class="text-sm leading-relaxed text-soft">
				Lowercasing, splitting, the three cleaning regexes, stopword and vocabulary filtering, left-padding to 500 and
				every tensor shape are reproduced from the notebook and computed from your text.
			</p>
		</div>
		<div>
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold"><span class="tag tag-illustrative">Illustrative</span></p>
			<p class="text-sm leading-relaxed text-soft">
				Word IDs come from a stand-in vocabulary. Embedding values, LSTM states, the logit and the probability come
				from small stand-ins, not the trained weights, apart from the one notebook review with a recorded output.
			</p>
		</div>
		<div>
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold"><span class="tag">Drawn representatively</span></p>
			<p class="text-sm leading-relaxed text-soft">
				Hidden states show 8 or 16 of 256 units, 64-value embeddings are drawn as 8 × 8 grids, and the 500-step
				sequence is compressed, with the full run shown as a single trace.
			</p>
		</div>
	</section>

	<div class="border-t border-rule py-16 lg:py-20">
		<ArchitecturePanel />
	</div>

	<div class="border-t border-rule py-16 lg:py-20">
		<TrainingCharts />
	</div>
</main>

<footer class="border-t border-rule">
	<div class="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-8">
		<span>Built with SvelteKit · PyTorch · LSTM</span>
		<a href={NOTEBOOK_URL} class="text-soft underline-offset-4 hover:text-text hover:underline" target="_blank" rel="noopener noreferrer">
			View the original implementation →
		</a>
	</div>
</footer>
