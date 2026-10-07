<script lang="ts">
	interface Props {
		/** 0 = not reached, 1 = data has passed through */
		fill: number;
	}
	let { fill }: Props = $props();
</script>

<div class="connector" aria-hidden="true">
	<div class="track"></div>
	<div class="fill" style="--fill: {fill}"></div>
</div>

<style>
	.connector {
		position: relative;
		flex: 1 1 0;
	}
	.track,
	.fill {
		position: absolute;
		border-radius: 1px;
	}
	/* vertical by default (mobile list) */
	.connector {
		width: 1px;
		min-height: 0.9rem;
		margin-left: 1.05rem;
	}
	.track {
		inset: 0;
		background: var(--color-rule-strong);
	}
	.fill {
		inset: 0;
		background: var(--color-signal);
		transform-origin: top;
		transform: scaleY(var(--fill));
		transition: transform 300ms ease-out;
	}
	@media (min-width: 1024px) {
		.connector {
			width: auto;
			height: 1px;
			min-height: 0;
			min-width: 0.75rem;
			margin: 1.05rem 0 0;
		}
		.fill {
			transform-origin: left;
			transform: scaleX(var(--fill));
		}
	}
</style>
