<script lang="ts">
	import { valueColor } from '#lib/utils/animation';

	interface Props {
		units: number[]; // 32 representative values
		mask?: boolean[]; // true = kept
		scale?: number;
		label: string;
		small?: boolean;
		/** 0..1, how far the mask has been applied (for animation) */
		apply?: number;
	}
	let { units, mask, scale = 1, label, small = false, apply = 1 }: Props = $props();

	const size = $derived(small ? 12 : 16);
	const gap = $derived(small ? 4 : 5);
	const W = $derived(8 * size + 7 * gap);
	const H = $derived(4 * size + 3 * gap);
	const dropped = $derived(mask ? mask.filter((m) => !m).length : 0);
</script>

<div class="flex flex-col gap-2">
	<svg width={W} height={H} viewBox="0 0 {W} {H}" role="img"
		aria-label="{label}: 32 representative units of 256{mask ? `, ${dropped} zeroed` : ''}">
		{#each units.slice(0, 32) as v, k (k)}
			{@const x = (k % 8) * (size + gap)}
			{@const y = Math.floor(k / 8) * (size + gap)}
			{@const off = mask ? !mask[k] : false}
			{#if off}
				<rect {x} {y} width={size} height={size} rx="3" fill="var(--color-ink)" stroke="var(--color-rule-strong)" />
			{/if}
			<rect {x} {y} width={size} height={size} rx="3"
				fill={valueColor(v * (mask && !off ? 1 + (scale - 1) * apply : 1), 1)}
				opacity={off ? 1 - apply : 1} />
			{#if off}
				<path d="M{x + 3} {y + 3}L{x + size - 3} {y + size - 3}M{x + size - 3} {y + 3}L{x + 3} {y + size - 3}"
					stroke="var(--color-amber)" stroke-width="1.3" opacity={apply} />
			{/if}
		{/each}
	</svg>
	<span class="font-mono text-xs text-muted">{label}</span>
</div>
