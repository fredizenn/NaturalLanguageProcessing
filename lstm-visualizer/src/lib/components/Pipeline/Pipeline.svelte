<script lang="ts">
	import { pipeline, STAGES } from '#lib/state/pipeline.svelte';
	import StageConnector from './StageConnector.svelte';

	const current = $derived(pipeline.stageIndex);
	const r = $derived(pipeline.result);

	function status(i: number) {
		if (current < 0) return 'upcoming';
		if (i < current) return 'done';
		if (i === current) return 'active';
		return 'upcoming';
	}
</script>

<nav aria-label="Model pipeline stages">
	<ol class="flex flex-col lg:flex-row lg:items-start">
		<li class="flex flex-col lg:flex-1 lg:flex-row">
			<div class="node" data-status={r ? 'done' : 'upcoming'}>
				<span class="dot" aria-hidden="true"></span>
				<span class="label">
					<span class="name">Review</span>
					<span class="shape">{r ? `${r.text.trim().length} chars` : 'text'}</span>
				</span>
			</div>
			<StageConnector fill={current >= 0 ? 1 : 0} />
		</li>
		{#each STAGES as stage, i (stage.id)}
			{@const s = status(i)}
			<li class={['flex flex-col lg:flex-row', i < STAGES.length - 1 && 'lg:flex-1']}>
				<button
					type="button"
					class="node"
					data-status={s}
					disabled={!r}
					aria-current={s === 'active' ? 'step' : undefined}
					onclick={() => pipeline.goTo(stage.id)}
				>
					<span class="dot" aria-hidden="true">
						{#if s === 'active'}
							<svg viewBox="0 0 24 24" class="progress-ring">
								<circle cx="12" cy="12" r="10.5" pathLength="1" style="stroke-dashoffset: {1 - pipeline.progress}" />
							</svg>
						{/if}
					</span>
					<span class="label">
						<span class="name">{stage.name}</span>
						<span class="shape">
							{#if stage.id === 'dropout' && pipeline.mode === 'explore'}
								bypassed
							{:else}
								{stage.shape(r)}
							{/if}
						</span>
					</span>
					<span class="sr-only">
						{s === 'done' ? '(completed)' : s === 'active' ? '(current stage)' : ''}
					</span>
				</button>
				{#if i < STAGES.length - 1}
					<StageConnector fill={i < current ? 1 : i === current ? pipeline.progress : 0} />
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.node {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: none;
		border: 0;
		padding: 0.15rem 0;
		color: inherit;
		text-align: left;
		cursor: pointer;
		font: inherit;
		flex-shrink: 0;
	}
	.node:disabled {
		cursor: default;
	}
	@media (min-width: 1024px) {
		.node {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.65rem;
			padding: 0 0.6rem 0 0;
		}
	}

	.dot {
		position: relative;
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		flex-shrink: 0;
	}
	.dot::before {
		content: '';
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 999px;
		border: 1px solid var(--color-rule-strong);
		background: var(--color-ink);
		transition:
			background-color 200ms,
			border-color 200ms,
			box-shadow 200ms;
	}
	[data-status='done'] .dot::before {
		background: var(--color-signal);
		border-color: var(--color-signal);
	}
	[data-status='active'] .dot::before {
		background: var(--color-signal);
		border-color: var(--color-signal);
		box-shadow: 0 0 0 4px rgb(79 209 255 / 0.15), 0 0 18px rgb(79 209 255 / 0.45);
	}
	.progress-ring {
		position: absolute;
		inset: 0;
		transform: rotate(-90deg);
	}
	.progress-ring circle {
		fill: none;
		stroke: var(--color-signal);
		stroke-width: 1.25;
		stroke-dasharray: 1;
		opacity: 0.6;
	}

	.label {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		min-width: 0;
	}
	@media (min-width: 1024px) {
		.label {
			flex-direction: column;
			gap: 0.15rem;
		}
	}
	.name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-muted);
		white-space: nowrap;
		transition: color 200ms;
	}
	[data-status='done'] .name {
		color: var(--color-soft);
	}
	[data-status='active'] .name {
		color: var(--color-text);
	}
	.node:not(:disabled):hover .name {
		color: var(--color-text);
	}
	.shape {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--color-muted);
		white-space: nowrap;
	}
	[data-status='active'] .shape {
		color: var(--color-signal);
	}
</style>
