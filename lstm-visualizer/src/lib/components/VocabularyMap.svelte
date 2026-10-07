<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE, MODEL } from '#lib/data/model';
	import { NEGATIONS, VOCAB } from '#lib/data/vocab';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { stagger } from '#lib/utils/animation';

	const SHOW = 14;
	const enc = $derived(pipeline.result!.encoded);
	const p = $derived(pipeline.progress);

	const kept = $derived(enc.lookups.filter((l) => l.status === 'kept'));
	const stop = $derived(enc.lookups.filter((l) => l.status === 'stopword'));
	const oov = $derived(enc.lookups.filter((l) => l.status === 'oov'));
	const empty = $derived(enc.lookups.filter((l) => l.status === 'empty'));
	const negations = $derived([...new Set(stop.filter((l) => NEGATIONS.has(l.word)).map((l) => l.word))]);

	// animate over the first SHOW lookups in reading order; the rest appear at the end
	const shown = $derived(enc.lookups.slice(0, SHOW * 2));
	const reveal = (index: number) => {
		const pos = shown.findIndex((l) => l.index === index);
		return pos < 0 ? (p >= 0.95 ? 1 : 0) : stagger(p, pos, shown.length, 0.05, 0.9);
	};
</script>

<Stage
	index={2}
	title="Vocabulary lookup"
	summary="Each cleaned word is looked up in a dictionary of the 1000 most frequent training words. A hit becomes an integer ID; anything else is dropped. There is no unknown-word token, so dropped words leave no trace in the input."
	code={CODE.vocabulary}
	inShape="{enc.words.length} words"
	outShape="{enc.ids.length} ids"
	kind="mixed"
>
	<div class="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<div>
			<h3 class="mb-3 flex items-baseline justify-between text-sm font-semibold">
				<span>Kept <span class="font-normal text-muted">→ id</span></span>
				<span class="font-mono text-xs font-normal text-signal">{kept.length}</span>
			</h3>
			{#if kept.length === 0}
				<p class="text-sm text-soft">No word survived. The model will see 500 padding tokens.</p>
			{:else}
				<ul class="flex flex-col">
					{#each kept.slice(0, SHOW) as l (l.index)}
						{@const t = reveal(l.index)}
						<li class="row" style="opacity: {0.15 + 0.85 * t}">
							<span class="font-mono text-sm text-text">{l.word}</span>
							<span class="lead" style="transform: scaleX({t})" aria-hidden="true"></span>
							<span class="font-mono text-sm tabular text-signal">{l.id}</span>
						</li>
					{/each}
				</ul>
				{#if kept.length > SHOW}
					<p class="mt-2 text-sm text-muted">+{kept.length - SHOW} more</p>
				{/if}
			{/if}
		</div>

		<div class="flex flex-col gap-5">
			{#each [{ title: 'Stopwords', items: stop, hint: 'NLTK English list' }, { title: 'Outside vocabulary', items: oov, hint: 'not in the top 1000' }, { title: 'Empty after cleaning', items: empty, hint: 'only punctuation' }] as group (group.title)}
				{#if group.items.length}
					<div>
						<h3 class="mb-2 flex items-baseline justify-between text-sm font-semibold">
							<span>{group.title} <span class="font-normal text-muted">dropped, {group.hint}</span></span>
							<span class="font-mono text-xs font-normal text-amber">{group.items.length}</span>
						</h3>
						<ul class="flex flex-wrap gap-1.5">
							{#each group.items.slice(0, 22) as l (l.index)}
								{@const t = reveal(l.index)}
								<li
									class="dropped"
									class:negation={NEGATIONS.has(l.word)}
									style="opacity: {0.15 + 0.85 * t}"
								>
									{l.word || l.raw}
								</li>
							{/each}
							{#if group.items.length > 22}
								<li class="self-center text-xs text-muted">+{group.items.length - 22}</li>
							{/if}
						</ul>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	{#if negations.length}
		<div class="mt-8 max-w-[64ch] border-l-2 border-amber pl-4 text-sm leading-relaxed text-soft">
			<strong class="font-semibold text-text">Negation removed.</strong>
			{negations.map((n) => `“${n}”`).join(', ')}
			{negations.length > 1 ? 'are' : 'is'} in the NLTK stopword list, so the model never sees
			{negations.length > 1 ? 'them' : 'it'}. “Not good” reaches the LSTM as “good”.
		</div>
	{/if}

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>Vocabulary</dt>
			<dd>{MODEL.vocabSize} words</dd>
			<dt>ID range</dt>
			<dd>1 – {MODEL.vocabSize}</dd>
			<dt>Reserved</dt>
			<dd>0 = padding</dd>
		</dl>
		<p>
			IDs are assigned by frequency, so common words get small numbers. The real dictionary wasn't exported, so
			this page uses a {VOCAB.size}-word stand-in in approximate IMDB frequency order. The IDs shown are
			illustrative, and a word marked outside the vocabulary may be in the real top 1000.
		</p>
	{/snippet}
</Stage>

<style>
	.row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.32rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.lead {
		height: 1px;
		background: linear-gradient(90deg, var(--color-rule-strong), var(--color-signal));
		transform-origin: left;
	}
	.dropped {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		padding: 0.12rem 0.45rem;
		border-radius: 0.3rem;
		color: var(--color-muted);
		border: 1px dashed var(--color-rule-strong);
		text-decoration: line-through;
		text-decoration-color: rgb(124 138 150 / 0.6);
	}
	.dropped.negation {
		color: var(--color-amber);
		border-color: rgb(232 161 92 / 0.6);
		text-decoration-color: rgb(232 161 92 / 0.8);
	}
</style>
