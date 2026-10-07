/**
 * Faithful TypeScript port of the notebook's text pipeline:
 *
 *   for word in sent.lower().split():
 *       word = preprocess_string(word)
 *       if word in onehot_dict: keep onehot_dict[word]
 *   padding_(..., 500)  -> left-pad with zeros, keep the first 500 ids
 *
 * Only the vocabulary contents are illustrative (see data/vocab.ts); the order of
 * operations, the regexes and the padding rule are reproduced exactly.
 */
import { MODEL } from '#lib/data/model';
import { STOPWORDS, VOCAB } from '#lib/data/vocab';

/** Python's `\w` is Unicode-aware: letters, digits, underscore. */
const NON_WORD = /[^\p{L}\p{N}_\s]/gu;
const WHITESPACE = /\s+/g;
const LITERAL_SLASH_D = /\/d/g;

export interface CleanedWord {
	raw: string; // after lower() + split()
	cleaned: string; // after preprocess_string()
	/** Index ranges of characters removed by rule 1 (for highlighting). */
	removed: number[];
}

/** Exact port of preprocess_string(s). */
export function preprocessString(s: string): string {
	s = s.replace(NON_WORD, '');
	s = s.replace(WHITESPACE, '');
	s = s.replace(LITERAL_SLASH_D, '');
	return s;
}

export function cleanWord(raw: string): CleanedWord {
	const removed: number[] = [];
	const chars = Array.from(raw);
	chars.forEach((ch, i) => {
		if (/[^\p{L}\p{N}_\s]/u.test(ch)) removed.push(i);
	});
	return { raw, cleaned: preprocessString(raw), removed };
}

export type LookupStatus = 'kept' | 'stopword' | 'oov' | 'empty';

export interface Lookup {
	word: string; // cleaned
	raw: string;
	status: LookupStatus;
	id?: number;
	/** Position in the original word list. */
	index: number;
}

export interface Encoded {
	words: CleanedWord[];
	lookups: Lookup[];
	ids: number[]; // kept ids, before truncation
	sequence: number[]; // length 500, left-padded
	keptIds: number[]; // ids that made it into the 500-long sequence
	keptWords: string[];
	padCount: number;
	truncated: number; // ids discarded because the review exceeded 500 tokens
}

export function lookup(word: CleanedWord, index: number): Lookup {
	const w = word.cleaned;
	const id = VOCAB.get(w);
	if (w === '') return { word: w, raw: word.raw, status: 'empty', index };
	if (id !== undefined) return { word: w, raw: word.raw, status: 'kept', id, index };
	if (STOPWORDS.has(w)) return { word: w, raw: word.raw, status: 'stopword', index };
	return { word: w, raw: word.raw, status: 'oov', index };
}

/** padding_(sentences, seq_len): zeros first, review ids at the end, first seq_len ids kept. */
export function leftPad(ids: number[], seqLen: number = MODEL.seqLen): number[] {
	const features = new Array<number>(seqLen).fill(0);
	if (ids.length === 0) return features;
	const kept = ids.slice(0, seqLen);
	const start = seqLen - kept.length;
	for (let i = 0; i < kept.length; i++) features[start + i] = kept[i];
	return features;
}

export function encode(text: string): Encoded {
	const rawWords = text.toLowerCase().split(/\s+/).filter(Boolean);
	const words = rawWords.map(cleanWord);
	const lookups = words.map(lookup);
	const kept = lookups.filter((l) => l.status === 'kept');
	const ids = kept.map((l) => l.id!);
	const sequence = leftPad(ids);
	const keptCount = Math.min(ids.length, MODEL.seqLen);
	return {
		words,
		lookups,
		ids,
		sequence,
		keptIds: ids.slice(0, keptCount),
		keptWords: kept.slice(0, keptCount).map((l) => l.word),
		padCount: MODEL.seqLen - keptCount,
		truncated: Math.max(0, ids.length - MODEL.seqLen)
	};
}
