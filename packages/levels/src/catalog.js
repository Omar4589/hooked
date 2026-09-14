// Turning the registry into the two lists the app asks for. Pure, so the ordering and the
// hidden-level rule are testable with made-up entries rather than with whatever happens to ship.

/** @typedef {import('./registry.js').Entry} Entry */
/** @typedef {{ id: number, name: string, book: number, hard: false|string }} Summary */

/** Development boards live under levels/dev/ and never reach a player. @param {Entry} entry */
export const isDevEntry = (entry) => entry.name.startsWith('dev/');

/** What a list needs without loading the file. @param {object} json @returns {Summary} */
export const summarize = (json) => ({
  id: json.id,
  name: json.name,
  book: json.book,
  hard: json.hard === undefined ? false : json.hard,
});

const byId = (a, b) => a.id - b.id;

/**
 * `shipped` is the play sequence: everything outside levels/dev/ that is not hidden, by id.
 * `dev` is the development boards, by id. `byId` serves them all, hidden ones included — the
 * frog-tap level of §13 is kept out of the list, not out of the loader.
 * @param {readonly Entry[]} entries
 * @returns {{ shipped: Summary[], dev: Summary[], byId: Map<number, Entry> }}
 */
export const buildCatalog = (entries) => {
  const lookup = new Map();
  for (const entry of entries) lookup.set(entry.json.id, entry);
  const shipped = entries
    .filter((e) => !isDevEntry(e) && e.json.hidden !== true)
    .map((e) => summarize(e.json))
    .sort(byId);
  const dev = entries
    .filter(isDevEntry)
    .map((e) => summarize(e.json))
    .sort(byId);
  return { shipped, dev, byId: lookup };
};
