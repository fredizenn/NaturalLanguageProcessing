/**
 * Central state for the visualization. Components read `pipeline.stage`,
 * `pipeline.progress` (0..1 within the current stage) and `pipeline.result`,
 * and never drive each other directly.
 */
import { DEFAULT_EXAMPLE } from '#lib/data/examples';
import { computeActivations, type Activations } from '#lib/services/activations';
import { predictor, type Prediction } from '#lib/services/predictor';
import { encode, type Encoded } from '#lib/utils/preprocess';

export type PipelineStage =
	| 'idle'
	| 'clean'
	| 'vocabulary'
	| 'padding'
	| 'embedding'
	| 'lstm'
	| 'dropout'
	| 'linear'
	| 'sigmoid'
	| 'result';

export type Mode = 'explore' | 'training';

export interface StageMeta {
	id: Exclude<PipelineStage, 'idle'>;
	name: string;
	/** Output tensor shape after this stage (batch dimension omitted). */
	shape: (r: PipelineResult | null) => string;
	duration: number; // ms at normal speed
}

export const STAGES: StageMeta[] = [
	{ id: 'clean', name: 'Clean', shape: (r) => (r ? `${r.encoded.words.length} words` : 'words'), duration: 2600 },
	{ id: 'vocabulary', name: 'Vocabulary', shape: (r) => (r ? `${r.encoded.ids.length} ids` : 'ids'), duration: 3000 },
	{ id: 'padding', name: 'Padding', shape: () => '[500]', duration: 2600 },
	{ id: 'embedding', name: 'Embedding', shape: () => '[500, 64]', duration: 2800 },
	{ id: 'lstm', name: 'LSTM × 2', shape: () => '[256]', duration: 6400 },
	{ id: 'dropout', name: 'Dropout', shape: () => '[256]', duration: 2000 },
	{ id: 'linear', name: 'Linear', shape: () => '[1]', duration: 2400 },
	{ id: 'sigmoid', name: 'Sigmoid', shape: () => 'p', duration: 2400 },
	{ id: 'result', name: 'Result', shape: (r) => (r ? (r.prediction.sentiment === 'positive' ? 'positive' : 'negative') : 'label'), duration: 0 }
];

export interface PipelineResult {
	text: string;
	encoded: Encoded;
	prediction: Prediction;
	activations: Activations;
}

const REDUCED_DURATION = 1400;

class PipelineState {
	input = $state(DEFAULT_EXAMPLE.text);
	mode = $state<Mode>('explore');
	stage = $state<PipelineStage>('idle');
	progress = $state(0);
	playing = $state(false);
	/** When true, playback stops at the end of the current stage instead of advancing. */
	hold = $state(false);
	result = $state<PipelineResult | null>(null);
	reducedMotion = $state(false);
	selectedEpoch = $state(4);
	error = $state<string | null>(null);

	#frame = 0;
	#last = 0;
	#elapsed = 0;

	get stageIndex() {
		return STAGES.findIndex((s) => s.id === this.stage);
	}

	get stale() {
		return this.result !== null && this.result.text !== this.input;
	}

	get finished() {
		return this.stage === 'result';
	}

	/** True once the playhead has reached or passed `id`. */
	reached(id: PipelineStage) {
		const target = STAGES.findIndex((s) => s.id === id);
		return this.stageIndex >= target && this.stageIndex >= 0;
	}

	durationOf(id: PipelineStage) {
		const meta = STAGES.find((s) => s.id === id);
		if (!meta) return 0;
		return this.reducedMotion ? Math.min(meta.duration, REDUCED_DURATION) : meta.duration;
	}

	async run() {
		const text = this.input.trim();
		if (!text) {
			this.error = 'Type a review first, or load an example.';
			return;
		}
		this.error = null;
		const encoded = encode(text);
		let prediction: Prediction;
		try {
			prediction = await predictor.predict(text);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Prediction failed.';
			return;
		}
		const activations = computeActivations(encoded, prediction.logit ?? Math.log(prediction.probability / (1 - prediction.probability)));
		this.result = { text: this.input, encoded, prediction, activations };
		this.mode = 'explore';
		this.hold = false;
		this.#enter('clean');
		this.play();
	}

	play() {
		if (!this.result) return;
		if (this.finished) {
			this.replay();
			return;
		}
		this.playing = true;
		this.#last = performance.now();
		cancelAnimationFrame(this.#frame);
		this.#frame = requestAnimationFrame(this.#tick);
	}

	pause() {
		this.playing = false;
		cancelAnimationFrame(this.#frame);
	}

	toggle() {
		if (this.playing) this.pause();
		else {
			this.hold = false;
			this.play();
		}
	}

	replay() {
		if (!this.result) return;
		this.hold = false;
		this.#enter('clean');
		this.play();
	}

	skip() {
		if (!this.result) return;
		this.pause();
		this.stage = 'result';
		this.progress = 1;
	}

	/** Jump to a stage, play it once, then stop there. */
	goTo(id: PipelineStage) {
		if (!this.result) return;
		this.hold = true;
		this.#enter(id);
		if (id === 'result') {
			this.progress = 1;
			this.pause();
			return;
		}
		this.play();
	}

	step(delta: 1 | -1) {
		const next = STAGES[this.stageIndex + delta];
		if (next) this.goTo(next.id);
	}

	#enter(id: PipelineStage) {
		this.stage = id;
		this.#elapsed = 0;
		this.progress = this.reducedMotion ? 1 : 0;
	}

	#tick = (now: number) => {
		if (!this.playing) return;
		const dt = now - this.#last;
		this.#last = now;
		const duration = this.durationOf(this.stage);
		if (duration > 0) {
			// with reduced motion, progress is already 1; time still passes so the reader can follow
			this.#elapsed += dt;
			if (!this.reducedMotion) this.progress = Math.min(1, this.#elapsed / duration);
		}
		if (duration === 0 || this.#elapsed >= duration) {
			this.#elapsed = 0;
			if (this.hold || this.stage === 'result') {
				this.progress = 1;
				this.pause();
				return;
			}
			const next = STAGES[this.stageIndex + 1];
			if (next) this.#enter(next.id);
			if (next?.id === 'result') {
				this.progress = 1;
				this.pause();
				return;
			}
		}
		this.#frame = requestAnimationFrame(this.#tick);
	};
}

export const pipeline = new PipelineState();
