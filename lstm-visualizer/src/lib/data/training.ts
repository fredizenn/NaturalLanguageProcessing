/** Per-epoch history exactly as printed by the notebook's training loop. */
export interface EpochRecord {
	epoch: number;
	trainAcc: number; // %
	valAcc: number; // %
	trainLoss: number;
	valLoss: number;
	saved: boolean; // checkpoint written (validation loss improved)
}

export const HISTORY: EpochRecord[] = [
	{ epoch: 1, trainAcc: 69.84266666666666, valAcc: 80.42399999999999, trainLoss: 0.5663181264003118, valLoss: 0.44012256181240084, saved: true },
	{ epoch: 2, trainAcc: 83.03733333333334, valAcc: 84.152, trainLoss: 0.3920126085281372, valLoss: 0.361269738137722, saved: true },
	{ epoch: 3, trainAcc: 85.856, valAcc: 85.512, trainLoss: 0.3336981091002623, valLoss: 0.34848281407356263, saved: true },
	{ epoch: 4, trainAcc: 87.54933333333334, valAcc: 86.47200000000001, trainLoss: 0.30115909284353254, valLoss: 0.31540762388706206, saved: true },
	{ epoch: 5, trainAcc: 88.832, valAcc: 86.19200000000001, trainLoss: 0.2709565493861834, valLoss: 0.32162475103139876, saved: false }
];

/** Epoch whose weights are in state_dict.pt (the last one that lowered validation loss). */
export const BEST_EPOCH = 4;
