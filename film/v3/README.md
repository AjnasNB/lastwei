# LastWei motion films

These are native Canvas compositions authored for ShowTime 0.4.2. There is no
authored video CSS. Founder and product are separate films with their own clocks,
original source evidence and audio mixes.

The source data is historical Base Sepolia evidence. Moving documents/arrows are
explanations, not captured wallet signatures. Completion and refund are separate
recorded intents. No real customer metrics are represented.

The original founder recording, processed human voice, original screen recording,
audio WAVs and captured images remain local. To render, restore the referenced
assets into each composition's `assets/`, `audio/` and `media/` directories, then:

```powershell
showtime check film/v3/founder
showtime render film/v3/founder --lufs -16
showtime check film/v3/product
showtime render film/v3/product --lufs -16
```

The founder uses local Geist 500/700 and Geist Mono 400 WOFF2 files from the pinned
Fontsource packages; their license is SIL OFL 1.1. Preserve each package's LICENSE
if copying the fonts into a distributed project.

Music credit for both films:

"Pure" by Of Far Different Nature (fardifferent.carrd.co), CC-BY 4.0:
https://opengameart.org/content/escape-album-14-tracks-deep-massive — trimmed and
mixed for these videos. Small ticks are generated audio.

`scripts/export-film-sources.mjs` exports the local composition sources and
focused checks while excluding media and credentials. User review is required
before uploading either film. Pre-render checks are not final render approval.
