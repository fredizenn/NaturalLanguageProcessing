/**
 * Prediction service.
 *
 * The visualization only depends on the `Predictor` interface. Today it is backed
 * by `MockPredictor`, which runs entirely in the browser and does NOT use the
 * trained weights. A future `ApiPredictor` (e.g. FastAPI + PyTorch serving
 * state_dict.pt) can replace it without touching any component.
 */
import { EXAMPLES } from '#lib/data/examples';
import { MOCK_POLARITY } from '#lib/data/vocab';
import { encode } from '#lib/utils/preprocess';
import { hashString, sigmoid } from '#lib/utils/random';

export interface Prediction {
	probability: number; // P(positive)
	sentiment: 'positive' | 'negative';
	logit?: number; // z before the sigmoid
	/** Where the number came from, so the UI can label it honestly. */
	source: 'illustrative' | 'recorded' | 'model';
}

export interface Predictor {
	predict(text: string): Promise<Prediction>;
}

const toPrediction = (probability: number, source: Prediction['source'], logit?: number): Prediction => ({
	probability,
	sentiment: probability > 0.5 ? 'positive' : 'negative',
	logit,
	source
});

/**
 * Deterministic stand-in scorer.
 *
 * It only looks at the tokens that survive the real preprocessing (so dropped
 * words, including negations, have no effect, as in the real model), weights
 * later tokens slightly more (the model reads its output at the last timestep),
 * and squashes the sum into a logit. Values are illustrative.
 */
export class MockPredictor implements Predictor {
	logitFor(text: string): number {
		const { keptWords } = encode(text);
		const n = keptWords.length;
		let raw = 0;
		keptWords.forEach((w, i) => {
			const weight = 0.6 + 0.4 * ((i + 1) / n);
			raw += (MOCK_POLARITY[w] ?? 0) * weight;
		});
		// small deterministic offset so neutral reviews don't all sit at exactly 0.5
		const jitter = ((hashString(keptWords.join(' ')) % 1000) / 1000 - 0.5) * 0.3;
		return 4.2 * Math.tanh((raw + 0.12 + jitter) / 3.2);
	}

	async predict(text: string): Promise<Prediction> {
		const recorded = EXAMPLES.find((e) => e.recorded && e.text.trim() === text.trim())?.recorded;
		if (recorded) {
			const p = recorded.probability;
			return toPrediction(p, 'recorded', Math.log(p / (1 - p)));
		}
		const z = this.logitFor(text);
		return toPrediction(sigmoid(z), 'illustrative', z);
	}
}

/** Drop-in replacement once an inference API exists. */
export class ApiPredictor implements Predictor {
	constructor(private endpoint: string) {}

	async predict(text: string): Promise<Prediction> {
		const res = await fetch(this.endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text })
		});
		if (!res.ok) throw new Error(`Prediction request failed with status ${res.status}`);
		const body = (await res.json()) as { probability: number; logit?: number };
		return toPrediction(body.probability, 'model', body.logit);
	}
}

export const predictor: Predictor = new MockPredictor();
