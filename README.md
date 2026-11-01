# Location Sketch Map Studio V4.3

Kerala village-office style location sketch tool.

## New in this build

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
