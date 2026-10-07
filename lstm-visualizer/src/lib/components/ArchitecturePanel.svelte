<script lang="ts">
	import { DATASET, MODEL, PARAMS, TOTAL_PARAMS, TRAINING } from '#lib/data/model';

	const n = (v: number) => v.toLocaleString('en-US');

	const spec: [string, string][] = [
		['Dataset', `IMDB, ${n(DATASET.train)} train / ${n(DATASET.validation)} validation`],
		['Vocabulary', `${n(MODEL.vocabSize)} words + padding (id 0)`],
		['Sequence length', `${MODEL.seqLen}, left-padded`],
		['Embedding', `${n(MODEL.embeddingRows)} × ${MODEL.embeddingDim}`],
		['LSTM layers', String(MODEL.numLayers)],
		['Hidden size', String(MODEL.hiddenSize)],
		['Dropout', `${MODEL.dropout.toFixed(2)}, training only`],
		['Output', `Linear ${MODEL.hiddenSize} → 1, sigmoid`],
		['Loss', TRAINING.loss],
		['Optimizer', `${TRAINING.optimizer}, lr ${TRAINING.learningRate}`],
		['Batch size', String(TRAINING.batchSize)],
		['Gradient clipping', `max norm ${TRAINING.gradClip}`],
		['Epochs', String(TRAINING.epochs)]
	];

	const parts = [
		{ name: 'Embedding', v: PARAMS.embedding, c: 'var(--color-soft)' },
		{ name: 'LSTM layer 1', v: PARAMS.lstm1, c: 'var(--color-memory)' },
		{ name: 'LSTM layer 2', v: PARAMS.lstm2, c: 'var(--color-signal)' },
		{ name: 'Linear', v: PARAMS.linear, c: 'var(--color-text)' }
	];
</script>

<section aria-labelledby="arch-title" class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<div>
		<h2 id="arch-title" class="mb-6 text-2xl font-semibold tracking-tight">The model, as trained</h2>
		<dl class="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] text-sm">
			{#each spec as [k, v] (k)}
				<dt class="border-b border-rule py-2.5 text-muted">{k}</dt>
				<dd class="border-b border-rule py-2.5 font-mono text-[0.82rem] text-text">{v}</dd>
			{/each}
		</dl>
	</div>

	<div>
		<h3 class="mb-2 text-lg font-semibold tracking-tight">Where the parameters are</h3>
		<p class="mb-6 max-w-[52ch] text-sm leading-relaxed text-soft">
			{n(TOTAL_PARAMS)} trainable parameters. Layer 2 is the largest because its input is layer 1's 256-wide hidden
			state, not the 64-wide embedding.
		</p>
		<div class="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img"
			aria-label={parts.map((p) => `${p.name} ${n(p.v)}`).join(', ')}>
			{#each parts as part (part.name)}
				<span style="flex: {part.v} 0 0; background: {part.c}; min-width: 2px"></span>
			{/each}
		</div>
		<dl class="mt-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 text-sm">
			{#each parts as part (part.name)}
				<span class="h-2.5 w-2.5 rounded-sm" style="background: {part.c}" aria-hidden="true"></span>
				<dt class="text-soft">{part.name}</dt>
				<dd class="text-right font-mono tabular">
					{n(part.v)}
					<span class="ml-2 inline-block w-12 text-muted">{((part.v / TOTAL_PARAMS) * 100).toFixed(1)}%</span>
				</dd>
			{/each}
		</dl>
	</div>
</section>
