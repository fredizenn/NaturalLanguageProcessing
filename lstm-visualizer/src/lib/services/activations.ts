/**
 * Illustrative activations for the visualization.
 *
 * None of these numbers come from the trained model. They are produced by a
 * tiny randomly-initialised LSTM (16 representative units per layer instead of
 * 256) that runs over the REAL left-padded 500-step sequence. That keeps the
 * mechanics honest: the pad vector really is fed 497 times, layer 1 really feeds
 * layer 2 at every step, and the output really is read at t = 500. Only the
 * values themselves are stand-ins.
 */
import { MODEL } from '#lib/data/model';
import { MOCK_POLARITY } from '#lib/data/vocab';
import type { Encoded } from '#lib/utils/preprocess';
import { clamp, gauss, rng, sigmoid } from '#lib/utils/random';

export const REP_UNITS = 16; // representative units drawn per hidden state
const IN = 16; // representative input dims fed to the mini LSTM

export interface StepState {
	t: number; // 1-based timestep
	id: number;
	word: string | null; // null for padding
	h1: number[];
	c1: number[];
	h2: number[];
	c2: number[];
}

export interface Activations {
	/** 64-d embedding per id that appears in the sequence (including 0). */
	embeddings: Map<number, number[]>;
	/** Mean |h| for every one of the 500 timesteps, both layers. */
	trace1: number[];
	trace2: number[];
	/** Full states at the steps the LSTM panel draws. */
	steps: StepState[];
	finalH: number[]; // h_500 of layer 2 (representative)
	linear: { weights: number[]; contributions: number[]; bias: number; logit: number };
	dropoutMask: boolean[]; // training-mode illustration only
}

const ID_SEED = 0x51ed;
const WEIGHT_SEED = 0x2a17;
const SENTIMENT_DIR = (() => {
	const r = rng(0x7e57);
	return Array.from({ length: MODEL.embeddingDim }, () => gauss(r));
})();

const idToWord = new Map<number, string>();

export function embeddingFor(id: number, word?: string): number[] {
	const r = rng(ID_SEED + id * 7919);
	const pol = word ? (MOCK_POLARITY[word] ?? 0) : 0;
	return Array.from({ length: MODEL.embeddingDim }, (_, i) =>
		clamp(gauss(r) * 0.45 + pol * SENTIMENT_DIR[i] * 0.18, -1, 1)
	);
}

interface Cell {
	W: number[][]; // 4*R x (input + R)
	b: number[]; // 4*R
}

function makeCell(seed: number, input: number, hidden: number): Cell {
	const r = rng(seed);
	const scale = 1 / Math.sqrt(input + hidden);
	const W = Array.from({ length: 4 * hidden }, () =>
		Array.from({ length: input + hidden }, () => gauss(r) * scale * 2.8)
	);
	// PyTorch gate order i, f, g, o. Forget-gate bias nudged up, a common init choice.
	const b = Array.from({ length: 4 * hidden }, (_, k) => (k >= hidden && k < 2 * hidden ? 1 : 0) + gauss(r) * 0.1);
	return { W, b };
}

function stepCell(cell: Cell, x: number[], h: number[], c: number[]): [number[], number[]] {
	const R = h.length;
	const xh = x.concat(h);
	const z = cell.W.map((row, k) => row.reduce((acc, w, j) => acc + w * xh[j], cell.b[k]));
	const hN = new Array<number>(R);
	const cN = new Array<number>(R);
	for (let u = 0; u < R; u++) {
		const i = sigmoid(z[u]);
		const f = sigmoid(z[R + u]);
		const g = Math.tanh(z[2 * R + u]);
		const o = sigmoid(z[3 * R + u]);
		cN[u] = f * c[u] + i * g;
		hN[u] = o * Math.tanh(cN[u]);
	}
	return [hN, cN];
}

const meanAbs = (v: number[]) => v.reduce((a, x) => a + Math.abs(x), 0) / v.length;

export function computeActivations(enc: Encoded, logit: number): Activations {
	const cell1 = makeCell(WEIGHT_SEED, IN, REP_UNITS);
	const cell2 = makeCell(WEIGHT_SEED + 1, REP_UNITS, REP_UNITS);

	enc.lookups.forEach((l) => l.status === 'kept' && idToWord.set(l.id!, l.word));

	const embeddings = new Map<number, number[]>();
	const emb = (id: number) => {
		let e = embeddings.get(id);
		if (!e) {
			e = embeddingFor(id, id === 0 ? undefined : idToWord.get(id));
			embeddings.set(id, e);
		}
		return e;
	};

	let h1 = new Array(REP_UNITS).fill(0);
	let c1 = new Array(REP_UNITS).fill(0);
	let h2 = new Array(REP_UNITS).fill(0);
	let c2 = new Array(REP_UNITS).fill(0);
	const trace1: number[] = [];
	const trace2: number[] = [];
	const steps: StepState[] = [];
	const firstReal = enc.padCount + 1;

	for (let t = 1; t <= MODEL.seqLen; t++) {
		const id = enc.sequence[t - 1];
		const e = emb(id);
		const word = id === 0 ? null : (idToWord.get(id) ?? null);
		const pol = word ? (MOCK_POLARITY[word] ?? 0) : 0;
		const x = e.slice(0, IN).map((v) => v * 1.8);
		x[0] += pol * 1.4;
		[h1, c1] = stepCell(cell1, x, h1, c1);
		[h2, c2] = stepCell(cell2, h1, h2, c2);
		trace1.push(meanAbs(h1));
		trace2.push(meanAbs(h2));
		const keep = t === 1 || t === enc.padCount || t >= firstReal;
		if (keep) steps.push({ t, id, word, h1: [...h1], c1: [...c1], h2: [...h2], c2: [...c2] });
	}

	// Linear readout: pick illustrative weights, then rescale them so that
	// w·h + b equals the logit the predictor reported.
	const r = rng(WEIGHT_SEED + 9);
	const bias = 0.08;
	let weights = h2.map(() => gauss(r));
	const raw = weights.reduce((a, w, i) => a + w * h2[i], 0);
	const target = logit - bias;
	if (Math.abs(raw) > 1e-3) {
		const s = target / raw;
		weights = weights.map((w) => w * s);
	} else {
		weights = h2.map((h) => (Math.abs(h) > 1e-6 ? target / (REP_UNITS * h) : 0));
	}
	const contributions = weights.map((w, i) => w * h2[i]);

	const mr = rng(0xd20b);
	const dropoutMask = Array.from({ length: 32 }, () => mr() >= MODEL.dropout);

	return {
		embeddings,
		trace1,
		trace2,
		steps,
		finalH: h2,
		linear: { weights, contributions, bias, logit },
		dropoutMask
	};
}
