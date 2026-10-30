        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

        const wrapper = document.getElementById('wrapper');
        const container = document.getElementById('container');
        const a4Page = document.getElementById('a4Page');
        const canvas = document.getElementById('mapCanvas');
        const ctx = canvas.getContext('2d');
        const itemContainer = document.getElementById('canvasContainer');
        const thumbCanvas = document.getElementById('thumbCanvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        const magnifier = document.getElementById('magnifier');
        const magCanvas = document.getElementById('magnifierCanvas');
        const magCtx = magCanvas.getContext('2d');

        let zoomScale = 1;
        let panX = 0;
        let panY = 0;
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let offSubMode = 'items';
        let rotateTabActive = false;
        let currentDeviceMode = 'pc';
        let magnifierEnabled = true;

        let pageTargetWidth = 794;
        let pageTargetHeight = 1123;

        let isMovingDrawingBlock = false;
        let blockOffsetX = 0;
        let blockOffsetY = 0;
        let globalDrawingTranslateX = 0;
        let globalDrawingTranslateY = 0;

        let drawModeOn = false;
        let drawingLockOn = false; // Lock: only select / group / move / resize / delete
        let eraseModeOn = false;
        let isErasing = false;
        let eraserRadius = 20;
        let eraserPointerModel = null;
        let eraseStrokeSnapshot = null;
        let eraseSnapshotStack = [];
        let eraseRedoStack = [];
        let lastActionType = null;
        let lastUndoWasErase = false;

        let isDrawing = false;
        let paths = [];
        let currentPath = [];
        let bgImage = null;
        let activePathIndex = null;
        let multiPointPolyActive = false;

        let activeTextBox = null;
        let selectedDraggableItem = null;

        // Path selection, grouping & move (road / railway as single unit)
        let selectedPathIndices = [];
        // Google Slides-style selection resize
        let isResizingSelection = false;
        let resizeHandleId = null; // nw,n,ne,e,se,s,sw,w
        let resizeStartBounds = null;
        let resizePathSnapshot = null;
        const RESIZE_HANDLE_SIZE = 8;
        let nextGroupId = 1;
        let isMovingSelectedPaths = false;
        let pathMoveStartModel = null;
        let pathMoveSnapshot = null;
        let pathHitTolerance = 14;

        // 12px magnetic snap + node (vertex) editing
        const MAGNETIC_SNAP_PX = 12;
        let nodeEditMode = false;
        let activeNode = null;
        let isDraggingNode = false;
        let nodeDragSnapshot = null;

        // Google Slides-style text tool (click-drag to size)
        let textToolActive = false;
        let isDraggingTextBox = false;
        let textDragStart = null;
        let textDragPreviewEl = null;

        // Marquee multi-select
        let isMarqueeSelecting = false;
        let marqueeStart = null;

        // Toast Helper (replaces native alert)
        let toastTimer = null;
        function showToast(msg) {
            const box = document.getElementById('toastBox');
            box.textContent = msg;
            box.style.display = 'block';
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { box.style.display = 'none'; }, 3200);
        }

        function openModal(id) {
            document.getElementById(id).classList.add('open');
        }
        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        // ================= OFFICIAL KERALA LOCATION SKETCH FORM GENERATOR =================
        function createOfficialTemplateDataURL() {
            // Fallback form matching official "ലൊക്കേഷൻ മാപ്പ്" PDF (no watermark text)
            const W = 794, H = 1123;
            const tCanvas = document.createElement('canvas');
            tCanvas.width = W;
            tCanvas.height = H;
            const tCtx = tCanvas.getContext('2d');

            tCtx.fillStyle = '#ffffff';
            tCtx.fillRect(0, 0, W, H);

            tCtx.strokeStyle = '#111111';
            tCtx.lineWidth = 2;
            tCtx.strokeRect(36, 36, W - 72, H - 72);

            // Title underlined
            tCtx.fillStyle = '#111';
            tCtx.font = 'bold 20px "Noto Sans Malayalam", Arial, sans-serif';
            tCtx.textAlign = 'center';
            tCtx.fillText('ലൊക്കേഷൻ മാപ്പ്', W / 2, 62);
            const tw = tCtx.measureText('ലൊക്കേഷൻ മാപ്പ്').width;
            tCtx.beginPath();
            tCtx.moveTo(W / 2 - tw / 2, 66);
            tCtx.lineTo(W / 2 + tw / 2, 66);
            tCtx.stroke();

            tCtx.font = '13px "Noto Sans Malayalam", Arial, sans-serif';
            tCtx.textAlign = 'left';
            tCtx.fillText('ജില്ല :', 52, 95);
            tCtx.fillText('താലൂക്ക് :', 52, 118);
            tCtx.fillText('വില്ലേജ് :', 52, 141);
            tCtx.fillText('കൈവശം:', 52, 164);
            tCtx.fillText('Doc No & SRO .', 52, 187);

            tCtx.fillText('തണ്ടപ്പേർ :', 420, 95);
            tCtx.fillText('റി. സ. :', 420, 118);
            tCtx.fillText('വിസ്തീർണ്ണം :', 420, 141);

            // Map box (നാലതിരുകൾ inside bottom)
            const mapTop = 205, mapBot = 880;
            tCtx.strokeRect(52, mapTop, W - 104, mapBot - mapTop);

            tCtx.font = 'bold 13px "Noto Sans Malayalam", Arial, sans-serif';
            let fy = mapBot - 110;
            tCtx.fillText('നാലതിരുകൾ', 68, fy);
            tCtx.font = '12px "Noto Sans Malayalam", Arial, sans-serif';
            fy += 22;
            ['കിഴക്ക് :', 'വടക്ക് :', 'പടിഞ്ഞാറ് :', 'തെക്ക് :'].forEach(lab => {
                tCtx.fillText(lab + ' ....................................................', 68, fy);
                fy += 20;
            });

            tCtx.font = '12px "Noto Sans Malayalam", Arial, sans-serif';
            tCtx.fillText('സർട്ടിഫിക്കറ്റ് നൽകുന്ന തീയതി : ........................', 52, mapBot + 28);
            tCtx.fillText('സർട്ടിഫിക്കറ്റ് നൽകുന്ന ഉദ്യോഗസ്ഥന്റെ സ്ഥാനപ്പേര് : ........................', 52, mapBot + 52);
            tCtx.fillText('സർട്ടിഫിക്കറ്റ് എന്താവശ്യത്തിനാണോ ആവശ്യപ്പെട്ടിട്ടുള്ളത്, ആ ആവശ്യത്തിന് മാത്രം', 52, mapBot + 80);
            tCtx.fillText('അനുവദിച്ചിട്ടുള്ളതാണ്.', 52, mapBot + 98);

            tCtx.textAlign = 'right';
            tCtx.fillText('വില്ലേജ് ഓഫീസറുടെ ഒപ്പ്', W - 52, H - 55);

            return tCanvas.toDataURL('image/png');
        }

        function applyKeralaRevenueTemplate() {
            bgImage = new Image();
            bgImage.onload = function() {
                const wm = document.getElementById('bgWatermark');
                if (wm) wm.style.display = 'none';
                redrawAll();
                showToast('ലൊക്കേഷൻ മാപ്പ് template loaded');
            };
            bgImage.onerror = function() {
                bgImage = new Image();
                bgImage.onload = function() {
                    const wm = document.getElementById('bgWatermark');
                    if (wm) wm.style.display = 'none';
                    redrawAll();
                };
                bgImage.src = createOfficialTemplateDataURL();
            };
            bgImage.src = 'template_form.png';
        }

        function loadKeralaRevenueTemplate() {
            // On first app load, hasUserWork is false → no confirm
            if (!hasUserWork()) {
                applyKeralaRevenueTemplate();
                return;
            }
            confirmBeforeReplaceWork('Load official template', function() {
                applyKeralaRevenueTemplate();
            });
        }

        // ================= DROPDOWN MENUS LOGIC =================
        function closeAllDropdowns() {
            document.querySelectorAll('.g-dropdown').forEach(d => d.classList.remove('open'));
            document.querySelectorAll('.g-menu-item').forEach(m => m.classList.remove('active'));
        }

        function openMenuDropdown(e, menuId) {
            e.stopPropagation();
            const menu = document.getElementById(menuId);
            const wasOpen = menu.classList.contains('open');
            closeAllDropdowns();
            if (!wasOpen) {
                openMenuById(menuId, e.currentTarget);
            }
        }

        function openMenuById(menuId, anchorEl) {
            const menu = document.getElementById(menuId);
            if (!menu || !anchorEl) return;
            const rect = anchorEl.getBoundingClientRect();
            menu.classList.add('open');
            let left = rect.left;
            let top = rect.bottom + 4;
            const mWidth = menu.offsetWidth || 280;
            if (left + mWidth > window.innerWidth - 12) {
                left = Math.max(10, window.innerWidth - mWidth - 12);
            }
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }

        window.addEventListener('click', (e) => {
            if (!e.target.closest('.g-dropdown')) {
                closeAllDropdowns();
            }
        });

        // ================= LINE & DOUBLE-LINE ROAD STYLES =================
        const roadStyles = {
            nh:              { outerWidth: 20,  outerColor: '#000000', innerWidth: 16.5, innerColor: '#ffffff', isBox: false, isRoad: true },
            sh:              { outerWidth: 15,  outerColor: '#000000', innerWidth: 11.7, innerColor: '#ffffff', isBox: false, isRoad: true },
            pwd:             { outerWidth: 12,  outerColor: '#000000', innerWidth: 8.7,  innerColor: '#ffffff', isBox: false, isRoad: true },
            panchayat:       { outerWidth: 10,  outerColor: '#000000', innerWidth: 6.7,  innerColor: '#ffffff', isBox: false, isRoad: true },
            mud:             { outerWidth: 8,   outerColor: '#000000', innerWidth: 5.4,  innerColor: '#ffffff', dash: [8, 5], isBox: false, isRoad: true },
            path:            { outerWidth: 1.8, outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', dash: [2, 4], isBox: false, isRoad: true },
            stream:          { outerWidth: 5,   outerColor: '#1769aa', innerWidth: 2.4,  innerColor: '#b8d8ef', isBox: false },
            plotLine:        { outerWidth: 2.2, outerColor: '#d93025', innerWidth: 0,    innerColor: 'transparent', isBox: false },
            railway:         { outerWidth: 1.4, outerColor: '#202020', innerWidth: 0,    innerColor: 'transparent', isBox: false, isRailway: true },
            electricLine:    { outerWidth: 1.6, outerColor: '#333333', innerWidth: 0,    innerColor: 'transparent', dash: [5, 5], isBox: false, isElectric: true },
            squarePlot:      { outerWidth: 2,   outerColor: '#d93025', innerWidth: 0,    innerColor: 'transparent', isBox: true },
            pointerArrow:    { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isArrow: true },
            basicLine:       { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false },
            elbowConnector:  { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isElbow: true },
            curvedConnector: { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isCurvedConn: true },
            curveLine:       { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isSmoothCurve: true, isMultiVertex: true },
            polylineTool:    { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isMultiVertex: true },
            polygonTool:     { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isMultiVertex: true, isPolygon: true },
            scribbleTool:    { outerWidth: 2,   outerColor: '#000000', innerWidth: 0,    innerColor: 'transparent', isBox: false, isFreehand: true }
        };

        function selectDrawingLine(typeKey, labelText) {
            if (drawingLockOn) {
                showToast('Drawing locked — unlock to draw new lines');
                closeAllDropdowns();
                return;
            }
            finishActiveMultiVertexPath();
            clearPathSelection();
            deactivateTextTool();
            document.getElementById('roadType').value = typeKey;
            document.getElementById('activeLineLabel').textContent = labelText;

            document.querySelectorAll('#lineToolsMenu .g-dd-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.line === typeKey);
            });

            if (eraseModeOn) toggleEraserMode();
            drawModeOn = true;
            updateToolButtonsUI();
            closeAllDropdowns();

            const st = roadStyles[typeKey];
            document.getElementById('polyHintBanner').style.display = (st && st.isMultiVertex) ? 'block' : 'none';
        }

        function toggleDrawingLock() {
            drawingLockOn = !drawingLockOn;
            if (drawingLockOn) {
                finishActiveMultiVertexPath();
                deactivateTextTool();
                drawModeOn = false;
                if (eraseModeOn) toggleEraserMode();
                nodeEditMode = false;
                isDraggingNode = false;
                activeNode = null;
                offSubMode = 'items';
                document.getElementById('polyHintBanner').style.display = 'none';
                showToast('🔒 Drawing locked — Select / Group / Move / Resize / Delete only');
            } else {
                showToast('🔓 Drawing unlocked — you can draw again');
            }
            updateToolButtonsUI();
            redrawAll();
        }

        function activateSelectTool() {
            finishActiveMultiVertexPath();
            deactivateTextTool();
            drawModeOn = false;
            if (eraseModeOn) toggleEraserMode();
            offSubMode = 'items';
            updateToolButtonsUI();
            document.getElementById('polyHintBanner').style.display = 'none';
        }

        function activatePanTool() {
            finishActiveMultiVertexPath();
            clearPathSelection();
            deactivateTextTool();
            drawModeOn = false;
            if (eraseModeOn) toggleEraserMode();
            offSubMode = 'page';
            updateToolButtonsUI();
            document.getElementById('polyHintBanner').style.display = 'none';
        }

        function updateToolButtonsUI() {
            const selectBtn = document.getElementById('selectToolBtn');
            const panBtn = document.getElementById('panToolBtn');
            const lineBtn = document.getElementById('lineDropdownBtn');
            const eraserBtn = document.getElementById('eraserToggleBtn');
            const textBtn = document.getElementById('textToolBtn');
            const lockBtn = document.getElementById('drawingLockBtn');

            selectBtn.classList.toggle('active', !drawModeOn && !eraseModeOn && !textToolActive && offSubMode === 'items');
            panBtn.classList.toggle('active', !drawModeOn && !eraseModeOn && !textToolActive && offSubMode === 'page');
            lineBtn.classList.toggle('active', drawModeOn && !drawingLockOn);
            eraserBtn.classList.toggle('active', eraseModeOn && !drawingLockOn);
            if (textBtn) textBtn.classList.toggle('active', textToolActive && !drawingLockOn);
            if (lockBtn) {
                lockBtn.classList.toggle('active', drawingLockOn);
                lockBtn.innerHTML = drawingLockOn ? '🔒 Locked' : '🔓 Lock';
                lockBtn.title = drawingLockOn
                    ? 'Unlock — allow drawing again'
                    : 'Lock drawings — only Select, Group, Move, Resize, Delete';
            }

            if (drawingLockOn) {
                canvas.style.cursor = 'default';
            } else if (drawModeOn || eraseModeOn || textToolActive) {
                canvas.style.cursor = 'crosshair';
            } else if (offSubMode === 'page') {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
        }

        // ================= SURVEY SYMBOLS & SOI CONVENTIONAL SIGNS =================
        const MAP_SYMBOLS = {
            NORTH_ARROW:'<path d="M12 2 4 21l8-5 8 5z"/><path d="M12 2v14"/>',
            DIR_ARROW:'<path d="M2 12h18m-7-7 7 7-7 7"/>',
            PLOT_MARKER:'<path d="M12 2 21 20H3Z"/><circle cx="12" cy="14" r="2.5"/>',
            UTILITY_POLE:'<path d="M12 22V3M4 7h16M7 4h10M5 7l-2 3m16-3 2 3M8 10h8M9 13h6"/>',
            HOUSE:'<path d="M3 11 12 3l9 8M5.5 9.5V21h13V9.5M9 21v-7h6v7"/>',
            BUILDING:'<rect x="5" y="2.5" width="14" height="19" rx="1"/><path d="M8 6h2m4 0h2M8 10h2m4 0h2M8 14h2m4 0h2M10 21v-4h4v4"/>',
            TEMPLE:'<path d="M3 10h18M5 10v10m14-10v10M3 20h18M12 3 4 8h16zM9 14h6M12 10v10"/>',
            MOSQUE:'<path d="M3 20V11h18v9M2 20h20M7 11V8a5 5 0 0 1 10 0v3M12 3V1M6 6 4 4m14 2 2-2M10 20v-5h4v5"/>',
            CHURCH:'<path d="M4 21V10l8-5 8 5v11M2 21h20M12 2v8m-3-5h6M9 21v-6h6v6"/>',
            TREE:'<path d="M12 2 5 11h4l-5 6h6v5h4v-5h6l-5-6h4z"/>',
            COCONUT_TREE:'<path d="M12 21 13 9M13 9C8 7 6 5 5 3c4 0 7 2 8 5 1-4 4-6 7-6-1 4-3 6-7 7M13 9c-3-2-6-2-9-1 2 3 5 4 9 3m0-2c3-2 5-2 8-1-2 3-5 4-8 3"/>',
            POND:'<path d="M3 8c2-2 4 2 6 0s4-2 6 0 4 2 6 0M3 13c2-2 4 2 6 0s4-2 6 0 4 2 6 0M3 18c2-2 4 2 6 0s4-2 6 0 4 2 6 0"/>',
            WELL:'<path d="M4 8h16M6 8v12h12V8M3 20h18M8 5h8M12 2v3M8 12h8"/>',
            JUNCTION:'<circle cx="12" cy="12" r="9"/><path d="M12 3v6m0 6v6M3 12h6m6 0h6"/>',
            PETROL_PUMP:'<rect x="5" y="3" width="11" height="18" rx="1.5"/><path d="M8 6h5v5H8zM16 7h2l2 3v7a2 2 0 0 1-4 0v-5M8 21v-2m5 2v-2"/>',
            HOSPITAL:'<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M10 8h4m-2-2v8M8 21v-5h8v5"/>',
            BANK:'<path d="M2 8h20L12 3zM4 10v8m5-8v8m6-8v8m5-8v8M2 21h20M3 18h18"/>',
            SCHOOL:'<path d="M3 21V8l9-5 9 5v13M2 8h20M8 21v-6h8v6M7 10h2m6 0h2"/>',
            BUS_STOP:'<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M7 7h10v5H7zM7 18l-2 3m12-3 2 3M4 15h16M8 18v1m8-1v1"/>',
            RAILWAY_STATION:'<path d="M7 3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM7 7h10v5H7zM8 19l-3 3m11-3 3 3M8 16h.01M16 16h.01"/>',
            POLICE_STATION:'<path d="M12 2 21 6v6c0 5-4 8-9 10-5-2-9-5-9-10V6z"/><path d="M12 7v10m-5-5h10"/>',
            FIRE_STATION:'<path d="M12 2c2 4-1 5 2 8 1-2 2-3 2-4 4 4 5 7 3 11a8 8 0 0 1-14-1c-1-4 1-7 4-10 0 3 1 4 2 5 2-3 1-6 1-9z"/>',
            VILLAGE_OFFICE:'<path d="M2 9 12 3l10 6M4 10h16M5 10v9m4-9v9m6-9v9m4-9v9M2 21h20M10 14h4"/>',
            PANCHAYAT_OFFICE:'<path d="M3 21V8l9-5 9 5v13M2 8h20M7 12h3m4 0h3M7 16h3m4 0h3M10 21v-3h4v3"/>',
            SHOP:'<path d="M4 10v11h16V10M3 10l2-6h14l2 6M3 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M8 21v-6h5v6"/>',
            MARKET:'<path d="M3 9h18l-2-5H5zM4 9v12h16V9M8 13h8v8"/>',
            POST_OFFICE:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 7 8 6 8-6M3 18l6-6m12 6-6-6"/>',
            MOBILE_TOWER:'<path d="m12 3-7 18m7-18 7 18M8 13h8M6 18h12M10 8h4M3 7a13 13 0 0 1 0 10M21 7a13 13 0 0 0 0 10"/>',
            TRANSFORMER:'<path d="M4 6h16v12H4zM8 6V3m8 3V3M8 18v3m8-3v3M7 9h3v6H7zm7 0h3v6h-3z"/>',
            WATER_TANK:'<path d="M4 8h16l-2 13H6zM3 8h18M7 5h10M9 5V3h6v2M8 12h8"/>',
            WATER_TAP:'<path d="M4 8h12a3 3 0 0 1 3 3v2M8 8V5h8v3M4 5h4M19 13v3m-2-1h4M19 19v2"/>',
            BRIDGE:'<path d="M2 8h20M4 8v12m16-12v12M2 20h20M4 8c2 8 14 8 16 0M8 10v5m8-5v5"/>',
            PARKING:'<circle cx="12" cy="12" r="9"/><path d="M9 18V6h4a4 4 0 0 1 0 8H9"/>',
            FACTORY:'<path d="M3 21V10l6 4V9l6 5V6h3l3 4v11zM6 18h2m3 0h2m3 0h2M15 3h3"/>',
            CONSTRUCTION:'<path d="M3 21h18M6 21V8h12v13M4 8h16M8 8V4h8v4M9 12h6m-6 4h6"/>',
            FOREST:'<path d="M7 2 2 10h3l-3 5h5v6h4v-6h4l-3-5h3L10 2zM17 7l-4 6h3l-2 4h4v4h3v-4h2l-2-4h2z"/>',
            CEMETERY:'<path d="M7 21V9a3 3 0 0 1 6 0v12M4 21h12M15 21V12a3 3 0 0 1 6 0v9M17 14h2"/>',
            FARM:'<path d="M3 21V10l9-6 9 6v11M2 21h20M8 21v-6h8v6M6 11h3m6 0h3"/>',
            CATTLE_FARM:'<path d="M4 11 3 7l4 2h10l4-2-1 4v7H4zM8 18v3m8-3v3M10 15h4"/>',
            AUTO_STAND:'<path d="M4 15 6 8h12l2 7v5H4zM6 15h12M7 20v2m10-2v2M7 11h10"/>',
            TAXI_STAND:'<path d="M3 14 5 8h14l2 6v6H3zM5 14h14M7 20v2m10-2v2M8 5h8v3H8z"/>',
            HARBOUR:'<path d="M12 3v13M8 7h8M3 13l9 5 9-5M4 17c2 3 4 4 8 4s6-1 8-4"/>',
            GROUND:'<path d="M3 18c3-2 5-2 9 0s6 2 9 0M4 14l8-10 8 10zM8 14v-3h8v3"/>',
            ROAD_WORK:'<path d="m12 3 9 17H3zM12 9v5m0 3h.01M6 21l2-3m10 3-2-3"/>',
            VILLAGE_OPEN:'<path d="M3 17 8 9l5 5 4-7 4 10"/><circle cx="6" cy="6" r="1.5"/><circle cx="18" cy="4" r="1.5"/>',
            VILLAGE_BUILTUP:'<rect x="3" y="4" width="7" height="7"/><rect x="13" y="3" width="8" height="6"/><rect x="7" y="14" width="9" height="7"/>',
            LEVEL_CROSSING:'<path d="M2 12h20M12 2v20M7 7l10 10m0-10L7 17"/>',
            CULVERT:'<path d="M2 8h20M2 16h20"/><rect x="8" y="8" width="8" height="8"/>',
            STREAM_PERENNIAL:'<path d="M3 3c8 3-2 6 6 9s-2 6 6 9 3-1 6 0"/>',
            STREAM_NONPERENNIAL:'<path d="M3 3c8 3-2 6 6 9s-2 6 6 9 3-1 6 0" stroke-dasharray="2 2"/>',
            CANAL:'<path d="M3 2c3 3 3 5 0 8s-3 5 0 8 3 3 0 4M21 2c-3 3-3 5 0 8s3 5 0 8-3 3 0 4M8 5h8m-8 7h8m-8 7h8"/>',
            RESERVOIR:'<path d="M3 7c3-2 5 2 8 0s5-2 10 0v12H3zM3 11c3-2 5 2 8 0s5-2 10 0"/>',
            MARSH:'<path d="M3 6h5m8 0h5M5 12h5m4 0h5M3 18h5m8 0h5"/>',
            SPOT_HEIGHT:'<circle cx="12" cy="12" r="2"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
            BOUNDARY_PILLAR:'<path d="M7 4h10v16H7zM5 4h14M5 20h14M12 7v10"/>',
            BENCH_MARK:'<path d="M3 18h18M5 18v-5h14v5M8 13V8h8v5M12 8V3"/>',
            TRIANGULATION_STATION:'<path d="M12 2 3 20h18zM12 2v18"/>',
            ORCHARD:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
            SCATTERED_TREES:'<circle cx="5" cy="7" r="2.5"/><circle cx="16" cy="5" r="2"/><circle cx="12" cy="15" r="2.5"/><path d="M5 9v3m11-5v3m-4 8v3"/>',
            ROCKY_GROUND:'<path d="m2 18 5-9 4 5 4-10 7 14z"/>',
            EMBANKMENT:'<path d="M2 18 12 6l10 12zM4 20h16"/>',
            DAM:'<path d="M3 4 8 20h8l5-16M2 20h20M5 8h14M6 12h12"/>',
            AERODROME:'<path d="M12 2 14 10 22 15 21 18 14 15 13 21 16 22 16 23 12 22 8 23 8 22 11 21 10 15 3 18 2 15 10 10z"/>',
            LIGHTHOUSE:'<path d="M8 21h8l-2-13h-4zM9 8h6M12 2v3M5 21h14"/>',
            RUINS:'<path d="M3 21V8l4 3V6l5 4 4-5v5l5-3v14z"/>',
            POWER_LINE:'<path d="M4 3 8 21M20 3l-4 18M2 7h20M7 12h10"/>',
            TELEPHONE_LINE:'<path d="M4 4h16M4 20h16M4 4v16M20 4v16M4 4l16 16M20 4 4 20" stroke-dasharray="2 2"/>'
        };

        const MAP_SYMBOL_COLORS = {
            TREE:'#237A3B', FOREST:'#237A3B', COCONUT_TREE:'#237A3B', FARM:'#237A3B', ORCHARD:'#237A3B', SCATTERED_TREES:'#237A3B',
            POND:'#1676B8', WELL:'#1676B8', WATER_TANK:'#1676B8', WATER_TAP:'#1676B8', HARBOUR:'#1676B8',
            CULVERT:'#1676B8', STREAM_PERENNIAL:'#1676B8', STREAM_NONPERENNIAL:'#1676B8', CANAL:'#1676B8', RESERVOIR:'#1676B8', MARSH:'#1676B8',
            EMBANKMENT:'#8A5A2B', DAM:'#8A5A2B'
        };

        const SYMBOL_LABELS = [
            ['NORTH_ARROW','North Arrow'],['DIR_ARROW','Direction Arrow'],['PLOT_MARKER','Main Plot'],['UTILITY_POLE','Electric Post'],
            ['HOUSE','House'],['BUILDING','Building'],['TEMPLE','Temple'],['MOSQUE','Mosque'],['CHURCH','Church'],
            ['TREE','Tree'],['COCONUT_TREE','Coconut Tree'],['POND','Pond'],['WELL','Well'],['JUNCTION','Junction'],
            ['PETROL_PUMP','Petrol Pump'],['HOSPITAL','Hospital'],['BANK','Bank'],['SCHOOL','School'],['BUS_STOP','Bus Stop'],
            ['RAILWAY_STATION','Railway Station'],['POLICE_STATION','Police Station'],['FIRE_STATION','Fire Station'],
            ['VILLAGE_OFFICE','Village Office'],['PANCHAYAT_OFFICE','Panchayat Office'],['SHOP','Shop'],['MARKET','Market'],
            ['POST_OFFICE','Post Office'],['MOBILE_TOWER','Mobile Tower'],['TRANSFORMER','Transformer'],
            ['WATER_TANK','Water Tank'],['WATER_TAP','Water Tap'],['BRIDGE','Bridge'],['PARKING','Parking'],
            ['FACTORY','Factory'],['CONSTRUCTION','Construction'],['FOREST','Forest'],['CEMETERY','Cemetery'],
            ['FARM','Farm'],['CATTLE_FARM','Cattle Farm'],['AUTO_STAND','Auto Stand'],['TAXI_STAND','Taxi Stand'],
            ['HARBOUR','Harbour'],['GROUND','Ground'],['ROAD_WORK','Road Work'],['VILLAGE_OPEN','Village (Open)'],
            ['VILLAGE_BUILTUP','Village (Built)'],['LEVEL_CROSSING','Level Crossing'],['CULVERT','Culvert'],
            ['STREAM_PERENNIAL','Perennial Stream'],['STREAM_NONPERENNIAL','Dry Stream'],['CANAL','Canal'],
            ['RESERVOIR','Reservoir'],['MARSH','Marsh / Swamp'],['SPOT_HEIGHT','Spot Height'],
            ['BOUNDARY_PILLAR','Boundary Pillar'],['BENCH_MARK','Bench Mark'],['TRIANGULATION_STATION','Triangulation'],
            ['ORCHARD','Orchard'],['SCATTERED_TREES','Scattered Trees'],['ROCKY_GROUND','Rocky Ground'],
            ['EMBANKMENT','Embankment'],['DAM','Dam'],['AERODROME','Aerodrome'],['LIGHTHOUSE','Lighthouse'],
            ['RUINS','Ruins'],['POWER_LINE','Power Line'],['TELEPHONE_LINE','Telephone Line']
        ];

        function makeMapSymbolSvg(code, size) {
            const content = MAP_SYMBOLS[code] || MAP_SYMBOLS.PLOT_MARKER;
            const color = MAP_SYMBOL_COLORS[code] || '#111111';
            return `<svg class="vector-map-symbol soi-conventional-symbol" data-symbol-code="${code}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><g fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`;
        }

        function buildSymbolsMegaGrid() {
            const grid = document.getElementById('symbolsGridContainer');
            grid.innerHTML = '';
            SYMBOL_LABELS.forEach(([code, label]) => {
                const card = document.createElement('div');
                card.className = 'symbol-card';
                card.dataset.search = (code + ' ' + label).toLowerCase();
                card.innerHTML = `${makeMapSymbolSvg(code, 28)}<span>${label}</span>`;
                card.onclick = () => {
                    addQuickSymbol(code, label);
                    closeAllDropdowns();
                };
                grid.appendChild(card);
            });
        }

        function filterSymbolGrid(query) {
            const q = (query || '').toLowerCase().trim();
            document.querySelectorAll('#symbolsGridContainer .symbol-card').forEach(card => {
                card.style.display = card.dataset.search.includes(q) ? 'flex' : 'none';
            });
        }

        const symbolImageCache = new Map();
        function getSymbolImage(svgNode) {
            const code = svgNode?.dataset?.symbolCode;
            if (!code) return null;
            if (symbolImageCache.has(code)) return symbolImageCache.get(code);
            const svg = svgNode.outerHTML.replace(/currentColor/g, '#111');
            const img = new Image();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            symbolImageCache.set(code, img);
            return img;
        }

        function drawSvgSymbolOnCanvas(pCtx, svgNode, x, y, width, height) {
            const img = getSymbolImage(svgNode);
            if (!img) return;
            if (img.complete && img.naturalWidth) pCtx.drawImage(img, x - width / 2, y - height / 2, width, height);
        }

        function addQuickSymbol(code, defaultLabel) {
            activateSelectTool();
            const sizeVal = document.getElementById('iconSizeSelect').value;
            const labelFs = document.getElementById('labelFontSize').value;
            const svgSize = sizeVal === 'large' ? 60 : sizeVal === 'small' ? 30 : 45;
            const el = document.createElement('div');
            el.className = 'draggable-item';
            el.style.left = '50%';
            el.style.top = '50%';
            const displayState = rotateTabActive ? 'block' : 'none';

            if (code === 'NORTH_ARROW') {
                el.innerHTML = `<div class="rotate-wrapper">${makeMapSymbolSvg(code, svgSize)}<span class="north-label">N</span><input type="range" class="rotation-slider" min="0" max="360" value="0" style="display:${displayState};" oninput="rotateElement(this)"></div><div class="delete-btn" onclick="this.parentElement.remove();updateThumbnail();">✕</div>`;
            } else {
                el.innerHTML = `<div class="rotate-wrapper">${makeMapSymbolSvg(code, svgSize)}<input type="range" class="rotation-slider" min="0" max="360" value="0" style="display:${displayState};" oninput="rotateElement(this)"></div><span class="icon-label editable-label" style="font-size:${labelFs};" ondblclick="editLabel(this)" title="Double-click to edit">${defaultLabel}</span><div class="delete-btn" onclick="this.parentElement.remove();updateThumbnail();">✕</div>`;
            }
            makeElementDraggable(el);
            itemContainer.appendChild(el);
            selectItemElement(el);
            updateThumbnail();
        }

        // ================= VIEWPORT, ZOOM & ORIENTATION =================
        function updateTransform() {
            container.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
        }

        function applyPresetZoom(val) {
            if (val === 'fit') {
                resetZoomAndPan();
                return;
            }
            const num = parseFloat(val);
            if (!isNaN(num)) {
                zoomScale = num;
                const wWidth = wrapper.clientWidth;
                const wHeight = wrapper.clientHeight;
                panX = (wWidth - (pageTargetWidth * zoomScale)) / 2;
                panY = Math.max(12, (wHeight - (pageTargetHeight * zoomScale)) / 2);
                updateTransform();
            }
        }

        function setOrientationValue(val) {
            document.getElementById('pageOrientation').value = val;
            changePageOrientation();
        }

        function changePageOrientation() {
            const orientation = document.getElementById('pageOrientation').value;
            if (orientation === 'landscape') {
                pageTargetWidth = 1123;
                pageTargetHeight = 794;
                thumbCanvas.width = 180;
                thumbCanvas.height = 127;
            } else {
                pageTargetWidth = 794;
                pageTargetHeight = 1123;
                thumbCanvas.width = 150;
                thumbCanvas.height = 212;
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

        function resetZoomAndPan() {
            const wWidth = wrapper.clientWidth;
            const wHeight = wrapper.clientHeight;
            const scaleX = (wWidth - 44) / pageTargetWidth;
            const scaleY = (wHeight - 44) / pageTargetHeight;
            zoomScale = Math.min(scaleX, scaleY);
            if (zoomScale > 1.15) zoomScale = 1.15;
            if (zoomScale < 0.15) zoomScale = 0.15;
            panX = (wWidth - (pageTargetWidth * zoomScale)) / 2;
            panY = Math.max(12, (wHeight - (pageTargetHeight * zoomScale)) / 2);
            document.getElementById('zoomSelect').value = 'fit';
            updateTransform();
        }

        function toggleSidebar() {
            document.getElementById('slideSidebar').classList.toggle('hidden');
            setTimeout(resetZoomAndPan, 50);
        }

        function toggleGridLines() {
            a4Page.classList.toggle('show-grid');
        }

        function toggleDeviceMode() {
            const btn = document.getElementById('deviceModeBtn');
            if (currentDeviceMode === 'mobile') {
                currentDeviceMode = 'pc';
                btn.innerHTML = '🖥️ PC Mode';
            } else {
                currentDeviceMode = 'mobile';
                btn.innerHTML = '📱 Mobile Mode';
            }
            resetZoomAndPan();
        }

        window.addEventListener('resize', resetZoomAndPan);

        // Mouse Wheel Zoom
        wrapper.addEventListener('wheel', (e) => {
            if (currentDeviceMode !== 'pc') return;
            e.preventDefault();
            const zoomFactor = 1.08;
            const rect = wrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const currentScale = zoomScale;
            if (e.deltaY < 0) zoomScale = Math.min(zoomScale * zoomFactor, 3.0);
            else zoomScale = Math.max(zoomScale / zoomFactor, 0.15);
            panX = mouseX - (mouseX - panX) * (zoomScale / currentScale);
            panY = mouseY - (mouseY - panY) * (zoomScale / currentScale);
            updateTransform();
        }, { passive: false });

        // ================= PATH SELECTION, GROUP, UNGROUP, MOVE =================
        function distPointToSeg(px, py, ax, ay, bx, by) {
            const dx = bx - ax, dy = by - ay;
            const len2 = dx * dx + dy * dy;
            if (len2 < 0.0001) return Math.hypot(px - ax, py - ay);
            let t = ((px - ax) * dx + (py - ay) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        }

        function pathHitTest(mx, my) {
            let bestIdx = -1;
            let bestDist = pathHitTolerance;
            for (let i = paths.length - 1; i >= 0; i--) {
                const pts = paths[i].points;
                if (!pts || pts.length < 2) continue;
                for (let j = 0; j < pts.length - 1; j++) {
                    const d = distPointToSeg(mx, my, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y);
                    if (d < bestDist) {
                        bestDist = d;
                        bestIdx = i;
                    }
                }
            }
            return bestIdx;
        }

        // 12px magnetic snap to any existing vertex / endpoint
        function magneticSnapPoint(x, y, excludePathIdx, excludePointIdx) {
            const snapOn = document.getElementById('straightMode') && document.getElementById('straightMode').checked;
            if (!snapOn) return { x, y, snapped: false };
            let best = null;
            let bestD = MAGNETIC_SNAP_PX;
            paths.forEach((p, pi) => {
                if (!p.points) return;
                p.points.forEach((pt, pti) => {
                    if (pi === excludePathIdx && pti === excludePointIdx) return;
                    const d = Math.hypot(pt.x - x, pt.y - y);
                    if (d < bestD) {
                        bestD = d;
                        best = { x: pt.x, y: pt.y };
                    }
                });
            });
            // Also snap current multi-vertex path points
            if (currentPath && currentPath.length) {
                currentPath.forEach((pt, pti) => {
                    if (pti === excludePointIdx && excludePathIdx === -1) return;
                    const d = Math.hypot(pt.x - x, pt.y - y);
                    if (d < bestD) {
                        bestD = d;
                        best = { x: pt.x, y: pt.y };
                    }
                });
            }
            if (best) return { x: best.x, y: best.y, snapped: true };
            return { x, y, snapped: false };
        }

        // Hit-test a vertex (node) within 12px
        function nodeHitTest(mx, my) {
            let best = null;
            let bestD = MAGNETIC_SNAP_PX + 2;
            const searchIdxs = selectedPathIndices.length ? selectedPathIndices : paths.map((_, i) => i);
            searchIdxs.forEach(pi => {
                const p = paths[pi];
                if (!p || !p.points) return;
                p.points.forEach((pt, pti) => {
                    const d = Math.hypot(pt.x - mx, pt.y - my);
                    if (d < bestD) {
                        bestD = d;
                        best = { pathIndex: pi, pointIndex: pti };
                    }
                });
            });
            return best;
        }

        function enableNodeEditMode() {
            if (drawingLockOn) {
                showToast('Drawing locked — unlock to edit nodes');
                hidePathContextMenu();
                return;
            }
            if (!selectedPathIndices.length) {
                showToast('Select a line / polygon first');
                hidePathContextMenu();
                return;
            }
            nodeEditMode = true;
            activeNode = null;
            hidePathContextMenu();
            showToast('Node edit ON — drag any vertex. Other nodes stay fixed. Snap 12px.');
            redrawAll();
        }

        function disableNodeEditMode() {
            nodeEditMode = false;
            activeNode = null;
            isDraggingNode = false;
            nodeDragSnapshot = null;
        }

        function applyFillToSelectedPaths() {
            if (!selectedPathIndices.length) {
                showToast('Select a polygon / shape first');
                hidePathContextMenu();
                return;
            }
            const fill = getActivePolygonFill() || document.getElementById('polygonFillColor').value || '#90EE90';
            selectedPathIndices.forEach(i => {
                if (!paths[i]) return;
                paths[i].fillColor = fill;
                // Ensure closed for multi-point shapes
                const pts = paths[i].points;
                if (pts && pts.length >= 3) {
                    const f = pts[0], l = pts[pts.length - 1];
                    if (Math.hypot(f.x - l.x, f.y - l.y) > 1) {
                        pts.push({ x: f.x, y: f.y });
                    }
                    paths[i].closed = true;
                }
            });
            hidePathContextMenu();
            redrawAll();
            showToast('Fill applied');
        }

        function clearFillOnSelectedPaths() {
            if (!selectedPathIndices.length) {
                hidePathContextMenu();
                return;
            }
            selectedPathIndices.forEach(i => {
                if (paths[i]) paths[i].fillColor = null;
            });
            hidePathContextMenu();
            redrawAll();
            showToast('Fill removed');
        }

        function getGroupMembers(idx) {
            if (idx < 0 || idx >= paths.length) return [idx];
            const gid = paths[idx].groupId;
            if (!gid) return [idx];
            const members = [];
            paths.forEach((p, i) => { if (p.groupId === gid) members.push(i); });
            return members.length ? members : [idx];
        }

        function clearPathSelection() {
            selectedPathIndices = [];
            disableNodeEditMode();
            hidePathContextMenu();
            redrawAll();
        }

        function selectPathAt(mx, my, additive) {
            const hit = pathHitTest(mx, my);
            if (hit < 0) {
                if (!additive) clearPathSelection();
                return;
            }
            const members = getGroupMembers(hit);
            if (additive) {
                const already = members.every(i => selectedPathIndices.includes(i));
                if (already) {
                    selectedPathIndices = selectedPathIndices.filter(i => !members.includes(i));
                } else {
                    members.forEach(i => {
                        if (!selectedPathIndices.includes(i)) selectedPathIndices.push(i);
                    });
                }
            } else {
                selectedPathIndices = members.slice();
            }
            hidePathContextMenu();
            redrawAll();
        }

        function showPathContextMenu(clientX, clientY) {
            const menu = document.getElementById('pathContextMenu');
            const groupBtn = document.getElementById('ctxGroupBtn');
            const ungroupBtn = document.getElementById('ctxUngroupBtn');
            const canGroup = selectedPathIndices.length >= 2;
            const canUngroup = selectedPathIndices.some(i => paths[i] && paths[i].groupId);
            groupBtn.classList.toggle('disabled', !canGroup);
            ungroupBtn.classList.toggle('disabled', !canUngroup);
            menu.classList.add('open');
            let left = clientX;
            let top = clientY;
            if (left + 210 > window.innerWidth) left = window.innerWidth - 220;
            if (top + 220 > window.innerHeight) top = window.innerHeight - 230;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }

        function hidePathContextMenu() {
            document.getElementById('pathContextMenu').classList.remove('open');
        }

        function pathIntersectsRect(path, rx0, ry0, rx1, ry1) {
            if (!path || !path.points || path.points.length < 2) return false;
            const minX = Math.min(rx0, rx1), maxX = Math.max(rx0, rx1);
            const minY = Math.min(ry0, ry1), maxY = Math.max(ry0, ry1);
            for (let i = 0; i < path.points.length; i++) {
                const pt = path.points[i];
                if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) return true;
            }
            for (let i = 0; i < path.points.length - 1; i++) {
                const a = path.points[i], b = path.points[i + 1];
                // sample midpoint
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                if (mx >= minX && mx <= maxX && my >= minY && my <= maxY) return true;
                if (distPointToSeg((minX + maxX) / 2, (minY + maxY) / 2, a.x, a.y, b.x, b.y) < 8) {
                    // segment crosses center region roughly
                }
                // any endpoint already checked; also check if segment crosses rect edges simply via bbox overlap
                const segMinX = Math.min(a.x, b.x), segMaxX = Math.max(a.x, b.x);
                const segMinY = Math.min(a.y, b.y), segMaxY = Math.max(a.y, b.y);
                if (segMaxX >= minX && segMinX <= maxX && segMaxY >= minY && segMinY <= maxY) return true;
            }
            return false;
        }

        function selectPathsInMarquee(x0, y0, x1, y1, additive) {
            const hits = [];
            paths.forEach((p, i) => {
                if (pathIntersectsRect(p, x0, y0, x1, y1)) hits.push(i);
            });
            // expand to full groups
            const expanded = new Set();
            hits.forEach(i => getGroupMembers(i).forEach(m => expanded.add(m)));
            if (additive) {
                expanded.forEach(i => {
                    if (!selectedPathIndices.includes(i)) selectedPathIndices.push(i);
                });
            } else {
                selectedPathIndices = Array.from(expanded);
            }
            redrawAll();
            if (selectedPathIndices.length) {
                showToast(selectedPathIndices.length + ' drawing(s) selected — right-click to Group / Move');
            }
        }

        function groupSelectedPaths() {
            if (selectedPathIndices.length < 2) {
                showToast('Select 2+ drawings first (drag-select or Ctrl+Click)');
                return;
            }
            const gid = nextGroupId++;
            // expand selection to include any existing group members
            const all = new Set();
            selectedPathIndices.forEach(i => getGroupMembers(i).forEach(m => all.add(m)));
            selectedPathIndices = Array.from(all);
            selectedPathIndices.forEach(i => {
                if (paths[i]) paths[i].groupId = gid;
            });
            showToast('Grouped (' + selectedPathIndices.length + '). Drag any one to move all together.');
            hidePathContextMenu();
            redrawAll();
        }

        function ungroupSelectedPaths() {
            let changed = false;
            const all = new Set();
            selectedPathIndices.forEach(i => getGroupMembers(i).forEach(m => all.add(m)));
            all.forEach(i => {
                if (paths[i] && paths[i].groupId) {
                    delete paths[i].groupId;
                    changed = true;
                }
            });
            selectedPathIndices = Array.from(all);
            if (changed) showToast('Ungrouped — each drawing is separate again');
            else showToast('No group on selection');
            hidePathContextMenu();
            redrawAll();
        }

        function startMoveSelectedPaths() {
            if (!selectedPathIndices.length) {
                showToast('Select drawings first (drag box or Ctrl+Click)');
                return;
            }
            // expand to full group
            const all = new Set();
            selectedPathIndices.forEach(i => getGroupMembers(i).forEach(m => all.add(m)));
            selectedPathIndices = Array.from(all);
            isMovingSelectedPaths = true;
            pathMoveSnapshot = deepClonePaths(paths);
            hidePathContextMenu();
            showToast('Drag on the map to move all ' + selectedPathIndices.length + ' together');
            canvas.style.cursor = 'move';
            redrawAll();
        }

        function deleteSelectedPaths() {
            if (!selectedPathIndices.length) return;
            const toDelete = new Set(selectedPathIndices);
            paths = paths.filter((_, i) => !toDelete.has(i));
            selectedPathIndices = [];
            lastActionType = 'draw';
            hidePathContextMenu();
            redrawAll();
            showToast('Deleted selected line(s)');
        }

        function applyPathMoveDelta(dx, dy) {
            const moved = new Set();
            selectedPathIndices.forEach(i => {
                const members = getGroupMembers(i);
                members.forEach(mi => {
                    if (moved.has(mi) || !paths[mi]) return;
                    moved.add(mi);
                    paths[mi].points.forEach(pt => {
                        pt.x += dx;
                        pt.y += dy;
                    });
                });
            });
        }

        function getSelectionBounds() {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let any = false;
            selectedPathIndices.forEach(i => {
                const p = paths[i];
                if (!p || !p.points) return;
                p.points.forEach(pt => {
                    any = true;
                    if (pt.x < minX) minX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y > maxY) maxY = pt.y;
                });
            });
            if (!any) return null;
            const pad = 6;
            return { x: minX - pad, y: minY - pad, w: (maxX - minX) + pad * 2, h: (maxY - minY) + pad * 2 };
        }

        function getResizeHandles(b) {
            if (!b) return [];
            const x = b.x, y = b.y, w = b.w, h = b.h, mx = x + w / 2, my = y + h / 2;
            return [
                { id: 'nw', x: x, y: y },
                { id: 'n', x: mx, y: y },
                { id: 'ne', x: x + w, y: y },
                { id: 'e', x: x + w, y: my },
                { id: 'se', x: x + w, y: y + h },
                { id: 's', x: mx, y: y + h },
                { id: 'sw', x: x, y: y + h },
                { id: 'w', x: x, y: my }
            ];
        }

        function hitTestResizeHandle(mx, my) {
            const b = getSelectionBounds();
            if (!b) return null;
            const hs = RESIZE_HANDLE_SIZE + 4;
            const handles = getResizeHandles(b);
            for (let i = 0; i < handles.length; i++) {
                const h = handles[i];
                if (Math.abs(mx - h.x) <= hs && Math.abs(my - h.y) <= hs) return h.id;
            }
            return null;
        }

        function drawSelectionBoxAndHandles(pCtx) {
            const b = getSelectionBounds();
            if (!b) return;
            pCtx.save();
            pCtx.strokeStyle = '#1a73e8';
            pCtx.lineWidth = 1.5;
            pCtx.setLineDash([5, 4]);
            pCtx.strokeRect(b.x, b.y, b.w, b.h);
            pCtx.setLineDash([]);
            const handles = getResizeHandles(b);
            handles.forEach(h => {
                pCtx.fillStyle = '#ffffff';
                pCtx.strokeStyle = '#1a73e8';
                pCtx.lineWidth = 1.5;
                pCtx.beginPath();
                pCtx.rect(h.x - RESIZE_HANDLE_SIZE / 2, h.y - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE);
                pCtx.fill();
                pCtx.stroke();
            });
            pCtx.restore();
        }

        function applySelectionScaleFromHandle(mx, my) {
            if (!resizeStartBounds || !resizePathSnapshot || !resizeHandleId) return;
            const b0 = resizeStartBounds;
            let newX = b0.x, newY = b0.y, newW = b0.w, newH = b0.h;
            const id = resizeHandleId;
            // Fixed opposite edge / corner
            if (id.indexOf('w') >= 0) { newX = mx; newW = (b0.x + b0.w) - mx; }
            if (id.indexOf('e') >= 0) { newW = mx - b0.x; }
            if (id.indexOf('n') >= 0) { newY = my; newH = (b0.y + b0.h) - my; }
            if (id.indexOf('s') >= 0) { newH = my - b0.y; }
            // Corner: uniform scale (Google Slides-like) using average factor
            const isCorner = (id === 'nw' || id === 'ne' || id === 'sw' || id === 'se');
            if (isCorner && b0.w > 1 && b0.h > 1) {
                let sx = newW / b0.w, sy = newH / b0.h;
                // Keep sign for flip
                const s = (Math.abs(sx) + Math.abs(sy)) / 2;
                sx = Math.sign(sx) * s;
                sy = Math.sign(sy) * s;
                if (id === 'se') { newW = b0.w * sx; newH = b0.h * sy; }
                if (id === 'sw') { newW = b0.w * sx; newH = b0.h * sy; newX = (b0.x + b0.w) - newW; }
                if (id === 'ne') { newW = b0.w * sx; newH = b0.h * sy; newY = (b0.y + b0.h) - newH; }
                if (id === 'nw') { newW = b0.w * sx; newH = b0.h * sy; newX = (b0.x + b0.w) - newW; newY = (b0.y + b0.h) - newH; }
            }
            if (Math.abs(newW) < 8) newW = Math.sign(newW) * 8 || 8;
            if (Math.abs(newH) < 8) newH = Math.sign(newH) * 8 || 8;
            const sx = newW / b0.w;
            const sy = newH / b0.h;
            // Map snapshot points into new box
            selectedPathIndices.forEach(i => {
                const src = resizePathSnapshot[i];
                if (!src || !src.points || !paths[i]) return;
                paths[i].points = src.points.map(pt => ({
                    x: newX + (pt.x - b0.x) * sx,
                    y: newY + (pt.y - b0.y) * sy
                }));
            });
        }

        function selectAllPaths() {
            finishActiveMultiVertexPath();
            drawModeOn = false;
            eraseModeOn = false;
            textToolActive = false;
            offSubMode = 'items';
            selectedPathIndices = paths.map((_, i) => i);
            updateToolButtonsUI();
            redrawAll();
            if (selectedPathIndices.length) {
                showToast(selectedPathIndices.length + ' drawings selected — drag blue handles to resize');
            } else {
                showToast('No drawings on the page');
            }
        }

        function fitSelectionToPage() {
            if (!selectedPathIndices.length) {
                showToast('Select drawings first');
                return;
            }
            const b = getSelectionBounds();
            if (!b || b.w < 1) return;
            const margin = 40;
            const targetW = pageTargetWidth - margin * 2;
            const scale = targetW / b.w;
            const newW = b.w * scale;
            const newH = b.h * scale;
            const newX = (pageTargetWidth - newW) / 2;
            const newY = Math.max(margin, (pageTargetHeight - newH) / 2);
            const snapshot = deepClonePaths(paths);
            selectedPathIndices.forEach(i => {
                const src = snapshot[i];
                if (!src || !src.points || !paths[i]) return;
                paths[i].points = src.points.map(pt => ({
                    x: newX + (pt.x - b.x) * scale,
                    y: newY + (pt.y - b.y) * scale
                }));
            });
            lastActionType = 'draw';
            hidePathContextMenu();
            redrawAll();
            showToast('Fitted selection to page width');
        }

        function openHelpModal() {
            openModal('helpModal');
        }

        function openTutorialVideo() {
            const url = 'docs/Location-Map-Studio-Tutorial-EN.mp4';
            window.open(url, '_blank', 'noopener');
        }

        // Canvas right-click → select + context menu
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (drawModeOn || eraseModeOn) return;
            const coord = getCoordinates(e);
            const mx = coord.x - globalDrawingTranslateX;
            const my = coord.y - globalDrawingTranslateY;
            const hit = pathHitTest(mx, my);
            if (hit >= 0) {
                if (!selectedPathIndices.includes(hit)) {
                    selectedPathIndices = getGroupMembers(hit);
                }
                showPathContextMenu(e.clientX, e.clientY);
                redrawAll();
            } else {
                hidePathContextMenu();
            }
        });

        window.addEventListener('click', (e) => {
            if (!e.target.closest('#pathContextMenu')) hidePathContextMenu();
            if (!e.target.closest('#itemContextMenu')) hideItemContextMenu();
        });

        // ================= DRAWING & CONNECTOR ENGINE =================
        function getCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        function getActivePolygonFill() {
            const enabled = document.getElementById('polygonFillEnabled');
            const colorEl = document.getElementById('polygonFillColor');
            if (enabled && enabled.checked && colorEl) return colorEl.value;
            return null;
        }

        function finishActiveMultiVertexPath() {
            if (multiPointPolyActive && currentPath.length >= 2) {
                const activeType = document.getElementById('roadType').value;
                const style = roadStyles[activeType];
                let pts = currentPath.slice();
                // Drop trailing duplicate tip used while drawing
                if (pts.length >= 2) {
                    const a = pts[pts.length - 1], b = pts[pts.length - 2];
                    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.5) pts.pop();
                }
                // Close polygon if first≈last or tool is polygon
                let closed = false;
                if (pts.length >= 3) {
                    const first = pts[0], last = pts[pts.length - 1];
                    if (Math.hypot(first.x - last.x, first.y - last.y) <= MAGNETIC_SNAP_PX + 2) {
                        pts[pts.length - 1] = { x: first.x, y: first.y };
                        closed = true;
                    } else if (style && style.isPolygon) {
                        pts.push({ x: first.x, y: first.y });
                        closed = true;
                    }
                }
                const fill = (closed || (style && style.isPolygon) || (style && style.isBox))
                    ? getActivePolygonFill()
                    : null;
                paths.push({
                    type: activeType,
                    points: pts,
                    fillColor: fill,
                    closed: closed,
                    centerLine: isRoadCenterLineEnabled()
                });
                lastActionType = 'draw';
            }
            multiPointPolyActive = false;
            isDrawing = false;
            currentPath = [];
            activePathIndex = null;
            magnifier.style.display = 'none';
            redrawAll();
        }

        function startDrawing(e) {
            if (drawingLockOn) {
                if (eraseModeOn) return;
                if (drawModeOn) {
                    showToast('Drawing locked — unlock to draw');
                    return;
                }
            }
            if (eraseModeOn) {
                if (e.target === canvas) startErasing(e);
                return;
            }
            if (!drawModeOn || e.target !== canvas || e.button === 2) return;
            if (e.touches && e.touches.length > 1) return;

            e.preventDefault();
            const coord = getCoordinates(e);
            let targetModelCoord = {
                x: coord.x - globalDrawingTranslateX,
                y: coord.y - globalDrawingTranslateY
            };
            // 12px magnetic snap — base/start point locks when snapped
            const snapped = magneticSnapPoint(targetModelCoord.x, targetModelCoord.y, -1, -1);
            targetModelCoord = { x: snapped.x, y: snapped.y };

            const activeType = document.getElementById('roadType').value;
            const style = roadStyles[activeType];

            // Multi-point Polyline / Curve / Polygon click mode
            if (style && style.isMultiVertex) {
                if (!multiPointPolyActive) {
                    multiPointPolyActive = true;
                    isDrawing = true;
                    currentPath = [targetModelCoord, { x: targetModelCoord.x, y: targetModelCoord.y }];
                } else {
                    // Close polygon if near first point (12px)
                    if (currentPath.length >= 3) {
                        const first = currentPath[0];
                        if (Math.hypot(targetModelCoord.x - first.x, targetModelCoord.y - first.y) <= MAGNETIC_SNAP_PX) {
                            targetModelCoord = { x: first.x, y: first.y };
                            currentPath[currentPath.length - 1] = targetModelCoord;
                            finishActiveMultiVertexPath();
                            showToast('Polygon closed (snapped to start)');
                            return;
                        }
                    }
                    currentPath[currentPath.length - 1] = targetModelCoord;
                    currentPath.push({ x: targetModelCoord.x, y: targetModelCoord.y });
                }
                redrawAll();
                return;
            }

            isDrawing = true;
            activePathIndex = null;

            // Snap to end of previous road segment of same type (legacy + 12px magnetic)
            if (document.getElementById('straightMode').checked && paths.length > 0 && !style.isBox && !style.isFreehand) {
                for (let i = paths.length - 1; i >= 0; i--) {
                    if (paths[i].type === activeType) {
                        let pts = paths[i].points;
                        let lastPt = pts[pts.length - 1];
                        if (Math.hypot(targetModelCoord.x - lastPt.x, targetModelCoord.y - lastPt.y) < Math.max(34, MAGNETIC_SNAP_PX)) {
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


        function constrainAnglePoint(base, tip, stepDeg) {
            // Snap line angle to nearest stepDeg (default 15°) for smooth Google-Slides-like drawing
            const step = (stepDeg || 15) * Math.PI / 180;
            const dx = tip.x - base.x;
            const dy = tip.y - base.y;
            const len = Math.hypot(dx, dy);
            if (len < 0.5) return tip;
            let ang = Math.atan2(dy, dx);
            ang = Math.round(ang / step) * step;
            return { x: base.x + Math.cos(ang) * len, y: base.y + Math.sin(ang) * len };
        }

        function getItemPagePos(item) {
            // Robust page-pixel centre position (matches CSS left/top + translate(-50%,-50%))
            let left = item.style.left || '';
            let top = item.style.top || '';
            let x, y;
            if (left.includes('%')) x = (parseFloat(left) / 100) * pageTargetWidth;
            else x = parseFloat(left);
            if (top.includes('%')) y = (parseFloat(top) / 100) * pageTargetHeight;
            else y = parseFloat(top);
            if (!isFinite(x)) x = item.offsetLeft + item.offsetWidth / 2;
            if (!isFinite(y)) y = item.offsetTop + item.offsetHeight / 2;
            return { x, y };
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
            // Live 12px magnetic snap while moving end point; base (index 0) stays fixed
            const snapped = magneticSnapPoint(targetModelCoord.x, targetModelCoord.y, -1, 0);
            targetModelCoord = { x: snapped.x, y: snapped.y };

            const activeType = document.getElementById('roadType').value;
            const style = roadStyles[activeType];

            // Shift = constrain angle to 15° steps (smooth Google Slides-like straight lines)
            if (e.shiftKey && currentPath.length >= 1) {
                const base = multiPointPolyActive
                    ? currentPath[Math.max(0, currentPath.length - 2)]
                    : currentPath[0];
                if (base) targetModelCoord = constrainAnglePoint(base, targetModelCoord, 15);
            }

            if (multiPointPolyActive && style && style.isMultiVertex) {
                // Only the moving tip updates; earlier vertices stay steady
                currentPath[currentPath.length - 1] = targetModelCoord;
                redrawAll();
                return;
            }

            if (style.isFreehand) {
                currentPath.push(targetModelCoord);
            } else if (style.isBox || style.isElbow || style.isCurvedConn || document.getElementById('straightMode').checked) {
                // Base point currentPath[0] stays fixed; only end moves
                currentPath = [currentPath[0], targetModelCoord];
            } else {
                currentPath.push(targetModelCoord);
            }

            redrawAll();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            triggerMagnifierRender(clientX, clientY, coord.x, coord.y);
        }

        function stopDrawing() {
            if (eraseModeOn) { stopErasing(); return; }
            const activeType = document.getElementById('roadType').value;
            const style = roadStyles[activeType];
            if (style && style.isMultiVertex && multiPointPolyActive) {
                return; // Wait for double-click or Enter
            }

            if (isDrawing && currentPath.length > 1) {
                if (activePathIndex !== null) {
                    paths[activePathIndex].points.push(currentPath[1]);
                } else {
                    const entry = { type: activeType, points: currentPath };
                    if (style && style.isBox) {
                        entry.fillColor = getActivePolygonFill();
                    }
                    if (style && style.isRoad && isRoadCenterLineEnabled()) {
                        entry.centerLine = true;
                    }
                    paths.push(entry);
                }
                lastActionType = 'draw';
            }
            isDrawing = false;
            currentPath = [];
            activePathIndex = null;
            magnifier.style.display = 'none';
            redrawAll();
        }

        canvas.addEventListener('dblclick', (e) => {
            if (multiPointPolyActive) {
                e.preventDefault();
                if (currentPath.length > 2) currentPath.pop();
                finishActiveMultiVertexPath();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && multiPointPolyActive) {
                finishActiveMultiVertexPath();
            } else if (e.key === 'Escape' && multiPointPolyActive) {
                multiPointPolyActive = false;
                isDrawing = false;
                currentPath = [];
                redrawAll();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                const t = e.target;
                if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                undoLast();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                const t = e.target;
                if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                redoLast();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                const t = e.target;
                if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                selectAllPaths();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPathIndices.length) {
                const t = e.target;
                if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                deleteSelectedPaths();
            }
        });

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDrawing);

        // ================= CANVAS RENDERING (Roads, Connectors, Curves, Railway) =================
        function drawArrowHead(pCtx, fromX, fromY, toX, toY, color) {
            const headLength = 15;
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

        function drawRailwayConventionalOnCtx(pCtx, points) {
            if (!points || points.length < 2) return;
            pCtx.save();
            pCtx.strokeStyle = '#000000';
            pCtx.lineWidth = 1.35;
            pCtx.lineCap = 'round';
            pCtx.lineJoin = 'round';

            const railOffset = 2.5;
            const segments = [];
            let totalLength = 0;
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                const dx = b.x - a.x, dy = b.y - a.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.01) continue;
                segments.push({ a, b, dx, dy, len, nx: -dy / len, ny: dx / len, start: totalLength });
                totalLength += len;
            }
            if (!segments.length) { pCtx.restore(); return; }

            for (const side of [-1, 1]) {
                pCtx.beginPath();
                let started = false;
                for (const seg of segments) {
                    const sx = seg.a.x + side * seg.nx * railOffset;
                    const sy = seg.a.y + side * seg.ny * railOffset;
                    const ex = seg.b.x + side * seg.nx * railOffset;
                    const ey = seg.b.y + side * seg.ny * railOffset;
                    if (!started) { pCtx.moveTo(sx, sy); started = true; }
                    else pCtx.lineTo(sx, sy);
                    pCtx.lineTo(ex, ey);
                }
                pCtx.stroke();
            }

            const sleeperSpacing = 10;
            const sleeperHalf = 4.2;
            for (let distance = 0; distance <= totalLength; distance += sleeperSpacing) {
                let seg = segments[segments.length - 1];
                for (const candidate of segments) {
                    if (distance <= candidate.start + candidate.len) { seg = candidate; break; }
                }
                const t = Math.max(0, Math.min(1, (distance - seg.start) / seg.len));
                const x = seg.a.x + seg.dx * t;
                const y = seg.a.y + seg.dy * t;
                pCtx.beginPath();
                pCtx.moveTo(x - seg.nx * sleeperHalf, y - seg.ny * sleeperHalf);
                pCtx.lineTo(x + seg.nx * sleeperHalf, y + seg.ny * sleeperHalf);
                pCtx.stroke();
            }
            pCtx.restore();
        }

        function drawPathGeometryOnCtx(pCtx, points, style) {
            pCtx.beginPath();
            if (style.isBox) {
                let s = points[0], e = points[1];
                pCtx.rect(s.x, s.y, e.x - s.x, e.y - s.y);
            } else if (style.isElbow && points.length >= 2) {
                let s = points[0], e = points[points.length - 1];
                let midX = (s.x + e.x) / 2;
                pCtx.moveTo(s.x, s.y);
                pCtx.lineTo(midX, s.y);
                pCtx.lineTo(midX, e.y);
                pCtx.lineTo(e.x, e.y);
            } else if (style.isCurvedConn && points.length >= 2) {
                let s = points[0], e = points[points.length - 1];
                let midX = (s.x + e.x) / 2;
                pCtx.moveTo(s.x, s.y);
                pCtx.bezierCurveTo(midX, s.y, midX, e.y, e.x, e.y);
            } else if (style.isSmoothCurve && points.length >= 3) {
                pCtx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length - 1; i++) {
                    const xc = (points[i].x + points[i + 1].x) / 2;
                    const yc = (points[i].y + points[i + 1].y) / 2;
                    pCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                }
                const last = points[points.length - 1];
                pCtx.lineTo(last.x, last.y);
            } else {
                pCtx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    pCtx.lineTo(points[i].x, points[i].y);
                }
            }
        }


        function isRoadCenterLineEnabled() {
            const el = document.getElementById('roadCenterLine');
            return !!(el && el.checked);
        }

        function applyCenterLineToSelected(on) {
            if (!selectedPathIndices.length) {
                showToast('Select a road first');
                return;
            }
            let n = 0;
            selectedPathIndices.forEach(i => {
                if (!paths[i]) return;
                const st = roadStyles[paths[i].type];
                if (st && st.isRoad) {
                    paths[i].centerLine = !!on;
                    n++;
                }
            });
            hidePathContextMenu();
            redrawAll();
            showToast(n ? (on ? 'Center dashed line added' : 'Center line removed') : 'Select a double-line road (NH/SH/PWD…)');
        }

        function drawPassOnCtx(pCtx, points, type, layer, fillColor, centerLine) {
            if (!points || points.length < 2) return;
            const style = roadStyles[type];
            if (!style) return;
            if (style.isRailway) {
                if (layer === 'outer') drawRailwayConventionalOnCtx(pCtx, points);
                return;
            }
            pCtx.save();
            pCtx.lineCap = style.isFreehand ? 'round' : 'butt';
            pCtx.lineJoin = style.isFreehand ? 'round' : 'miter';
            pCtx.miterLimit = 10;

            drawPathGeometryOnCtx(pCtx, points, style);

            // Colour fill for boxes and closed polygons
            if (layer === 'outer' && fillColor) {
                if (style.isBox || points.length >= 3) {
                    pCtx.closePath();
                    pCtx.fillStyle = fillColor;
                    pCtx.globalAlpha = 0.55;
                    pCtx.fill();
                    pCtx.globalAlpha = 1;
                    // Rebuild path for stroke after fill
                    drawPathGeometryOnCtx(pCtx, points, style);
                    if (!style.isBox && points.length >= 3) pCtx.closePath();
                }
            }

            if (layer === 'outer' && style.outerWidth > 0) {
                pCtx.lineWidth = style.outerWidth;
                pCtx.strokeStyle = style.outerColor;
                pCtx.setLineDash(style.dash || []);
                pCtx.stroke();

                if (style.isElectric) {
                    pCtx.font = '12px Arial';
                    pCtx.fillStyle = '#e67e22';
                    pCtx.textAlign = 'center';
                    pCtx.textBaseline = 'middle';
                    for (let i = 0; i < points.length - 1; i++) {
                        let p1 = points[i], p2 = points[i + 1];
                        pCtx.fillText('⚡', (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
                    }
                }

                if (style.isArrow && points.length >= 2) {
                    const tip = points[points.length - 1];
                    const prev = points[points.length - 2];
                    drawArrowHead(pCtx, prev.x, prev.y, tip.x, tip.y, style.outerColor);
                }
            }

            if (layer === 'inner' && style.innerWidth > 0 && !style.isBox) {
                pCtx.lineWidth = style.innerWidth;
                pCtx.strokeStyle = style.innerColor;
                pCtx.setLineDash(style.dash || []);
                pCtx.stroke();
            }

            // Road center dashed line (− − − −) between the two edges
            if (layer === 'inner' && style.isRoad && centerLine) {
                drawPathGeometryOnCtx(pCtx, points, style);
                pCtx.lineWidth = 1.25;
                pCtx.strokeStyle = '#000000';
                pCtx.setLineDash([10, 8]);
                pCtx.lineCap = 'butt';
                pCtx.lineJoin = 'miter';
                pCtx.stroke();
            }
            pCtx.restore();
        }

        let redrawPending = false;
        function redrawAll() {
            if (redrawPending) return;
            redrawPending = true;
            requestAnimationFrame(() => {
                performRedraw();
                redrawPending = false;
            });
        }

        function getCombinedPaths() {
            let allPaths = [];
            paths.forEach((p, idx) => {
                if (idx === activePathIndex && isDrawing && currentPath.length > 0) {
                    allPaths.push({
                        type: p.type,
                        points: [...p.points, currentPath[1]],
                        fillColor: p.fillColor,
                        centerLine: p.centerLine,
                        groupId: p.groupId,
                        closed: p.closed
                    });
                } else {
                    allPaths.push(p);
                }
            });
            if (activePathIndex === null && isDrawing && currentPath.length > 0) {
                const liveType = document.getElementById('roadType').value;
                const liveStyle = roadStyles[liveType];
                const liveEntry = { type: liveType, points: currentPath, centerLine: isRoadCenterLineEnabled() };
                if (liveStyle && (liveStyle.isBox || liveStyle.isPolygon || liveStyle.isMultiVertex)) {
                    liveEntry.fillColor = getActivePolygonFill();
                }
                allPaths.push(liveEntry);
            }
            return allPaths;
        }

        function performRedraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (bgImage) {
                // Contain fit — preserve PDF form aspect (no stretch distortion)
                const cw = canvas.width, ch = canvas.height;
                const iw = bgImage.naturalWidth || bgImage.width;
                const ih = bgImage.naturalHeight || bgImage.height;
                if (iw > 0 && ih > 0) {
                    const scale = Math.min(cw / iw, ch / ih);
                    const dw = iw * scale, dh = ih * scale;
                    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
                    ctx.drawImage(bgImage, dx, dy, dw, dh);
                } else {
                    ctx.drawImage(bgImage, 0, 0, cw, ch);
                }
            }

            ctx.save();
            ctx.translate(globalDrawingTranslateX, globalDrawingTranslateY);
            const allPaths = getCombinedPaths();

            allPaths.forEach(p => drawPassOnCtx(ctx, p.points, p.type, 'outer', p.fillColor, p.centerLine));
            allPaths.forEach(p => drawPassOnCtx(ctx, p.points, p.type, 'inner', p.fillColor, p.centerLine));

            // Selection highlight for selected / grouped roads & lines
            if (selectedPathIndices.length > 0 && !drawModeOn && !eraseModeOn) {
                selectedPathIndices.forEach(idx => {
                    if (idx < 0 || idx >= paths.length) return;
                    const p = paths[idx];
                    if (!p || !p.points || p.points.length < 2) return;
                    ctx.save();
                    ctx.strokeStyle = '#1a73e8';
                    ctx.lineWidth = 3.5;
                    ctx.setLineDash([6, 4]);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.points[0].x, p.points[0].y);
                    for (let k = 1; k < p.points.length; k++) {
                        ctx.lineTo(p.points[k].x, p.points[k].y);
                    }
                    ctx.stroke();
                    ctx.restore();
                });
                // Google Slides-style bounding box + resize handles
                drawSelectionBoxAndHandles(ctx);
            }

            // Node handles (vertices) when path selected or node-edit mode
            if ((nodeEditMode || selectedPathIndices.length > 0) && !drawModeOn && !eraseModeOn) {
                const idxs = selectedPathIndices.length ? selectedPathIndices : [];
                idxs.forEach(idx => {
                    const p = paths[idx];
                    if (!p || !p.points) return;
                    p.points.forEach((pt, pti) => {
                        const isActive = activeNode && activeNode.pathIndex === idx && activeNode.pointIndex === pti;
                        ctx.save();
                        ctx.fillStyle = isActive ? '#d93025' : '#1a73e8';
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, isActive ? 6 : 5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    });
                });
            }

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

            updateThumbnail();
        }

        function updateThumbnail() {
            if (!thumbCtx) return;
            thumbCtx.fillStyle = '#ffffff';
            thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
            thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        }

        // ================= ERASER ENGINE =================
        function ptDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

        function deepClonePaths(arr) {
            return arr.map(p => {
                const out = {
                    type: p.type,
                    points: (p.points || []).map(pt => ({ x: pt.x, y: pt.y })),
                    fillColor: p.fillColor || null
                };
                if (p.groupId != null) out.groupId = p.groupId;
                if (p.centerLine) out.centerLine = true;
                if (p.closed) out.closed = true;
                return out;
            });
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
                        if (chain.length >= 2) {
                            const seg = { type: path.type, points: chain, fillColor: path.fillColor || null };
                            if (path.centerLine) seg.centerLine = true;
                            if (path.groupId != null) seg.groupId = path.groupId;
                            newPaths.push(seg);
                        }
                        chain = [];
                    } else {
                        chain.push(pt);
                    }
                });
                if (chain.length >= 2) {
                    const seg = { type: path.type, points: chain, fillColor: path.fillColor || null };
                    if (path.centerLine) seg.centerLine = true;
                    if (path.groupId != null) seg.groupId = path.groupId;
                    newPaths.push(seg);
                }
            });
            if (changed) paths = newPaths;
            return changed;
        }

        function toggleEraserMode() {
            if (drawingLockOn && !eraseModeOn) {
                showToast('Drawing locked — unlock to use eraser');
                return;
            }
            finishActiveMultiVertexPath();
            eraseModeOn = !eraseModeOn;
            if (eraseModeOn) {
                drawModeOn = false;
                clearPathSelection();
                deactivateTextTool();
            } else {
                isErasing = false;
                eraseStrokeSnapshot = null;
                eraserPointerModel = null;
                magnifier.style.display = 'none';
            }
            updateToolButtonsUI();
            redrawAll();
        }

        function updateEraserSize() {
            eraserRadius = parseInt(document.getElementById('eraserSize').value, 10) || 20;
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

        // ================= MAGNIFIER LOUPE =================
        function toggleMagnifier() {
            magnifierEnabled = !magnifierEnabled;
            document.getElementById('magnifierToggleBtn').classList.toggle('active', magnifierEnabled);
            if (!magnifierEnabled) magnifier.style.display = 'none';
        }

        function triggerMagnifierRender(screenX, screenY, centerModelX, centerModelY) {
            if (!magnifierEnabled) return;
            magnifier.style.display = 'block';
            magnifier.style.left = (screenX - 70) + 'px';
            magnifier.style.top = Math.max(10, (screenY - 160)) + 'px';

            magCtx.fillStyle = '#ffffff';
            magCtx.fillRect(0, 0, 140, 140);
            magCtx.save();
            magCtx.translate(70, 70);
            magCtx.scale(2, 2);
            magCtx.translate(-centerModelX, -centerModelY);
            magCtx.drawImage(canvas, 0, 0);
            magCtx.restore();
        }

        // ================= UNDO / REDO =================
        let redoStack = [];
        let itemRedoStack = [];

        function undoLast() {
            if (lastActionType === 'erase' && eraseSnapshotStack.length > 0) {
                eraseRedoStack.push(deepClonePaths(paths));
                paths = eraseSnapshotStack.pop();
                lastActionType = eraseSnapshotStack.length > 0 ? 'erase' : null;
                lastUndoWasErase = true;
                redrawAll();
                return;
            }
            if (paths.length === 0) return;
            let lastPath = paths[paths.length - 1];
            if (lastPath.points.length > 2) {
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
            if (redoStack.length === 0) return;
            const item = redoStack.pop();
            if (item.type === 'path') paths.push(item.path);
            else if (item.type === 'point' && paths[item.pathIndex]) paths[item.pathIndex].points.push(item.point);
            redrawAll();
        }

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
            el.querySelectorAll('.editable-label').forEach(span => { span.ondblclick = function() { editLabel(this); }; });
            el.querySelectorAll('.draggable-text-style').forEach(td => { td.dataset.boundEdit = ''; bindTextBoxEditing(td); });
            itemContainer.appendChild(el);
        }

        // ================= DRAGGABLE ITEMS & PAGE ALIGNMENT =================
        let draggedElement = null;
        let dragPendingEl = null;
        let dragStartClient = null;
        const DRAG_THRESHOLD_PX = 5;
        let isResizingItem = false;
        let itemResizeHandle = null; // nw,n,ne,e,se,s,sw,w
        let itemResizeStart = null; // {cx,cy,w,h, clientX, clientY, textEl}

        function selectItemElement(el) {
            document.querySelectorAll('.draggable-item.selected-item').forEach(n => n.classList.remove('selected-item'));
            selectedDraggableItem = el;
            if (el) {
                el.classList.add('selected-item');
                ensureItemResizeHandles(el);
            }
        }

        function makeElementDraggable(el) {
            el.addEventListener('mousedown', startDrag);
            el.addEventListener('touchstart', startDrag, { passive: false });
            bindItemContextMenu(el);
        }

        function ensureItemResizeHandles(el) {
            if (!el || el.querySelector('.item-resize-handle')) return;
            // Google Slides-style: 4 corner blue handles (resize width + height)
            ['nw', 'ne', 'se', 'sw'].forEach(id => {
                const h = document.createElement('div');
                h.className = 'item-resize-handle ' + id;
                h.dataset.handle = id;
                h.addEventListener('mousedown', onItemResizeHandleDown);
                el.appendChild(h);
            });
        }

        function onItemResizeHandleDown(e) {
            e.preventDefault();
            e.stopPropagation();
            const el = e.currentTarget.parentElement;
            if (!el || !el.classList.contains('draggable-item')) return;
            selectItemElement(el);
            const textEl = el.querySelector('.draggable-text-style');
            const symbol = el.querySelector('.vector-map-symbol');
            const pos = getItemPagePos(el);
            let w = 80, h = 40;
            if (textEl) {
                w = textEl.offsetWidth || parseFloat(textEl.style.width) || 170;
                h = textEl.offsetHeight || parseFloat(textEl.style.minHeight) || 36;
            } else if (symbol) {
                w = parseFloat(symbol.getAttribute('width')) || 45;
                h = parseFloat(symbol.getAttribute('height')) || 45;
            } else {
                w = el.offsetWidth || 80;
                h = el.offsetHeight || 40;
            }
            isResizingItem = true;
            itemResizeHandle = e.currentTarget.dataset.handle;
            itemResizeStart = {
                cx: pos.x, cy: pos.y, w: w, h: h,
                clientX: e.clientX, clientY: e.clientY,
                textEl: textEl, symbol: symbol, el: el
            };
            dragPendingEl = null;
            draggedElement = null;
        }

        function applyItemResize(e) {
            if (!isResizingItem || !itemResizeStart || !itemResizeHandle) return;
            const st = itemResizeStart;
            const dx = (e.clientX - st.clientX) / zoomScale;
            const dy = (e.clientY - st.clientY) / zoomScale;
            const id = itemResizeHandle;
            let w = st.w, h = st.h, cx = st.cx, cy = st.cy;
            // Google Slides: opposite edge stays fixed
            if (id.includes('e')) { w = Math.max(40, st.w + dx); cx = st.cx - st.w / 2 + w / 2; }
            if (id.includes('w')) { w = Math.max(40, st.w - dx); cx = st.cx + st.w / 2 - w / 2; }
            if (id.includes('s')) { h = Math.max(24, st.h + dy); cy = st.cy - st.h / 2 + h / 2; }
            if (id.includes('n')) { h = Math.max(24, st.h - dy); cy = st.cy + st.h / 2 - h / 2; }
            // corners that only have one letter already handled via includes
            st.el.style.left = cx + 'px';
            st.el.style.top = cy + 'px';
            if (st.textEl) {
                st.textEl.style.width = Math.round(w) + 'px';
                st.textEl.style.minHeight = Math.round(h) + 'px';
                st.textEl.style.height = Math.round(h) + 'px';
            } else if (st.symbol) {
                st.symbol.setAttribute('width', Math.round(w));
                st.symbol.setAttribute('height', Math.round(h));
                st.symbol.style.width = Math.round(w) + 'px';
                st.symbol.style.height = Math.round(h) + 'px';
            }
        }

        function startDrag(e) {
            // Resize handle takes priority
            if (e.target.classList && e.target.classList.contains('item-resize-handle')) return;
            selectItemElement(this);
            if (drawModeOn || eraseModeOn || offSubMode !== 'items' || e.target.className === 'delete-btn' || e.target.className === 'rotation-slider' || e.button === 2) return;
            if (e.target.isContentEditable || (e.target.classList && e.target.classList.contains('is-editing'))) return;
            // Clicking text / label / symbol → select or edit, do not move until drag threshold
            if (e.touches && e.touches.length > 1) return;

            // Pending drag — only move after 5px so click/edit does not shift box
            dragPendingEl = this;
            dragStartClient = {
                x: e.touches ? e.touches[0].clientX : e.clientX,
                y: e.touches ? e.touches[0].clientY : e.clientY
            };
            draggedElement = null;
        }

        wrapper.addEventListener('mousedown', (e) => {
            if (e.target === canvas) {
                selectItemElement(null);
            }
            if ((offSubMode === 'page' && !drawModeOn && !eraseModeOn && !textToolActive) || e.button === 2) {
                isPanning = true;
                wrapper.style.cursor = 'grabbing';
                startX = e.clientX - panX;
                startY = e.clientY - panY;
                return;
            }

            // Google Slides-style text: click or drag on page to create sized text box
            if (textToolActive && e.button === 0) {
                const onPage = e.target === canvas || e.target === itemContainer || e.target === a4Page ||
                    (e.target.closest && e.target.closest('#a4Page'));
                if (onPage && !e.target.closest('.draggable-item')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const coord = getCoordinates(e);
                    isDraggingTextBox = true;
                    textDragStart = { x: coord.x, y: coord.y };
                    const prev = document.getElementById('textDragPreview');
                    if (prev.parentElement !== itemContainer) itemContainer.appendChild(prev);
                    prev.style.display = 'block';
                    prev.style.left = coord.x + 'px';
                    prev.style.top = coord.y + 'px';
                    prev.style.width = '0px';
                    prev.style.height = '0px';
                    return;
                }
            }

            // Select / node-edit / move paths when Select tool is active
            if (offSubMode === 'items' && !drawModeOn && !eraseModeOn && !textToolActive && e.target === canvas && e.button === 0) {
                const coord = getCoordinates(e);
                const mx = coord.x - globalDrawingTranslateX;
                const my = coord.y - globalDrawingTranslateY;

                // Resize handles (Google Slides style) — highest priority when selection exists
                if (selectedPathIndices.length) {
                    const hid = hitTestResizeHandle(mx, my);
                    if (hid) {
                        isResizingSelection = true;
                        resizeHandleId = hid;
                        resizeStartBounds = getSelectionBounds();
                        resizePathSnapshot = deepClonePaths(paths);
                        canvas.style.cursor = hid + '-resize';
                        return;
                    }
                }

                // Node edit: grab a vertex (other nodes stay fixed) — blocked when drawing locked
                if (!drawingLockOn && (nodeEditMode || selectedPathIndices.length)) {
                    const nodeHit = nodeHitTest(mx, my);
                    if (nodeHit) {
                        if (!selectedPathIndices.includes(nodeHit.pathIndex)) {
                            selectedPathIndices = getGroupMembers(nodeHit.pathIndex);
                        }
                        activeNode = nodeHit;
                        isDraggingNode = true;
                        nodeDragSnapshot = deepClonePaths(paths);
                        nodeEditMode = true;
                        canvas.style.cursor = 'grabbing';
                        redrawAll();
                        return;
                    }
                }

                const hit = pathHitTest(mx, my);

                if (isMovingSelectedPaths && selectedPathIndices.length) {
                    pathMoveStartModel = { x: mx, y: my };
                    pathMoveSnapshot = deepClonePaths(paths);
                    canvas.style.cursor = 'move';
                    return;
                }

                if (hit >= 0) {
                    const additive = e.ctrlKey || e.metaKey;
                    selectPathAt(mx, my, additive);
                    // Expand to full group so all move together
                    const all = new Set();
                    selectedPathIndices.forEach(i => getGroupMembers(i).forEach(m => all.add(m)));
                    selectedPathIndices = Array.from(all);
                    isMovingSelectedPaths = true;
                    pathMoveStartModel = { x: mx, y: my };
                    pathMoveSnapshot = deepClonePaths(paths);
                    canvas.style.cursor = 'move';
                    redrawAll();
                    return;
                }

                // Empty area → marquee multi-select (or Shift keeps previous)
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) clearPathSelection();
                isMarqueeSelecting = true;
                marqueeStart = { x: mx, y: my };
                const mq = document.getElementById('marqueeSelectRect');
                if (mq.parentElement !== itemContainer) itemContainer.appendChild(mq);
                mq.style.display = 'block';
                mq.style.left = mx + 'px';
                mq.style.top = my + 'px';
                mq.style.width = '0px';
                mq.style.height = '0px';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isPanning) {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                updateTransform();
            } else if (isResizingSelection && resizeStartBounds) {
                const coord = getCoordinates(e);
                const mx = coord.x - globalDrawingTranslateX;
                const my = coord.y - globalDrawingTranslateY;
                applySelectionScaleFromHandle(mx, my);
                redrawAll();
            } else if (isMarqueeSelecting && marqueeStart) {
                const coord = getCoordinates(e);
                const mx = coord.x - globalDrawingTranslateX;
                const my = coord.y - globalDrawingTranslateY;
                const x0 = Math.min(marqueeStart.x, mx);
                const y0 = Math.min(marqueeStart.y, my);
                const w = Math.abs(mx - marqueeStart.x);
                const h = Math.abs(my - marqueeStart.y);
                const mq = document.getElementById('marqueeSelectRect');
                mq.style.left = x0 + 'px';
                mq.style.top = y0 + 'px';
                mq.style.width = w + 'px';
                mq.style.height = h + 'px';
            } else if (isDraggingNode && activeNode && nodeDragSnapshot) {
                const coord = getCoordinates(e);
                let mx = coord.x - globalDrawingTranslateX;
                let my = coord.y - globalDrawingTranslateY;
                const sn = magneticSnapPoint(mx, my, activeNode.pathIndex, activeNode.pointIndex);
                mx = sn.x;
                my = sn.y;
                // Restore snapshot then move ONLY this node — other nodes steady
                paths = deepClonePaths(nodeDragSnapshot);
                const p = paths[activeNode.pathIndex];
                if (p && p.points && p.points[activeNode.pointIndex]) {
                    p.points[activeNode.pointIndex].x = mx;
                    p.points[activeNode.pointIndex].y = my;
                }
                redrawAll();
            } else if (isDraggingTextBox && textDragStart) {
                const coord = getCoordinates(e);
                const x0 = Math.min(textDragStart.x, coord.x);
                const y0 = Math.min(textDragStart.y, coord.y);
                const w = Math.abs(coord.x - textDragStart.x);
                const h = Math.abs(coord.y - textDragStart.y);
                const prev = document.getElementById('textDragPreview');
                prev.style.left = x0 + 'px';
                prev.style.top = y0 + 'px';
                prev.style.width = w + 'px';
                prev.style.height = h + 'px';
            } else if (isMovingSelectedPaths && pathMoveStartModel && selectedPathIndices.length) {
                const coord = getCoordinates(e);
                const mx = coord.x - globalDrawingTranslateX;
                const my = coord.y - globalDrawingTranslateY;
                const dx = mx - pathMoveStartModel.x;
                const dy = my - pathMoveStartModel.y;
                paths = deepClonePaths(pathMoveSnapshot);
                applyPathMoveDelta(dx, dy);
                redrawAll();
            } else if (isMovingDrawingBlock) {
                const rect = itemContainer.getBoundingClientRect();
                globalDrawingTranslateX = (e.clientX - rect.left) / zoomScale - blockOffsetX;
                globalDrawingTranslateY = (e.clientY - rect.top) / zoomScale - blockOffsetY;
                redrawAll();
            } else if (isResizingItem) {
                e.preventDefault();
                applyItemResize(e);
            } else if (dragPendingEl && dragStartClient && !draggedElement) {
                const cx = e.clientX, cy = e.clientY;
                const dist = Math.hypot(cx - dragStartClient.x, cy - dragStartClient.y);
                if (dist >= DRAG_THRESHOLD_PX) {
                    // If click was on pure text without drag intent, allow edit path; else move
                    draggedElement = dragPendingEl;
                    dragPendingEl = null;
                }
            }
            if (draggedElement) {
                e.preventDefault();
                const containerRect = itemContainer.getBoundingClientRect();
                // Account for translate(-50%,-50%): left/top are the visual centre
                let x = (e.clientX - containerRect.left) / zoomScale;
                let y = (e.clientY - containerRect.top) / zoomScale;
                draggedElement.style.left = x + 'px';
                draggedElement.style.top = y + 'px';

                const modelCoord = getCoordinates(e);
                triggerMagnifierRender(e.clientX, e.clientY, modelCoord.x, modelCoord.y);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isResizingSelection) {
                isResizingSelection = false;
                resizeHandleId = null;
                resizeStartBounds = null;
                resizePathSnapshot = null;
                lastActionType = 'draw';
                redrawAll();
                return;
            }
            if (isMarqueeSelecting && marqueeStart) {
                const coord = getCoordinates(e);
                const mx = coord.x - globalDrawingTranslateX;
                const my = coord.y - globalDrawingTranslateY;
                const additive = e.ctrlKey || e.metaKey || e.shiftKey;
                const w = Math.abs(mx - marqueeStart.x);
                const h = Math.abs(my - marqueeStart.y);
                document.getElementById('marqueeSelectRect').style.display = 'none';
                isMarqueeSelecting = false;
                if (w > 6 || h > 6) {
                    selectPathsInMarquee(marqueeStart.x, marqueeStart.y, mx, my, additive);
                }
                marqueeStart = null;
                return;
            }
            if (isDraggingNode) {
                isDraggingNode = false;
                nodeDragSnapshot = null;
                lastActionType = 'draw';
                redrawAll();
                return;
            }
            if (isDraggingTextBox && textDragStart) {
                const coord = getCoordinates(e);
                let x0 = Math.min(textDragStart.x, coord.x);
                let y0 = Math.min(textDragStart.y, coord.y);
                let w = Math.abs(coord.x - textDragStart.x);
                let h = Math.abs(coord.y - textDragStart.y);
                document.getElementById('textDragPreview').style.display = 'none';
                isDraggingTextBox = false;
                // Google Slides: tiny click → default size at click point; drag → exact size
                if (w < 12 && h < 12) {
                    w = 180;
                    h = 40;
                    x0 = textDragStart.x;
                    y0 = textDragStart.y;
                }
                const finalW = Math.max(w, 60);
                const finalH = Math.max(h, 28);
                const cx = x0 + finalW / 2;
                const cy = y0 + finalH / 2;
                addCustomText(null, null, cx, cy, finalW, finalH);
                textDragStart = null;
                return;
            }
            if (isMovingSelectedPaths && pathMoveSnapshot) {
                lastActionType = 'draw';
            }
            isPanning = false;
            isMovingDrawingBlock = false;
            isMovingSelectedPaths = false;
            pathMoveStartModel = null;
            pathMoveSnapshot = null;
            draggedElement = null;
            dragPendingEl = null;
            dragStartClient = null;
            isResizingItem = false;
            itemResizeHandle = null;
            itemResizeStart = null;
            magnifier.style.display = 'none';
            updateToolButtonsUI();
        });

        function alignSelectedItemOnPage(pos) {
            const target = selectedDraggableItem || (activeTextBox && activeTextBox.closest('.draggable-item'));
            if (!target) {
                showToast('Select a symbol or text box on the map first');
                return;
            }
            if (pos === 'left') target.style.left = '120px';
            if (pos === 'center') target.style.left = (pageTargetWidth / 2) + 'px';
            if (pos === 'right') target.style.left = (pageTargetWidth - 120) + 'px';
            if (pos === 'top') target.style.top = '190px';
            if (pos === 'middle') target.style.top = (pageTargetHeight / 2) + 'px';
            if (pos === 'bottom') target.style.top = (pageTargetHeight - 160) + 'px';
            closeAllDropdowns();
        }

        function bringSelectedToFront() {
            if (selectedDraggableItem) {
                itemContainer.appendChild(selectedDraggableItem);
            }
        }

        function deleteSelectedItem() {
            if (selectedDraggableItem) {
                selectedDraggableItem.remove();
                selectedDraggableItem = null;
            }
        }

        function toggleRotateTab() {
            rotateTabActive = !rotateTabActive;
            document.getElementById('rotateToggleBtn').classList.toggle('active', rotateTabActive);
            document.querySelectorAll('.rotation-slider').forEach(s => {
                s.style.display = rotateTabActive ? 'block' : 'none';
            });
        }

        function rotateElement(slider) {
            const target = slider.previousElementSibling;
            if (target) target.style.transform = `rotate(${slider.value}deg)`;
        }

        function hideItemContextMenu() {
            document.getElementById('itemContextMenu').classList.remove('open');
        }

        function showItemContextMenu(clientX, clientY) {
            hidePathContextMenu();
            const menu = document.getElementById('itemContextMenu');
            menu.classList.add('open');
            let left = clientX;
            let top = clientY;
            if (left + 220 > window.innerWidth) left = window.innerWidth - 230;
            if (top + 280 > window.innerHeight) top = window.innerHeight - 290;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }

        function bindItemContextMenu(el) {
            if (!el || el.dataset.ctxBound === '1') return;
            el.dataset.ctxBound = '1';
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectItemElement(el);
                showItemContextMenu(e.clientX, e.clientY);
            });
        }

        function getSelectedItemRotateWrapper() {
            if (!selectedDraggableItem) return null;
            return selectedDraggableItem.querySelector('.rotate-wrapper');
        }

        function getSelectedItemSlider() {
            if (!selectedDraggableItem) return null;
            return selectedDraggableItem.querySelector('.rotation-slider');
        }

        function itemRotateBy(deg) {
            const wrap = getSelectedItemRotateWrapper();
            const slider = getSelectedItemSlider();
            if (!wrap) {
                showToast('Select a symbol or text first');
                hideItemContextMenu();
                return;
            }
            let current = 0;
            if (slider) current = parseInt(slider.value, 10) || 0;
            else {
                const m = (wrap.style.transform || '').match(/rotate\((-?\d+)deg\)/);
                if (m) current = parseInt(m[1], 10);
            }
            let next = (current + deg) % 360;
            if (next < 0) next += 360;
            wrap.style.transform = `rotate(${next}deg)`;
            if (slider) slider.value = next;
            hideItemContextMenu();
            showToast('Rotated ' + deg + '°');
        }

        function itemShowFreeRotate() {
            if (!selectedDraggableItem) {
                showToast('Select a symbol or text first');
                hideItemContextMenu();
                return;
            }
            rotateTabActive = true;
            document.getElementById('rotateToggleBtn').classList.add('active');
            const slider = getSelectedItemSlider();
            if (slider) {
                slider.style.display = 'block';
                showToast('Use the slider under the object to rotate freely');
            } else {
                showToast('Rotation slider not available on this item');
            }
            hideItemContextMenu();
        }

        function editLabel(span) {
            const current = span.innerText;
            const currentFs = span.style.fontSize || '11px';
            const input = document.createElement('textarea');
            input.value = current;
            input.rows = Math.max(2, (current.match(/\n/g) || []).length + 1);
            input.style.cssText = `font-size:${currentFs};font-weight:bold;width:130px;min-height:36px;padding:3px 5px;border:2px solid #1a73e8;border-radius:4px;text-align:center;line-height:1.25;`;
            span.replaceWith(input);
            input.focus();
            input.select();

            function commitEdit() {
                const newSpan = document.createElement('span');
                newSpan.className = 'icon-label editable-label';
                newSpan.style.fontSize = currentFs;
                const newVal = input.value.trim();
                newSpan.innerText = newVal;
                newSpan.style.display = newVal ? 'block' : 'none';
                newSpan.ondblclick = function() { this.style.display = 'block'; editLabel(this); };
                input.replaceWith(newSpan);
            }
            input.addEventListener('blur', commitEdit);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                    e.preventDefault();
                    input.blur();
                }
            });
        }

        // ================= TEXT BOXES, FONT FORMATTING & ALIGNMENT =================
        function getSelectedTextFont() {
            const famEl = document.getElementById('fontFamilySelect');
            const sizeEl = document.getElementById('fontSizeSelect');
            return {
                family: (famEl && famEl.value) ? famEl.value : 'Arial',
                size: (sizeEl && sizeEl.value) ? sizeEl.value : '18px'
            };
        }

        function selectTextBox(textDiv) {
            if (!textDiv) return;
            document.querySelectorAll('.draggable-text-style.is-selected').forEach(node => {
                if (node !== textDiv) node.classList.remove('is-selected');
            });
            activeTextBox = textDiv;
            textDiv.classList.add('is-selected');
            selectItemElement(textDiv.closest('.draggable-item'));
        }

        function stepFontSize(delta) {
            const sel = document.getElementById('fontSizeSelect');
            let curr = parseInt(sel.value, 10) || 18;
            if (activeTextBox && activeTextBox.style.fontSize) {
                curr = parseInt(activeTextBox.style.fontSize, 10) || curr;
            }
            const next = Math.max(8, Math.min(72, curr + delta)) + 'px';
            if (activeTextBox) activeTextBox.style.fontSize = next;
            let matched = false;
            for (const opt of sel.options) {
                if (opt.value === next) { sel.value = next; matched = true; break; }
            }
            if (!matched) {
                const o = document.createElement('option');
                o.value = next;
                o.textContent = parseInt(next, 10);
                sel.appendChild(o);
                sel.value = next;
            }
        }

        function toggleTextFormat(type) {
            if (!activeTextBox) {
                showToast('Click a Text Box first to format');
                return;
            }
            if (type === 'bold') {
                const isNormal = activeTextBox.style.fontWeight === 'normal';
                activeTextBox.style.fontWeight = isNormal ? 'bold' : 'normal';
            } else if (type === 'italic') {
                const isItalic = activeTextBox.style.fontStyle === 'italic';
                activeTextBox.style.fontStyle = isItalic ? 'normal' : 'italic';
            } else if (type === 'underline') {
                const isU = activeTextBox.style.textDecoration === 'underline';
                activeTextBox.style.textDecoration = isU ? 'none' : 'underline';
            }
        }

        function applyTextColor(colorVal) {
            document.getElementById('textColorIndicator').style.borderBottomColor = colorVal;
            if (activeTextBox) {
                activeTextBox.style.color = colorVal;
            }
        }

        function setTextAlignment(alignVal) {
            if (!activeTextBox) {
                showToast('Select a Text Box first to change alignment');
                return;
            }
            activeTextBox.style.textAlign = alignVal;
            closeAllDropdowns();
        }

        function setTextLineHeight(lhVal) {
            if (!activeTextBox) {
                showToast('Select a Text Box first');
                return;
            }
            activeTextBox.style.lineHeight = lhVal;
            closeAllDropdowns();
        }

        function bindTextBoxEditing(textDiv) {
            if (!textDiv || textDiv.dataset.boundEdit === '1') return;
            textDiv.dataset.boundEdit = '1';
            textDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                selectTextBox(textDiv);
            });
            textDiv.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startTextBoxEdit(textDiv);
            });
        }

        function startTextBoxEdit(textDiv) {
            if (textDiv.isContentEditable) return;
            // Cancel any pending drag so edit never shifts the box
            dragPendingEl = null;
            dragStartClient = null;
            draggedElement = null;
            selectTextBox(textDiv);
            const parentItem = textDiv.closest('.draggable-item');
            // Freeze page position (centre) before layout changes from editing styles
            if (parentItem) {
                const pos = getItemPagePos(parentItem);
                parentItem.style.left = pos.x + 'px';
                parentItem.style.top = pos.y + 'px';
                // Keep box width stable so translate(-50%,-50%) does not jump left
                const tw = textDiv.offsetWidth || parseFloat(textDiv.style.width) || 170;
                textDiv.style.width = Math.max(tw, 60) + 'px';
                parentItem.classList.add('text-editing-active');
            }
            if (textDiv.classList.contains('is-placeholder')) {
                textDiv.textContent = '';
                textDiv.classList.remove('is-placeholder');
            }
            textDiv.classList.add('is-editing');
            textDiv.contentEditable = 'true';
            textDiv.focus();

            function onTabKey(ev) {
                if (ev.key !== 'Tab') return;
                ev.preventDefault();
                // Google Slides-style indent: insert 4 spaces at caret
                document.execCommand('insertText', false, '    ');
            }
            textDiv.addEventListener('keydown', onTabKey);

            function finish() {
                textDiv.contentEditable = 'false';
                textDiv.classList.remove('is-editing');
                textDiv.classList.remove('is-selected');
                if (parentItem) parentItem.classList.remove('text-editing-active');
                textDiv.removeEventListener('blur', finish);
                textDiv.removeEventListener('keydown', onTabKey);
                let val = (textDiv.innerText || '').trim();
                if (!val) {
                    textDiv.textContent = 'Type here…';
                    textDiv.classList.add('is-placeholder');
                }
            }
            textDiv.addEventListener('blur', finish);
        }

        function activateTextTool() {
            if (drawingLockOn) {
                showToast('Drawing locked — unlock to add text');
                return;
            }
            finishActiveMultiVertexPath();
            clearPathSelection();
            if (eraseModeOn) toggleEraserMode();
            drawModeOn = false;
            textToolActive = true;
            offSubMode = 'items';
            updateToolButtonsUI();
            const btn = document.getElementById('textToolBtn');
            if (btn) btn.classList.add('active');
            canvas.style.cursor = 'crosshair';
            wrapper.style.cursor = 'crosshair';
            showToast('Text tool ON — click or drag on the map where you need the box (Google Slides style)');
        }

        function deactivateTextTool() {
            textToolActive = false;
            isDraggingTextBox = false;
            textDragStart = null;
            const prev = document.getElementById('textDragPreview');
            if (prev) prev.style.display = 'none';
            const btn = document.getElementById('textToolBtn');
            if (btn) btn.classList.remove('active');
            wrapper.style.cursor = '';
        }

        function addCustomText(initialText, initialFont, posX, posY, boxW, boxH) {
            deactivateTextTool();
            activateSelectTool();
            const font = initialFont || getSelectedTextFont();
            const el = document.createElement('div');
            el.className = 'draggable-item';
            const cx = (typeof posX === 'number') ? posX : (pageTargetWidth / 2);
            const cy = (typeof posY === 'number') ? posY : (pageTargetHeight / 2);
            el.style.left = cx + 'px';
            el.style.top = cy + 'px';
            const displayState = rotateTabActive ? 'block' : 'none';
            const hasText = initialText && String(initialText).trim();
            const phClass = hasText ? '' : ' is-placeholder';
            const w = (boxW && boxW > 40) ? Math.round(boxW) : 170;
            const h = (boxH && boxH > 24) ? Math.round(boxH) : 36;

            el.innerHTML = `
                <div class="rotate-wrapper">
                    <div class="draggable-text-style${phClass}" style="font-size:${font.size};font-family:${font.family};width:${w}px;min-height:${h}px;" contenteditable="false">Type here…</div>
                    <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display:${displayState};" oninput="rotateElement(this)">
                </div>
                <div class="delete-btn" onclick="this.parentElement.remove()">✕</div>
            `;
            makeElementDraggable(el);
            bindItemContextMenu(el);
            itemContainer.appendChild(el);
            const textDiv = el.querySelector('.draggable-text-style');
            if (hasText) textDiv.innerText = String(initialText).trim();
            bindTextBoxEditing(textDiv);
            setTimeout(() => startTextBoxEdit(textDiv), 30);
            return textDiv;
        }

        async function pasteTextFromClipboard() {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const txt = await navigator.clipboard.readText();
                    if (txt && txt.trim()) {
                        addCustomText(txt.trim());
                        return;
                    }
                }
                showToast('Text Box created — press Ctrl+V to paste');
                addCustomText();
            } catch (e) {
                addCustomText();
            }
        }

        document.getElementById('fontFamilySelect').addEventListener('change', function() {
            if (activeTextBox && activeTextBox.isConnected) {
                activeTextBox.style.fontFamily = this.value;
            }
        });
        document.getElementById('fontSizeSelect').addEventListener('change', function() {
            if (activeTextBox && activeTextBox.isConnected) {
                activeTextBox.style.fontSize = this.value;
            }
        });

        // ================= QR CODE GENERATOR =================
        function addGoogleMapQRCode() {
            const linkUrl = document.getElementById('mapLinkInput').value.trim();
            const labelTxt = document.getElementById('qrCustomLabel').value.trim() || '📍 Scan for Location';
            if (!linkUrl) {
                showToast('Please paste a Google Map URL or location text first!');
                return;
            }
            activateSelectTool();
            const el = document.createElement('div');
            el.className = 'draggable-item';
            el.style.left = '50%';
            el.style.top = '50%';
            const displayState = rotateTabActive ? 'block' : 'none';

            el.innerHTML = `
                <div class="rotate-wrapper">
                    <div class="draggable-qrcode-wrapper">
                        <div class="qr-target-container"></div>
                    </div>
                    <span class="icon-label editable-label" style="color:#c0392b;" ondblclick="editLabel(this)">${labelTxt}</span>
                    <input type="range" class="rotation-slider" min="0" max="360" value="0" style="display:${displayState};" oninput="rotateElement(this)">
                </div>
                <div class="delete-btn" onclick="this.parentElement.remove()">✕</div>
            `;
            const qrTarget = el.querySelector('.qr-target-container');
            new QRCode(qrTarget, {
                text: linkUrl,
                width: 90,
                height: 90,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            makeElementDraggable(el);
            itemContainer.appendChild(el);
            document.getElementById('mapLinkInput').value = '';
            closeModal('qrModal');
            showToast('Location QR Code added to map!');
        }

        // ================= BACKGROUND UPLOADER (IMAGE & PDF) =================
        function applyBackgroundFile(file) {
            if (!file) return;
            const reader = new FileReader();
            if (file.type === 'application/pdf') {
                reader.onload = function(event) {
                    const typedarray = new Uint8Array(event.target.result);
                    pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                        pdf.getPage(1).then(function(page) {
                            const viewport = page.getViewport({ scale: 2.0 });
                            const renderCanvas = document.createElement('canvas');
                            const rCtx = renderCanvas.getContext('2d');
                            renderCanvas.width = viewport.width;
                            renderCanvas.height = viewport.height;
                            page.render({ canvasContext: rCtx, viewport: viewport }).promise.then(function() {
                                bgImage = new Image();
                                bgImage.onload = function() {
                                    const wm = document.getElementById('bgWatermark');
                                    if (wm) wm.style.display = 'none';
                                    redrawAll();
                                    showToast('Background loaded — use ↩ Restore if this was accidental');
                                };
                                bgImage.src = renderCanvas.toDataURL('image/png');
                            });
                        });
                    });
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = function(event) {
                    bgImage = new Image();
                    bgImage.onload = function() {
                        const wm = document.getElementById('bgWatermark');
                        if (wm) wm.style.display = 'none';
                        redrawAll();
                        showToast('Background loaded — use ↩ Restore if this was accidental');
                    };
                    bgImage.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        }

        document.getElementById('bgUploader').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            // Snapshot current work, then load only after confirm
            confirmBeforeReplaceWork('Load background: ' + file.name, function() {
                applyBackgroundFile(file);
            });
            // Allow re-selecting same file later
            e.target.value = '';
        });

        function removeUploadedBackground() {
            confirmBeforeReplaceWork('Remove background', function() {
                bgImage = null;
                document.getElementById('bgUploader').value = '';
                const wm = document.getElementById('bgWatermark');
                if (wm) wm.style.display = 'none';
                redrawAll();
            });
        }

        // ================= EXPORT HIGH-RES PDF & PNG =================
        function drawMultilineTextOnExport(pCtx, text, x, y, lineHeight, align) {
            if (!text) return;
            const lines = String(text).split(/\r\n|\r|\n/);
            const lh = lineHeight || 14;
            pCtx.textAlign = align || 'center';
            pCtx.lineJoin = 'round';
            // ~0.3mm white stroke buffer around glyphs (matches on-screen text-shadow)
            lines.forEach((line, i) => {
                const yy = y + i * lh;
                pCtx.strokeStyle = '#ffffff';
                pCtx.lineWidth = 2.3; // ~2 × 1.15px for full halo
                pCtx.strokeText(line, x, yy);
                pCtx.fillText(line, x, yy);
            });
        }

        async function buildMergedExportCanvas() {
            const pendingSymbols = Array.from(document.querySelectorAll('.vector-map-symbol')).map(node => {
                const img = getSymbolImage(node);
                if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
            });
            await Promise.all(pendingSymbols);

            const outCanvas = document.createElement('canvas');
            outCanvas.width = pageTargetWidth;
            outCanvas.height = pageTargetHeight;
            const pCtx = outCanvas.getContext('2d');
            pCtx.fillStyle = '#ffffff';
            pCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
            pCtx.drawImage(canvas, 0, 0);

            const items = document.querySelectorAll('.draggable-item');
            items.forEach(item => {
                // Same page coordinates as on screen (1:1 with canvas)
                const pos = getItemPagePos(item);
                const posX = pos.x;
                const posY = pos.y;
                const textNode = item.querySelector('.draggable-text-style');
                const mapSymbolNode = item.querySelector('.vector-map-symbol');
                const northLabel = item.querySelector('.north-label');
                const qrCanvas = item.querySelector('.draggable-qrcode-wrapper canvas');
                const labelNode = item.querySelector('.icon-label');
                const sliderNode = item.querySelector('.rotation-slider');
                const angleDeg = sliderNode ? parseInt(sliderNode.value, 10) : 0;

                pCtx.save();
                pCtx.translate(posX, posY);
                if (angleDeg !== 0) pCtx.rotate((angleDeg * Math.PI) / 180);

                if (textNode && !textNode.classList.contains('is-placeholder')) {
                    const comp = window.getComputedStyle(textNode);
                    const fSize = comp.fontSize || '18px';
                    const fFamily = comp.fontFamily || 'Arial';
                    const fWeight = comp.fontWeight || 'bold';
                    const fStyle = comp.fontStyle || 'normal';
                    const fColor = comp.color || '#000000';
                    const tAlign = (comp.textAlign === 'start' ? 'left' : (comp.textAlign || 'center'));
                    const text = (textNode.innerText || '').replace(/\u00a0/g, ' ').replace(/\s+$/,'');
                    if (text.trim()) {
                        pCtx.font = `${fStyle} ${fWeight} ${fSize} ${fFamily}`;
                        pCtx.fillStyle = fColor;
                        pCtx.textBaseline = 'middle';
                        pCtx.textAlign = tAlign === 'left' || tAlign === 'right' ? tAlign : 'center';
                        const lines = text.split(/\r\n|\r|\n/);
                        const fsNum = parseFloat(fSize) || 18;
                        const lhMul = parseFloat(comp.lineHeight) && comp.lineHeight !== 'normal'
                            ? (parseFloat(comp.lineHeight) / fsNum)
                            : 1.3;
                        const lh = fsNum * (isFinite(lhMul) && lhMul > 0.5 ? lhMul : 1.3);
                        const totalH = lines.length * lh;
                        // Match on-screen box: text is centered in the draggable item
                        drawMultilineTextOnExport(pCtx, text, 0, -totalH / 2 + lh / 2, lh, pCtx.textAlign);
                    }
                } else if (mapSymbolNode) {
                    const symbolSize = parseFloat(mapSymbolNode.getAttribute('width')) || 45;
                    drawSvgSymbolOnCanvas(pCtx, mapSymbolNode, 0, -5, symbolSize, symbolSize);
                    if (northLabel) {
                        pCtx.font = 'bold 13px Arial';
                        pCtx.fillStyle = '#111';
                        pCtx.textAlign = 'center';
                        pCtx.fillText('N', 0, symbolSize / 2 + 10);
                    }
                    if (labelNode && labelNode.innerText && labelNode.style.display !== 'none') {
                        pCtx.font = `bold ${labelNode.style.fontSize || '11px'} Arial`;
                        pCtx.fillStyle = '#000';
                        pCtx.textBaseline = 'top';
                        drawMultilineTextOnExport(pCtx, labelNode.innerText, 0, symbolSize / 2 + 2, 13, 'center');
                    }
                } else if (qrCanvas) {
                    pCtx.fillStyle = 'white';
                    pCtx.fillRect(-51, -51, 102, 102);
                    pCtx.strokeStyle = '#2c3e50';
                    pCtx.lineWidth = 2;
                    pCtx.strokeRect(-51, -51, 102, 102);
                    pCtx.drawImage(qrCanvas, -45, -45, 90, 90);
                    if (labelNode && labelNode.innerText) {
                        pCtx.font = 'bold 11px Arial';
                        pCtx.fillStyle = '#c0392b';
                        pCtx.textBaseline = 'top';
                        drawMultilineTextOnExport(pCtx, labelNode.innerText, 0, 56, 13, 'center');
                    }
                }
                pCtx.restore();
            });

            return outCanvas;
        }

        async function compileAndSavePDF() {
            const outCanvas = await buildMergedExportCanvas();
            // PNG keeps text/lines sharp so PDF matches on-screen layout
            const imgData = outCanvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const currentOrientation = document.getElementById('pageOrientation').value;
            const doc = new jsPDF({ orientation: currentOrientation, unit: 'mm', format: 'a4', compress: true });
            const pdfW = currentOrientation === 'landscape' ? 297 : 210;
            const pdfH = currentOrientation === 'landscape' ? 210 : 297;
            // Fill entire A4 — same aspect as canvas (794×1123 ≈ A4)
            doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
            const titleName = (document.getElementById('docTitleInput').value || 'Location_Sketch').replace(/\s+/g, '_');
            doc.save(titleName + '.pdf');
            showToast('✅ PDF Downloaded — matches screen layout');
        }

        async function exportMapAsPNG() {
            const outCanvas = await buildMergedExportCanvas();
            const link = document.createElement('a');
            const titleName = (document.getElementById('docTitleInput').value || 'Location_Sketch').replace(/\s+/g, '_');
            link.download = titleName + '.png';
            link.href = outCanvas.toDataURL('image/png');
            link.click();
            showToast('✅ PNG Image Downloaded!');
        }

        function resetSketchState() {
            // Keep recovery snapshot so Clear is reversible via ↩ Restore
            if (typeof captureRecoverySnapshot === 'function' && hasUserWork()) {
                captureRecoverySnapshot('before:clear');
            }
            paths = [];
            activePathIndex = null;
            selectedPathIndices = [];
            globalDrawingTranslateX = 0;
            globalDrawingTranslateY = 0;
            document.querySelectorAll('.draggable-item').forEach(item => item.remove());
            hidePathContextMenu();
            redrawAll();
            resetZoomAndPan();
            activateSelectTool();
            showToast('Canvas cleared — ↩ Restore to undo');
        }

        // ================= AUTO-SAVE / RECOVERY (accidental file load safe) =================
        const LSM_RECOVERY_NAME = '__AUTOSAVE_RECOVERY__';
        let lastRecoverySnapshot = null; // in-memory last good state
        let autosaveTimer = null;

        function hasUserWork() {
            if (paths && paths.length > 0) return true;
            if (document.querySelectorAll('.draggable-item').length > 0) return true;
            return false;
        }

        function captureRecoverySnapshot(reason) {
            try {
                lastRecoverySnapshot = serializeSketchState();
                lastRecoverySnapshot._reason = reason || 'autosave';
                lastRecoverySnapshot._savedAt = Date.now();
                // Persist to IndexedDB (best-effort)
                openLSMDB().then(db => {
                    const tx = db.transaction(LSM_STORE, 'readwrite');
                    const store = tx.objectStore(LSM_STORE);
                    const reqAll = store.getAll();
                    reqAll.onsuccess = () => {
                        const existing = (reqAll.result || []).find(m => m.name === LSM_RECOVERY_NAME);
                        const record = {
                            name: LSM_RECOVERY_NAME,
                            data: lastRecoverySnapshot,
                            updatedAt: Date.now(),
                            createdAt: existing ? existing.createdAt : Date.now()
                        };
                        if (existing) record.id = existing.id;
                        store.put(record);
                    };
                }).catch(() => {});
            } catch (e) {}
        }

        async function loadRecoveryFromIDB() {
            try {
                const db = await openLSMDB();
                const tx = db.transaction(LSM_STORE, 'readonly');
                const req = tx.objectStore(LSM_STORE).getAll();
                return await new Promise(resolve => {
                    req.onsuccess = () => {
                        const rec = (req.result || []).find(m => m.name === LSM_RECOVERY_NAME);
                        resolve(rec ? rec.data : null);
                    };
                    req.onerror = () => resolve(null);
                });
            } catch (e) {
                return null;
            }
        }

        function restoreLastWork(silent) {
            const snap = lastRecoverySnapshot;
            if (!snap) {
                loadRecoveryFromIDB().then(data => {
                    if (data) {
                        lastRecoverySnapshot = data;
                        restoreFromSnapshot(data);
                        if (!silent) showToast('↩ Previous work restored');
                    } else if (!silent) {
                        showToast('No previous work to restore');
                    }
                });
                return;
            }
            restoreFromSnapshot(snap);
            if (!silent) showToast('↩ Previous work restored');
        }

        function confirmBeforeReplaceWork(actionLabel, onConfirm) {
            // Always keep a recovery snapshot first
            if (hasUserWork()) captureRecoverySnapshot('before:' + actionLabel);
            if (!hasUserWork()) {
                onConfirm();
                return;
            }
            const ok = window.confirm(
                '⚠️ You have drawings / text on the map.\n\n' +
                'Action: ' + actionLabel + '\n\n' +
                'Your current work will be auto-saved.\n' +
                'You can restore it anytime with "↩ Restore last work".\n\n' +
                'Continue?'
            );
            if (ok) onConfirm();
            else showToast('Cancelled — work kept');
        }

        function startAutosaveLoop() {
            if (autosaveTimer) clearInterval(autosaveTimer);
            autosaveTimer = setInterval(() => {
                if (hasUserWork()) captureRecoverySnapshot('interval');
            }, 30000); // every 30s
            // Also save when tab loses focus
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && hasUserWork()) {
                    captureRecoverySnapshot('blur');
                }
            });
            window.addEventListener('beforeunload', (e) => {
                if (hasUserWork()) {
                    captureRecoverySnapshot('unload');
                }
            });
        }

        // ================= INDEXED-DB SAVED MAPS =================

        const LSM_IDB_NAME = 'LocationSketchMakerDB';
        const LSM_IDB_VERSION = 1;
        const LSM_STORE = 'maps';
        let currentLoadedMapId = null;

        function openLSMDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(LSM_IDB_NAME, LSM_IDB_VERSION);
                req.onupgradeneeded = function(e) {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(LSM_STORE)) {
                        const store = db.createObjectStore(LSM_STORE, { keyPath: 'id', autoIncrement: true });
                        store.createIndex('name', 'name', { unique: false });
                        store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                };
                req.onsuccess = e => resolve(e.target.result);
                req.onerror = e => reject(e.target.error);
            });
        }

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
                pageOrientation: document.getElementById('pageOrientation').value,
                globalDrawingTranslateX,
                globalDrawingTranslateY,
                savedAt: Date.now()
            };
        }

        function restoreFromSnapshot(data) {
            paths = data.paths || [];
            globalDrawingTranslateX = data.globalDrawingTranslateX || 0;
            globalDrawingTranslateY = data.globalDrawingTranslateY || 0;
            if (data.pageOrientation) {
                document.getElementById('pageOrientation').value = data.pageOrientation;
                changePageOrientation();
            }
            document.querySelectorAll('.draggable-item').forEach(item => item.remove());
            (data.items || []).forEach(saved => {
                const temp = document.createElement('div');
                temp.innerHTML = saved.html;
                const el = temp.firstChild;
                if (!el) return;
                el.style.left = saved.left;
                el.style.top = saved.top;
                makeElementDraggable(el);
                el.querySelectorAll('.editable-label').forEach(span => { span.ondblclick = function() { editLabel(this); }; });
                el.querySelectorAll('.draggable-text-style').forEach(td => { td.dataset.boundEdit = ''; bindTextBoxEditing(td); });
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

        function promptMapFileName(defaultName) {
            const titleEl = document.getElementById('docTitleInput');
            const base = (defaultName || (titleEl && titleEl.value) || 'Location_Map').trim() || 'Location_Map';
            const name = window.prompt('Save map as (file name):', base);
            if (name === null) return null; // cancelled
            return name.trim().replace(/[\\/:*?"<>|]/g, '_') || base;
        }

        async function saveNamedMapToIDB() {
            const titleEl = document.getElementById('docTitleInput');
            const suggested = (titleEl.value || 'Location Map').trim();
            const name = window.prompt('Browser save name (this PC only):', suggested);
            if (name === null) return;
            const finalName = name.trim() || suggested || 'Location Map';
            if (titleEl) titleEl.value = finalName;
            try {
                const db = await openLSMDB();
                const tx = db.transaction(LSM_STORE, 'readwrite');
                const store = tx.objectStore(LSM_STORE);
                const record = {
                    name: finalName,
                    data: serializeSketchState(),
                    updatedAt: Date.now(),
                    createdAt: Date.now()
                };
                if (currentLoadedMapId) record.id = currentLoadedMapId;
                const req = store.put(record);
                req.onsuccess = () => {
                    currentLoadedMapId = req.result;
                    showToast('✅ Saved "' + finalName + '" in this browser');
                };
            } catch (err) {
                showToast('Error saving map');
            }
        }

        /**
         * Download editable project file (.lsm.json) — share & open on another computer.
         * Format: JSON { format, version, name, paths, items, bgImageSrc, ... }
         */
        function downloadMapProjectFile() {
            const fileBase = promptMapFileName();
            if (!fileBase) return;
            const titleEl = document.getElementById('docTitleInput');
            if (titleEl) titleEl.value = fileBase;

            const project = {
                format: 'LocationSketchStudio',
                version: 1,
                name: fileBase,
                exportedAt: new Date().toISOString(),
                ...serializeSketchState()
            };
            const json = JSON.stringify(project);
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileBase.replace(/\.lsm\.json$/i, '').replace(/\.json$/i, '') + '.lsm.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            captureRecoverySnapshot('export-file');
            showToast('✅ Downloaded "' + a.download + '" — share this file to open on another PC');
        }

        function openMapProjectFilePicker() {
            const input = document.getElementById('mapProjectUploader');
            if (input) input.click();
        }

        function handleMapProjectFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data || (data.format && data.format !== 'LocationSketchStudio')) {
                        // Still try if it looks like our snapshot
                        if (!data.paths && !data.items) {
                            showToast('Not a Location Map project file (.lsm.json)');
                            return;
                        }
                    }
                    const doLoad = () => {
                        restoreFromSnapshot(data);
                        const titleEl = document.getElementById('docTitleInput');
                        if (titleEl && data.name) titleEl.value = data.name;
                        currentLoadedMapId = null;
                        showToast('📂 Opened "' + (data.name || file.name) + '"');
                    };
                    confirmBeforeReplaceWork('Open project: ' + (data.name || file.name), doLoad);
                } catch (err) {
                    showToast('Invalid project file');
                }
            };
            reader.readAsText(file);
        }

        function openSavedMapsPanel() {
            openModal('savedMapsOverlay');
            refreshSavedMapsList();
        }
        function closeSavedMapsPanel() {
            closeModal('savedMapsOverlay');
        }

        async function refreshSavedMapsList() {
            const listEl = document.getElementById('savedMapsList');
            try {
                const db = await openLSMDB();
                const tx = db.transaction(LSM_STORE, 'readonly');
                const req = tx.objectStore(LSM_STORE).getAll();
                req.onsuccess = () => {
                    const maps = (req.result || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    if (!maps.length) {
                        listEl.innerHTML = '<div style="text-align:center;color:#80868b;padding:24px;">No saved maps yet. Click <b>💾 Save Map</b> to save your work.</div>';
                        return;
                    }
                    listEl.innerHTML = '';
                    maps.forEach(m => {
                        const row = document.createElement('div');
                        row.className = 'saved-map-row';
                        const dateStr = new Date(m.updatedAt).toLocaleString();
                        const isRec = m.name === LSM_RECOVERY_NAME;
                        const title = isRec ? '↩ Auto-saved recovery' : m.name;
                        row.innerHTML = `
                            <div>
                                <div style="font-weight:700;font-size:14px;">${title}</div>
                                <div style="font-size:11px;color:#5f6368;">${dateStr}</div>
                            </div>
                            <div style="display:flex;gap:6px;">
                                <button class="g-pill-btn primary" data-load="${m.id}">📂 Load</button>
                                <button class="g-pill-btn danger" data-del="${m.id}">🗑️</button>
                            </div>
                        `;
                        row.querySelector('[data-load]').onclick = () => {
                            const doLoad = () => {
                                restoreFromSnapshot(m.data);
                                currentLoadedMapId = m.id;
                                document.getElementById('docTitleInput').value = m.name;
                                closeSavedMapsPanel();
                                showToast('Loaded "' + m.name + '"');
                            };
                            if (m.name === LSM_RECOVERY_NAME) {
                                doLoad();
                                return;
                            }
                            confirmBeforeReplaceWork('Load saved map: ' + m.name, doLoad);
                        };
                        row.querySelector('[data-del]').onclick = async () => {
                            const d2 = await openLSMDB();
                            const t2 = d2.transaction(LSM_STORE, 'readwrite');
                            t2.objectStore(LSM_STORE).delete(Number(m.id));
                            t2.oncomplete = () => refreshSavedMapsList();
                        };
                        listEl.appendChild(row);
                    });
                };
            } catch (e) {
                listEl.innerHTML = 'Unable to load saved maps.';
            }
        }

        // ================= ONLINE / VISIT COUNTER (GitHub Pages friendly) =================
        // Change COUNTER_NAMESPACE if you host your own copy (unique key per site)
        const COUNTER_NAMESPACE = 'location-sketch-studio-v4';
        const COUNTER_KEY = 'visits';

        async function updateOnlineVisitBadge() {
            const countEl = document.getElementById('onlineUsersCount');
            const labelEl = document.getElementById('onlineUsersLabel');
            if (!countEl) return;

            // Session presence (this browser tab counts as 1 "online" locally)
            try {
                const sessionKey = 'lsm_session_' + COUNTER_NAMESPACE;
                if (!sessionStorage.getItem(sessionKey)) {
                    sessionStorage.setItem(sessionKey, String(Date.now()));
                }
            } catch (e) {}

            // Total visits via free CounterAPI (no backend needed — works on GitHub Pages)
            try {
                const url = 'https://api.counterapi.dev/v1/' + encodeURIComponent(COUNTER_NAMESPACE) + '/' + encodeURIComponent(COUNTER_KEY) + '/up';
                const res = await fetch(url, { method: 'GET', mode: 'cors' });
                if (res.ok) {
                    const data = await res.json();
                    const total = (data && (data.count != null ? data.count : data.value));
                    if (total != null) {
                        countEl.textContent = total;
                        if (labelEl) labelEl.textContent = ' Visits';
                        document.getElementById('onlineUsersBadge').title = 'Total visits (online host). Local file shows only after hosting.';
                        return;
                    }
                }
            } catch (err) {
                // offline / blocked / local file
            }

            // Fallback when not hosted / API blocked
            countEl.textContent = '1';
            if (labelEl) labelEl.textContent = ' (local)';
            document.getElementById('onlineUsersBadge').title = 'Local mode — host on GitHub Pages for live visit count';
        }


        // Project file open input
        (function wireMapProjectUploader() {
            const inp = document.getElementById('mapProjectUploader');
            if (!inp || inp.dataset.bound === '1') return;
            inp.dataset.bound = '1';
            inp.addEventListener('change', function(e) {
                const file = e.target.files && e.target.files[0];
                if (file) handleMapProjectFile(file);
                e.target.value = '';
            });
        })();

        // ================= INITIALIZE STUDIO =================
        window.addEventListener('load', async () => {
            buildSymbolsMegaGrid();
            changePageOrientation();
            loadKeralaRevenueTemplate();
            updateOnlineVisitBadge();
            startAutosaveLoop();
            try {
                const recovered = await loadRecoveryFromIDB();
                if (recovered && ((recovered.paths && recovered.paths.length) || (recovered.items && recovered.items.length))) {
                    lastRecoverySnapshot = recovered;
                    const ageMin = Math.round((Date.now() - (recovered._savedAt || recovered.savedAt || 0)) / 60000);
                    const ageTxt = ageMin > 0 ? (ageMin + ' min ago') : 'just now';
                    if (window.confirm('↩ Found auto-saved work from ' + ageTxt + '.\n\nRestore it now?')) {
                        restoreFromSnapshot(recovered);
                        showToast('↩ Previous work restored');
                    }
                }
            } catch (e) {}
        });
