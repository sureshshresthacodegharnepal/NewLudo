import { DiceRollState } from '../models/gameModels';

let rollCounter = 1;

/**
 * Generates a cryptographically unbiased random integer between 1 and 6 inclusive.
 */
export function rollSingleDie(): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    // Reject values >= 2^32 - (2^32 % 6) to eliminate modulo bias
    const maxUnbiased = 0xffffffff - (0xffffffff % 6);
    let randomVal = 0;
    do {
      window.crypto.getRandomValues(array);
      randomVal = array[0];
    } while (randomVal >= maxUnbiased);
    return (randomVal % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

export function generateDiceRoll(isDoubleDice: boolean): DiceRollState {
  const values = isDoubleDice
    ? [rollSingleDie(), rollSingleDie()]
    : [rollSingleDie()];
  const total = values.reduce((acc, v) => acc + v, 0);
  return {
    values,
    total,
    isDoubleDice,
    rollId: rollCounter++,
  };
}
