# Inside an LSTM sentiment classifier

An interactive visual explainer for a PyTorch **Embedding → 2-layer LSTM → Dropout → Linear → Sigmoid** sentiment classifier trained on IMDB reviews.

Type a review and follow it through every stage: cleaning, vocabulary lookup, left-padding to 500, the embedding table, both LSTM layers unrolled over time, dropout (bypassed at inference), the linear readout and the sigmoid. A second mode walks through the training loop and the logged history of the five training epochs.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build
pnpm preview
pnpm check      # svelte-check (types + a11y)
```

Requires Node 20+ and pnpm.

## Deploy to Vercel

Import the repository in Vercel. No settings are needed: the project uses `@sveltejs/adapter-vercel`, and the single page is prerendered as static HTML.

Before deploying, set your repository link in `src/lib/data/site.ts` (`SOURCE_URL`). It drives the **View source** button and the footer link.

## What is real and what is illustrative

| | |
|---|---|
| **Computed from the input** | Lowercasing and splitting, the notebook's three cleaning regexes (applied per word), stopword and vocabulary filtering, left-padding / truncation to 500, every tensor shape. Ported in `src/lib/utils/preprocess.ts`. |
| **From the notebook** | Architecture, hyperparameters, parameter counts and the 5-epoch training history (`src/lib/data/model.ts`, `src/lib/data/training.ts`), plus the one recorded prediction (0.7083 for review #30). |
| **Illustrative** | Word IDs (a ~380-word stand-in vocabulary in approximate IMDB frequency order), embedding values, LSTM states, the logit and the probability. The LSTM states come from a small random-weight LSTM (16 units) run over the real padded sequence, so the mechanics are honest even though the values are not the trained ones. |

The UI labels each stage accordingly.

## Project layout

```
src/
├── lib/
│   ├── components/
│   │   ├── Pipeline/            # rail of stages, stage frame, connectors
│   │   ├── CleaningStage.svelte
│   │   ├── VocabularyMap.svelte
│   │   ├── PaddingSequence.svelte
│   │   ├── EmbeddingVisualizer.svelte
│   │   ├── LSTMVisualizer.svelte
│   │   ├── DropoutVisualizer.svelte
│   │   ├── LinearVisualizer.svelte
│   │   ├── SigmoidVisualizer.svelte
│   │   ├── PredictionResult.svelte
│   │   ├── TrainingMode.svelte
│   │   ├── TrainingCharts.svelte
│   │   └── ArchitecturePanel.svelte
│   ├── data/                    # ground-truth constants, examples, vocabulary
│   ├── services/
│   │   ├── predictor.ts         # Predictor interface, MockPredictor, ApiPredictor
│   │   └── activations.ts       # illustrative activations
│   ├── state/pipeline.svelte.ts # single source of truth for stage, progress, mode
│   └── utils/                   # preprocessing port, animation helpers, seeded RNG
└── routes/+page.svelte
```

All components read from the central `pipeline` state; the timeline is a single `requestAnimationFrame` loop that advances `stage` and `progress`.

## Connecting the real model later

The visualization only depends on the `Predictor` interface in `src/lib/services/predictor.ts`:

```ts
interface Predictor {
  predict(text: string): Promise<Prediction>; // { probability, sentiment, logit?, source }
}
```

To use a FastAPI + PyTorch backend that serves `state_dict.pt`, replace the exported instance:

```ts
export const predictor: Predictor = new ApiPredictor('https://your-api.example.com/predict');
```

`ApiPredictor` expects `{ "probability": number, "logit"?: number }` back. Results from it are labelled "Trained model output". Intermediate activations remain illustrative unless the API also returns them.

## Notes

- Built on SvelteKit 3, which configures the kit through `vite.config.ts` and uses `#lib/...` (Node subpath imports in `package.json`) in place of the old `$lib` alias.
- Respects `prefers-reduced-motion`: stages step through without animation.
- The notebook's quirks are documented rather than fixed: the `/d` regex never matches (so digits survive), `<br />` becomes the token `br`, and `not`/`no` are removed as stopwords.
