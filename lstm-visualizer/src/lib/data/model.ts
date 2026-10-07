/**
 * Ground-truth facts about the model, taken directly from the training notebook
 * (Sentiment_Analysis_W_PyTorch.ipynb). Every number shown in the UI that claims
 * to describe the real model must come from this file.
 */

export const DATASET = {
	name: 'IMDB movie reviews',
	total: 50_000,
	train: 37_500,
	validation: 12_500,
	split: 'stratified 75 / 25',
	labels: { positive: 1, negative: 0 }
} as const;

export const MODEL = {
	vocabSize: 1000, // top-N most frequent non-stopword tokens
	paddingIndex: 0,
	embeddingRows: 1001, // 1000 words + padding index 0
	seqLen: 500,
	embeddingDim: 64,
	hiddenSize: 256,
	numLayers: 2,
	dropout: 0.3,
	outputDim: 1
} as const;

export const TRAINING = {
	loss: 'BCELoss',
	optimizer: 'Adam',
	learningRate: 0.001,
	batchSize: 50,
	gradClip: 5,
	epochs: 5,
	batchesPerEpoch: DATASET.train / 50, // 750
	bestEpoch: 4
} as const;

/** Parameter counts, derived from the layer shapes (PyTorch layout: W_ih, W_hh, b_ih, b_hh). */
const H = MODEL.hiddenSize;
export const PARAMS = {
	embedding: MODEL.embeddingRows * MODEL.embeddingDim, // 64,064
	lstm1: 4 * H * MODEL.embeddingDim + 4 * H * H + 2 * 4 * H, // 329,728
	lstm2: 4 * H * H + 4 * H * H + 2 * 4 * H, // 526,336
	linear: H * MODEL.outputDim + MODEL.outputDim // 257
};
export const TOTAL_PARAMS = PARAMS.embedding + PARAMS.lstm1 + PARAMS.lstm2 + PARAMS.linear; // 920,385

/** Code from the notebook, re-wrapped to fit the side column. */
export const CODE = {
	clean: `def preprocess_string(s):
    s = re.sub(r"[^\\w\\s]", '', s)
    s = re.sub(r"\\s+", '', s)
    s = re.sub(r"/d", '', s)
    return s`,
	vocabulary: `corpus_ = sorted(corpus,
    key=corpus.get,
    reverse=True)[:1000]
onehot_dict = {w: i+1 for i, w
    in enumerate(corpus_)}`,
	padding: `features = np.zeros(
    (len(sentences), 500), dtype=int)
features[ii, -len(review):] = \\
    np.array(review)[:500]`,
	embedding: `self.embedding = nn.Embedding(
    1001, 64)`,
	lstm: `self.lstm = nn.LSTM(
    input_size=64,
    hidden_size=256,
    num_layers=2,
    batch_first=True)`,
	dropout: `self.dropout = nn.Dropout(0.3)`,
	linear: `self.fc = nn.Linear(256, 1)`,
	sigmoid: `self.sig = nn.Sigmoid()
sig_out = sig_out[:, -1]  # last step`
} as const;
