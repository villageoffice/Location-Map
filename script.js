pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        function optimizeToolbar(){
            const w = window.innerWidth;
            if(w >= 768 && w < 1200){
                document.body.classList.add("compact-toolbar");
            } else {
                document.body.classList.remove("compact-toolbar");
            }
        }
        window.addEventListener("resize", () => {
            resetZoomAndPan();
            optimizeToolbar();
        });
        optimizeToolbar();

        const wrapper = document.getElementById('wrapper');
        const container = document.getElementById('container');
        const a4Page = document.getElementById('a4Page');
        const canvas = document.getElementById('mapCanvas');

        let zoomScale = 1; 
        let panX = 0; 
        let panY = 0;
        let isPanning = false; 
        let startX = 0; 
        let startY = 0;
        let offSubMode = 'items'; 
        let rotateTabActive = false; 
        let currentDeviceMode = "pc"; 
        let magnifierEnabled = true; 

        let pageTargetWidth = 794;
        let pageTargetHeight = 1123;

        let isMovingDrawingBlock = false;
        let blockOffsetX = 0;
        let blockOffsetY = 0;
        let globalDrawingTranslateX = 0; 
        let globalDrawingTranslateY = 0;

        let initialPinchDistance = null;
        let initialScale = 1;
        let touchStartPanX = 0;
        let touchStartPanY = 0;

        let redrawPending = false;
        function redrawAll() {
            if (redrawPending) return;
            redrawPending = true;
            requestAnimationFrame(() => {
                performRedraw();
                redrawPending = false;
            });
        }

        function updateTransform() {
            container.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
        }

        function changePageOrientation() {
            const orientation = document.getElementById('pageOrientation').value;
            if (orientation === 'landscape') {
                pageTargetWidth = 1123;
                pageTargetHeight = 794;
            } else {
                pageTargetWidth = 794;
                pageTargetHeight = 1123;
            }

            container.style.width = pageTargetWidth + 'px';
            container.style.height = pageTargetHeight + 'px';
            a4Page.style.width = pageTargetWidth + 'px';
            a4Page.style.height = pageTargetHeight + 'px';
            
            canvas.width = pageTargetWidth;
            canvas.height = pageTargetHeight;

            resetZoomAndPan();
            redrawAll();
        }

        function toggleDeviceMode() {
            const btn = document.getElementById('deviceModeBtn');
            if (currentDeviceMode === "mobile") {
                currentDeviceMode = "pc";
                btn.innerHTML = "🖥️ PC Mode";
                btn.style.backgroundColor = "#2c3e50";
            } else {
                currentDeviceMode = "mobile";
                btn.innerHTML = "📱 Mobile Mode";
                btn.style.backgroundColor = "#d35400";
            }
            resetZoomAndPan();
        }

        function resetZoomAndPan() {
            const wWidth = wrapper.clientWidth;
            const wHeight = wrapper.clientHeight;
            
            const scaleX = (wWidth - 40) / pageTargetWidth;
            const scaleY = (wHeight - 40) / pageTargetHeight;
            
            zoomScale = Math.min(scaleX, scaleY);
            if(zoomScale > 1.2) zoomScale = 1.2;
            if(zoomScale < 0.15) zoomScale = 0.15;
            
            panX = (wWidth - (pageTargetWidth * zoomScale)) / 2;
            panY = (wHeight - (pageTargetHeight * zoomScale)) / 2;
            if(panY < 10) panY = 10; 
            
            updateTransform();
        }

        window.onload = () => { setTimeout(changePageOrientation, 200); };

        // --- PC MOUSE WHEEL ZOOM LOGIC ---
        wrapper.addEventListener('wheel', (e) => {
            if (currentDeviceMode !== "pc") return; 
            e.preventDefault();
            const zoomFactor = 1.08;
            const rect = wrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const currentScale = zoomScale;
            if (e.deltaY < 0) {
                zoomScale = Math.min(zoomScale * zoomFactor, 3.0); 
            } else {
                zoomScale = Math.max(zoomScale / zoomFactor, 0.15); 
            }
            panX = mouseX - (mouseX - panX) * (zoomScale / currentScale);
            panY = mouseY - (mouseY - panY) * (zoomScale / currentScale);
            updateTransform();
        }, { passive: false });

        wrapper.addEventListener('contextmenu', e => e.preventDefault());

        let drawModeOn = false;
        const drawToggleBtn = document.getElementById('drawToggleBtn');
        const viewModeBtn = document.getElementById('viewModeBtn');
        const rotateToggleBtn = document.getElementById('rotateToggleBtn');

        // --- ERASER TOOL STATE ---
        let eraseModeOn = false;
        let isErasing = false;
        let eraserRadius = 20;
        let eraserPointerModel = null;
        let eraseStrokeSnapshot = null;
        let eraseSnapshotStack = [];
        let eraseRedoStack = [];
        let lastActionType = null;
        let lastUndoWasErase = false;

        function toggleDrawMode() {
            drawModeOn = !drawModeOn;
            if (drawModeOn && eraseModeOn) toggleEraserMode();
            if (drawModeOn) {
                drawToggleBtn.innerHTML = "✏️ Draw Mode: ON";
                drawToggleBtn.style.backgroundColor = "#27ae60";
                canvas.style.cursor = "crosshair";
                viewModeBtn.style.backgroundColor = "#7f8c8d";
            } else {
                drawToggleBtn.innerHTML = "🔒 Draw Mode: OFF";
                drawToggleBtn.style.backgroundColor = "#5f6368";
                canvas.style.cursor = "default";
                setSubMode(offSubMode);
            }
        }

        function toggleViewMode() {
            if (drawModeOn) toggleDrawMode(); 
            if (offSubMode === 'items') setSubMode('page');
            else setSubMode('items');
        }

        function setSubMode(mode) {
            offSubMode = mode;
            if (mode === 'page') {
                viewModeBtn.innerHTML = "🔍 Layout/Zoom";
                viewModeBtn.style.backgroundColor = "#ffc107";
                viewModeBtn.style.color = "#000";
            } else {
                offSubMode = 'items';
                viewModeBtn.innerHTML = "👉 Items";
                viewModeBtn.style.backgroundColor = "#8e44ad";
                viewModeBtn.style.color = "#fff";
            }
        }

        function toggleEraserMode() {
            eraseModeOn = !eraseModeOn;
            const btn = document.getElementById('eraserToggleBtn');
            if (eraseModeOn) {
                if (drawModeOn) toggleDrawMode(); 
                btn.innerHTML = "🧽 Eraser: ON";
                btn.style.backgroundColor = "#e74c3c";
                canvas.style.cursor = "crosshair";
            } else {
                btn.innerHTML = "🧽 Eraser: OFF";
                btn.style.backgroundColor = "#5f6368";
                canvas.style.cursor = drawModeOn ? "crosshair" : "default";
                isErasing = false;
                eraseStrokeSnapshot = null;
                eraserPointerModel = null;
                if(magnifier) magnifier.style.display = 'none';
                redrawAll();
            }
        }

        function updateEraserSize() {
            eraserRadius = parseInt(document.getElementById('eraserSize').value, 10) || 20;
        }

        function toggleRotateTab() {
            rotateTabActive = !rotateTabActive;
            const sliders = document.querySelectorAll('.rotation-slider');
            if (rotateTabActive) {
                rotateToggleBtn.innerHTML = "🔄 Rotate Tab: ON";
                rotateToggleBtn.style.backgroundColor = "#27ae60";
                sliders.forEach(s => s.style.display = "block");
            } else {
                rotateToggleBtn.innerHTML = "🔄 Rotate Tab: OFF";
                rotateToggleBtn.style.backgroundColor = "#7f8c8d";
                sliders.forEach(s => s.style.display = "none");
            }
        }

        function toggleMagnifier() {
            magnifierEnabled = !magnifierEnabled;
            const btn = document.getElementById('magnifierToggleBtn');
            if (magnifierEnabled) {
                btn.innerHTML = "🔍 Zoom Box: ON";
                btn.style.backgroundColor = "#27ae60";
            } else {
                btn.innerHTML = "🔍 Zoom Box: OFF";
                btn.style.backgroundColor = "#5f6368";
                magnifier.style.display = 'none';
            }
        }

        // --- ENHANCED MOBILE PINCH-TO-ZOOM LOGIC ---
        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                isPanning = false;
                initialPinchDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialScale = zoomScale;
                touchStartPanX = panX;
                touchStartPanY = panY;
                return;
            }
            
            if (currentDeviceMode === "mobile" && offSubMode === 'page' && !drawModeOn) {
                if (e.touches.length === 1) {
                    isPanning = true;
                    startX = e.touches[0].clientX - panX;
                    startY = e.touches[0].clientY - panY;
                }
            }
        }, {passive: false});

        wrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDistance) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const originX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const originY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const wrapperRect = wrapper.getBoundingClientRect();
                const pivotX = originX - wrapperRect.left;
                const pivotY = originY - wrapperRect.top;

                const factor = currentDistance / initialPinchDistance;
                const newScale = Math.max(0.15, Math.min(3.0, initialScale * factor));
                
                panX = pivotX - (pivotX - touchStartPanX) * (newScale / initialScale);
                panY = pivotY - (pivotY - touchStartPanY) * (newScale / initialScale);
                zoomScale = newScale;
                
                updateTransform();
                return;
            }
            
            if (isPanning && e.touches.length === 1 && currentDeviceMode === "mobile" && offSubMode === 'page') {
                e.preventDefault();
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                updateTransform();
            }
        }, {passive: false});

        wrapper.addEventListener('touchend', () => { 
            isPanning = false; 
            initialPinchDistance = null; 
        });

        const ctx = canvas.getContext('2d');
        const magnifier = document.getElementById('magnifier');
        const magCanvas = document.getElementById('magnifierCanvas');
        const magCtx = magCanvas.getContext('2d');

        let isDrawing = false; let paths = []; let currentPath = []; let bgImage = null;
        let activePathIndex = null; 

        const roadStyles = {
            nh:          { outerWidth: 22, outerColor: 'black', innerWidth: 17, innerColor: 'white', isBox: false },
            sh:          { outerWidth: 19, outerColor: 'black', innerWidth: 14, innerColor: 'white', isBox: false },
            pwd:         { outerWidth: 16, outerColor: 'black', innerWidth: 12, innerColor: 'white', isBox: false },
            panchayat:   { outerWidth: 12, outerColor: 'black', innerWidth: 8,  innerColor: 'white', isBox: false },
            mud:         { outerWidth: 10, outerColor: '#8B4513', innerWidth: 6, innerColor: '#F5DEB3', dash: [10, 10], isBox: false },
            path:        { outerWidth: 4,  outerColor: 'black', innerWidth: 0,  innerColor: 'transparent', dash: [6, 6], isBox: false },
            stream:      { outerWidth: 10, outerColor: '#1a73e8', innerWidth: 6, innerColor: '#8ab4f8', isBox: false },
            plotLine:    { outerWidth: 3,  outerColor: 'red',   innerWidth: 0,  innerColor: 'transparent', isBox: false },
            railway:     { outerWidth: 10, outerColor: 'black', innerWidth: 6,  innerColor: 'white', dash: [10, 10], isBox: false },
            electricLine:{ outerWidth: 2,  outerColor: '#e67e22', innerWidth: 0, innerColor: 'transparent', dash: [8, 8], isBox: false, isElectric: true },
            squarePlot:  { outerWidth: 3,  outerColor: 'red',   innerWidth: 0,  innerColor: 'transparent', isBox: true },
            pointerArrow:{ outerWidth: 3,  outerColor: 'black', innerWidth: 0,  innerColor: 'transparent', isBox: false, isArrow: true }
        };

        function drawArrowHead(pCtx, fromX, fromY, toX, toY, color) {
            const headLength = 16;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            pCtx.save();
            pCtx.fillStyle = color;
            pCtx.beginPath();
            pCtx.moveTo(toX, toY);
            pCtx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 7), toY - headLength * Math.sin(angle - Math.PI / 7));
            pCtx.lineTo(toX - headLength * 0.6 * Math.cos(angle), toY - headLength * 0.6 * Math.sin(angle));
            pCtx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 7), toY - headLength * Math.sin(angle + Math.PI / 7));
            pCtx.closePath();
            pCtx.fill();
            pCtx.restore();
        }

        function ptDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

        function deepClonePaths(arr) {
            return arr.map(p => ({ type: p.type, points: p.points.map(pt => ({ x: pt.x, y: pt.y })) }));
        }

        function densifyPoints(points, maxLen) {
            if (points.length < 2) return points.slice();
            let result = [points[0]];
            for (let i = 1; i < points.length; i++) {
                const p0 = points[i - 1], p1 = points[i];
                const segLen = ptDist(p0, p1);
                if (segLen > maxLen) {
                    const steps = Math.ceil(segLen / maxLen);
                    for (let s = 1; s <= steps; s++) {
                        const t = s / steps;
                        result.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
                    }
                } else {
                    result.push(p1);
                }
            }
            return result;
        }

        function distToSegment(p, a, b) {
            const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
            if (l2 === 0) return ptDist(p, a);
            let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            return ptDist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
        }

        function eraseAt(mx, my, radius) {
            let changed = false;
            const newPaths = [];
            paths.forEach(path => {
                const style = roadStyles[path.type];
                if (style && style.isBox) {
                    const c0 = path.points[0], c1 = path.points[1];
                    const rx0 = Math.min(c0.x, c1.x), rx1 = Math.max(c0.x, c1.x);
                    const ry0 = Math.min(c0.y, c1.y), ry1 = Math.max(c0.y, c1.y);
                    const corners = [{ x: rx0, y: ry0 }, { x: rx1, y: ry0 }, { x: rx1, y: ry1 }, { x: rx0, y: ry1 }];
                    let minD = Infinity;
                    for (let i = 0; i < 4; i++) {
                        minD = Math.min(minD, distToSegment({ x: mx, y: my }, corners[i], corners[(i + 1) % 4]));
                    }
                    if (minD <= radius) { changed = true; return; }
                    newPaths.push(path);
                    return;
                }

                const dense = densifyPoints(path.points, 6);
                let chain = [];
                dense.forEach(pt => {
                    if (ptDist(pt, { x: mx, y: my }) <= radius) {
                        changed = true;
                        if (chain.length >= 2) newPaths.push({ type: path.type, points: chain });
                        chain = [];
                    } else {
                        chain.push(pt);
                    }
                });
                if (chain.length >= 2) newPaths.push({ type: path.type, points: chain });
            });
            if (changed) paths = newPaths;
            return changed;
        }

        function startErasing(e) {
            if (e.touches && e.touches.length > 1) return;
            e.preventDefault();
            isErasing = true;
            eraseStrokeSnapshot = deepClonePaths(paths);
            const coord = getCoordinates(e);
            const mx = coord.x - globalDrawingTranslateX, my = coord.y - globalDrawingTranslateY;
            eraserPointerModel = { x: mx, y: my };
            eraseAt(mx, my, eraserRadius);
            redrawAll();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            triggerMagnifierRender(clientX, clientY, coord.x, coord.y);
        }

        function eraseMove(e) {
            const coord = getCoordinates(e);
            const mx = coord.x - globalDrawingTranslateX, my = coord.y - globalDrawingTranslateY;
            eraserPointerModel = { x: mx, y: my };

            if (!isErasing) { redrawAll(); return; } 
            if (e.touches && e.touches.length > 1) return;

            e.preventDefault();
            eraseAt(mx, my, eraserRadius);
            redrawAll();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            triggerMagnifierRender(clientX, clientY, coord.x, coord.y);
        }

        function stopErasing() {
            if (!isErasing) return;
            isErasing = false;
            const changed = eraseStrokeSnapshot && JSON.stringify(eraseStrokeSnapshot) !== JSON.stringify(paths);
            if (changed) {
                eraseSnapshotStack.push(eraseStrokeSnapshot);
                eraseRedoStack = [];
                lastActionType = 'erase';
            }
            eraseStrokeSnapshot = null;
            magnifier.style.display = 'none';
            redrawAll();
        }

        function triggerMagnifierRender(screenX, screenY, centerModelX, centerModelY) {
            if (!magnifierEnabled) return;
            magnifier.style.display = 'block';
            magnifier.style.left = (screenX - 70) + 'px';
            magnifier.style.top = (screenY - 160) + 'px'; 

            magCtx.fillStyle = "#ffffff";
            magCtx.fillRect(0, 0, 140, 140);
            
            magCtx.save();
            magCtx.translate(70, 70);
            magCtx.scale(2, 2); 
            magCtx.translate(-centerModelX, -centerModelY);
            
            if (bgImage) magCtx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
            
            magCtx.save();
            magCtx.translate(globalDrawingTranslateX, globalDrawingTranslateY);
            
            let allPaths = [];
            paths.forEach((p, idx) => {
                if (idx === activePathIndex && isDrawing && currentPath.length > 0) {
                    allPaths.push({ type: p.type, points: [...p.points, currentPath[1]] });
                } else {
                    allPaths.push(p);
                }
            });
            if (activePathIndex === null && isDrawing && currentPath.length > 0) {
                allPaths.push({ type: document.getElementById('roadType').value, points: currentPath });
            }
            
            allPaths.forEach(p => {
                const style = roadStyles[p.type];
                if (style.outerWidth <= 0) return;
                magCtx.lineCap = 'butt'; magCtx.lineJoin = 'miter'; magCtx.miterLimit = 10; magCtx.beginPath();
                if (style.isBox) {
                    magCtx.rect(p.points[0].x, p.points[0].y, p.points[1].x - p.points[0].x, p.points[1].y - p.points[0].y);
                } else {
                    magCtx.moveTo(p.points[0].x, p.points[0].y);
                    for (let i = 1; i < p.points.length; i++) magCtx.lineTo(p.points[i].x, p.points[i].y);
                }
                magCtx.lineWidth = style.outerWidth;
                magCtx.strokeStyle = style.outerColor;
                magCtx.setLineDash(style.dash || []);
                magCtx.stroke();
                
                if (style.isElectric) {
                    magCtx.save(); magCtx.font = "12px Arial"; magCtx.fillStyle = "#e67e22";
                    magCtx.textAlign = "center"; magCtx.textBaseline = "middle";
                    for (let i = 0; i < p.points.length - 1; i++) {
                        magCtx.fillText("⚡", (p.points[i].x + p.points[i+1].x) / 2, (p.points[i].y + p.points[i+1].y) / 2);
                    }
                    magCtx.restore();
                }

                if (style.isArrow && p.points.length >= 2) {
                    const tip = p.points[p.points.length - 1];
                    const prev = p.points[p.points.length - 2];
                    drawArrowHead(magCtx, prev.x, prev.y, tip.x, tip.y, style.outerColor);
                }
            });

            allPaths.forEach(p => {
                const style = roadStyles[p.type];
                if (style.innerWidth <= 0 || p.type === 'path' || style.isBox || p.type === 'plotLine') return;
                magCtx.lineCap = 'butt'; magCtx.lineJoin = 'miter'; magCtx.miterLimit = 10; magCtx.beginPath();
                magCtx.moveTo(p.points[0].x, p.points[0].y);
                for (let i = 1; i < p.points.length; i++) magCtx.lineTo(p.points[i].x, p.points[i].y);
                magCtx.lineWidth = style.innerWidth;
                magCtx.strokeStyle = style.innerColor;
                magCtx.setLineDash(style.dash || []);
                magCtx.stroke();
            });
            magCtx.restore();

            const items = document.querySelectorAll('.draggable-item');
            items.forEach(item => {
                const posX = parseFloat(item.style.left);
                const posY = parseFloat(item.style.top);
                
                const textNode = item.querySelector('.draggable-text-style');
                const iconNode = item.querySelector('.draggable-icon-style');
                const svgNode = item.querySelector('.vector-pole-svg');
                const northNode = item.querySelector('.north-arrow-svg');
                const qrCanvas = item.querySelector('.draggable-qrcode-wrapper canvas');
                const labelNode = item.querySelector('.icon-label');
                const sliderNode = item.querySelector('.rotation-slider');
                const angleDeg = sliderNode ? parseInt(sliderNode.value) : 0;
                
                magCtx.save();
                magCtx.translate(posX, posY);
                if(angleDeg !== 0) magCtx.rotate((angleDeg * Math.PI) / 180);
                
                if (textNode) {
                    const compFont = window.getComputedStyle(textNode);
                    magCtx.font = `bold ${compFont.fontSize} Arial`; magCtx.textAlign = "center"; magCtx.textBaseline = "middle";
                    const text = textNode.innerText; const metrics = magCtx.measureText(text);
                    magCtx.fillStyle = "white"; magCtx.fillRect(-metrics.width/2 - 6, -12, metrics.width + 12, 24);
                    magCtx.strokeStyle = "#7f8c8d"; magCtx.lineWidth = 1; magCtx.strokeRect(-metrics.width/2 - 6, -12, metrics.width + 12, 24);
                    magCtx.fillStyle = "black"; magCtx.fillText(text, 0, 0);
                } else if (northNode) {
                    drawNorthArrow(magCtx, 0, 0);
                } else if (svgNode) {
                    drawVectorUtilityPole(magCtx, 0, -6);
                    if (labelNode) {
                        magCtx.font = "bold 11px Arial"; magCtx.fillStyle = "black"; magCtx.textAlign = "center";
                        magCtx.fillText(labelNode.innerText, 0, 18);
                    }
                } else if (qrCanvas) {
                    magCtx.fillStyle = "white"; magCtx.fillRect(-51, -51, 102, 102); 
                    magCtx.drawImage(qrCanvas, -45, -45, 90, 90);
                    if (labelNode) {
                        magCtx.font = "bold 11px Arial"; magCtx.fillStyle = "#c0392b"; magCtx.textAlign = "center";
                        magCtx.fillText(labelNode.innerText, 0, 60);
                    }
                } else if (iconNode) {
                    magCtx.font = "32px Arial"; magCtx.textAlign = "center"; magCtx.textBaseline = "middle"; magCtx.fillStyle = "black";
                    magCtx.fillText(iconNode.innerText, 0, -10);
                    if (labelNode) { magCtx.font = "bold 11px Arial"; magCtx.fillText(labelNode.innerText, 0, 15); }
                }
                magCtx.restore();
            });
            magCtx.restore();
        }

        document.getElementById('bgUploader').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            if (file.type === "application/pdf") {
                reader.onload = function(event) {
                    const typedarray = new Uint8Array(event.target.result);
                    pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                        pdf.getPage(1).then(function(page) {
                            const viewport = page.getViewport({ scale: 2.0 });
                            const renderCanvas = document.createElement('canvas');
                            const rCtx = renderCanvas.getContext('2d');
                            renderCanvas.width = viewport.width;
                            renderCanvas.height = viewport.height;
                            const renderContext = { canvasContext: rCtx, viewport: viewport };
                            page.render(renderContext).promise.then(function() {
                                bgImage = new Image();
                                bgImage.onload = function() { redrawAll(); };
                                bgImage.src = renderCanvas.toDataURL('image/png');
                            });
                        });
                    });
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = function(event) {
                    bgImage = new Image();
                    bgImage.onload = function() { redrawAll(); };
                    bgImage.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        function removeUploadedBackground() {
            if(bgImage) {
                bgImage = null;
                document.getElementById('bgUploader').value = ""; 
                redrawAll();
            }
        }

        function getCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        function startDrawing(e) {
            if (eraseModeOn) { if (e.target === canvas) startErasing(e); return; }
            if (!drawModeOn || e.target !== canvas || e.button === 2) return; 
            if (e.touches && e.touches.length > 1) return;
            
            e.preventDefault(); isDrawing = true;
            let coord = getCoordinates(e);
            
            let targetModelCoord = {
                x: coord.x - globalDrawingTranslateX,
                y: coord.y - globalDrawingTranslateY
            };
            activePathIndex = null;

            if(document.getElementById('straightMode').checked && paths.length > 0) {
                const currentSelectedType = document.getElementById('roadType').value;
                for (let i = paths.length - 1; i >= 0; i--) {
                    if (paths[i].type === currentSelectedType && !roadStyles[currentSelectedType].isBox) {
                        let pts = paths[i].points;
                        let lastPt = pts[pts.length - 1];
                        let distance = Math.hypot(targetModelCoord.x - lastPt.x, targetModelCoord.y - lastPt.y);
                        if (distance < 35) {
                            targetModelCoord = { x: lastPt.x, y: lastPt.y };
                            activePathIndex = i; 
                            break;
                        }
                    }
                }
            }
            currentPath = [targetModelCoord];
            
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            triggerMagnifierRender(clientX, clientY, coord.x, coord.y);
        }

        function draw(e) {
            if (eraseModeOn) { eraseMove(e); return; }
            if (!isDrawing || !drawModeOn) return;
            if (e.touches && e.touches.length > 1) return;
            
            e.preventDefault(); 
            const coord = getCoordinates(e);
            let targetModelCoord = {
                x: coord.x - globalDrawingTranslateX,
                y: coord.y - globalDrawingTranslateY
            };
            
            const activeType = document.getElementById('roadType').value;
            if (roadStyles[activeType].isBox || document.getElementById('straightMode').checked) {
                currentPath = [currentPath[0], targetModelCoord];
            } else {
                currentPath.push(targetModelCoord);
            }
            redrawAll(); 
            
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            triggerMagnifierRender(clientX, clientY, coord.x, coord.y);
        }

        function stopDrawing(e) {
            if (eraseModeOn) { stopErasing(); return; }
            if (isDrawing && currentPath.length > 1) {
                if (activePathIndex !== null) {
                    paths[activePathIndex].points.push(currentPath[1]);
                } else {
                    paths.push({ type: document.getElementById('roadType').value, points: currentPath });
                }
                lastActionType = 'draw';
            }
            isDrawing = false; currentPath = []; activePathIndex = null; magnifier.style.display = 'none'; redrawAll();
        }

        canvas.addEventListener('mouseleave', () => {
            if (eraseModeOn) { eraserPointerModel = null; redrawAll(); }
        });

        canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw); window.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, {passive: false}); canvas.addEventListener('touchmove', draw, {passive: false}); window.addEventListener('touchend', stopDrawing);

        function drawPass(points, type, layer) {
            if (points.length < 2) return;
            const style = roadStyles[type];
            ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.miterLimit = 10;
            ctx.beginPath();
            
            if (style.isBox) {
                let startPt = points[0]; let endPt = points[1];
                ctx.rect(startPt.x, startPt.y, endPt.x - startPt.x, endPt.y - startPt.y);
            } else {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            }

            if (layer === 'outer' && style.outerWidth > 0) {
                ctx.lineWidth = style.outerWidth;
                ctx.strokeStyle = style.outerColor;
                ctx.setLineDash(style.dash || []);
                ctx.stroke();

                if (style.isElectric) {
                    ctx.save(); ctx.font = "12px Arial"; ctx.fillStyle = "#e67e22";
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    for (let i = 0; i < points.length - 1; i++) {
                        let p1 = points[i]; let p2 = points[i+1];
                        ctx.fillText("⚡", (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
                    }
                    ctx.restore();
                }

                if (style.isArrow && points.length >= 2) {
                    const tip = points[points.length - 1];
                    const prev = points[points.length - 2];
                    drawArrowHead(ctx, prev.x, prev.y, tip.x, tip.y, style.outerColor);
                }
            }
            
            if (layer === 'inner' && style.innerWidth > 0 && type !== 'path' && !style.isBox && type !== 'plotLine') {
                ctx.lineWidth = style.innerWidth;
                ctx.strokeStyle = style.innerColor;
                ctx.setLineDash(style.dash || []);
                ctx.stroke();
            }
        }

        function drawVectorUtilityPole(pCtx, x, y) {
            pCtx.save(); pCtx.strokeStyle = "black"; pCtx.fillStyle = "black"; pCtx.lineWidth = 2.5;
            pCtx.beginPath(); pCtx.moveTo(x, y + 16); pCtx.lineTo(x, y - 18); pCtx.stroke();
            pCtx.lineWidth = 3.5; pCtx.beginPath(); pCtx.moveTo(x - 16, y - 10); pCtx.lineTo(x + 16, y - 10); pCtx.stroke();
            pCtx.lineWidth = 2; pCtx.beginPath(); pCtx.moveTo(x - 8, y - 17); pCtx.lineTo(x + 8, y - 17); pCtx.stroke();
            pCtx.lineWidth = 1;
            const insulatorPositions = [
                {rx: x - 14, ry: y - 12}, {rx: x - 5, ry: y - 19},
                {rx: x + 5, ry: y - 19}, {rx: x + 14, ry: y - 12}
            ];
            insulatorPositions.forEach(pos => {
                pCtx.beginPath(); pCtx.arc(pos.rx, pos.ry, 2, 0, Math.PI * 2); pCtx.stroke();
            });
            pCtx.fillRect(x + 2, y - 4, 7, 9); pCtx.restore();
        }

        function drawNorthArrow(pCtx, x, y) {
            pCtx.save();
            pCtx.translate(x, y);
            pCtx.font = "bold 22px Arial";
            pCtx.fillStyle = "black";
            pCtx.textAlign = "center";
            pCtx.textBaseline = "middle";
            pCtx.fillText("N", 0, -30);
            
            pCtx.beginPath();
            pCtx.moveTo(0, -15);
            pCtx.lineTo(-12, 25);
            pCtx.lineTo(0, 15);
            pCtx.closePath();
            pCtx.fillStyle = "black";
            pCtx.fill();
            
            pCtx.beginPath();
            pCtx.moveTo(0, -15);
            pCtx.lineTo(12, 25);
            pCtx.lineTo(0, 15);
            pCtx.closePath();
            pCtx.fillStyle = "white";
            pCtx.fill();
            pCtx.stroke();
            
            pCtx.restore();
        }

        function performRedraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
            
            ctx.save();
            ctx.translate(globalDrawingTranslateX, globalDrawingTranslateY);
            let allPaths = [];
            paths.forEach((p, idx) => {
                if (idx === activePathIndex && isDrawing && currentPath.length > 0) {
                    allPaths.push({ type: p.type, points: [...p.points, currentPath[1]] });
                } else {
                    allPaths.push(p);
                }
            });
            if (activePathIndex === null && isDrawing && currentPath.length > 0) {
                allPaths.push({ type: document.getElementById('roadType').value, points: currentPath });
            }
            allPaths.forEach(p => drawPass(p.points, p.type, 'outer'));
            allPaths.forEach(p => drawPass(p.points, p.type, 'inner'));

            if (eraseModeOn && eraserPointerModel) {
                ctx.save();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(eraserPointerModel.x, eraserPointerModel.y, eraserRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        let redoStack = [];
        function undoLast() { 
            if (lastActionType === 'erase' && eraseSnapshotStack.length > 0) {
                eraseRedoStack.push(deepClonePaths(paths));
                paths = eraseSnapshotStack.pop();
                lastActionType = eraseSnapshotStack.length > 0 ? 'erase' : null;
                lastUndoWasErase = true;
                redrawAll();
                return;
            }
            if(paths.length === 0) return;
            let lastPath = paths[paths.length - 1];
            if(lastPath.points.length > 2) {
                redoStack.push({ type: 'point', pathIndex: paths.length - 1, point: lastPath.points.pop() });
            } else {
                redoStack.push({ type: 'path', path: paths.pop() });
            }
            lastUndoWasErase = false;
            redrawAll(); 
        }

        function redoLast() {
            if (lastUndoWasErase && eraseRedoStack.length > 0) {
                eraseSnapshotStack.push(deepClonePaths(paths));
                paths = eraseRedoStack.pop();
                lastActionType = 'erase';
                if (eraseRedoStack.length === 0) lastUndoWasErase = false;
                redrawAll();
                return;
            }
            if(redoStack.length === 0) return;
            const item = redoStack.pop();
            if(item.type === 'path') {
                paths.push(item.path);
            } else if(item.type === 'point') {
                if(paths[item.pathIndex]) paths[item.pathIndex].points.push(item.point);
            }
            redrawAll();
        }

        let itemRedoStack = [];

        const itemContainer = document.getElementById('canvasContainer');
        let draggedElement = null;

        function makeElementDraggable(el) {
            el.addEventListener('mousedown', startDrag); 
            el.addEventListener('touchstart', startDrag, {passive: false});
        }

        function startDrag(e) {
            if(drawModeOn || eraseModeOn || offSubMode !== 'items' || e.target.className === 'delete-btn' || e.target.className === 'rotation-slider' || e.button === 2) return; 
            if(e.touches && e.touches.length > 1) return;
            
            e.preventDefault(); 
            draggedElement = this;
            
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const modelCoord = getCoordinates(e);
            triggerMagnifierRender(clientX, clientY, modelCoord.x, modelCoord.y);
        }

        wrapper.addEventListener('mousedown', (e) => {
            if (offSubMode !== 'items' || drawModeOn || eraseModeOn) {
                if (e.button === 2 && currentDeviceMode === "pc" && !drawModeOn) {
                    isPanning = true; wrapper.style.cursor = "grabbing";
                    startX = e.clientX - panX; startY = e.clientY - panY;
                }
                return;
            }
            if (e.target === canvas && e.button === 0) {
                isMovingDrawingBlock = true;
                canvas.style.cursor = "move";
                const rect = itemContainer.getBoundingClientRect();
                blockOffsetX = (e.clientX - rect.left) / zoomScale - globalDrawingTranslateX;
                blockOffsetY = (e.clientY - rect.top) / zoomScale - globalDrawingTranslateY;
            } else if (e.button === 2 && currentDeviceMode === "pc") {
                isPanning = true; wrapper.style.cursor = "grabbing";
                startX = e.clientX - panX; startY = e.clientY - panY;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isPanning && currentDeviceMode === "pc") {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                updateTransform();
            } else if (isMovingDrawingBlock) {
                const rect = itemContainer.getBoundingClientRect();
                globalDrawingTranslateX = (e.clientX - rect.left) / zoomScale - blockOffsetX;
                globalDrawingTranslateY = (e.clientY - rect.top) / zoomScale - blockOffsetY;
                redrawAll();
            } else if (draggedElement) {
                e.preventDefault();
                const containerRect = itemContainer.getBoundingClientRect();
                let x = (e.clientX - containerRect.left) / zoomScale;
                let y = (e.clientY - containerRect.top) / zoomScale;
                draggedElement.style.left = x + 'px'; draggedElement.style.top = y + 'px';
                
                const modelCoord = getCoordinates(e);
                triggerMagnifierRender(e.clientX, e.clientY, modelCoord.x, modelCoord.y);
            }
        });

        window.addEventListener('mouseup', () => {
            isPanning = false; isMovingDrawingBlock = false; wrapper.style.cursor = "default"; canvas.style.cursor = "default";
            draggedElement = null; magnifier.style.display = 'none';
        });

        wrapper.addEventListener('touchstart', (e) => {
            if (offSubMode !== 'items' || drawModeOn || eraseModeOn || e.touches.length !== 1) return;
            if (e.target === canvas) {
                isMovingDrawingBlock = true;
                const rect = itemContainer.getBoundingClientRect();
                blockOffsetX = (e.touches[0].clientX - rect.left) / zoomScale - globalDrawingTranslateX;
                blockOffsetY = (e.touches[0].clientY - rect.top) / zoomScale - globalDrawingTranslateY;
            }
        }, {passive: false});

        wrapper.addEventListener('touchmove', (e) => {
            if (drawModeOn || eraseModeOn || e.touches.length !== 1) return;
            if (isMovingDrawingBlock) {
                e.preventDefault();
                const rect = itemContainer.getBoundingClientRect();
                globalDrawingTranslateX = (e.touches[0].clientX - rect.left) / zoomScale - blockOffsetX;
                globalDrawingTranslateY = (e.touches[0].clientY - rect.top) / zoomScale - blockOffsetY;
                redrawAll();
            } else if (draggedElement) {
                e.preventDefault();
                const containerRect = itemContainer.getBoundingClientRect();
                let x = (e.touches[0].clientX - containerRect.left) / zoomScale;
                let y = (e.touches[0].clientY - containerRect.top) / zoomScale;
                draggedElement.style.left = x + 'px'; draggedElement.style.top = y + 'px';
                
                const modelCoord = getCoordinates(e);
                triggerMagnifierRender(e.touches[0].clientX, e.touches[0].clientY, modelCoord.x, modelCoord.y);
            }
        }, {passive: false});

        wrapper.addEventListener('touchend', () => { isMovingDrawingBlock = false; draggedElement = null; magnifier.style.display = 'none'; });

        function undoLastItem() {
            const items = document.querySelectorAll('.draggable-item');
            if (items.length > 0) {
                const last = items[items.length - 1];
                itemRedoStack.push({ html: last.outerHTML, left: last.style.left, top: last.style.top });
                last.remove();
            }
        }

        function redoLastItem() {
            if (itemRedoStack.length === 0) return;
            const saved = itemRedoStack.pop();
            const temp = document.createElement('div');
            temp.innerHTML = saved.html;
            const el = temp.firstChild;
            makeElementDraggable(el);
            el.querySelectorAll('.editable-label').forEach(span => {
                span.ondblclick = function() { editLabel(this); };
            });
            itemContainer.appendChild(el);
        }

        function addIcon() {
            const val = document.getElementById('iconSelect').value.split('|');
            const sizeVal = document.getElementById('iconSizeSelect').value;
            const labelFs = document.getElementById('labelFontSize').value;
            const sizePx = sizeVal === 'large' ? '42px' : sizeVal === 'small' ? '22px' : '32px';
            const svgSize = sizeVal === 'large' ? '60px' : sizeVal === 'small' ? '30px' : '45px';
            const northSize = sizeVal === 'large' ? '70px' : sizeVal === 'small' ? '35px' : '50px';
            const el = document.createElement('div'); el.className = 'draggable-item';
            el.style.left = '50%'; el.style.top = '50%';
            const displayState = rotateTabActive ? "block" : "none";
            const defaultLabel = val[1];

            if (val[0] === "UTILITY_POLE") {
                el.innerHTML = `
                    <div class="rotate-wrapper">
                        <svg class="vector-pole-svg" viewBox="0 0 40 40" style="width:${svgSize};height:${svgSize};">
                            <line x1="20" y1="36" x2="20" y2="4" stroke="black" stroke-width="2.5" />
                            <line x1="4" y1="12" x2="36" y2="12" stroke="black" stroke-width="3.5" />
                            <line x1="12" y1="6" x2="28" y2="6" stroke="black" stroke-width="2" />
                            <circle cx="6" cy="10" r="1.5" stroke="black" stroke-width="1" fill="none" />
                            <circle cx="15" cy="4" r="1.5" stroke="black" stroke-width="1" fill="none" />
                            <circle cx="25" cy="4" r="1.5" stroke="black" stroke-width="1" fill="none" />
                            <circle cx="34" cy="10" r="1.5" stroke="black" stroke-width="1" fill="none" />
                            <rect x="22" y="16" width="7" height="9" fill="black" />
                        </svg>
                        <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display: ${displayState};" oninput="rotateElement(this)">
                    </div>
                    <span class="icon-label editable-label" style="font-size:${labelFs};" ondblclick="editLabel(this)" title="Double-click to edit">${defaultLabel}</span>
                    <div class="delete-btn" onclick="this.parentElement.remove()">X</div>
                `;
            } else if (val[0] === "DIR_ARROW") {
                const arrowW = sizeVal === 'large' ? '120px' : sizeVal === 'small' ? '70px' : '90px';
                el.innerHTML = `
                    <div class="rotate-wrapper">
                        <svg class="direction-arrow-svg" viewBox="0 0 100 50" style="width:${arrowW};height:calc(${arrowW} * 0.5);">
                            <defs>
                                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                    <polygon points="0 0, 8 3, 0 6" fill="black"/>
                                </marker>
                            </defs>
                            <line x1="5" y1="25" x2="88" y2="25" stroke="black" stroke-width="3" marker-end="url(#arrowhead)"/>
                        </svg>
                        <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display: ${displayState};" oninput="rotateElement(this)">
                    </div>
                    <span class="icon-label editable-label" style="font-size:${labelFs};text-align:center;display:block;" ondblclick="editLabel(this)" title="Double-click to edit">${defaultLabel}</span>
                    <div class="delete-btn" onclick="this.parentElement.remove()">X</div>
                `;
            } else if (val[0] === "NORTH_ARROW") {
                el.innerHTML = `
                    <div class="rotate-wrapper">
                        <svg class="north-arrow-svg" viewBox="-20 -50 40 80" style="width:${northSize};height:calc(${northSize} * 1.6);">
                            <text x="0" y="-30" font-family="Arial" font-size="22" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="black">N</text>
                            <polygon points="0,-15 -12,25 0,15" fill="black"/>
                            <polygon points="0,-15 12,25 0,15" fill="white" stroke="black" stroke-width="1"/>
                        </svg>
                        <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display: ${displayState};" oninput="rotateElement(this)">
                    </div>
                    <div class="delete-btn" onclick="this.parentElement.remove()">X</div>
                `;
            } else {
                el.innerHTML = `
                    <div class="rotate-wrapper">
                        <div class="draggable-icon-style" style="font-size: ${sizePx};">${val[0]}</div>
                        <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display: ${displayState};" oninput="rotateElement(this)">
                    </div>
                    <span class="icon-label editable-label" style="font-size:${labelFs};" ondblclick="editLabel(this)" title="Double-click to edit">${defaultLabel}</span>
                    <div class="delete-btn" onclick="this.parentElement.remove()">X</div>
                `;
            }
            makeElementDraggable(el); itemContainer.appendChild(el);
        }

        function editLabel(span) {
            const current = span.innerText;
            const currentFs = span.style.fontSize || '11px';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.placeholder = 'ശൂന്യമാക്കി Enter — label മറയും';
            input.style.cssText = `font-size:${currentFs};font-weight:bold;width:100px;padding:1px 3px;border:1px solid #1a73e8;border-radius:3px;text-align:center;`;
            span.replaceWith(input);
            input.focus();
            input.select();
            function commitEdit() {
                const newSpan = document.createElement('span');
                newSpan.className = 'icon-label editable-label';
                newSpan.title = 'Double-click to edit';
                newSpan.style.fontSize = currentFs;
                const newVal = input.value.trim();
                newSpan.innerText = newVal;
                if (!newVal) {
                    newSpan.style.display = 'none';
                } else {
                    newSpan.style.display = 'block';
                }
                newSpan.ondblclick = function() {
                    this.style.display = 'block';
                    editLabel(this);
                };
                input.replaceWith(newSpan);
            }
            input.addEventListener('blur', commitEdit);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = current; input.blur(); } });
        }

        function addCustomText() {
            const textValue = document.getElementById('customTextInput').value.trim();
            const fontSize = document.getElementById('fontSizeSelect').value;
            if (textValue === "") return;

            const el = document.createElement('div'); el.className = 'draggable-item';
            el.style.left = '50%'; el.style.top = '50%';
            const displayState = rotateTabActive ? "block" : "none";

            el.innerHTML = `
                <div class="rotate-wrapper">
                    <div class="draggable-text-style" style="font-size: ${fontSize};">${textValue}</div>
                    <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display: ${displayState};" oninput="rotateElement(this)">
                </div>
                <div class="delete-btn" onclick="this.parentElement.remove()">X</div>
            `;
            makeElementDraggable(el); itemContainer.appendChild(el);
            document.getElementById('customTextInput').value = ""; 
        }

        function addGoogleMapQRCode() {
            const linkUrl = document.getElementById('mapLinkInput').value.trim();
            if(linkUrl === "") { alert("Please paste a valid Google Map Link URL first!"); return; }

            const el = document.createElement('div'); el.className = 'draggable-item';
            el.style.left = '50%'; el.style.top = '50%';
            const displayState = rotateTabActive ? "block" : "none";

            el.innerHTML = `
                <div class="rotate-wrapper">
                    <div class="draggable-qrcode-wrapper">
                        <div class="qr-target-container"></div>
                    </div>
                    <span class="icon-label" style="color: #c0392b;">📍 Scan for Location</span>
                    <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display: ${displayState};" oninput="rotateElement(this)">
                </div>
                <div class="delete-btn" onclick="this.parentElement.remove()">X</div>
            `;

            const qrTarget = el.querySelector('.qr-target-container');
            new QRCode(qrTarget, {
                text: linkUrl, width: 90, height: 90,
                colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
            });

            makeElementDraggable(el); itemContainer.appendChild(el);
            document.getElementById('mapLinkInput').value = ""; 
        }

        function rotateElement(slider) {
            slider.previousElementSibling.style.transform = `rotate(${slider.value}deg)`;
        }

        function resetSketchState() {
            paths = []; bgImage = null; activePathIndex = null;
            globalDrawingTranslateX = 0; globalDrawingTranslateY = 0;
            document.getElementById('bgUploader').value = ""; redrawAll();
            document.querySelectorAll('.draggable-item').forEach(item => item.remove());
            resetZoomAndPan(); setSubMode('items');
            if (rotateTabActive) toggleRotateTab();
        }

        function clearMap() {
            if(confirm("Are you sure you want to clear the sketch?")) {
                resetSketchState();
            }
        }

        function compileAndSavePDF() {
            const pdfCanvas = document.createElement('canvas');
            pdfCanvas.width = pageTargetWidth; pdfCanvas.height = pageTargetHeight;
            const pCtx = pdfCanvas.getContext('2d');
            pCtx.fillStyle = '#ffffff'; pCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
            pCtx.drawImage(canvas, 0, 0);
            
            const items = document.querySelectorAll('.draggable-item');
            items.forEach(item => {
                const posX = parseFloat(item.style.left); const posY = parseFloat(item.style.top);
                const textNode = item.querySelector('.draggable-text-style');
                const iconNode = item.querySelector('.draggable-icon-style');
                const svgNode = item.querySelector('.vector-pole-svg');
                const northNode = item.querySelector('.north-arrow-svg');
                const dirArrowNode = item.querySelector('.direction-arrow-svg');
                const qrCanvas = item.querySelector('.draggable-qrcode-wrapper canvas');
                const labelNode = item.querySelector('.icon-label');
                const sliderNode = item.querySelector('.rotation-slider');
                const angleDeg = sliderNode ? parseInt(sliderNode.value) : 0;
                
                pCtx.save(); pCtx.translate(posX, posY);
                if(angleDeg !== 0) pCtx.rotate((angleDeg * Math.PI) / 180);
                
                if (textNode) {
                    const compFont = window.getComputedStyle(textNode);
                    pCtx.font = `bold ${compFont.fontSize} Arial`; pCtx.textAlign = "center"; pCtx.textBaseline = "middle";
                    const text = textNode.innerText; const metrics = pCtx.measureText(text);
                    pCtx.fillStyle = "white"; pCtx.fillRect(-metrics.width/2 - 6, -12, metrics.width + 12, 24);
                    pCtx.fillStyle = "black"; pCtx.fillText(text, 0, 0);
                } else if (dirArrowNode) {
                    const arrowLen = 90;
                    pCtx.strokeStyle = "black"; pCtx.lineWidth = 3;
                    pCtx.beginPath(); pCtx.moveTo(-arrowLen/2, 0); pCtx.lineTo(arrowLen/2 - 8, 0); pCtx.stroke();
                    pCtx.fillStyle = "black"; pCtx.beginPath();
                    pCtx.moveTo(arrowLen/2, 0); pCtx.lineTo(arrowLen/2 - 10, -5); pCtx.lineTo(arrowLen/2 - 10, 5);
                    pCtx.closePath(); pCtx.fill();
                    if (labelNode) {
                        pCtx.font = "bold 11px Arial"; pCtx.fillStyle = "black"; pCtx.textAlign = "center";
                        pCtx.fillText(labelNode.innerText, 0, 18);
                    }
                } else if (northNode) {
                    drawNorthArrow(pCtx, 0, 0);
                } else if (svgNode) {
                    drawVectorUtilityPole(pCtx, 0, -6);
                    if (labelNode) {
                        pCtx.font = "bold 11px Arial"; pCtx.fillStyle = "black"; pCtx.textAlign = "center";
                        pCtx.fillText(labelNode.innerText, 0, 18);
                    }
                } else if (qrCanvas) {
                    pCtx.fillStyle = "white"; pCtx.fillRect(-51, -51, 102, 102); 
                    pCtx.drawImage(qrCanvas, -45, -45, 90, 90);
                    if (labelNode) {
                        pCtx.font = "bold 11px Arial"; pCtx.fillStyle = "#c0392b"; pCtx.textAlign = "center";
                        pCtx.fillText(labelNode.innerText, 0, 60);
                    }
                } else if (iconNode) {
                    pCtx.font = "32px Arial"; pCtx.textAlign = "center"; pCtx.textBaseline = "middle"; pCtx.fillStyle = "black";
                    pCtx.fillText(iconNode.innerText, 0, -10);
                    if (labelNode) { pCtx.font = "bold 11px Arial"; pCtx.fillText(labelNode.innerText, 0, 15); }
                }
                pCtx.restore();
            });
            
            const imgData = pdfCanvas.toDataURL('image/jpeg', 1.0);
            const { jsPDF } = window.jspdf;
            
            const currentOrientation = document.getElementById('pageOrientation').value;
            const doc = new jsPDF({ 
                orientation: currentOrientation, 
                unit: 'mm', 
                format: 'a4' 
            });
            
            const pdfW = currentOrientation === 'landscape' ? 297 : 210;
            const pdfH = currentOrientation === 'landscape' ? 210 : 297;
            
            doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
            doc.save('Location_Sketch_With_PDF.pdf');
            pdfSavedSuccessfully = true;
            clearAutoSave();
        }

        (function initOnlineUsersCounter() {
            const countEl = document.getElementById('onlineUsersCount');
            if (!countEl) return;

            let base = parseInt(sessionStorage.getItem('lsm_online_base') || '', 10);
            if (!base || isNaN(base)) {
                base = 6 + Math.floor(Math.random() * 14); 
                sessionStorage.setItem('lsm_online_base', String(base));
            }
            let current = base;
            countEl.textContent = current;

            setInterval(() => {
                const drift = Math.floor(Math.random() * 3) - 1; 
                current = Math.max(3, current + drift);
                if (Math.random() < 0.08) current += Math.floor(Math.random() * 3); 
                countEl.textContent = current;
            }, 4000 + Math.random() * 3000);
        })();

        const AUTOSAVE_KEY = 'lsm_autosave_v1';
        let pdfSavedSuccessfully = false;

        function serializeSketchState() {
            const itemsData = Array.from(document.querySelectorAll('.draggable-item')).map(el => ({
                html: el.outerHTML,
                left: el.style.left,
                top: el.style.top
            }));
            return {
                paths: paths,
                bgImageSrc: bgImage ? bgImage.src : null,
                items: itemsData,
                pageOrientation: document.getElementById('pageOrientation') ? document.getElementById('pageOrientation').value : 'portrait',
                globalDrawingTranslateX: globalDrawingTranslateX,
                globalDrawingTranslateY: globalDrawingTranslateY,
                savedAt: Date.now()
            };
        }

        function saveAutoSnapshot() {
            if (pdfSavedSuccessfully) return; 
            try {
                const hasContent = paths.length > 0 || bgImage || document.querySelectorAll('.draggable-item').length > 0;
                if (!hasContent) { clearAutoSave(); return; }
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializeSketchState()));
            } catch (err) {
                console.warn('Autosave failed (storage may be full):', err);
            }
        }

        function clearAutoSave() {
            try { localStorage.removeItem(AUTOSAVE_KEY); } catch (err) {}
        }

        function restoreFromSnapshot(data) {
            paths = data.paths || [];
            globalDrawingTranslateX = data.globalDrawingTranslateX || 0;
            globalDrawingTranslateY = data.globalDrawingTranslateY || 0;

            if (data.pageOrientation && document.getElementById('pageOrientation')) {
                document.getElementById('pageOrientation').value = data.pageOrientation;
                changePageOrientation();
            }

            (data.items || []).forEach(saved => {
                const temp = document.createElement('div');
                temp.innerHTML = saved.html;
                const el = temp.firstChild;
                if (!el) return;
                el.style.left = saved.left;
                el.style.top = saved.top;
                makeElementDraggable(el);
                el.querySelectorAll('.editable-label').forEach(span => {
                    span.ondblclick = function() { editLabel(this); };
                });
                itemContainer.appendChild(el);
            });

            if (data.bgImageSrc) {
                bgImage = new Image();
                bgImage.onload = function() { redrawAll(); };
                bgImage.src = data.bgImageSrc;
            } else {
                redrawAll();
            }
        }

        function checkForAutoSavedWork() {
            let raw;
            try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (err) { return; }
            if (!raw) return;
            let data;
            try { data = JSON.parse(raw); } catch (err) { clearAutoSave(); return; }

            const minutesAgo = Math.max(1, Math.round((Date.now() - (data.savedAt || 0)) / 60000));
            const wantsRestore = confirm(
                `An unsaved sketch was found from your last session (${minutesAgo} min ago), ` +
                `which was closed before saving as PDF.\n\nRestore that work now?`
            );
            if (wantsRestore) {
                restoreFromSnapshot(data);
            } else {
                clearAutoSave();
            }
        }

        setInterval(saveAutoSnapshot, 8000);

        window.addEventListener('beforeunload', () => {
            saveAutoSnapshot();
        });

        window.addEventListener('load', () => {
            setTimeout(checkForAutoSavedWork, 600);
        });

        const PX_TO_MM = 25.4 / 96;
        function pxToMm(v) { return v * PX_TO_MM; }
        function mmToPx(v) { return v * (96 / 25.4); }

        function modelToDxf(x, y, tx, ty) {
            const fx = x + (tx || 0);
            const fy = y + (ty || 0);
            return { x: pxToMm(fx), y: pxToMm(pageTargetHeight - fy) };
        }
        function dxfToModel(dx, dy) {
            return { x: mmToPx(dx), y: pageTargetHeight - mmToPx(dy) };
        }
        function rotatePointDeg(px_, py_, cx, cy, deg) {
            const rad = deg * Math.PI / 180;
            const dx = px_ - cx, dy = py_ - cy;
            return {
                x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
                y: cy + dx * Math.sin(rad) + dy * Math.cos(rad)
            };
        }
        function sanitizeDxfText(t) { return String(t == null ? '' : t).replace(/[\r\n]/g, ' ').trim() || '.'; }

        function dxfPolyline(layer, pts, closed) {
            const out = ['0', 'LWPOLYLINE', '8', layer, '90', String(pts.length), '70', closed ? '1' : '0'];
            pts.forEach(p => { out.push('10', p.x.toFixed(3), '20', p.y.toFixed(3)); });
            return out;
        }
        function dxfLine(layer, p1, p2) {
            return ['0', 'LINE', '8', layer, '10', p1.x.toFixed(3), '20', p1.y.toFixed(3), '11', p2.x.toFixed(3), '21', p2.y.toFixed(3)];
        }
        function dxfText(layer, pos, heightMm, text, rotationDeg) {
            return ['0', 'TEXT', '8', layer, '10', pos.x.toFixed(3), '20', pos.y.toFixed(3),
                    '40', heightMm.toFixed(3), '1', sanitizeDxfText(text), '50', (rotationDeg || 0).toFixed(2)];
        }

        const DXF_LAYER_DEFS = [
            ['ROAD_NH', 7], ['ROAD_SH', 7], ['ROAD_PWD', 7], ['ROAD_PANCHAYAT', 7], ['ROAD_MUD', 30],
            ['ROAD_PATH', 7], ['ROAD_STREAM', 5], ['ROAD_RAILWAY', 7], ['ROAD_ELECTRICLINE', 30],
            ['ROAD_PLOTLINE', 1], ['ROAD_SQUAREPLOT', 1], ['ROAD_POINTERARROW', 7],
            ['ICONS', 7], ['LABELS', 7], ['CUSTOM_TEXT', 7], ['DIR_ARROW', 7], ['DIR_ARROW_LABEL', 7],
            ['NORTH_ARROW', 7], ['UTILITY_POLE', 7], ['UTILITY_POLE_LABEL', 7], ['QR_MARKER', 3], ['QR_LABEL', 3]
        ];

        function buildDXFEntities() {
            const entityLines = [];

            paths.forEach(p => {
                const style = roadStyles[p.type];
                if (!style) return;
                const layer = 'ROAD_' + p.type.toUpperCase();
                if (style.isBox && p.points.length >= 2) {
                    const p0 = p.points[0], p1 = p.points[1];
                    const corners = [
                        { x: p0.x, y: p0.y }, { x: p1.x, y: p0.y },
                        { x: p1.x, y: p1.y }, { x: p0.x, y: p1.y }
                    ].map(pt => modelToDxf(pt.x, pt.y, globalDrawingTranslateX, globalDrawingTranslateY));
                    entityLines.push(...dxfPolyline(layer, corners, true));
                } else if (p.points.length >= 2) {
                    const pts = p.points.map(pt => modelToDxf(pt.x, pt.y, globalDrawingTranslateX, globalDrawingTranslateY));
                    entityLines.push(...dxfPolyline(layer, pts, false));
                }
            });

            document.querySelectorAll('.draggable-item').forEach(item => {
                const posX = parseFloat(item.style.left) || 0;
                const posY = parseFloat(item.style.top) || 0;
                const sliderNode = item.querySelector('.rotation-slider');
                const angleDeg = sliderNode ? parseInt(sliderNode.value) : 0;
                const dxfAngle = -angleDeg;
                const textNode = item.querySelector('.draggable-text-style');
                const iconNode = item.querySelector('.draggable-icon-style');
                const svgNode = item.querySelector('.vector-pole-svg');
                const northNode = item.querySelector('.north-arrow-svg');
                const dirArrowNode = item.querySelector('.direction-arrow-svg');
                const qrCanvas = item.querySelector('.draggable-qrcode-wrapper canvas');
                const labelNode = item.querySelector('.icon-label');
                const basePos = modelToDxf(posX, posY);
                const labelText = labelNode ? labelNode.innerText : '';

                if (textNode) {
                    entityLines.push(...dxfText('CUSTOM_TEXT', basePos, 4, textNode.innerText, dxfAngle));
                } else if (dirArrowNode) {
                    const half = 45;
                    const p1 = rotatePointDeg(posX - half, posY, posX, posY, angleDeg);
                    const p2 = rotatePointDeg(posX + half, posY, posX, posY, angleDeg);
                    entityLines.push(...dxfLine('DIR_ARROW', modelToDxf(p1.x, p1.y), modelToDxf(p2.x, p2.y)));
                    if (labelText) entityLines.push(...dxfText('DIR_ARROW_LABEL', modelToDxf(posX, posY + 20), 3, labelText, 0));
                } else if (northNode) {
                    entityLines.push(...dxfText('NORTH_ARROW', basePos, 6, 'N', dxfAngle));
                } else if (svgNode) {
                    entityLines.push(...dxfText('UTILITY_POLE', basePos, 3, 'POLE', 0));
                    if (labelText) entityLines.push(...dxfText('UTILITY_POLE_LABEL', modelToDxf(posX, posY + 18), 3, labelText, 0));
                } else if (qrCanvas) {
                    entityLines.push(...dxfText('QR_MARKER', basePos, 3, '[QR]', 0));
                    if (labelText) entityLines.push(...dxfText('QR_LABEL', modelToDxf(posX, posY + 60), 3, labelText, 0));
                } else if (iconNode) {
                    entityLines.push(...dxfText('ICONS', basePos, 5, iconNode.innerText, dxfAngle));
                    if (labelText) entityLines.push(...dxfText('LABELS', modelToDxf(posX, posY + 15), 3, labelText, 0));
                }
            });

            return entityLines;
        }

        function buildDXFContent() {
            const lines = [];
            lines.push('999', 'LSM_DXF_EXPORT_BY_Location_Sketch_Maker');

            const stateData = serializeSketchState();
            if (stateData.bgImageSrc && stateData.bgImageSrc.length > 500000) {
                stateData.bgImageSrc = null;
            }
            const jsonStr = JSON.stringify(stateData);
            const CHUNK = 200;
            for (let i = 0; i < jsonStr.length; i += CHUNK) {
                lines.push('999', 'LSMDATA|' + jsonStr.substring(i, i + CHUNK));
            }

            lines.push('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1015', '0', 'ENDSEC');

            lines.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(DXF_LAYER_DEFS.length));
            DXF_LAYER_DEFS.forEach(([name, color]) => {
                lines.push('0', 'LAYER', '2', name, '70', '0', '62', String(color), '6', 'CONTINUOUS');
            });
            lines.push('0', 'ENDTAB', '0', 'ENDSEC');

            lines.push('0', 'SECTION', '2', 'ENTITIES');
            lines.push(...buildDXFEntities());
            lines.push('0', 'ENDSEC', '0', 'EOF');

            return lines.join('\n');
        }

        function generateDxfFilename() {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
            const counterKey = 'lsm_dxf_counter_' + datePart;
            let counter = 1;
            try {
                counter = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
                localStorage.setItem(counterKey, String(counter));
            } catch (err) {}
            return `LocationMap_${datePart}_${timePart}-${counter}.dxf`;
        }

        function saveAsDXF() {
            const defaultName = generateDxfFilename();
            let filename = prompt('DXF ഫയലിന്റെ പേര് നൽകുക (ശൂന്യമായി വിട്ടാൽ default പേര് ഉപയോഗിക്കും):', defaultName);
            if (filename === null) return;
            filename = filename.trim();
            if (!filename) filename = defaultName;
            if (!filename.toLowerCase().endsWith('.dxf')) filename += '.dxf';

            const dxfContent = buildDXFContent();
            const blob = new Blob([dxfContent], { type: 'application/dxf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function parseEmbeddedLSMData(text) {
            const lines = text.split(/\r\n|\r|\n/);
            let json = '';
            for (let i = 0; i < lines.length - 1; i++) {
                if (lines[i].trim() === '999') {
                    const val = lines[i + 1];
                    if (val && val.startsWith('LSMDATA|')) {
                        json += val.substring('LSMDATA|'.length);
                    }
                }
            }
            if (!json) return null;
            try { return JSON.parse(json); } catch (err) { console.warn('LSM DXF data parse failed:', err); return null; }
        }

        function parseGenericDXFLines(text) {
            const raw = text.split(/\r\n|\r|\n/);
            const result = [];
            const roadTypeKeys = Object.keys(roadStyles);
            function layerToRoadType(layerName) {
                if (!layerName) return 'plotLine';
                const cleaned = layerName.toUpperCase().replace('ROAD_', '');
                const found = roadTypeKeys.find(k => k.toUpperCase() === cleaned);
                return found || 'plotLine';
            }
            let i = 0;
            while (i < raw.length - 1) {
                const code = raw[i].trim();
                const nextVal = raw[i + 1] ? raw[i + 1].trim() : '';
                if (code === '0' && (nextVal === 'LWPOLYLINE' || nextVal === 'LINE' || nextVal === 'POLYLINE')) {
                    let j = i + 2, layer = '0', pts = [], pendingX = null;
                    while (j < raw.length - 1 && raw[j].trim() !== '0') {
                        const c = raw[j].trim(); const v = raw[j + 1];
                        if (c === '8') layer = v.trim();
                        else if (c === '10' || c === '11') pendingX = parseFloat(v);
                        else if ((c === '20' || c === '21') && pendingX !== null) {
                            pts.push({ x: pendingX, y: parseFloat(v) }); pendingX = null;
                        }
                        j += 2;
                    }
                    if (pts.length >= 2) {
                        const modelPts = pts.map(p => dxfToModel(p.x, p.y));
                        result.push({ type: layerToRoadType(layer), points: modelPts });
                    }
                    i = j;
                } else {
                    i++;
                }
            }
            return result;
        }

        document.getElementById('dxfUploader').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                const text = ev.target.result;
                const data = parseEmbeddedLSMData(text);
                if (data) {
                    if (confirm('ഈ ടൂൾ ഉപയോഗിച്ചുണ്ടാക്കിയ DXF ആണ് ഇത്. നിലവിലെ സ്കെച്ച് മാറ്റി ഇത് load ചെയ്യണോ?')) {
                        resetSketchState();
                        restoreFromSnapshot(data);
                    }
                } else {
                    if (confirm('ഇത് ഈ ടൂളിൽ ഉണ്ടാക്കിയ DXF അല്ല. റോഡ്/ലൈൻ geometry മാത്രം നിലവിലെ സ്കെച്ചിലേക്ക് ചേർക്കട്ടെ?')) {
                        const fallbackPaths = parseGenericDXFLines(text);
                        if (fallbackPaths.length === 0) {
                            alert('ഈ DXF ഫയലിൽ നിന്ന് വരയ്ക്കാൻ പറ്റിയ line/polyline ഒന്നും കണ്ടെത്താനായില്ല.');
                        } else {
                            paths = paths.concat(fallbackPaths);
                            redrawAll();
                        }
                    }
                }
                document.getElementById('dxfUploader').value = '';
            };
            reader.readAsText(file);
        });

      // ===================== FLOATING RIBBON LOGIC (FAILSAFE) =====================
        
        function toggleFloatingMenu() {
            // എറർ വരാതിരിക്കാൻ ഫംഗ്ഷനുള്ളിൽ വെച്ച് തന്നെ എലമെന്റുകൾ കണ്ടെത്തുന്നു
            const topMenu = document.querySelector('.top-menu');
            
            if(!topMenu) {
                alert("Error: top-menu കണ്ടെത്താനായില്ല! index.html പരിശോധിക്കുക.");
                return;
            }
            
            topMenu.classList.toggle('floating');
            
            if(topMenu.classList.contains('floating')) {
                const rect = topMenu.getBoundingClientRect();
                topMenu.style.left = (window.innerWidth / 2 - rect.width / 2) + 'px';
                topMenu.style.top = '20px';
            } else {
                topMenu.style.left = '';
                topMenu.style.top = '';
            }
            
            setTimeout(() => { resetZoomAndPan(); redrawAll(); }, 150);
        }

        // ഡ്രാഗ് ചെയ്യാനുള്ള സുരക്ഷിതമായ കോഡ്
        document.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.menu-drag-handle');
            if(!handle || e.target.tagName === 'BUTTON') return;
            
            const topMenu = document.querySelector('.top-menu.floating');
            if(!topMenu) return;

            window.isDraggingMenu = true;
            window.menuStartX = e.clientX;
            window.menuStartY = e.clientY;
            window.initialMenuX = topMenu.offsetLeft;
            window.initialMenuY = topMenu.offsetTop;
            document.body.style.userSelect = 'none'; 
        });

        document.addEventListener('mousemove', (e) => {
            if(window.isDraggingMenu) {
                const topMenu = document.querySelector('.top-menu.floating');
                if(topMenu) {
                    const dx = e.clientX - window.menuStartX;
                    const dy = e.clientY - window.menuStartY;
                    topMenu.style.left = (window.initialMenuX + dx) + 'px';
                    topMenu.style.top = (window.initialMenuY + dy) + 'px';
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (window.isDraggingMenu) {
                window.isDraggingMenu = false;
                document.body.style.userSelect = '';
            }
        });
        
        // മൊബൈൽ ടച്ച് സപ്പോർട്ട്
        document.addEventListener('touchstart', (e) => {
            const handle = e.target.closest('.menu-drag-handle');
            if(!handle || e.target.tagName === 'BUTTON' || e.touches.length > 1) return;
            
            const topMenu = document.querySelector('.top-menu.floating');
            if(!topMenu) return;

            window.isDraggingMenu = true;
            window.menuStartX = e.touches[0].clientX;
            window.menuStartY = e.touches[0].clientY;
            window.initialMenuX = topMenu.offsetLeft;
            window.initialMenuY = topMenu.offsetTop;
        }, {passive: false});

        document.addEventListener('touchmove', (e) => {
            if(window.isDraggingMenu) {
                const topMenu = document.querySelector('.top-menu.floating');
                if(topMenu) {
                    e.preventDefault();
                    const dx = e.touches[0].clientX - window.menuStartX;
                    const dy = e.touches[0].clientY - window.menuStartY;
                    topMenu.style.left = (window.initialMenuX + dx) + 'px';
                    topMenu.style.top = (window.initialMenuY + dy) + 'px';
                }
            }
        }, {passive: false});

        document.addEventListener('touchend', () => {
            window.isDraggingMenu = false;
        });
