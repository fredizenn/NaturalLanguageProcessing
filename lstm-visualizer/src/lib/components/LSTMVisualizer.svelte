<script lang="ts">
	import Stage from '#lib/components/Pipeline/Stage.svelte';
	import { CODE, MODEL, PARAMS } from '#lib/data/model';
	import type { StepState } from '#lib/services/activations';
	import { pipeline } from '#lib/state/pipeline.svelte';
	import { easeInOut, phase, valueColor } from '#lib/utils/animation';

	type Col =
		| { kind: 'step'; step: StepState; pad: boolean }
		| { kind: 'gap'; label: string; pad: boolean; from: number; to: number };

	const SHOW_TOKENS = 6;
	const r = $derived(pipeline.result!);
	const enc = $derived(r.encoded);
	const act = $derived(r.activations);
	const p = $derived(pipeline.progress);

	const cols = $derived.by<Col[]>(() => {
		const steps = act.steps;
		const out: Col[] = [];
		const pad = enc.padCount;
		const real = steps.filter((s) => s.id !== 0 || s.t > pad);
		const padSteps = steps.filter((s) => s.t <= pad);
		if (pad > 0) {
			out.push({ kind: 'step', step: padSteps[0], pad: true });
			if (pad > 2) out.push({ kind: 'gap', label: `${pad - 2} more pad steps`, pad: true, from: 2, to: pad - 1 });
			if (pad > 1) out.push({ kind: 'step', step: padSteps[padSteps.length - 1], pad: true });
		}
		if (real.length > SHOW_TOKENS) {
			const hidden = real.length - SHOW_TOKENS;
			out.push({ kind: 'gap', label: `${hidden} more word${hidden > 1 ? 's' : ''}`, pad: false, from: real[0].t, to: real[hidden - 1].t });
		}
		for (const s of real.slice(-SHOW_TOKENS)) out.push({ kind: 'step', step: s, pad: false });
		return out;
	});

	// geometry
	const W = 1000;
	const LEFT = 92;
	const RIGHT = 150;
	const Y2 = 92;
	const Y1 = 222;
	const YX = 338;
	const CW = 70;
	const CH = 58;
	const xs = $derived(cols.map((_, i) => LEFT + (cols.length === 1 ? 0.5 : i / (cols.length - 1)) * (W - LEFT - RIGHT - CW) + CW / 2));

	// timeline: padding columns pass quickly, real words slowly
	const weights = $derived(cols.map((c) => (c.pad ? 0.45 : c.kind === 'gap' ? 0.7 : 1)));
	const starts = $derived.by(() => {
		const total = weights.reduce((a, b) => a + b, 0);
		let acc = 0;
		return weights.map((w) => {
			const s = (acc / total) * 0.86;
			acc += w;
			return s;
		});
	});
	const spanOf = (i: number) => (i + 1 < starts.length ? starts[i + 1] : 0.86) - starts[i];
	/** 0..1 activation of column i in layer `layer` */
	const lit = (i: number, layer: 1 | 2) => {
		const s = starts[i];
		const d = spanOf(i);
		return layer === 1 ? phase(p, s, s + d * 0.55) : phase(p, s + d * 0.45, s + d);
	};
	const outputIn = $derived(easeInOut(phase(p, 0.86, 1)));

	// front position for the travelling pulse
	const front = $derived.by(() => {
		for (let i = 0; i < cols.length; i++) {
			const s = starts[i];
			const e = s + spanOf(i);
			if (p < e) return { i, f: phase(p, s, e) };
		}
		return { i: cols.length - 1, f: 1 };
	});

	let selected = $state<number | null>(null);
	const focusIndex = $derived(selected ?? front.i);
	const focusCol = $derived(cols[Math.min(focusIndex, cols.length - 1)]);

	const bars = (v: number[], n = 8) => v.slice(0, n);
	// display scaling: bar sizes are relative to the largest value drawn for that kind of state
	const hMax = $derived(Math.max(0.05, ...act.steps.flatMap((s) => [...s.h1, ...s.h2].map(Math.abs))));
	const cMax = $derived(Math.max(0.05, ...act.steps.flatMap((s) => [...s.c1, ...s.c2].map(Math.abs))));
	const label = (c: Col) => (c.kind === 'gap' ? '' : c.step.word ?? 'pad');

	// 500-step trace
	const TW = 1000;
	const TH = 64;
	const traceMax = $derived(Math.max(...act.trace1, ...act.trace2));
	const traceMin = $derived(Math.min(...act.trace1, ...act.trace2));
	const tracePath = (vals: number[]) =>
		vals
			.map((v, k) => `${k === 0 ? 'M' : 'L'}${((k + 0.5) / vals.length) * TW},${TH - 4 - ((v - traceMin) / Math.max(1e-6, traceMax - traceMin)) * (TH - 10)}`)
			.join('');
	const playheadT = $derived.by(() => {
		const c = cols[front.i];
		if (!c) return MODEL.seqLen;
		if (c.kind === 'step') return c.step.t;
		return c.from + (c.to - c.from) * front.f;
	});
</script>

<Stage
	index={5}
	title="Two stacked LSTM layers"
	summary="The LSTM reads the 500 vectors one timestep at a time. Each layer carries two states forward: a hidden state h and a cell state c. At every step, layer 1's h becomes layer 2's input. Only layer 2's hidden state at t = 500 moves on to the classifier."
	code={CODE.lstm}
	inShape="[500, 64]"
	outShape="h₅₀₀ [256]"
	kind="illustrative"
>
	<div class="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
		<svg viewBox="0 0 {W} 400" class="block w-full min-w-[46rem]" role="img"
			aria-label="Unrolled two-layer LSTM over 500 timesteps. Layer 1 receives the embedding at each step; layer 2 receives layer 1's hidden state. Both pass h and c to the next step. The final layer-2 hidden state at t = 500 is the output.">
			<defs>
				<marker id="arr-h" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
					<path d="M0 0L8 4L0 8z" fill="var(--color-signal)" />
				</marker>
				<marker id="arr-c" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
					<path d="M0 0L8 4L0 8z" fill="var(--color-memory)" />
				</marker>
				<marker id="arr-dim" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
					<path d="M0 0L8 4L0 8z" fill="var(--color-rule-strong)" />
				</marker>
				<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="4" />
				</filter>
			</defs>

			<!-- row labels -->
			<text x="0" y={Y2 + 4} class="row-label">Layer 2</text>
			<text x="0" y={Y2 + 20} class="row-sub">h, c ∈ ℝ²⁵⁶</text>
			<text x="0" y={Y1 + 4} class="row-label">Layer 1</text>
			<text x="0" y={Y1 + 20} class="row-sub">h, c ∈ ℝ²⁵⁶</text>
			<text x="0" y={YX + 4} class="row-label">Input xₜ</text>
			<text x="0" y={YX + 20} class="row-sub">ℝ⁶⁴</text>

			<!-- initial state -->
			{#each [Y2, Y1] as y (y)}
				<text x={xs[0] - CW / 2 - 8} y={y - CH / 2 - 8} class="tiny" text-anchor="end">h₀, c₀ = 0</text>
			{/each}

			{#each cols as col, i (i)}
				{@const x = xs[i]}
				{@const l1 = lit(i, 1)}
				{@const l2 = lit(i, 2)}
				{@const next = xs[i + 1]}

				<!-- recurrent connections to the next column -->
				{#if next !== undefined}
					{#each [{ y: Y2, a: lit(i + 1, 2) }, { y: Y1, a: lit(i + 1, 1) }] as row (row.y)}
						{@const dashed = col.kind === 'gap' || cols[i + 1].kind === 'gap'}
						<line x1={x + CW / 2} x2={next - CW / 2 - 2} y1={row.y - 12} y2={row.y - 12}
							stroke={row.a > 0 ? 'var(--color-memory)' : 'var(--color-rule-strong)'}
							stroke-opacity={0.35 + 0.65 * row.a} stroke-width="1.5"
							stroke-dasharray={dashed ? '3 4' : undefined}
							marker-end={row.a > 0 ? 'url(#arr-c)' : 'url(#arr-dim)'} />
						<line x1={x + CW / 2} x2={next - CW / 2 - 2} y1={row.y + 12} y2={row.y + 12}
							stroke={row.a > 0 ? 'var(--color-signal)' : 'var(--color-rule-strong)'}
							stroke-opacity={0.35 + 0.65 * row.a} stroke-width="1.5"
							stroke-dasharray={dashed ? '3 4' : undefined}
							marker-end={row.a > 0 ? 'url(#arr-h)' : 'url(#arr-dim)'} />
					{/each}
				{/if}

				{#if col.kind === 'gap'}
					{#each [Y2, Y1] as y (y)}
						<text x={x} y={y + 5} text-anchor="middle" class="gap-dots" opacity={0.4 + 0.6 * (y === Y2 ? l2 : l1)}>• • •</text>
					{/each}
					<text x={x} y={YX - 4} text-anchor="middle" class="tiny">{col.label}</text>
					<text x={x} y={YX + 12} text-anchor="middle" class="tiny mono">t={col.from}…{col.to}</text>
				{:else}
					{@const s = col.step}
					{@const emb = act.embeddings.get(s.id) ?? []}
					<!-- input -->
					<g opacity={0.35 + 0.65 * l1}>
						{#each bars(emb) as v, k (k)}
							<rect x={x - 24 + k * 6} y={YX - 22} width="5" height="8" rx="1" fill={valueColor(v, 0.9)} />
						{/each}
						<text x={x} y={YX + 2} text-anchor="middle" class="tok" class:pad-tok={s.id === 0}>{label(col)}</text>
						<text x={x} y={YX + 17} text-anchor="middle" class="tiny mono">t={s.t}</text>
					</g>
					<line x1={x} x2={x} y1={YX - 26} y2={Y1 + CH / 2 + 4} stroke={l1 > 0 ? 'var(--color-soft)' : 'var(--color-rule-strong)'} stroke-width="1.2" marker-end="url(#arr-dim)" />
					<!-- layer 1 -> layer 2 : h only -->
					<line x1={x} x2={x} y1={Y1 - CH / 2} y2={Y2 + CH / 2 + 4} stroke={l2 > 0 ? 'var(--color-signal)' : 'var(--color-rule-strong)'} stroke-width="1.5" marker-end={l2 > 0 ? 'url(#arr-h)' : 'url(#arr-dim)'} />
					<text x={x + 5} y={(Y1 + Y2) / 2 + 4} class="tiny" fill="var(--color-signal)" opacity={l2}>h⁽¹⁾</text>

					{#each [{ y: Y2, a: l2, h: s.h2, c: s.c2 }, { y: Y1, a: l1, h: s.h1, c: s.c1 }] as cell (cell.y)}
						<g
							role="button"
							tabindex="0"
							aria-label="Timestep {s.t}, {label(col)}: show states"
							class="cell"
							onclick={() => (selected = i)}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (selected = i))}
						>
							<rect x={x - CW / 2} y={cell.y - CH / 2} width={CW} height={CH} rx="8"
								fill="var(--color-surface)"
								stroke={focusIndex === i && cell.a > 0 ? 'var(--color-text)' : cell.a > 0 ? 'var(--color-signal)' : 'var(--color-rule-strong)'}
								stroke-opacity={0.4 + 0.6 * cell.a} />
							<!-- c: violet ticks -->
							{#each bars(cell.c) as v, k (k)}
								<rect x={x - 25 + k * 6.4} y={cell.y - 19} width="4.6" height="4.6" rx="1"
									fill="var(--color-memory)" opacity={(0.12 + 0.88 * Math.abs(v) / cMax) * cell.a} />
							{/each}
							<!-- h: signed bars -->
							<line x1={x - 26} x2={x + 26} y1={cell.y + 8} y2={cell.y + 8} stroke="var(--color-rule-strong)" />
							{#each bars(cell.h) as v, k (k)}
								{@const hgt = Math.max(0.8, (Math.abs(v) / hMax) * 15) * cell.a}
								<rect x={x - 25 + k * 6.4} y={v >= 0 ? cell.y + 8 - hgt : cell.y + 8} width="4.6" height={hgt} rx="1"
									fill={v >= 0 ? 'var(--color-signal)' : 'var(--color-amber)'} />
							{/each}
						</g>
					{/each}
				{/if}
			{/each}

			<!-- travelling pulse -->
			{#if p > 0 && p < 0.86}
				{@const fx = xs[front.i] - CW / 2 + front.f * CW}
				<circle cx={fx} cy={Y1 + 12} r="5" fill="var(--color-signal)" filter="url(#glow)" />
				<circle cx={fx} cy={Y1 + 12} r="2.5" fill="var(--color-text)" />
				<circle cx={fx - 10} cy={Y2 + 12} r="5" fill="var(--color-signal)" filter="url(#glow)" opacity="0.8" />
				<circle cx={fx - 10} cy={Y2 + 12} r="2.5" fill="var(--color-text)" opacity="0.8" />
			{/if}

			<!-- output -->
			{#if cols.length}
				{@const lx = xs[xs.length - 1] + CW / 2}
				<g opacity={0.25 + 0.75 * outputIn}>
					<line x1={lx} x2={W - 104} y1={Y2 + 12} y2={Y2 + 12} stroke="var(--color-signal)" stroke-width="2" marker-end="url(#arr-h)" />
					<rect x={W - 100} y={Y2 - 26} width="100" height="64" rx="10" fill="rgb(79 209 255 / 0.08)" stroke="var(--color-signal)" />
					<text x={W - 50} y={Y2 - 4} text-anchor="middle" class="out-title">h₅₀₀</text>
					<text x={W - 50} y={Y2 + 13} text-anchor="middle" class="tiny">layer 2</text>
					<text x={W - 50} y={Y2 + 28} text-anchor="middle" class="tiny mono">[256]</text>
					<text x={W - 50} y={Y2 + 62} text-anchor="middle" class="tiny">to dropout</text>
					<text x={W - 50} y={Y2 + 76} text-anchor="middle" class="tiny">→ linear</text>
				</g>
				<text x={lx + 10} y={Y1 + 4} class="tiny">h⁽¹⁾₅₀₀, c₅₀₀</text>
				<text x={lx + 10} y={Y1 + 18} class="tiny">discarded</text>
			{/if}
		</svg>
	</div>

	<!-- legend -->
	<div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
		<span class="flex items-center gap-2"><span class="h-0.5 w-5 bg-signal"></span>hidden state h (bars: sign and size)</span>
		<span class="flex items-center gap-2"><span class="h-0.5 w-5 bg-memory"></span>cell state c (squares: magnitude)</span>
		<span>8 of 256 units drawn per state, scaled for display</span>
	</div>

	<!-- full 500 step trace -->
	<figure class="mt-8">
		<figcaption class="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted">
			<span>All 500 steps · mean |h| per step</span>
			<span class="flex gap-4">
				<span class="flex items-center gap-1.5"><span class="h-0.5 w-4 bg-soft"></span>layer 1</span>
				<span class="flex items-center gap-1.5"><span class="h-0.5 w-4 bg-signal"></span>layer 2</span>
			</span>
		</figcaption>
		<svg viewBox="0 0 {TW} {TH}" preserveAspectRatio="none" class="block h-16 w-full" role="img"
			aria-label="Mean absolute hidden activation across all 500 timesteps; it settles during the padding run and moves when real words arrive.">
			<rect x="0" y="0" width={(enc.padCount / MODEL.seqLen) * TW} height={TH} fill="var(--color-surface)" />
			<path d={tracePath(act.trace1)} fill="none" stroke="var(--color-soft)" stroke-width="1.25" vector-effect="non-scaling-stroke" opacity="0.7" />
			<path d={tracePath(act.trace2)} fill="none" stroke="var(--color-signal)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
			<line x1={(playheadT / MODEL.seqLen) * TW} x2={(playheadT / MODEL.seqLen) * TW} y1="0" y2={TH} stroke="var(--color-text)" stroke-width="1" vector-effect="non-scaling-stroke" opacity={p > 0 && p < 1 ? 0.8 : 0} />
		</svg>
		<div class="mt-1 flex justify-between font-mono text-[0.68rem] text-muted">
			<span>t=1</span>
			{#if enc.padCount > 0 && enc.padCount < MODEL.seqLen}<span>padding ends at t={enc.padCount}</span>{/if}
			<span>t=500</span>
		</div>
	</figure>

	<!-- state readout -->
	{#if focusCol && focusCol.kind === 'step'}
		{@const s = focusCol.step}
		<div class="mt-8 rounded-xl border border-rule bg-surface p-5">
			<div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
				<p class="text-sm">
					<span class="font-mono text-muted">t = {s.t}</span>
					<span class="ml-2 font-mono text-text">{s.word ?? 'pad'}</span>
				</p>
				<p class="text-xs text-muted">
					{selected === null ? 'Following the playhead. Click any cell to inspect it.' : 'Pinned.'}
					{#if selected !== null}
						<button type="button" class="ml-2 text-signal underline underline-offset-2" onclick={() => (selected = null)}>Follow playhead</button>
					{/if}
				</p>
			</div>
			<div class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
				{#each [{ name: 'h⁽²⁾', v: s.h2, c: false }, { name: 'c⁽²⁾', v: s.c2, c: true }, { name: 'h⁽¹⁾', v: s.h1, c: false }, { name: 'c⁽¹⁾', v: s.c1, c: true }] as st (st.name)}
					<div class="flex items-center gap-3">
						<span class="w-8 font-mono text-sm text-soft">{st.name}</span>
						<svg viewBox="0 0 160 24" class="h-6 flex-1" aria-label="{st.name}: 16 of 256 units">
							<line x1="0" x2="160" y1="12" y2="12" stroke="var(--color-rule-strong)" />
							{#each st.v as v, k (k)}
								{@const hh = Math.max(0.6, (Math.abs(v) / Math.max(1e-6, ...st.v.map(Math.abs))) * 11)}
								<rect x={k * 10 + 1.5} y={v >= 0 ? 12 - hh : 12} width="7" height={hh} rx="1"
									fill={st.c ? 'var(--color-memory)' : v >= 0 ? 'var(--color-signal)' : 'var(--color-amber)'} />
							{/each}
						</svg>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-xs text-muted">16 of 256 units per state, each row scaled to its largest unit · illustrative values from a small random-weight LSTM run over your real sequence</p>
		</div>
	{/if}

	<details class="mt-6 rounded-xl border border-rule">
		<summary class="cursor-pointer px-5 py-3.5 text-sm font-medium text-soft hover:text-text">Inside one LSTM cell</summary>
		<div class="grid gap-6 border-t border-rule px-5 py-5 md:grid-cols-2">
			<div class="font-mono text-[0.8rem] leading-7 text-soft">
				<p>iₜ = σ(W<sub>ii</sub>xₜ + W<sub>hi</sub>hₜ₋₁ + b<sub>i</sub>)<span class="eq-note">input gate</span></p>
				<p>fₜ = σ(W<sub>if</sub>xₜ + W<sub>hf</sub>hₜ₋₁ + b<sub>f</sub>)<span class="eq-note">forget gate</span></p>
				<p>gₜ = tanh(W<sub>ig</sub>xₜ + W<sub>hg</sub>hₜ₋₁ + b<sub>g</sub>)<span class="eq-note">candidate</span></p>
				<p>oₜ = σ(W<sub>io</sub>xₜ + W<sub>ho</sub>hₜ₋₁ + b<sub>o</sub>)<span class="eq-note">output gate</span></p>
				<p class="mt-2 text-memory">cₜ = fₜ ⊙ cₜ₋₁ + iₜ ⊙ gₜ</p>
				<p class="text-signal">hₜ = oₜ ⊙ tanh(cₜ)</p>
			</div>
			<div class="text-sm leading-relaxed text-soft">
				<p class="mb-3">
					This is the standard LSTM cell that <code class="font-mono">nn.LSTM</code> implements. The forget gate decides
					how much of the cell state to keep, and the output gate decides how much of it to expose as h.
				</p>
				<dl class="readout">
					<dt>Layer 1 input</dt><dd>xₜ ∈ ℝ⁶⁴</dd>
					<dt>Layer 2 input</dt><dd>h⁽¹⁾ₜ ∈ ℝ²⁵⁶</dd>
					<dt>Layer 1 params</dt><dd>{PARAMS.lstm1.toLocaleString('en-US')}</dd>
					<dt>Layer 2 params</dt><dd>{PARAMS.lstm2.toLocaleString('en-US')}</dd>
				</dl>
			</div>
		</div>
	</details>

	{#snippet notes()}
		<dl class="readout mb-5">
			<dt>Input size</dt><dd>64</dd>
			<dt>Hidden size</dt><dd>256</dd>
			<dt>Layers</dt><dd>2</dd>
			<dt>Inter-layer dropout</dt><dd>none</dd>
			<dt>Output</dt><dd>layer 2, t=500</dd>
		</dl>
		<p>
			The notebook passes all 500 outputs through dropout, linear and sigmoid, then keeps only the last one
			(<code class="font-mono">sig_out[:, -1]</code>). That gives the same result as feeding h₅₀₀ alone, which is
			what is drawn here.
		</p>
	{/snippet}
</Stage>

<style>
	.row-label {
		font-size: 14px;
		font-weight: 600;
		fill: var(--color-text);
	}
	.row-sub {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--color-muted);
	}
	.tiny {
		font-size: 11px;
		fill: var(--color-muted);
	}
	.mono {
		font-family: var(--font-mono);
	}
	.tok {
		font-family: var(--font-mono);
		font-size: 13px;
		fill: var(--color-text);
	}
	.pad-tok {
		fill: var(--color-muted);
	}
	.gap-dots {
		font-size: 14px;
		fill: var(--color-soft);
		letter-spacing: 2px;
	}
	.out-title {
		font-size: 16px;
		font-weight: 600;
		fill: var(--color-text);
	}
	.cell {
		cursor: pointer;
		outline: none;
	}
	.cell:focus-visible rect:first-child {
		stroke: var(--color-text);
		stroke-width: 2;
	}
	.eq-note {
		margin-left: 0.75rem;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		color: var(--color-muted);
	}
</style>
