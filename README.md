# Location Sketch Map Studio V4.4

Kerala village-office style location sketch tool.

## New in this update (V4.5) — straight lines, smart snap, bends (valavu)

- **Lines are always perfectly straight** — drag = start→end only, hand vibration can never bend a line (with Snap ON or OFF). The old *Straight* checkbox is gone; **Scribble** is the only freehand tool. Accidental taps / strokes under 3 px are ignored.
- **Smart Snap 12px** — radius is now 12 *screen* px (zoom in to place lines very close), the old 34 px "continue previous road" catch is gone, a **green ring** shows where the pointer will snap, and the moving line end no longer sticks to itself.
  - Hold **Alt** or **Ctrl** while drawing = skip snap for that stroke (no need to untick Snap). **S** = Snap on/off.
- **Bend (valavu) mode** — tick **Bend** (or press **B**), set radius **R**, then click every corner point of any road / line / polyline; corners become true circular arcs (double-line roads stay parallel).
  - Hairpin bend = 3 clicks in a V shape with a small R; U-turn = 4 points, R = half the gap.
  - Double-click / Enter / **✔ Done** finishes. Select a bent road and change **R** to tune it live; right-click → *Round bends* / *Sharp corners* also works on roads drawn the normal way (chained segments).
  - Bends survive save / load, duplicate, resize, rotate, group and eraser.

## From V4.4

- **Duplicate** selection (Ctrl+D) — paths and symbols
- **Path group rotate** — drag the top circle handle, or R / right-click 90°·−90°·180°
- **Keyboard shortcuts**: V Select · H Pan · T Text · E Eraser · R Rotate · Ctrl+G/Shift+G Group · Ctrl+S Save · Arrows nudge
- **Simple layer list** (left sidebar) — select, show/hide, delete
- **Location Map folder save** — Chrome/Edge picks a folder once (e.g. Downloads/Location Map); saves/restores `.lsm.json` by preferred or default name (falls back to normal download)

## From V4.3

- **Help** tab (toolbar) — full usage guide (ML + EN)
- **Select all** (⬚ All / Ctrl+A)
- **Google Slides-style resize**: select drawings → blue box + 8 handles → drag corner/side to scale
- **Fit to page width** (right-click menu)
- Group / ungroup / move still work on the same selection

## Online symbol search (fixed + smarter)

- Icon drawings are downloaded as JSON and drawn locally as inline SVG, so they no longer depend on remote `<img>` loading (blocked by some ad-blockers / ISPs / firewalls).
- Placed icons are embedded in the map: saved maps, PDF/PNG export and offline use keep working.
- 3 mirror servers with automatic fallback, Retry button, quick category chips, recently-used icons.
- Malayalam / Manglish search words work: `vathil`, `kinar`, `ambalam`, `palli`, `വീട്`, `കിണർ` …

## Custom Road

Line / Road menu → **Custom Road** → type any width (6–150 px) → press Enter or click the row.
The white fill auto-adjusts so the black edge line is always **1.75 px** on each side
(e.g. 30 px road = white 26.5 px + 2 × 1.75 px black). Each road remembers its own width.

## Folder

```
index.html  style.css  script.js  lib/  README.md
```

## Local libs (default)

`lib/` holds PDF.js, jsPDF, QRCode — offline + faster on GitHub Pages.

## Use

1. Select tool → click drawings or drag marquee (or Ctrl+A)
2. Optional: right-click → Group
3. Drag **blue corner handles** to enlarge/shrink (like Google Slides)
4. Help button for full guide

## Video tutorial

English narrated walkthrough:

`docs/Location-Map-Studio-Tutorial-EN.mp4`

Also linked from **Help → Video tutorial (English)** and inside the Help guide modal.

GitHub Pages path example:
`https://<user>.github.io/<repo>/docs/Location-Map-Studio-Tutorial-EN.mp4`
