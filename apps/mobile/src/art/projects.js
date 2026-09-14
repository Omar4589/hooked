// The testable half of the project registry: a level names the thing it makes — `"project":
// "coaster_olive"` in the level JSON (DESIGN.md §10; the ids for Book 1 are listed in
// docs/LEVELS-BOOK1.md) — and this file reads that name off a level. ./illustrations.js files the
// art under the same name, so the win screen draws `illustrationFor(projectKeyOf(level))`.
//
// The two halves are one registry and they are deliberately two files, for the same reason
// ./compose.js and ./sprites.js are. illustrations.js is built from require() of PNG files, and
// plain node can load neither spelling: `require` is not defined in an ES module scope, and an
// `import` of a .png throws ERR_UNKNOWN_FILE_EXTENSION. Either one would take the whole
// `node --test src/*/*.test.js` run down, not just its own file. So everything node can execute
// lives here, and projects.test.js covers the Metro half the way pieces.test.js polices its own
// import list — by reading that source as text.
//
// What must never move here is the list of projects that have art. illustrations.js is the only
// place that list exists. A copy here would be testable, would pass, and would still let a
// hasArt() answer yes while illustrationFor() came back undefined and `.done` threw — on the win
// screen, whose only way out is Home.

/**
 * The project a level makes, or null when it names none. A level with no project key is not an
 * error here: it is a board with nothing to illustrate, and the win screen draws no illustration.
 * Anything that is not a non-empty string — a missing level, a missing field, `''`, a number a
 * hand-authored file slipped in — comes back null, so one check covers them all.
 * @param {{ project?: unknown }|null|undefined} level  a level as @hooked/levels loads it
 * @returns {string|null}
 */
export const projectKeyOf = (level) => {
  const key = level?.project;
  return typeof key === 'string' && key.length > 0 ? key : null;
};
