// The promoted list — recipes Billy and the team have chosen to feature.
// These are the only recipes that get a fully public, no-signup page meant
// for sharing on social, and they're also what a logged-out visitor sees as
// a peek when they tap the Community tab without signing up.
//
// To promote a recipe: add its exact dish title here (must match a title
// in lib/dishes.ts, or any dish name someone has actually searched, since
// it just needs to exist as a key in the cache). To un-promote one, remove
// it from this list — nothing else needs to change.
//
// Order doesn't matter functionally, but keeping the most current picks
// near the top makes this easier to scan when the list grows.

export const PROMOTED_DISHES: string[] = [
  // Add dish titles here, e.g.:
  // "Birria Tacos",
  // "Miso Glazed Salmon",
];
