# Location Sketch Map Studio V4.3

Kerala village-office style location sketch tool (roads, survey symbols, polygon fill, PDF export).

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `style.css` | Styles |
| `script.js` | App logic |

## Run locally

Open `index.html` in a browser, or:

```bash
npx serve .
```

## GitHub Pages

1. Push this folder to a repo
2. Settings → Pages → Deploy from branch (`main` / root)
3. Site URL: `https://USERNAME.github.io/REPO/`

CDN scripts (PDF.js, jsPDF, QRCode) load from cdnjs — needs internet once for first load.

## Features

- Double-line roads, railway, polygon fill
- Survey symbols, text boxes (drag to size)
- Group / ungroup / move / node edit
- 12px magnetic snap
- Save maps in browser (IndexedDB)
- Export PDF / PNG
