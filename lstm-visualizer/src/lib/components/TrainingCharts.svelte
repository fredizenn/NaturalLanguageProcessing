<script lang="ts">
	import { BEST_EPOCH, HISTORY } from '#lib/data/training';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import TrainingChart from './TrainingChart.svelte';
</script>

<section aria-labelledby="training-title">
	<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 id="training-title" class="text-2xl font-semibold tracking-tight">Training history</h2>
			<p class="mt-2 max-w-[62ch] text-sm leading-relaxed text-soft">
				Five epochs, as logged by the notebook. Validation loss bottoms out at epoch {BEST_EPOCH}, which is the
				checkpoint saved to <code class="font-mono">state_dict.pt</code>. In epoch 5 training loss keeps falling while
				validation loss rises, the first sign of overfitting.
			</p>
		</div>
		<div class="flex items-center gap-5 text-xs text-soft" aria-hidden="true">
			<span class="flex items-center gap-2"><svg width="22" height="10"><line x1="0" x2="22" y1="5" y2="5" stroke="var(--color-signal)" stroke-width="2" /><circle cx="11" cy="5" r="3.5" fill="var(--color-signal)" /></svg>train</span>
			<span class="flex items-center gap-2"><svg width="22" height="10"><line x1="0" x2="22" y1="5" y2="5" stroke="var(--color-memory)" stroke-width="2" stroke-dasharray="5 3" /><rect x="8" y="2" width="6" height="6" fill="var(--color-memory)" transform="rotate(45 11 5)" /></svg>validation</span>
		</div>
	</div>

	<div class="grid gap-10 md:grid-cols-2">
		<TrainingChart
			title="Accuracy"
			train={(e) => e.trainAcc}
			val={(e) => e.valAcc}
			domain={[65, 92]}
			ticks={[70, 75, 80, 85, 90]}
			format={(v) => v.toFixed(1)}
			unit="%"
		/>
		<TrainingChart
			title="Loss (BCE)"
			train={(e) => e.trainLoss}
			val={(e) => e.valLoss}
			domain={[0.24, 0.6]}
			ticks={[0.3, 0.4, 0.5, 0.6]}
			format={(v) => v.toFixed(3)}
		/>
	</div>

	<details class="mt-8 rounded-xl border border-rule">
		<summary class="cursor-pointer px-5 py-3.5 text-sm font-medium text-soft hover:text-text">Show as table</summary>
		<div class="overflow-x-auto border-t border-rule">
			<table class="w-full min-w-[34rem] text-sm">
				<thead class="text-left text-muted">
					<tr>
						<th class="px-5 py-2.5 font-medium">Epoch</th>
						<th class="px-3 py-2.5 text-right font-medium">Train acc</th>
						<th class="px-3 py-2.5 text-right font-medium">Val acc</th>
						<th class="px-3 py-2.5 text-right font-medium">Train loss</th>
						<th class="px-3 py-2.5 text-right font-medium">Val loss</th>
						<th class="px-5 py-2.5 font-medium">Checkpoint</th>
					</tr>
				</thead>
				<tbody class="font-mono tabular">
					{#each HISTORY as e (e.epoch)}
						<tr class="border-t border-rule" class:bg-surface={e.epoch === pipeline.selectedEpoch}>
							<td class="px-5 py-2.5">{e.epoch}</td>
							<td class="px-3 py-2.5 text-right">{e.trainAcc.toFixed(2)}%</td>
							<td class="px-3 py-2.5 text-right">{e.valAcc.toFixed(2)}%</td>
							<td class="px-3 py-2.5 text-right">{e.trainLoss.toFixed(4)}</td>
							<td class="px-3 py-2.5 text-right">{e.valLoss.toFixed(4)}</td>
							<td class="px-5 py-2.5 font-sans text-soft">
								{e.epoch === BEST_EPOCH ? 'saved, final' : e.saved ? 'saved, later replaced' : 'not saved'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</section>
