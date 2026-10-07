<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE } from '#lib/data/model';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { phase, stagger } from '#lib/utils/animation';

	const MAX = 28;
	const enc = $derived(pipeline.result!.encoded);
	const words = $derived(enc.words.slice(0, MAX));
	const hidden = $derived(Math.max(0, enc.words.length - MAX));
	const changed = $derived(enc.words.filter((w) => w.raw !== w.cleaned).length);
	const p = $derived(pipeline.progress);
	const split = $derived(phase(p, 0, 0.25));
</script>

<Stage
	index={1}
	title="Lowercase, split, clean each word"
	summary="The review is lowercased and split on whitespace first. Only then is each word cleaned on its own, so the regexes strip punctuation inside a word but never join words together."
	code={CODE.clean}
	inShape="string"
	outShape="{enc.words.length} words"
	kind="computed"
>
	<div class="flex flex-col gap-6">
		<div>
			<p class="mb-2 text-xs text-muted">Review</p>
			<p class="line-clamp-3 max-w-[70ch] font-mono text-sm leading-relaxed break-words text-soft">
				{pipeline.result!.text}
			</p>
		</div>

		<div style="opacity: {split}; transform: translateY({(1 - split) * 6}px)">
			<p class="mb-3 text-xs text-muted">
				<code class="font-mono text-soft">text.lower().split()</code>, then
				<code class="font-mono text-soft">preprocess_string(word)</code> on each
			</p>
			<ol class="flex flex-wrap gap-2" aria-label="Words after cleaning">
				{#each words as w, i (i)}
					{@const t = stagger(p, i, words.length, 0.25, 0.95)}
					{@const chars = Array.from(w.raw)}
					<li class="word" class:changed={w.raw !== w.cleaned} class:empty={w.cleaned === ''}>
						<span class="sr-only">{w.raw} becomes {w.cleaned || 'an empty string'}</span>
						<span aria-hidden="true" class="font-mono">
							{#each chars as ch, ci (ci)}
								{#if w.removed.includes(ci)}
									<span class="removed" style="--t: {t}">{ch}</span>
								{:else}
									{ch}
								{/if}
							{/each}
						</span>
						{#if w.cleaned === ''}
							<span class="ml-1.5 text-[0.7rem] text-amber" style="opacity: {t}" aria-hidden="true">empty</span>
						{/if}
					</li>
				{/each}
				{#if hidden > 0}
					<li class="self-center px-1 text-sm text-muted">+{hidden} more</li>
				{/if}
			</ol>
		</div>
	</div>

	{#snippet notes()}
		<p class="mb-3 text-xs text-muted">What each rule does here</p>
		<ol class="flex flex-col gap-3">
			<li>
				<code class="font-mono text-xs text-text">[^\w\s] → ''</code><br />
				Strips punctuation. Changed {changed} of {enc.words.length} words.
			</li>
			<li>
				<code class="font-mono text-xs text-text">\s+ → ''</code><br />
				No effect: words are already split on whitespace.
			</li>
			<li>
				<code class="font-mono text-xs text-text">/d → ''</code><br />
				Matches the literal text <code class="font-mono">/d</code>, not digits. Rule 1 already removed every
				<code class="font-mono">/</code>, so it never fires and digits survive: <code class="font-mono">10/10</code> →
				<code class="font-mono">1010</code>.
			</li>
		</ol>
	{/snippet}
</Stage>

<style>
	.word {
		display: inline-flex;
		align-items: baseline;
		border: 1px solid var(--color-rule-strong);
		border-radius: 0.375rem;
		padding: 0.2rem 0.5rem;
		font-size: 0.82rem;
		color: var(--color-text);
		background: var(--color-surface);
	}
	.word.changed {
		border-color: rgb(232 161 92 / 0.45);
	}
	.word.empty {
		color: var(--color-muted);
	}
	.removed {
		display: inline-block;
		color: var(--color-amber);
		opacity: calc(1 - var(--t) * 0.8);
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
		transform: translateY(calc(var(--t) * -3px));
		max-width: calc((1 - var(--t)) * 1ch + 0.01ch);
		overflow: hidden;
		vertical-align: bottom;
	}
</style>
