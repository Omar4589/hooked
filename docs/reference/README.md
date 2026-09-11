# Reference material

Things the artist and the level author look at; nothing here ships in the app.

- `photos/` — her finished pieces (blanket, coasters, tote, butterfly charm, wind spinner).
  They set the palette (§15), the stitch textures and the project illustrations. The folder
  is gitignored so the photos stay on this machine; drop them in and they are never bundled,
  never committed, never shown in the app (CLAUDE.md, DESIGN.md §13). Location metadata was
  stripped from them on 2026-09-10; strip it again from anything new before it goes to a
  designer or an AI tool (`exiftool -gps:all= -overwrite_original <file>`).

The public art brief that points at these is `docs/design/BRIEF.md`.
