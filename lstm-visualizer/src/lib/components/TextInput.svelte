<script lang="ts">
	import { EXAMPLES } from '#lib/data/examples';
	import { pipeline } from '#lib/state/pipeline.svelte';

	const activeExample = $derived(EXAMPLES.find((e) => e.text === pipeline.input));

	function load(text: string) {
		pipeline.input = text;
		pipeline.run();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			pipeline.run();
		}
	}
</script>

<form
	class="flex flex-col gap-4"
	onsubmit={(e) => {
		e.preventDefault();
		pipeline.run();
	}}
>
	<label for="review" class="text-sm font-medium text-soft">Your review</label>
	<div class="rounded-xl border border-rule-strong bg-surface transition-colors focus-within:border-signal/70">
		<textarea
			id="review"
			bind:value={pipeline.input}
			{onkeydown}
			rows="4"
			placeholder="Enter a review…"
			class="block max-h-64 min-h-28 w-full resize-y bg-transparent px-4 pt-3.5 pb-2 text-[1.02rem] leading-relaxed text-text outline-none placeholder:text-muted"
			aria-describedby="review-hint"
		></textarea>
		<div class="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-3 py-2.5">
			<span id="review-hint" class="pl-1 text-xs text-muted">
				{pipeline.input.trim().split(/\s+/).filter(Boolean).length} words · Ctrl + Enter to run
			</span>
			<button type="submit" class="btn btn-primary">
				{pipeline.stale || !pipeline.result ? 'Run model' : 'Run again'}
			</button>
		</div>
	</div>

	{#if pipeline.error}
		<p class="text-sm text-amber" role="alert">{pipeline.error}</p>
	{/if}

	<div>
		<p id="examples-label" class="mb-2 text-sm text-muted">Load an example</p>
		<ul class="flex flex-wrap gap-2" aria-labelledby="examples-label">
			{#each EXAMPLES as ex (ex.id)}
				<li>
					<button
						type="button"
						class={['btn chip', activeExample?.id === ex.id && 'chip-active']}
						aria-pressed={activeExample?.id === ex.id}
						onclick={() => load(ex.text)}
					>
						{ex.label}
					</button>
				</li>
			{/each}
		</ul>
		{#if activeExample}
			<p class="mt-3 text-sm text-soft">{activeExample.note}</p>
		{/if}
	</div>
</form>
