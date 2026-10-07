<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		index: number;
		title: string;
		summary: string;
		code?: string;
		inShape?: string;
		outShape?: string;
		/** computed: derived exactly from the input. illustrative: stand-in values. */
		kind: 'computed' | 'illustrative' | 'mixed';
		children: Snippet;
		notes?: Snippet;
	}

	let { index, title, summary, code, inShape, outShape, kind, children, notes }: Props = $props();

	const kindLabel = {
		computed: 'Computed from your input',
		illustrative: 'Illustrative values',
		mixed: 'Shapes computed, values illustrative'
	};
</script>

<section class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]" aria-labelledby="stage-title">
	<div class="min-w-0">
		<header class="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
			<span class="font-mono text-sm text-muted tabular">{String(index).padStart(2, '0')}</span>
			<h2 id="stage-title" class="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
			<span class="tag tag-{kind === 'computed' ? 'computed' : 'illustrative'}">{kindLabel[kind]}</span>
		</header>
		<p class="mb-8 max-w-[62ch] text-[0.98rem] leading-relaxed text-soft">{summary}</p>
		<div class="min-w-0">
			{@render children()}
		</div>
	</div>

	<aside class="flex min-w-0 flex-col gap-5 lg:border-l lg:border-rule lg:pl-8">
		{#if inShape || outShape}
			<dl class="readout">
				{#if inShape}<dt>Input</dt><dd>{inShape}</dd>{/if}
				{#if outShape}<dt>Output</dt><dd>{outShape}</dd>{/if}
			</dl>
		{/if}
		{#if code}
			<div>
				<p class="mb-2 text-xs text-muted">From the notebook</p>
				<pre class="code-block"><code>{code}</code></pre>
			</div>
		{/if}
		{#if notes}
			<div class="text-sm leading-relaxed text-soft">
				{@render notes()}
			</div>
		{/if}
	</aside>
</section>
