<script lang="ts">
	import { pipeline, STAGES } from '#lib/state/pipeline.svelte';

	const idx = $derived(pipeline.stageIndex);
	const has = $derived(pipeline.result !== null);
</script>

<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Playback">
	<button type="button" class="btn btn-icon" onclick={() => pipeline.step(-1)} disabled={!has || idx <= 0} aria-label="Previous stage">
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>
	</button>
	<button type="button" class="btn" onclick={() => pipeline.toggle()} disabled={!has || pipeline.finished} aria-label={pipeline.playing ? 'Pause' : 'Play'}>
		{#if pipeline.playing}
			<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="2" width="3" height="10" rx="0.5" fill="currentColor" /><rect x="8.5" y="2" width="3" height="10" rx="0.5" fill="currentColor" /></svg>
			Pause
		{:else}
			<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 2l8 5-8 5z" fill="currentColor" /></svg>
			Play
		{/if}
	</button>
	<button type="button" class="btn btn-icon" onclick={() => pipeline.step(1)} disabled={!has || idx >= STAGES.length - 1} aria-label="Next stage">
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>
	</button>
	<span class="mx-1 h-5 w-px bg-rule-strong" aria-hidden="true"></span>
	<button type="button" class="btn" onclick={() => pipeline.replay()} disabled={!has}>Replay</button>
	<button type="button" class="btn" onclick={() => pipeline.skip()} disabled={!has || pipeline.finished}>Skip to result</button>
</div>
