/**
 * NLTK English stopword list (nltk.corpus.stopwords.words('english')).
 * The notebook drops these while building the vocabulary, so none of them ever
 * receives an ID. Note that the comparison happens AFTER cleaning, so "don't"
 * becomes "dont", which is not in this list.
 */
export const STOPWORDS: ReadonlySet<string> = new Set(
	`i me my myself we our ours ourselves you you're you've you'll you'd your yours yourself
yourselves he him his himself she she's her hers herself it it's its itself they them their
theirs themselves what which who whom this that that'll these those am is are was were be been
being have has had having do does did doing a an the and but if or because as until while of at
by for with about against between into through during before after above below to from up down
in out on off over under again further then once here there when where why how all any both each
few more most other some such no nor not only own same so than too very s t can will just don
don't should should've now d ll m o re ve y ain aren aren't couldn couldn't didn didn't doesn
doesn't hadn hadn't hasn hasn't haven haven't isn isn't ma mightn mightn't mustn mustn't needn
needn't shan shan't shouldn shouldn't wasn wasn't weren weren't won won't wouldn wouldn't`
		.split(/\s+/)
		.filter(Boolean)
);

/** Negation words that the stopword filter removes; worth calling out in the UI. */
export const NEGATIONS: ReadonlySet<string> = new Set(['not', 'no', 'nor']);

/**
 * ILLUSTRATIVE vocabulary.
 *
 * The real vocabulary is the 1000 most frequent non-stopword tokens of the
 * training split, with IDs 1..1000 in frequency order. That dictionary was not
 * exported from the notebook, so this demo ships a subset of common IMDB review
 * words in an approximate frequency order. IDs are therefore illustrative: a
 * word marked "outside vocabulary" here may well be inside the real top 1000.
 */
const RANKED = `br movie film one like good even would time really story see well much bad get great
also people first dont made movies make films could way characters think watch character two
many seen love plot never acting show best know little life ever better man still end say scene
something scenes go im back real watching doesnt thing didnt though years actors funny actually
10 another look find new work lot nothing going old every part us director cant thats makes
things cast quite pretty seems want young around got take however fact enough horror world big
may thought give long without isnt saw series comedy ive always original right action
interesting gets almost role whole point come bit done guy least times must music feel script
minutes far might last anything since family performance making girl kind probably tv yet away
worst rather sure fun anyone hard day found played especially woman trying although believe
course comes looking screen place goes ending set sense everything maybe put different three
shows book money dvd worth looks actor someone true effects main watched reason together
everyone plays play said john instead job beautiful special audience seem idea takes half
version american wife house left black mind star war father shot death seeing nice help simply
budget high second poor used completely men read use either try boring wasnt given need classic
less friends short low along kids dead home top hollywood rest production camera line enjoy
couple women truly stupid next awful recommend wonderful start mean terrible video full moments
school came small let getting perhaps playing keep early others often definitely tell person
understand name face become human felt lines piece entertaining liked case stars went yes lost
absolutely perfect head title supposed waste couldnt laugh picture hope episode cinema final
entire problem says worse dialogue lead oh fans guys totally mr care style overall loved evil
white boy written wanted hour game several beginning based mother killer throughout called
sound wrong quality excellent amazing brilliant enjoyed favorite highly mess fantastic
unfortunately bored horrible dull predictable gripping suspense thriller performances young
memorable masterpiece superb avoid lame ridiculous annoying hours robert police detective
small role central history town city doesnt drama romance car feeling soldiers kill 1010
dark sad heart serious tries red stuff touching powerful`
	.split(/\s+/)
	.filter(Boolean);

function buildVocab(words: string[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const w of words) {
		if (STOPWORDS.has(w) || map.has(w)) continue;
		map.set(w, map.size + 1); // IDs start at 1; 0 is padding
	}
	return map;
}

export const VOCAB: ReadonlyMap<string, number> = buildVocab(RANKED);
export const VOCAB_IS_ILLUSTRATIVE = true;

/**
 * Word polarity table used ONLY by the mock predictor to produce plausible
 * illustrative probabilities. The trained model has no such table; it learned
 * its behaviour from data.
 */
export const MOCK_POLARITY: Readonly<Record<string, number>> = {
	fantastic: 2.2, excellent: 2.2, amazing: 2.0, brilliant: 2.1, great: 1.6, best: 1.3,
	love: 1.4, loved: 1.6, wonderful: 2.0, perfect: 1.8, beautiful: 1.3, enjoy: 1.1,
	enjoyed: 1.4, good: 0.9, nice: 0.8, fun: 1.0, funny: 0.6, recommend: 1.3, highly: 0.9,
	favorite: 1.4, gripping: 1.4, masterpiece: 2.4, superb: 2.2, entertaining: 1.1,
	interesting: 0.5, classic: 0.8, memorable: 1.2, powerful: 1.1, touching: 1.2, well: 0.4,
	'1010': 1.8, '10': 0.6, truly: 0.6, worth: 0.5, liked: 0.9, absolutely: 0.3, performances: 0.4,
	bad: -1.8, worst: -2.6, awful: -2.4, terrible: -2.4, boring: -2.0, bored: -1.8, waste: -2.4,
	stupid: -1.8, poor: -1.5, horrible: -2.4, dull: -1.8, predictable: -1.2, mess: -1.6,
	unfortunately: -1.2, worse: -1.6, nothing: -0.5, supposed: -0.7, minutes: -0.3,
	didnt: -0.6, doesnt: -0.4, couldnt: -0.4, wasnt: -0.5, cant: -0.3, dont: -0.3, money: -0.4,
	avoid: -1.8, lame: -1.8, ridiculous: -1.4, annoying: -1.4, wanted: -0.3, wrong: -0.8,
	lost: -0.4, sad: -0.2, hours: -0.2
};
