// exercise_results has no plan-item column: a set is keyed by plan, athlete,
// exercise, date and set_number. When the same exercise appears more than
// once in a plan (or is added again mid-session), every occurrence gets its
// own block of set numbers — the 1st uses 1–99, the 2nd 101–199, … — so
// their sets never overwrite each other and can be told apart again.
export const SET_BLOCK = 100;

export function setNumberBase(occurrence: number): number {
  return occurrence * SET_BLOCK;
}

// Which occurrence a stored set belongs to, given how many there are now.
export function occurrenceOfSet(setNumber: number, occurrences: number): number {
  return Math.min(Math.floor(setNumber / SET_BLOCK), Math.max(occurrences - 1, 0));
}
