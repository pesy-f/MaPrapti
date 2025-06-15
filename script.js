document.addEventListener('DOMContentLoaded', () => {
    // --- ICONS ---
    lucide.createIcons();

    // --- CONSTANTS & CONFIG ---
    const STORAGE_KEY = 'maPraqtiState_v33_final';
    const DEFAULT_SEAT_SIZE = '45px';
    const DEFAULT_FONT_SIZE = 14;
    const DRAG_THRESHOLD = 3; // pixels

    // --- DOM ELEMENTS ---
    const mainContent = document.getElementById('main-content');
    const mapContainer = document.getElementById('beit-midrash-map');
    const objectContainer = document.getElementById('object-container');
    const colHeadersContainer = document.getElementById('col-headers');
    const rowHeadersContainer = document.getElementById('row-headers');
    const gridAndCanvasContainer = document.getElementById('grid-and-canvas-container');
    const selectionBox = document.getElementById('selection-box');
    const importFileInput = document.getElementById('import-file-input');
    const imageUploadInput = document.getElementById('image-upload-input');
    const statusBar = document.getElementById('status-bar');
    
    // Seat Tools
    const applyBgColorBtn = document.getElementById('btn-apply-bg-color');
    const applyFontColorBtn = document.getElementById('btn-apply-font-color');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const fontColorPicker = document.getElementById('font-color-picker');
    const bgColorTrigger = document.getElementById('bg-color-trigger');
    const fontColorTrigger = document.getElementById('font-color-trigger');
    const bgColorIndicator = document.getElementById('bg-color-indicator');
    const fontColorIndicator = document.getElementById('font-color-indicator');
    const fontSizeInput = document.getElementById('input-font-size');
    const seatFontWeightBtn = document.getElementById('btn-seat-font-weight');
    const widthInput = document.getElementById('input-width');
    const heightInput = document.getElementById('input-height');
    const mergeBtn = document.getElementById('btn-merge-unmerge');
    const hideModeBtn = document.getElementById('btn-mode-hide');
    const writingModeBtn = document.getElementById('btn-toggle-writing-mode');
    
    // Numbering Tools
    const toggleNumberingBtn = document.getElementById('btn-toggle-numbering');
    const numberingOptionsBar = document.getElementById('numbering-options-bar');
    const btnGematria = document.getElementById('btn-numbering-gematria');
    const btnNumContinuous = document.getElementById('btn-numbering-continuous');
    const btnNumBlock = document.getElementById('btn-numbering-block');
    const btnNumSeries = document.getElementById('btn-numbering-series');

    // Object Tools
    const addTextboxBtn = document.getElementById('btn-add-textbox');
    const addLineBtn = document.getElementById('btn-add-line');
    const addRectangleBtn = document.getElementById('btn-add-rectangle');
    const addEllipseBtn = document.getElementById('btn-add-ellipse');
    const addImageBtn = document.getElementById('btn-add-image');
    
    // Object Edit Tools
    const objectEditTools = document.getElementById('object-edit-tools');
    const objectFontWeightBtn = document.getElementById('object-font-weight-btn');
    const deleteObjectBtn = document.getElementById('btn-delete-object');

    // Grid Edit Tools
    const addRowsColsCountInput = document.getElementById('add-rows-cols-count');
    const gridEditDynamicLabel = document.getElementById('grid-edit-dynamic-label');
    const addRowBeforeBtn = document.getElementById('btn-add-row-before');
    const addRowAfterBtn = document.getElementById('btn-add-row-after');
    const addRowStartBtn = document.getElementById('btn-add-row-start');
    const addRowEndBtn = document.getElementById('btn-add-row-end');
    const addColBeforeBtn = document.getElementById('btn-add-col-before');
    const addColAfterBtn = document.getElementById('btn-add-col-after');
    const addColStartBtn = document.getElementById('btn-add-col-start');
    const addColEndBtn = document.getElementById('btn-add-col-end');
    const deleteBtn = document.getElementById('btn-delete');

    // Footer & About Buttons
    const importBtn = document.getElementById('btn-import');
    const exportBtn = document.getElementById('btn-export');
    const saveImageBtn = document.getElementById('btn-save-image');
    const resetBtn = document.getElementById('btn-reset');
    const aboutBtn = document.getElementById('btn-about');
    const aboutModal = document.getElementById('about-modal');
    const closeModalBtn = document.querySelector('.modal-close-btn');
    const downloadOfflineBtn = document.getElementById('btn-download-offline');

    // Zoom Controls
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomDisplay = document.getElementById('zoom-display');
    const layoutContainer = document.getElementById('layout-container');


    // --- STATE & APP VARS ---
    let state = {};
    let activeMovableObject = null;
    let actionState = { intent: null, isDragging: false, isResizing: false, isRotating: false, target: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 };
    let lastSelectedSeatId = null;
    let seatStyleClipboard = null;
    
    // --- INITIALIZATION ---
    function initialize() {
        loadStateAndHistory();
        rebuildUIFromState();
        setupEventListeners();
        setupAccordion();
        updateAllColorIndicators();
        mainContent.focus();
    }
    
    // --- STATE SAVE/LOAD ---
    function recordState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    function loadStateAndHistory() { try { const savedState = localStorage.getItem(STORAGE_KEY); if (savedState) { state = JSON.parse(savedState); } else { resetState(false); } } catch (e) { console.error("Failed to load state, resetting.", e); resetState(false); } }
    function resetState(confirmReset = true) { if (confirmReset && !confirm('האם אתה בטוח שברצונך לאפס את המפה? כל השינויים יאבדו.')) return; state = { grid: { rows: 20, cols: 22, colWidths: Array(22).fill(DEFAULT_SEAT_SIZE), rowHeights: Array(20).fill(DEFAULT_SEAT_SIZE) }, seats: {}, merges: {}, objects: [], showSeatNumbers: false, useGematria: false, numberingStrategy: 'block' }; recordState(); rebuildUIFromState(); updateStatusBar("המפה אופסה"); }
    function rebuildUIFromState(options = { preserveSelection: false }) { let selectedIds = new Set(); if (options.preserveSelection) { selectedIds = new Set([...document.querySelectorAll('.seat.selected')].map(s => s.dataset.row + '-' + s.dataset.col)); } createGrid(); loadObjectsFromState(); if (options.preserveSelection) { restoreSelection(selectedIds); } updateAllSideBarInputs(); toggleNumberingBtn.classList.toggle('active', state.showSeatNumbers); numberingOptionsBar.classList.toggle('visible', state.showSeatNumbers); updateNumberingControlActiveStates(); }
    
    // --- NUMBERING LOGIC & HELPERS ---
    function toGematria(num) { if (num <= 0) return ''; const letters = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת']; const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400]; let str = ''; let n = num; for (let i = values.length - 1; i > 0; i--) { while (n >= values[i]) { str += letters[i]; n -= values[i]; } } if (str.includes('יה')) str = str.replace('יה', 'טו'); if (str.includes('יו')) str = str.replace('יו', 'טז'); return str; }
    function isSeatNumberable(r, c) { const seatId = `${r}-${c}`; const seatState = state.seats[seatId] || {}; const hasCustomColor = seatState.color && seatState.color.toLowerCase() !== '#ffffff'; return !seatState.hidden && !hasCustomColor; }
    
    function detectAllBlocks() {
        const blocks = []; const visited = new Set();
        for (let r = 1; r <= state.grid.rows; r++) { for (let c = 1; c <= state.grid.cols; c++) {
            const seatId = `${r}-${c}`;
            if (visited.has(seatId) || !isSeatNumberable(r, c)) continue;
            const block = []; const stack = [seatId]; visited.add(seatId);
            while (stack.length > 0) {
                const currentId = stack.pop(); block.push(currentId);
                const [currR, currC] = currentId.split('-').map(Number);
                const neighbors = [`${currR-1}-${currC}`, `${currR+1}-${currC}`, `${currR}-${currC-1}`, `${currR}-${currC+1}`];
                neighbors.forEach(neighborId => {
                    const [nextR, nextC] = neighborId.split('-').map(Number);
                    if (nextR > 0 && nextR <= state.grid.rows && nextC > 0 && nextC <= state.grid.cols && !visited.has(neighborId) && isSeatNumberable(nextR, nextC)) {
                        visited.add(neighborId); stack.push(neighborId);
                    }
                });
            }
            if (block.length > 0) blocks.push(block);
        }} return blocks;
    }

    function calculateNumbering() {
        const numberingMap = {}; const blocks = detectAllBlocks();
        const sortSeats = (a, b) => { const [rA, cA] = a.split('-').map(Number); const [rB, cB] = b.split('-').map(Number); return rA - rB || cA - cB; };
        blocks.forEach(b => b.sort(sortSeats)); blocks.sort((blockA, blockB) => sortSeats(blockA[0], blockB[0]));
        
        const strategy = state.numberingStrategy || 'block'; const assignNumber = (num) => state.useGematria ? toGematria(num) : num;
        
        if (strategy === 'continuous') {
            let counter = 1; blocks.flat().forEach(seatId => { if (!isSeatCoveredByMerge(...seatId.split('-').map(Number))) { numberingMap[seatId] = assignNumber(counter++); } });
        } else { // block or series
            const step = strategy === 'series' ? 100 : 0; let seriesBase = strategy === 'series' ? 100 : 1;
            blocks.forEach(block => {
                let counter = seriesBase; 
                block.forEach(seatId => { if (!isSeatCoveredByMerge(...seatId.split('-').map(Number))) { numberingMap[seatId] = assignNumber(counter++); } });
                if (strategy === 'series') { const blockSize = block.length; seriesBase += Math.max(step, Math.ceil(blockSize / step) * step); }
            });
        }
        
        Object.keys(state.merges).forEach(startSeatId => {
            const seatState = state.seats[startSeatId] || {};
            if (seatState.color && seatState.color.toLowerCase() !== '#ffffff') {
                delete numberingMap[startSeatId];
                return;
            }

            const mergeInfo = state.merges[startSeatId]; const [startR, startC] = startSeatId.split('-').map(Number);
            const mergedNumbers = [];
            for (let r_offset = 0; r_offset < mergeInfo.rowSpan; r_offset++) { for (let c_offset = 0; c_offset < mergeInfo.colSpan; c_offset++) {
                const innerSeatId = `${startR + r_offset}-${startC + c_offset}`;
                if (numberingMap[innerSeatId]) {
                    mergedNumbers.push({id: numberingMap[innerSeatId], originalId: innerSeatId });
                }
                if(r_offset > 0 || c_offset > 0) {
                     delete numberingMap[innerSeatId];
                }
            }}
           
            if (mergedNumbers.length > 1) {
                mergedNumbers.sort((a,b) => sortSeats(a.originalId, b.originalId));
                numberingMap[startSeatId] = `${mergedNumbers[0].id}-${mergedNumbers[mergedNumbers.length-1].id}`;
            } else if (mergedNumbers.length === 1) {
                numberingMap[startSeatId] = mergedNumbers[0].id;
            }
        });
        return numberingMap;
    }

    // --- GRID & HEADERS ---
    function createGrid() {
        if (!state || !state.grid) { console.error("State is invalid."); return; }
        mapContainer.innerHTML = ''; colHeadersContainer.innerHTML = ''; rowHeadersContainer.innerHTML = '';
        const colTemplate = state.grid.colWidths.join(' '); const rowTemplate = state.grid.rowHeights.join(' ');
        mapContainer.style.gridTemplateColumns = colTemplate; mapContainer.style.gridTemplateRows = rowTemplate;
        colHeadersContainer.style.gridTemplateColumns = colTemplate; rowHeadersContainer.style.gridTemplateRows = rowTemplate;
        for (let c = 1; c <= state.grid.cols; c++) { const header = document.createElement('div'); header.className = 'col-header'; header.textContent = c; header.dataset.col = c; colHeadersContainer.appendChild(header); }
        for (let r = 1; r <= state.grid.rows; r++) { const header = document.createElement('div'); header.className = 'row-header'; header.textContent = r; header.dataset.row = r; rowHeadersContainer.appendChild(header); }
        
        let numberingMap = {}; if(state.showSeatNumbers) { numberingMap = calculateNumbering(); }

        for (let r = 1; r <= state.grid.rows; r++) {
            for (let c = 1; c <= state.grid.cols; c++) {
                const seatId = `${r}-${c}`; const seat = document.createElement('div');
                seat.className = 'seat'; seat.dataset.row = r; seat.dataset.col = c;
                const seatState = state.seats[seatId] || {};
                const seatContent = document.createElement('div'); seatContent.className = 'seat-content';
                seatContent.textContent = seatState.text || '';
                seat.appendChild(seatContent);
                if (seatState.color) seat.style.backgroundColor = seatState.color;
                if (seatState.fontColor) seat.style.color = seatState.fontColor;
                if (seatState.writingMode) seat.style.writingMode = seatState.writingMode;
                if (seatState.fontWeight) seat.style.fontWeight = seatState.fontWeight;
                seat.style.fontSize = `${seatState.fontSize || DEFAULT_FONT_SIZE}px`;
                if (seatState.hidden) seat.classList.add('hidden');
                
                if (numberingMap[seatId]) { const numSpan = document.createElement('span'); numSpan.className = 'seat-number-legend'; numSpan.textContent = numberingMap[seatId]; seat.appendChild(numSpan); }
                
                const mergeInfo = state.merges[seatId];
                if (mergeInfo) { seat.style.gridRowEnd = `span ${mergeInfo.rowSpan}`; seat.style.gridColumnEnd = `span ${mergeInfo.colSpan}`; }
                else if (isSeatCoveredByMerge(r, c)) { seat.style.display = 'none'; }
                mapContainer.appendChild(seat);
            }
        }
    }
    function isSeatCoveredByMerge(row, col) { for (const startSeatId in state.merges) { const [startRow, startCol] = startSeatId.split('-').map(Number); const { rowSpan, colSpan } = state.merges[startSeatId]; if (row >= startRow && row < startRow + rowSpan && col >= startCol && col < startCol + colSpan && (row !== startRow || col !== startCol)) return true; } return false; }
    
    // --- ACCORDION ---
    function setupAccordion() { document.querySelectorAll('.tool-group-header').forEach(header => { const group = header.parentElement; const groupId = group.dataset.groupId; if (sessionStorage.getItem(`accordion-${groupId}`) === 'open') { group.classList.add('open'); } header.addEventListener('click', () => { group.classList.toggle('open'); sessionStorage.setItem(`accordion-${groupId}`, group.classList.contains('open') ? 'open' : 'closed'); }); }); }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Seat Editing
        applyBgColorBtn.addEventListener('click', applyBgColor);
        bgColorPicker.addEventListener('input', () => updateColorIndicator(bgColorPicker, bgColorIndicator));
        bgColorTrigger.addEventListener('click', () => bgColorPicker.click());
        applyFontColorBtn.addEventListener('click', applyFontColor);
        fontColorPicker.addEventListener('input', () => updateColorIndicator(fontColorPicker, fontColorIndicator));
        fontColorTrigger.addEventListener('click', () => fontColorPicker.click());
        fontSizeInput.addEventListener('change', changeSelectedFontSize);
        seatFontWeightBtn.addEventListener('click', toggleSeatFontWeight);
        widthInput.addEventListener('change', applySize); heightInput.addEventListener('change', applySize);
        mergeBtn.addEventListener('click', handleMergeUnmerge);
        hideModeBtn.addEventListener('click', toggleHideMode);
        writingModeBtn.addEventListener('click', toggleWritingMode);
        document.querySelectorAll('.number-input-control').forEach(btn => { btn.addEventListener('click', handleNumberInputChange); });

        // Numbering
        toggleNumberingBtn.addEventListener('click', toggleSeatNumbering);
        btnGematria.addEventListener('click', () => { state.useGematria = !state.useGematria; recordState(); rebuildUIFromState({ preserveSelection: true }); });
        btnNumContinuous.addEventListener('click', () => { setNumberingStrategy('continuous'); });
        btnNumBlock.addEventListener('click', () => { setNumberingStrategy('block'); });
        btnNumSeries.addEventListener('click', () => { setNumberingStrategy('series'); });

        // Grid & Object interactions
        mainContent.addEventListener('mousedown', handleContentMouseDown);
        document.addEventListener('mousemove', handleContentMouseMove);
        document.addEventListener('mouseup', handleContentMouseUp);
        mainContent.addEventListener('dblclick', handleDoubleClick);
        colHeadersContainer.addEventListener('click', e => { if (e.target.matches('.col-header')) selectColumn(+e.target.dataset.col, e.ctrlKey || e.metaKey); });
        rowHeadersContainer.addEventListener('click', e => { if (e.target.matches('.row-header')) selectRow(+e.target.dataset.row, e.ctrlKey || e.metaKey); });
        
        // Object Tools
        addTextboxBtn.addEventListener('click', () => createObject('text-box')); addLineBtn.addEventListener('click', () => createObject('line-object')); addRectangleBtn.addEventListener('click', () => createObject('rectangle-object')); addEllipseBtn.addEventListener('click', () => createObject('ellipse-object')); addImageBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', handleImageUpload);
        
        // Object Edit Tools
        document.getElementById('object-fill-picker').addEventListener('input', e => updateColorIndicator(e.target, document.getElementById('object-fill-indicator')));
        document.getElementById('object-stroke-picker').addEventListener('input', e => updateColorIndicator(e.target, document.getElementById('object-stroke-indicator')));
        document.getElementById('object-font-color-picker').addEventListener('input', e => updateColorIndicator(e.target, document.getElementById('object-font-color-indicator')));
        objectEditTools.addEventListener('change', handleObjectPanelChange);
        document.getElementById('object-fill-trigger').addEventListener('click', () => document.getElementById('object-fill-picker').click());
        document.getElementById('object-stroke-trigger').addEventListener('click', () => document.getElementById('object-stroke-picker').click());
        document.getElementById('object-font-color-trigger').addEventListener('click', () => document.getElementById('object-font-color-picker').click());
        objectFontWeightBtn.addEventListener('click', handleObjectPanelChange); // Can be triggered by click too
        deleteObjectBtn.addEventListener('click', deleteSelectedObject);
        
        // Grid Structure Tools
        addRowsColsCountInput.addEventListener('input', updateGridEditDynamicLabel);
        updateGridEditDynamicLabel(); // Initial call
        addRowBeforeBtn.addEventListener('click', () => addRowsOrCols('row', 'before')); addRowAfterBtn.addEventListener('click', () => addRowsOrCols('row', 'after')); addRowStartBtn.addEventListener('click', () => addRowsOrCols('row', 'start')); addRowEndBtn.addEventListener('click', () => addRowsOrCols('row', 'end')); addColBeforeBtn.addEventListener('click', () => addRowsOrCols('col', 'before')); addColAfterBtn.addEventListener('click', () => addRowsOrCols('col', 'after')); addColStartBtn.addEventListener('click', () => addRowsOrCols('col', 'start')); addColEndBtn.addEventListener('click', () => addRowsOrCols('col', 'end'));
        deleteBtn.addEventListener('click', deleteSelectedRowsOrCols);

        // Footer & General
        importBtn.addEventListener('click', () => importFileInput.click()); importFileInput.addEventListener('change', importMap);
        exportBtn.addEventListener('click', exportMap); saveImageBtn.addEventListener('click', saveAsImage); resetBtn.addEventListener('click', () => resetState(true));
        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('click', (e) => { if (!e.target.closest('.movable-object, #sidebar')) { deselectAllObjects(); } });

        // About Modal Listeners
        aboutBtn.addEventListener('click', () => aboutModal.classList.add('visible'));
        closeModalBtn.addEventListener('click', () => aboutModal.classList.remove('visible'));
        aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) { aboutModal.classList.remove('visible'); } });
        downloadOfflineBtn.addEventListener('click', downloadOfflineVersion);

        // Zoom Listeners
        zoomSlider.addEventListener('input', handleZoom);
        zoomInBtn.addEventListener('click', () => changeZoom(10));
        zoomOutBtn.addEventListener('click', () => changeZoom(-10));
    }
    
    // --- HELPERS ---
    function hexToRgba(hex, alpha = 1) { if(!hex) hex = '#ffffff'; const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
    function updateColorIndicator(picker, indicator) { if (indicator) indicator.style.backgroundColor = picker.value; }
    function updateAllColorIndicators() { updateColorIndicator(bgColorPicker, bgColorIndicator); updateColorIndicator(fontColorPicker, fontColorIndicator); if(activeMovableObject) {updateColorIndicator(document.getElementById('object-fill-picker'), document.getElementById('object-fill-indicator')); updateColorIndicator(document.getElementById('object-stroke-picker'), document.getElementById('object-stroke-indicator')); updateColorIndicator(document.getElementById('object-font-color-picker'), document.getElementById('object-font-color-indicator'));} }

    // --- MOUSE & KEYBOARD & EDITING ---
    function handleKeyDown(e) {
        if (e.target.closest('[contenteditable="true"]') || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const selectedSeats = getSelectedSeats();
        const isPrintableKey = e.key.length === 1 && !isCtrlOrMeta;

        // Priority 1: Ctrl/Meta + C/V
        if (isCtrlOrMeta) {
            if (e.key.toLowerCase() === 'c') {
                if (selectedSeats.length > 0) {
                    e.preventDefault();
                    copySeatStyle();
                }
                return;
            }
            if (e.key.toLowerCase() === 'v') {
                if (selectedSeats.length > 0 && seatStyleClipboard) {
                    e.preventDefault();
                    pasteSeatStyle();
                }
                return;
            }
        }
        
        // Priority 2: Escape, Delete, Backspace
        if (e.key === 'Escape') { 
            e.preventDefault();
            deselectAllObjects(); 
            deselectAllSeats(); 
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (activeMovableObject) {
                deleteSelectedObject();
            } else if (selectedSeats.length > 0) {
                selectedSeats.forEach(seat => {
                    const seatId = `${seat.dataset.row}-${seat.dataset.col}`;
                    state.seats[seatId] = { ...(state.seats[seatId] || {}), text: '' };
                });
                recordState();
                rebuildUIFromState({ preserveSelection: true });
            }
            return;
        }

        // Priority 3: Arrow navigation
        const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrows.includes(e.key)) {
            e.preventDefault();
            const lastSelected = document.querySelector(`.seat[data-row='${lastSelectedSeatId?.split('-')[0]}'][data-col='${lastSelectedSeatId?.split('-')[1]}']`);
            if (!lastSelected) return; let { row, col } = lastSelected.dataset; row = parseInt(row); col = parseInt(col);
            if (e.key === 'ArrowUp' && row > 1) row--; if (e.key === 'ArrowDown' && row < state.grid.rows) row++;
            if (e.key === 'ArrowRight' && col > 1) col--; if (e.key === 'ArrowLeft' && col < state.grid.cols) col++;
            const nextSeatEl = document.querySelector(`.seat[data-row='${row}'][data-col='${col}']`);
            if (nextSeatEl) { if (!e.shiftKey) deselectAllSeats(); toggleSeatSelection(nextSeatEl, true); lastSelectedSeatId = `${row}-${col}`; updateAllSideBarInputs(); }
            return;
        }
        
        // Priority 4: Type-to-edit
        if (isPrintableKey && selectedSeats.length === 1) {
            e.preventDefault();
            const seat = selectedSeats[0];
            const seatContent = seat.querySelector('.seat-content');
            if(seatContent) {
                seatContent.textContent = e.key;
                makeEditable(seatContent);
                // Move cursor to the end
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(seatContent);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
    
    function handleContentMouseDown(e) {
        const clickedObject = e.target.closest('.movable-object');
        const seat = e.target.closest('.seat');
        
        if (e.target.closest('[contenteditable="true"]')) return;

        if (clickedObject) {
            selectObject(clickedObject);
            actionState.target = clickedObject;
            actionState.startX = e.clientX; 
            actionState.startY = e.clientY;

            if (e.target.classList.contains('resizer')) {
                actionState.intent = 'resizing';
                actionState.resizer = e.target.className.replace('resizer ', '');
            } else if (e.target.classList.contains('rotator')) {
                actionState.intent = 'rotating';
            } else {
                actionState.intent = 'dragging';
            }

            const rect = clickedObject.getBoundingClientRect();
            actionState.startWidth = rect.width; 
            actionState.startHeight = rect.height;
            actionState.startLeft = clickedObject.offsetLeft; 
            actionState.startTop = clickedObject.offsetTop;
            
            e.preventDefault();
        } else if (seat) {
            handleSeatClick(e);
        } else {
             if (!e.target.closest('#sidebar')) {
                deselectAllObjects(); deselectAllSeats();
                actionState.intent = 'selecting';
                const containerRect = gridAndCanvasContainer.getBoundingClientRect();
                actionState.startX = e.clientX - containerRect.left + mainContent.scrollLeft;
                actionState.startY = e.clientY - containerRect.top + mainContent.scrollTop;
                Object.assign(selectionBox.style, { display: 'block', left: `${actionState.startX}px`, top: `${actionState.startY}px`, width: '0px', height: '0px' });
             }
        }
    }

    function handleContentMouseMove(e) {
        e.preventDefault();
        const dx = e.clientX - actionState.startX;
        const dy = e.clientY - actionState.startY;

        if (actionState.intent && !actionState.isDragging && !actionState.isResizing && !actionState.isRotating) {
            if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                if(actionState.intent === 'dragging') actionState.isDragging = true;
                if(actionState.intent === 'resizing') {
                    actionState.isResizing = true;
                }
                if(actionState.intent === 'rotating') {
                    actionState.isRotating = true;
                    const rect = actionState.target.getBoundingClientRect();
                    const objState = state.objects.find(o => o.id === actionState.target.id);
                    actionState.initialRotation = objState.rotation || 0;
                    const objCenterX = rect.left + rect.width / 2;
                    const objCenterY = rect.top + rect.height / 2;
                    actionState.startAngle = Math.atan2(actionState.startY - objCenterY, actionState.startX - objCenterX) * (180 / Math.PI);
                }
            }
        }

        if (actionState.isDragging) {
            actionState.target.style.left = `${actionState.startLeft + dx}px`; 
            actionState.target.style.top = `${actionState.startTop + dy}px`; 
        } else if (actionState.isResizing) {
            let newWidth = actionState.startWidth, newHeight = actionState.startHeight, newLeft = actionState.startLeft, newTop = actionState.startTop;
            if (actionState.resizer.includes('right')) newWidth += dx; 
            if (actionState.resizer.includes('bottom')) newHeight += dy;
            if (actionState.resizer.includes('left')) { newWidth -= dx; newLeft += dx; }
            if (actionState.resizer.includes('top')) { newHeight -= dy; newTop += dy; }
            if (actionState.target.classList.contains('line-object')) { newHeight = actionState.startHeight; }
            actionState.target.style.width = `${Math.max(10, newWidth)}px`; 
            actionState.target.style.height = `${Math.max(10, newHeight)}px`;
            actionState.target.style.left = `${newLeft}px`; 
            actionState.target.style.top = `${newTop}px`;
        } else if(actionState.isRotating) {
            const rect = actionState.target.getBoundingClientRect();
            const objCenterX = rect.left + rect.width / 2;
            const objCenterY = rect.top + rect.height / 2;
            const currentAngle = Math.atan2(e.clientY - objCenterY, e.clientX - objCenterX) * (180 / Math.PI);
            let newRotation = actionState.initialRotation + (currentAngle - actionState.startAngle);
            newRotation = Math.round(newRotation);
            actionState.target.style.transform = `rotate(${newRotation}deg)`;
            
            const objState = state.objects.find(o => o.id === actionState.target.id);
            if(objState) { 
                objState.rotation = newRotation; 
                document.getElementById('object-rotation').value = newRotation;
            }
        } else if (actionState.intent === 'selecting') {
            const containerRect = gridAndCanvasContainer.getBoundingClientRect();
            const currentX = e.clientX - containerRect.left + mainContent.scrollLeft;
            const currentY = e.clientY - containerRect.top + mainContent.scrollTop;
            const newLeft = Math.min(actionState.startX, currentX); const newTop = Math.min(actionState.startY, currentY);
            const newWidth = Math.abs(currentX - actionState.startX); const newHeight = Math.abs(currentY - actionState.startY);
            Object.assign(selectionBox.style, { left: `${newLeft}px`, top: `${newTop}px`, width: `${newWidth}px`, height: `${newHeight}px` });
        }
    }
    function handleContentMouseUp(e) {
        if (actionState.isDragging || actionState.isResizing || actionState.isRotating) { updateObjectInState(actionState.target); recordState(); }
        if (actionState.intent === 'selecting') {
            const boxRect = selectionBox.getBoundingClientRect();
            deselectAllSeats();
            document.querySelectorAll('.seat').forEach(seat => { // Select all seats, including hidden
                const seatRect = seat.getBoundingClientRect();
                if (boxRect.left < seatRect.right && boxRect.right > seatRect.left && boxRect.top < seatRect.bottom && boxRect.bottom > seatRect.top) {
                    toggleSeatSelection(seat, true);
                }
            });
            selectionBox.style.display = 'none';
            updateAllSideBarInputs();
        }
        actionState = { intent: null, isDragging: false, isResizing: false, isRotating: false, target: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 };
    }
    
    function handleDoubleClick(e) {
        const seatContent = e.target.closest('.seat-content');
        const objectContent = e.target.closest('.object-text-content');
        if (seatContent) makeEditable(seatContent);
        if (objectContent) makeEditable(objectContent);
    }
    
    function makeEditable(element) {
        element.setAttribute('contenteditable', 'true');
        element.parentElement.classList.add('editing');
        element.focus();
        // document.execCommand('selectAll', false, null); // Commented out to avoid selecting all text on type-to-edit
        const onBlur = () => {
            element.setAttribute('contenteditable', 'false');
            element.parentElement.classList.remove('editing');
            element.removeEventListener('blur', onBlur);
            element.removeEventListener('keydown', onKeyDown);
            if (element.classList.contains('seat-content')) {
                const seat = element.parentElement;
                const seatId = `${seat.dataset.row}-${seat.dataset.col}`;
                state.seats[seatId] = { ...(state.seats[seatId] || {}), text: element.textContent };
            } else if (element.classList.contains('object-text-content')) {
                updateObjectInState(element.parentElement);
            }
            recordState();
        };
        const onKeyDown = (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); element.blur(); }};
        element.addEventListener('blur', onBlur);
        element.addEventListener('keydown', onKeyDown);
    }
    
    // --- HTML OBJECTS ---
    function createObject(type, options = {}) {
        const id = `obj_${Date.now()}`;
        const newObjState = { id, type, left: '50px', top: '50px', width: '150px', height: '100px', rotation: 0, fillColor: '#ffffff', fillOpacity: 0, strokeColor: '#000000', strokeOpacity: 1, borderWidth: '2px', borderStyle: 'solid', borderRadius: '0px', color: '#1e293b', fontSize: '16px', fontWeight: 'normal', content: type.includes('image') ? '' : 'טקסט', ...options };
        if(type === 'line-object') { newObjState.height = '2px'; newObjState.fillOpacity = 0; }
        if(type === 'ellipse-object') newObjState.borderRadius = '50%';
        state.objects.push(newObjState);
        const objEl = renderObject(newObjState);
        objectContainer.appendChild(objEl);
        selectObject(objEl); recordState();
    }
    function renderObject(objState) {
        let el = document.getElementById(objState.id);
        if(!el) {
            el = document.createElement('div');
            el.id = objState.id;
            const resizers = objState.type === 'line-object' ? ['left-middle', 'right-middle'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            resizers.forEach(pos => { const resizer = document.createElement('div'); resizer.className = `resizer ${pos}`; el.appendChild(resizer); });
            const rotator = document.createElement('div'); rotator.className = 'rotator'; el.appendChild(rotator);
            if (!objState.type.includes('line')) { const textContent = document.createElement('div'); textContent.className = 'object-text-content'; el.appendChild(textContent); }
        }
        
        el.className = `movable-object ${objState.type}`;
        if(activeMovableObject && activeMovableObject.id === objState.id) el.classList.add('selected');
        
        Object.assign(el.style, { left: objState.left, top: objState.top, width: objState.width, height: objState.height, backgroundColor: hexToRgba(objState.fillColor, objState.fillOpacity), borderColor: objState.type === 'line-object' ? 'transparent' : hexToRgba(objState.strokeColor, objState.strokeOpacity), borderWidth: objState.borderWidth, borderStyle: objState.borderStyle, borderRadius: objState.borderRadius, transform: `rotate(${objState.rotation || 0}deg)` });
        
        const textContentEl = el.querySelector('.object-text-content');
        if (textContentEl) { Object.assign(textContentEl.style, { color: objState.color, fontSize: objState.fontSize, fontWeight: objState.fontWeight }); if (textContentEl.textContent !== objState.content) { textContentEl.textContent = objState.content || ''; } }
        if (objState.type === 'image-object') { el.style.backgroundImage = `url(${objState.backgroundImageData})`; }
        if (objState.type === 'line-object') {
            if (!el.querySelector('.resizer')) {
                const resizers = ['left-middle', 'right-middle'];
                resizers.forEach(pos => { const resizer = document.createElement('div'); resizer.className = `resizer ${pos}`; el.appendChild(resizer); });
                const rotator = document.createElement('div'); rotator.className = 'rotator'; el.appendChild(rotator);
            }
            el.querySelector('svg')?.remove();
            const svg = `<svg width="100%" height="100%" style="overflow: visible;"><line x1="0" y1="50%" x2="100%" y2="50%" stroke="${hexToRgba(objState.strokeColor, objState.strokeOpacity)}" stroke-width="${parseInt(objState.borderWidth)}" stroke-dasharray="${objState.borderStyle === 'dashed' ? '5,5' : (objState.borderStyle === 'dotted' ? `1, ${parseInt(objState.borderWidth)*2}`: 'none')}"/></svg>`;
            el.insertAdjacentHTML('afterbegin', svg);
        }
        
        return el;
    }
    function loadObjectsFromState() { objectContainer.innerHTML = ''; if (!state.objects) state.objects = []; state.objects.forEach(objState => { objectContainer.appendChild(renderObject(objState)); }); }
    function selectObject(el) { deselectAllObjects(); deselectAllSeats(); el.classList.add('selected'); activeMovableObject = el; updateAllSideBarInputs(); }
    function deselectAllObjects() { if(activeMovableObject) activeMovableObject.classList.remove('selected'); activeMovableObject = null; updateAllSideBarInputs(); actionState = { intent: null, isDragging: false, isResizing: false, isRotating: false, target: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 }; }
    function deleteSelectedObject() { if (!activeMovableObject) return; state.objects = state.objects.filter(o => o.id !== activeMovableObject.id); activeMovableObject.remove(); activeMovableObject = null; updateAllSideBarInputs(); recordState(); }
    function updateObjectInState(el) { const objState = state.objects.find(o => o.id === el.id); if (!objState) return; Object.assign(objState, { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height, rotation: objState.rotation || 0 }); const textContent = el.querySelector('.object-text-content'); if(textContent) objState.content = textContent.textContent; }
    function handleImageUpload(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => createObject('image-object', { backgroundImageData: event.target.result }); reader.readAsDataURL(file); e.target.value = ''; }
    
    // --- SEAT/GRID ACTIONS ---
    function handleSeatClick(e) {
        const seat = e.target.closest('.seat'); if (!seat) return;
        deselectAllObjects();
        const { row, col } = seat.dataset; const seatId = `${row}-${col}`;
        if (state.isHideMode) { toggleSeatHiddenState(seat); recordState(); rebuildUIFromState({preserveSelection: true}); return; }
        if (e.shiftKey && lastSelectedSeatId) {
            const [lastR, lastC] = lastSelectedSeatId.split('-').map(Number); const [currR, currC] = [parseInt(row), parseInt(col)];
            const minR = Math.min(lastR, currR), maxR = Math.max(lastR, currR); const minC = Math.min(lastC, currC), maxC = Math.max(lastC, currC);
            if (!e.ctrlKey && !e.metaKey) deselectAllSeats();
            for (let r = minR; r <= maxR; r++) { for (let c = minC; c <= maxC; c++) {
                const seatToSelect = document.querySelector(`.seat[data-row='${r}'][data-col='${c}']`); if (seatToSelect) toggleSeatSelection(seatToSelect, true);
            }}
        } else { if (!e.ctrlKey && !e.metaKey) deselectAllSeats(); toggleSeatSelection(seat, !seat.classList.contains('selected')); }
        lastSelectedSeatId = seatId; updateAllSideBarInputs();
    }
    function copySeatStyle() {
        const selected = getSelectedSeats();
        if (selected.length === 0) return;
        const firstSeat = selected[0];
        const seatId = `${firstSeat.dataset.row}-${firstSeat.dataset.col}`;
        const sourceState = state.seats[seatId] || {};
        
        seatStyleClipboard = {
            color: sourceState.color,
            fontColor: sourceState.fontColor,
            fontSize: sourceState.fontSize,
            fontWeight: sourceState.fontWeight,
            writingMode: sourceState.writingMode,
            hidden: sourceState.hidden,
        };
        
        updateStatusBar(`סגנון של מושב הועתק`);
    }
    function pasteSeatStyle() {
        const selected = getSelectedSeats();
        if (selected.length === 0 || !seatStyleClipboard) return;
        selected.forEach(seat => {
            const seatId = `${seat.dataset.row}-${seat.dataset.col}`;
            const currentText = state.seats[seatId]?.text;
            state.seats[seatId] = { ...(state.seats[seatId] || {}), ...seatStyleClipboard };
            if (currentText) {
                state.seats[seatId].text = currentText;
            }
        });
        recordState();
        rebuildUIFromState({ preserveSelection: true });
        updateStatusBar(`סגנון הודבק על ${selected.length} מושבים`);
    }
    function toggleSeatSelection(seat, force) { seat.classList.toggle('selected', force); }
    function deselectAllSeats() { document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected')); updateSelectionStatus(); }
    function getSelectedSeats() { return document.querySelectorAll('.seat.selected'); }
    function restoreSelection(idSet) { idSet.forEach(id => { const seat = mapContainer.querySelector(`.seat[data-row='${id.split('-')[0]}'][data-col='${id.split('-')[1]}']`); if(seat) seat.classList.add('selected'); })}
    function selectColumn(colNum, addToSelection = false) { if (!addToSelection) deselectAllSeats(); mapContainer.querySelectorAll(`.seat[data-col='${colNum}']`).forEach(s => toggleSeatSelection(s, true)); updateAllSideBarInputs(); if(state.isHideMode) handleHideOnSelection();}
    function selectRow(rowNum, addToSelection = false) { if (!addToSelection) deselectAllSeats(); mapContainer.querySelectorAll(`.seat[data-row='${rowNum}']`).forEach(s => toggleSeatSelection(s, true)); updateAllSideBarInputs(); if(state.isHideMode) handleHideOnSelection();}
    
    function applyBgColor() { getSelectedSeats().forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), color: bgColorPicker.value }; }); recordState(); rebuildUIFromState({preserveSelection: true}); }
    function applyFontColor() { getSelectedSeats().forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), fontColor: fontColorPicker.value }; }); recordState(); rebuildUIFromState({preserveSelection: true}); }
    function changeSelectedFontSize() { const selected = getSelectedSeats(); if (selected.length === 0) return; let newSize = parseInt(fontSizeInput.value, 10); if (isNaN(newSize) || newSize < 8) { updateStatusBar("ערך לא חוקי"); updateFontSizeInput(); return; } selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), fontSize: newSize }; }); recordState(); rebuildUIFromState({preserveSelection: true}); }
    function toggleSeatFontWeight() { const selected = getSelectedSeats(); if (selected.length === 0) return; const firstSeatId = `${selected[0].dataset.row}-${selected[0].dataset.col}`; const isBold = (state.seats[firstSeatId]?.fontWeight || 'normal') === 'bold'; const newWeight = isBold ? 'normal' : 'bold'; selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), fontWeight: newWeight }; }); recordState(); rebuildUIFromState({preserveSelection: true}); updateAllSideBarInputs(); }
    function toggleWritingMode() { const selected = getSelectedSeats(); if (selected.length === 0) return; const isVertical = state.seats[`${selected[0].dataset.row}-${selected[0].dataset.col}`]?.writingMode === 'vertical-rl'; const newMode = isVertical ? null : 'vertical-rl'; selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), writingMode: newMode }; }); recordState(); rebuildUIFromState({preserveSelection: true}); }
    function toggleHideMode() { state.isHideMode = !state.isHideMode; hideModeBtn.classList.toggle('active', state.isHideMode); deselectAllSeats(); updateStatusBar(state.isHideMode ? "מצב הצג/הסתר פעיל" : "מצב הצג/הסתר כבוי"); }
    function toggleSeatNumbering() { state.showSeatNumbers = !state.showSeatNumbers; recordState(); rebuildUIFromState({ preserveSelection: true }); }
    function setNumberingStrategy(strategy) { state.numberingStrategy = strategy; recordState(); rebuildUIFromState({ preserveSelection: true }); }
    function handleHideOnSelection() { let changedCount = 0; getSelectedSeats().forEach(seat => { toggleSeatHiddenState(seat); changedCount++; }); if (changedCount > 0) { recordState(); rebuildUIFromState({ preserveSelection: true }); updateStatusBar(`${changedCount} מושבים הוחבאו/הוצגו`); } }
    function toggleSeatHiddenState(seat) { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; const isHidden = state.seats[seatId]?.hidden || false; state.seats[seatId] = { ...(state.seats[seatId] || {}), hidden: !isHidden }; }
    function handleMergeUnmerge() { const selected = getSelectedSeats(); if (selected.length === 0) { updateStatusBar('יש לבחור מושבים.'); return; } const firstSeatId = `${selected[0].dataset.row}-${selected[0].dataset.col}`; if (selected.length === 1 && state.merges[firstSeatId]) { unmergeSeat(selected[0]); } else if (selected.length > 1) { mergeSeats(selected); } else { updateStatusBar('יש לבחור מושבים מרובים למיזוג, או מושב ממוזג לפיצול.'); return; } recordState(); rebuildUIFromState(); deselectAllSeats(); }
    function mergeSeats(selected) { let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity; selected.forEach(s => { minRow = Math.min(minRow, +s.dataset.row); maxRow = Math.max(maxRow, +s.dataset.row); minCol = Math.min(minCol, +s.dataset.col); maxCol = Math.max(maxCol, +s.dataset.col); }); const anchorId = `${minRow}-${minCol}`; state.merges[anchorId] = { rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 }; }
    function unmergeSeat(seat) { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; delete state.merges[seatId]; }
    
    // --- SIDEBAR UI UPDATES ---
    function handleNumberInputChange(e) {
        const button = e.currentTarget;
        const inputId = button.dataset.for;
        const action = button.dataset.action;
        const input = document.getElementById(inputId);
        if (!input) return;

        let currentValue = parseFloat(input.value) || 0;
        const step = parseFloat(input.step) || 1;
        
        if (action === 'increase') {
            currentValue += step;
        } else if (action === 'decrease') {
            currentValue -= step;
        }

        const min = parseFloat(input.min);
        const max = parseFloat(input.max);

        if (!isNaN(min) && currentValue < min) currentValue = min;
        if (!isNaN(max) && currentValue > max) currentValue = max;
        
        input.value = currentValue;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function handleObjectPanelChange(e) {
        if (!activeMovableObject) return;
        const objState = state.objects.find(o => o.id === activeMovableObject.id);
        if (!objState) return;

        objState.width = `${document.getElementById('object-width').value}px`;
        objState.height = `${document.getElementById('object-height').value}px`;
        objState.rotation = document.getElementById('object-rotation').value;

        objState.fillColor = document.getElementById('object-fill-picker').value;
        objState.fillOpacity = document.getElementById('object-fill-opacity').value;
        objState.strokeColor = document.getElementById('object-stroke-picker').value;
        objState.strokeOpacity = document.getElementById('object-stroke-opacity').value;
        objState.borderWidth = `${document.getElementById('object-stroke-width').value}px`;
        objState.borderStyle = document.getElementById('object-stroke-style').value;
        objState.borderRadius = `${document.getElementById('object-border-radius').value}px`;
        objState.color = document.getElementById('object-font-color-picker').value;
        objState.fontSize = `${document.getElementById('object-font-size').value}px`;
        
        if (e && e.target === objectFontWeightBtn) {
            objState.fontWeight = objState.fontWeight === 'bold' ? 'normal' : 'bold';
        }

        renderObject(objState);
        updateAllSideBarInputs();
        recordState();
    }
    
    function updateAllSideBarInputs() {
        const selectedSeats = getSelectedSeats();
        objectEditTools.classList.toggle('visible', !!activeMovableObject);
        if (activeMovableObject) {
            const objState = state.objects.find(o => o.id === activeMovableObject.id);
            if(objState){
                document.getElementById('object-width').value = parseInt(objState.width) || 150;
                document.getElementById('object-height').value = parseInt(objState.height) || 100;
                document.getElementById('object-rotation').value = objState.rotation || 0;

                document.getElementById('object-fill-picker').value = objState.fillColor || '#ffffff';
                document.getElementById('object-fill-opacity').value = objState.fillOpacity ?? 1;
                document.getElementById('object-stroke-picker').value = objState.strokeColor || '#000000';
                document.getElementById('object-stroke-opacity').value = objState.strokeOpacity ?? 1;
                document.getElementById('object-stroke-width').value = parseInt(objState.borderWidth) || 0;
                document.getElementById('object-stroke-style').value = objState.borderStyle || 'solid';
                document.getElementById('object-border-radius').value = parseInt(objState.borderRadius) || 0;
                document.getElementById('object-font-color-picker').value = objState.color || '#1e293b';
                document.getElementById('object-font-size').value = parseInt(objState.fontSize) || 16;
                objectFontWeightBtn.classList.toggle('active', objState.fontWeight === 'bold');
                updateAllColorIndicators();
                
                const isLine = objState.type === 'line-object';
                const hasText = !objState.type.includes('line') && !objState.type.includes('image');
                document.getElementById('object-fill-controls').style.display = !isLine ? 'flex' : 'none';
                document.getElementById('object-text-controls').style.display = hasText ? 'flex' : 'none';
                document.getElementById('object-border-radius-wrapper').style.display = !isLine ? 'flex' : 'none';
            }
        }
        if (selectedSeats.length > 0) { 
            const firstSeat = selectedSeats[0]; 
            const firstSeatId = `${firstSeat.dataset.row}-${firstSeat.dataset.col}`;
            widthInput.value = parseInt(state.grid.colWidths[firstSeat.dataset.col - 1]); 
            heightInput.value = parseInt(state.grid.rowHeights[firstSeat.dataset.row - 1]);
            const isBold = (state.seats[firstSeatId]?.fontWeight || 'normal') === 'bold';
            const allSameWeight = [...selectedSeats].every(s => (state.seats[`${s.dataset.row}-${s.dataset.col}`]?.fontWeight || 'normal') === (isBold ? 'bold' : 'normal'));
            seatFontWeightBtn.classList.toggle('active', allSameWeight && isBold);
        } else { 
            widthInput.value = ''; 
            heightInput.value = ''; 
        }
        updateFontSizeInput(); updateSelectionStatus();
    }
    function updateFontSizeInput() { const selected = getSelectedSeats(); if (selected.length > 0) { const firstSeatId = `${selected[0].dataset.row}-${selected[0].dataset.col}`; const firstSize = state.seats[firstSeatId]?.fontSize || DEFAULT_FONT_SIZE; const allSameSize = [...selected].every(s => (state.seats[`${s.dataset.row}-${s.dataset.col}`]?.fontSize || DEFAULT_FONT_SIZE) === firstSize); fontSizeInput.value = allSameSize ? firstSize : ''; if(fontSizeInput.value) { fontSizeInput.parentElement.classList.add('has-value'); } else { fontSizeInput.parentElement.classList.remove('has-value'); } } else { fontSizeInput.value = ''; fontSizeInput.parentElement.classList.remove('has-value'); } }
    function applySize() { const rows = new Set(); const cols = new Set(); getSelectedSeats().forEach(s => { rows.add(s.dataset.row); cols.add(s.dataset.col); }); const newWidth = widthInput.value; const newHeight = heightInput.value; let changed = false; if (newWidth && !isNaN(newWidth) && newWidth > 0) { cols.forEach(c => state.grid.colWidths[c - 1] = `${newWidth}px`); changed = true; } if (newHeight && !isNaN(newHeight) && newHeight > 0) { rows.forEach(r => state.grid.rowHeights[r - 1] = `${newHeight}px`); changed = true; } if (changed) { recordState(); rebuildUIFromState({preserveSelection: true}); } }
    function updateNumberingControlActiveStates() {
        btnGematria.classList.toggle('active', !!state.useGematria);
        btnNumContinuous.classList.toggle('active', state.numberingStrategy === 'continuous');
        btnNumBlock.classList.toggle('active', state.numberingStrategy === 'block');
        btnNumSeries.classList.toggle('active', state.numberingStrategy === 'series');
    }

    // --- GRID MANAGEMENT ---
    function updateGridEditDynamicLabel() {
        const count = addRowsColsCountInput.value || 0;
        gridEditDynamicLabel.textContent = `היכן להוסיף ${count} שורות / טורים:`;
    }
    function getSelectionBounds() { const selected = getSelectedSeats(); if (selected.length === 0) return null; let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity; selected.forEach(s => { minRow = Math.min(minRow, +s.dataset.row); maxRow = Math.max(maxRow, +s.dataset.row); minCol = Math.min(minCol, +s.dataset.col); maxCol = Math.max(maxCol, +s.dataset.col); }); return { minRow, maxRow, minCol, maxCol }; }
    function addRowsOrCols(mode, position) {
        const isRowMode = mode === 'row'; const count = +addRowsColsCountInput.value || 1; let index = -1;
        const bounds = getSelectionBounds();
        if (position === 'start') index = 0;
        else if (position === 'end') index = isRowMode ? state.grid.rows : state.grid.cols;
        else if (bounds) { index = isRowMode ? (position === 'before' ? bounds.minRow - 1 : bounds.maxRow) : (position === 'before' ? bounds.minCol - 1 : bounds.maxCol); }
        else if (position === 'before' || position === 'after') { updateStatusBar("יש לבחור מיקום להוספה"); return; }
        if (isRowMode) { for (let i = 0; i < count; i++) state.grid.rowHeights.splice(index, 0, DEFAULT_SEAT_SIZE); state.grid.rows += count; }
        else { for (let i = 0; i < count; i++) state.grid.colWidths.splice(index, 0, DEFAULT_SEAT_SIZE); state.grid.cols += count; }
        remapStateAfterInsertion(isRowMode, index + 1, count); recordState(); rebuildUIFromState();
    }
    function deleteSelectedRowsOrCols() {
        const bounds = getSelectionBounds(); if (!bounds) { updateStatusBar("יש לבחור פריטים למחיקה"); return; }
        const selectedSeatCount = getSelectedSeats().length;
        const isFullRowSelection = (bounds.maxCol - bounds.minCol + 1) === state.grid.cols && selectedSeatCount === state.grid.cols * (bounds.maxRow - bounds.minRow + 1);
        const isFullColSelection = (bounds.maxRow - bounds.minRow + 1) === state.grid.rows && selectedSeatCount === state.grid.rows * (bounds.maxCol - bounds.minCol + 1);
        if (isFullRowSelection) deleteSelectedRows(bounds); else if (isFullColSelection) deleteSelectedCols(bounds); else updateStatusBar("יש לבחור שורה או טור מלאים למחיקה");
    }
    function deleteSelectedRows(bounds) { const rowsToDelete = Array.from({length: bounds.maxRow - bounds.minRow + 1}, (_, i) => bounds.minRow + i); state.grid.rowHeights.splice(bounds.minRow - 1, rowsToDelete.length); state.grid.rows -= rowsToDelete.length; remapStateAfterDeletion(true, rowsToDelete); recordState(); rebuildUIFromState(); updateStatusBar(`${rowsToDelete.length} שורות נמחקו`); }
    function deleteSelectedCols(bounds) { const colsToDelete = Array.from({length: bounds.maxCol - bounds.minCol + 1}, (_, i) => bounds.minCol + i); state.grid.colWidths.splice(bounds.minCol - 1, colsToDelete.length); state.grid.cols -= colsToDelete.length; remapStateAfterDeletion(false, colsToDelete); recordState(); rebuildUIFromState(); updateStatusBar(`${colsToDelete.length} טורים נמחקו`); }
    function remapStateAfterInsertion(isRow, startIndex, count) { if(startIndex === -1) return; const newSeats = {}; const newMerges = {}; const processItem = (item, r, c) => { const newR = (isRow && r >= startIndex) ? r + count : r; const newC = (!isRow && c >= startIndex) ? c + count : c; return [`${newR}-${newC}`, item]; }; for (const id in state.seats) { const [r, c] = id.split('-').map(Number); const [newId, item] = processItem(state.seats[id], r, c); newSeats[newId] = item; } for (const id in state.merges) { const [r, c] = id.split('-').map(Number); const [newId, item] = processItem(state.merges[id], r, c); newMerges[newId] = item; } state.seats = newSeats; state.merges = newMerges; }
    function remapStateAfterDeletion(isRow, deletedIndices) { const newSeats = {}; const newMerges = {}; const deletedSet = new Set(deletedIndices); const getOffset = (index) => deletedIndices.filter(d => d < index).length; for (const id in state.seats) { const [r, c] = id.split('-').map(Number); if ( (isRow && deletedSet.has(r)) || (!isRow && deletedSet.has(c)) ) continue; const newR = isRow ? r - getOffset(r) : r; const newC = !isRow ? c - getOffset(c) : c; newSeats[`${newR}-${newC}`] = state.seats[id]; } for (const id in state.merges) { const [r, c] = id.split('-').map(Number); if ( (isRow && deletedSet.has(r)) || (!isRow && deletedSet.has(c)) ) continue; const newR = isRow ? r - getOffset(r) : r; const newC = !isRow ? c - getOffset(c) : c; newMerges[`${newR}-${newC}`] = state.merges[id]; } state.seats = newSeats; state.merges = newMerges; }
    
    // --- UI FEEDBACK & IMPORT/EXPORT/SAVE & ZOOM ---
    let statusShowTimeout, statusFadeTimeout;
    function updateStatusBar(message) {
        clearTimeout(statusShowTimeout); clearTimeout(statusFadeTimeout);
        statusBar.textContent = message; statusBar.className = 'visible';
        statusShowTimeout = setTimeout(() => { statusBar.classList.add('fading'); }, 3000);
        statusFadeTimeout = setTimeout(() => { statusBar.className = ''; }, 6000);
    }
    function updateSelectionStatus() { /* No longer updating status on simple selection to avoid noise */ }
    function exportMap() { const current_state_json = JSON.stringify(state, null, 2); const blob = new Blob([current_state_json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'MaPraqti-map.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); updateStatusBar("הייצוא הושלם"); }
    function importMap(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const importedState = JSON.parse(e.target.result); if (importedState && importedState.grid) { state = importedState; rebuildUIFromState(); importFileInput.value = ""; updateStatusBar("המפה יובאה בהצלחה"); } else { alert('קובץ לא תקין או בפורמט שגוי.'); } } catch (err) { alert('שגיאה בניתוח קובץ ה-JSON.'); console.error(err); } }; reader.readAsText(file); }
    async function downloadOfflineVersion() {
        updateStatusBar("מכין גרסה להורדה...");
        try {
            const cssPromises = [...document.styleSheets].map(sheet => {
                try {
                    return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
                } catch (e) {
                     return fetch(sheet.href).then(response => response.text());
                }
            });
            const cssText = (await Promise.all(cssPromises)).join('\n');

            const jsContent = document.querySelector('script[src="script.js"]').innerHTML;
            let html = document.documentElement.outerHTML;
            
            html = html.replace(/<link rel="stylesheet".*?>/g, `<style>${cssText}</style>`);
            html = html.replace(/<script src="script\.js"><\/script>/, `<script>${jsContent}<\/script>`);
            
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'MaPraqti-Offline.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateStatusBar("ההורדה הושלמה!");

        } catch (error) {
            console.error("Error creating offline version:", error);
            updateStatusBar("שגיאה ביצירת גרסה לא מקוונת.");
        }
    }
    function saveAsImage() { deselectAllObjects(); deselectAllSeats(); const container = document.getElementById('grid-and-canvas-container'); updateStatusBar("מכין תמונה..."); html2canvas(container, { useCORS: true, backgroundColor: '#ffffff', scale: 4, }).then(canvas => { const link = document.createElement('a'); link.download = 'MaPraqti-map.png'; link.href = canvas.toDataURL('image/png'); link.click(); updateStatusBar("התמונה נשמרה"); }).catch(err => { console.error("Failed to save image:", err); updateStatusBar("שגיאה בשמירת התמונה"); }); }

    function handleZoom(e) {
        const zoomValue = e.target.value;
        layoutContainer.style.transform = `scale(${zoomValue / 100})`;
        zoomDisplay.textContent = `${zoomValue}%`;
    }

    function changeZoom(amount) {
        let currentValue = parseInt(zoomSlider.value, 10);
        currentValue += amount;
        if (currentValue < zoomSlider.min) currentValue = zoomSlider.min;
        if (currentValue > zoomSlider.max) currentValue = zoomSlider.max;
        zoomSlider.value = currentValue;
        zoomSlider.dispatchEvent(new Event('input'));
    }

    // --- RUN APPLICATION ---
    initialize();
});
