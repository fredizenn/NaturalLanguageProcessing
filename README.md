# Sentiment Analysis with PyTorch (LSTM)

A binary sentiment classifier for IMDB movie reviews, built from scratch in PyTorch: a word-level embedding feeding a 2-layer LSTM, with a sigmoid output. Reaches **86.5% validation accuracy** after 4 epochs.

**[Interactive visualization →](https://natural-language-processing-seven.vercel.app)** — follow a review through every layer of this model, from raw text to probability.

<!-- Replace the link above with your Vercel URL. -->

---

## Results

| Epoch | Train acc | Val acc | Train loss | Val loss |
|:-----:|----------:|--------:|-----------:|---------:|
| 1 | 69.84% | 80.42% | 0.5663 | 0.4401 |
| 2 | 83.04% | 84.15% | 0.3920 | 0.3613 |
| 3 | 85.86% | 85.51% | 0.3337 | 0.3485 |
| **4** | **87.55%** | **86.47%** | **0.3012** | **0.3154** |
| 5 | 88.83% | 86.19% | 0.2710 | 0.3216 |

The checkpoint (`state_dict.pt`) is saved whenever validation loss improves, so it holds the **epoch 4** weights. In epoch 5, training loss keeps falling while validation loss rises, which is the first sign of overfitting.

"Validation" here is the 25% held-out split. It was also used to pick the checkpoint, so these figures are not an independent test score.

## Model

```
SentimentRNN(
  (embedding): Embedding(1001, 64)
  (lstm): LSTM(64, 256, num_layers=2, batch_first=True)
  (dropout): Dropout(p=0.3)
  (fc): Linear(in_features=256, out_features=1)
  (sig): Sigmoid()
)
```

| Component | Shape | Parameters |
|---|---|---:|
| Embedding | 1001 × 64 (1000 words + padding index 0) | 64,064 |
| LSTM layer 1 | 64 → 256 | 329,728 |
| LSTM layer 2 | 256 → 256 | 526,336 |
| Linear | 256 → 1 | 257 |
| **Total** | | **920,385** |

The prediction is read from the **last timestep** of layer 2. Sequences are left-padded, so that timestep is always the review's final word. The forward pass applies dropout, the linear layer and the sigmoid to all 500 timesteps and then keeps `sig_out[:, -1]`, which gives the same result as using the final hidden state alone.

## Pipeline

1. **Load** `IMDB Dataset.csv` (50,000 reviews, balanced positive/negative).
2. **Split** 75 / 25, stratified by label: 37,500 train, 12,500 validation.
3. **Tokenize.** Lowercase each review, split on whitespace, then clean each word by removing non-word characters.
4. **Build the vocabulary** from the training split only. NLTK English stopwords are removed, and the 1,000 most frequent remaining words get IDs 1–1000. ID 0 is reserved for padding.
5. **Encode.** Each word becomes its ID. Words outside the vocabulary are dropped; there is no unknown-word token.
6. **Pad** every review to 500 tokens: zeros on the left, longer reviews truncated to their first 500 IDs.
7. **Train** for 5 epochs.

### Training setup

| Setting | Value |
|---|---|
| Loss | `BCELoss` |
| Optimizer | Adam, lr = 0.001 |
| Batch size | 50 (750 batches per epoch) |
| Gradient clipping | max norm 5 |
| Epochs | 5 |
| Checkpointing | save when validation loss improves |

## Getting started

### 1. Install dependencies

```bash
pip install torch pandas numpy scikit-learn nltk matplotlib seaborn
```

A CUDA GPU is used automatically if available; CPU works but is slower.

### 2. Download the data

Download the [IMDB Dataset of 50K Movie Reviews](https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews) from Kaggle and place the CSV at:

```
data/IMDB Dataset.csv
```

### 3. Run the notebook

```bash
jupyter notebook Sentiment_Analysis_W_PyTorch.ipynb
```

The notebook calls `nltk.download('all')`, which is a large download. Only the stopword list is needed, so you can replace it with `nltk.download('stopwords')`.

### 4. Predict

The last cell defines `predict_text`, which returns P(positive) for a raw string:

```python
pro = predict_text("A taut, gripping thriller with superb performances.")
status = "positive" if pro > 0.5 else "negative"
```

In the notebook, review #30 of the dataset (a positive review of *Crossfire*, 1947) is predicted positive with probability **0.7083**.

## Known limitations

These are behaviours of the current code. They are documented here rather than silently fixed, and the interactive visualization shows them as they are.

- **Negations are removed.** `not`, `no` and `nor` are NLTK stopwords, so "not good" reaches the model as "good".
- **Inference doesn't lowercase.** Training lowercases text, but `predict_text` does not, so capitalised words such as "This" or "Fantastic" don't match the vocabulary and are dropped.
- **The digit regex is a typo.** `re.sub(r"/d", '', s)` removes the literal string `/d`, not digits (`r"\d"`). In practice digits survive, so "10/10" becomes the token `1010`.
- **HTML line breaks become a token.** `<br />` is cleaned to `br`, which is likely one of the most frequent words in the vocabulary.
- **The split isn't seeded.** `train_test_split` has no `random_state`, so the vocabulary, the split and the exact scores change between runs. The vocabulary is also not saved alongside `state_dict.pt`, so the checkpoint can only be used in the session that created it.
- **Padding is learned.** `nn.Embedding` is created without `padding_idx`, so the padding vector is trained like a word and the LSTM processes every padded step.
- **`drop_prob` is unused.** The constructor accepts `drop_prob=0.5`, but the dropout layer is hard-coded to 0.3.
- **Hidden state carries across batches.** During training, `h` is initialised once per epoch and then detached and reused across shuffled, unrelated batches, instead of being reset to zero for each batch.

## Possible improvements

- Keep negations by removing `not`, `no` and `nor` from the stopword list.
- Lowercase in `predict_text`, fix the digit regex and strip HTML tags before tokenizing.
- Set `random_state` on the split and save the vocabulary with the checkpoint.
- Add an `<UNK>` token and a larger vocabulary.
- Pass `padding_idx=0` to the embedding, or use `pack_padded_sequence` so padding is skipped.
- Reset the hidden state for each batch.
- Evaluate on a separate test split that isn't used for checkpoint selection.

## Repository structure

```
.
├── Sentiment_Analysis_W_PyTorch.ipynb
├── data/
│   └── IMDB Dataset.csv      # not committed; download from Kaggle
└── state_dict.pt             # created by training (epoch 4 weights)
```

## Built with

PyTorch · NLTK · scikit-learn · pandas · NumPy · Matplotlib · seaborn