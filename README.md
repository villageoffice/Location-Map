# Location Sketch Map Studio V4.3

Kerala village-office style location sketch tool.

## Folder structure

```
location-sketch-studio/
  index.html
  style.css
  script.js
  lib/
    pdf.min.js
    pdf.worker.min.js
    jspdf.umd.min.js
    qrcode.min.js
  README.md
```

## CDN load options

### A) Local (default — recommended)
- Scripts in `index.html` point to `lib/`
- Works **offline**
- Faster on GitHub Pages after first load
- Repo ~1.8 MB larger

### B) CDN
In `index.html` head:
1. Comment the LOCAL `<script src="lib/...">` lines
2. Uncomment the CDN block (cdnjs URLs)
3. In `script.js` first line, change worker to:
   ```js
   pdfjsLib.GlobalWorkerOptions.workerSrc =
     'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
   ```
- Smaller repo
- Needs internet on every cold load

### C) Hybrid / lazy (advanced)
Load PDF/QR libraries only when user clicks Export or QR — reduces first paint. Ask if you want this wired in.

## GitHub Pages

Push folder → Settings → Pages → Deploy from branch.  
Open `index.html` as root.

## Local test

```bash
npx serve .
# or open index.html in browser
```
