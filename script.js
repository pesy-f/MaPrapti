document.addEventListener('DOMContentLoaded', () => {
    // --- ICONS ---
    lucide.createIcons();

    // --- CONSTANTS & CONFIG ---
    const STORAGE_KEY = 'beitMidrashMapState_v21_final';
    const DEFAULT_SEAT_SIZE = '45px';
    const DEFAULT_FONT_SIZE = 14;

    // --- DOM ELEMENTS ---
    const mainContent = document.getElementById('main-content');
    const mapContainer = document.getElementById('beit-midrash-map');
    const colHeadersContainer = document.getElementById('col-headers');
    const rowHeadersContainer = document.getElementById('row-headers');
    const selectionBox = document.getElementById('selection-box');
    const importFileInput = document.getElementById('import-file-input');
    const imageUploadInput = document.getElementById('image-upload-input');
    const statusBar = document.getElementById('status-bar');
    
    // Sidebar Controls
    const bgColorPicker = document.getElementById('bg-color-picker');
    const fontColorPicker = document.getElementById('font-color-picker');
    const bgColorTrigger = document.getElementById('bg-color-trigger');
    const fontColorTrigger = document.getElementById('font-color-trigger');
    const bgColorIndicator = document.getElementById('bg-color-indicator');
    const fontColorIndicator = document.getElementById('font-color-indicator');
    const applyBgColorBtn = document.getElementById('btn-apply-bg-color');
    const applyFontColorBtn = document.getElementById('btn-apply-font-color');
    const fontSizeInput = document.getElementById('input-font-size');
    const widthInput = document.getElementById('input-width');
    const heightInput = document.getElementById('input-height');
    const mergeBtn = document.getElementById('btn-merge-unmerge');
    const hideModeBtn = document.getElementById('btn-mode-hide');
    const writingModeBtn = document.getElementById('btn-toggle-writing-mode');
    const toggleObjectModeBtn = document.getElementById('btn-toggle-object-mode');
    const addTextboxBtn = document.getElementById('btn-add-textbox');
    const addLineBtn = document.getElementById('btn-add-line');
    const addImageBtn = document.getElementById('btn-add-image');
    const addRowsColsCountInput = document.getElementById('add-rows-cols-count');
    const addRowBeforeBtn = document.getElementById('btn-add-row-before');
    const addRowAfterBtn = document.getElementById('btn-add-row-after');
    const addRowStartBtn = document.getElementById('btn-add-row-start');
    const addRowEndBtn = document.getElementById('btn-add-row-end');
    const addColBeforeBtn = document.getElementById('btn-add-col-before');
    const addColAfterBtn = document.getElementById('btn-add-col-after');
    const addColStartBtn = document.getElementById('btn-add-col-start');
    const addColEndBtn = document.getElementById('btn-add-col-end');
    const deleteBtn = document.getElementById('btn-delete');
    const importBtn = document.getElementById('btn-import');
    const exportBtn = document.getElementById('btn-export');
    const saveImageBtn = document.getElementById('btn-save-image');
    const resetBtn = document.getElementById('btn-reset');

    // --- STATE & APP VARS ---
    let state = {};
    let fabricCanvas;
    let history = [];
    let historyIndex = -1;
    let isUndoingRedoing = false;
    let lastSelectedSeatId = null;
    let isHideMode = false;
    let isObjectMode = false;
    let seatClipboard = null;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    
    // --- INITIALIZATION ---
    function initialize() {
        loadStateAndHistory();
        initializeFabricCanvas();
        rebuildUIFromState();
        setupEventListeners();
        mainContent.focus();
        updateColorIndicators();
    }
    
    // --- STATE SAVE/LOAD/HISTORY ---
    function recordState() { if (isUndoingRedoing) return; if (fabricCanvas) state.fabricJSON = fabricCanvas.toJSON(['id', 'src']); const currentStateJSON = JSON.stringify(state); if (history.length > 0 && currentStateJSON === history[historyIndex]) return; history = history.slice(0, historyIndex + 1); history.push(currentStateJSON); historyIndex = history.length - 1; if (history.length > 100) { history.shift(); historyIndex--; } localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); }
    function loadStateAndHistory() { try { const savedHistory = localStorage.getItem(STORAGE_KEY); if (savedHistory) { history = JSON.parse(savedHistory); historyIndex = history.length - 1; state = JSON.parse(history[historyIndex]); } else { resetState(false); } } catch (e) { console.error("Failed to load state, resetting.", e); resetState(false); } }
    function resetState(confirmReset = true) { if (confirmReset && !confirm('האם אתה בטוח שברצונך לאפס את המפה? כל השינויים יאבדו.')) return; localStorage.removeItem(STORAGE_KEY); history = []; historyIndex = -1; state = { grid: { rows: 20, cols: 22, colWidths: Array(22).fill(DEFAULT_SEAT_SIZE), rowHeights: Array(20).fill(DEFAULT_SEAT_SIZE) }, seats: {}, merges: {}, fabricJSON: null, }; if (fabricCanvas) fabricCanvas.clear(); recordState(); rebuildUIFromState(); updateStatusBar("המפה אופסה", 3000); }
    function rebuildUIFromState(options = { preserveSelection: false }) { let selectedIds = new Set(); if (options.preserveSelection) { selectedIds = new Set([...getSelectedSeats()].map(s => `${s.dataset.row}-${s.dataset.col}`)); } createGrid(); loadObjectsToCanvas(); if (options.preserveSelection) restoreSelection(selectedIds); updateAllSideBarInputs(); setTimeout(resizeFabricCanvas, 50); }
    function undo() { if (historyIndex > 0) { isUndoingRedoing = true; historyIndex--; state = JSON.parse(history[historyIndex]); rebuildUIFromState(); isUndoingRedoing = false; updateStatusBar("ביטול"); } }
    function redo() { if (historyIndex < history.length - 1) { isUndoingRedoing = true; historyIndex++; state = JSON.parse(history[historyIndex]); rebuildUIFromState(); isUndoingRedoing = false; updateStatusBar("בצע שוב"); } }

    // --- GRID & HEADERS ---
    function createGrid() { if (!state || !state.grid) { console.error("State is invalid."); return; } mapContainer.innerHTML = ''; colHeadersContainer.innerHTML = ''; rowHeadersContainer.innerHTML = ''; const colTemplate = state.grid.colWidths.join(' '); const rowTemplate = state.grid.rowHeights.join(' '); mapContainer.style.gridTemplateColumns = colTemplate; mapContainer.style.gridTemplateRows = rowTemplate; colHeadersContainer.style.gridTemplateColumns = colTemplate; rowHeadersContainer.style.gridTemplateRows = rowTemplate; for (let c = 1; c <= state.grid.cols; c++) { const header = document.createElement('div'); header.className = 'col-header'; header.textContent = c; header.dataset.col = c; colHeadersContainer.appendChild(header); } for (let r = 1; r <= state.grid.rows; r++) { const header = document.createElement('div'); header.className = 'row-header'; header.textContent = r; header.dataset.row = r; rowHeadersContainer.appendChild(header); } for (let r = 1; r <= state.grid.rows; r++) { for (let c = 1; c <= state.grid.cols; c++) { const seatId = `${r}-${c}`; const seat = document.createElement('div'); seat.className = 'seat'; seat.dataset.row = r; seat.dataset.col = c; const seatState = state.seats[seatId] || {}; seat.textContent = seatState.text || ''; if (seatState.color) seat.style.backgroundColor = seatState.color; if (seatState.fontColor) seat.style.color = seatState.fontColor; if (seatState.writingMode) seat.style.writingMode = seatState.writingMode; seat.style.fontSize = `${seatState.fontSize || DEFAULT_FONT_SIZE}px`; if (seatState.hidden) seat.classList.add('hidden'); const mergeInfo = state.merges[seatId]; if (mergeInfo) { seat.style.gridRowEnd = `span ${mergeInfo.rowSpan}`; seat.style.gridColumnEnd = `span ${mergeInfo.colSpan}`; } else if (isSeatCoveredByMerge(r, c)) { seat.style.display = 'none'; } mapContainer.appendChild(seat); } } }
    function isSeatCoveredByMerge(row, col) { for (const startSeatId in state.merges) { const [startRow, startCol] = startSeatId.split('-').map(Number); const { rowSpan, colSpan } = state.merges[startSeatId]; const isWithinBounds = (row >= startRow && row < startRow + rowSpan && col >= startCol && col < startCol + colSpan); const isAnchor = (row === startRow && col === startCol); if (isWithinBounds && !isAnchor) return true; } return false; }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        mapContainer.addEventListener('click', handleSeatClick);
        mapContainer.addEventListener('dblclick', handleSeatDblClick);
        mapContainer.addEventListener('input', handleSeatInput);
        mainContent.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        colHeadersContainer.addEventListener('click', e => { if (e.target.matches('.col-header')) selectColumn(+e.target.dataset.col, e.ctrlKey || e.metaKey); });
        rowHeadersContainer.addEventListener('click', e => { if (e.target.matches('.row-header')) selectRow(+e.target.dataset.row, e.ctrlKey || e.metaKey); });
        
        applyBgColorBtn.addEventListener('click', applyBgColor);
        bgColorPicker.addEventListener('input', updateColorIndicators);
        bgColorTrigger.addEventListener('click', () => bgColorPicker.click());
        
        applyFontColorBtn.addEventListener('click', applyFontColor);
        fontColorPicker.addEventListener('input', updateColorIndicators);
        fontColorTrigger.addEventListener('click', () => fontColorPicker.click());
        
        fontSizeInput.addEventListener('change', () => changeSelectedFontSize(true));
        widthInput.addEventListener('change', applySize);
        heightInput.addEventListener('change', applySize);
        mergeBtn.addEventListener('click', handleMergeUnmerge);
        hideModeBtn.addEventListener('click', toggleHideMode);
        toggleObjectModeBtn.addEventListener('click', toggleObjectMode);
        writingModeBtn.addEventListener('click', toggleWritingMode);
        addTextboxBtn.addEventListener('click', () => addObject('textbox'));
        addLineBtn.addEventListener('click', () => addObject('line'));
        addImageBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', handleImageUpload);
        
        addRowBeforeBtn.addEventListener('click', () => addRowsOrCols('row', 'before'));
        addRowAfterBtn.addEventListener('click', () => addRowsOrCols('row', 'after'));
        addRowStartBtn.addEventListener('click', () => addRowsOrCols('row', 'start'));
        addRowEndBtn.addEventListener('click', () => addRowsOrCols('row', 'end'));
        addColBeforeBtn.addEventListener('click', () => addRowsOrCols('col', 'before'));
        addColAfterBtn.addEventListener('click', () => addRowsOrCols('col', 'after'));
        addColStartBtn.addEventListener('click', () => addRowsOrCols('col', 'start'));
        addColEndBtn.addEventListener('click', () => addRowsOrCols('col', 'end'));

        deleteBtn.addEventListener('click', deleteSelectedRowsOrCols);

        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', importMap);
        exportBtn.addEventListener('click', exportMap);
        saveImageBtn.addEventListener('click', saveAsImage);
        resetBtn.addEventListener('click', () => resetState(true));
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', resizeFabricCanvas);
        window.addEventListener('paste', handlePaste);
    }
    
    // --- KEYBOARD, MOUSE, CLIPBOARD ---
    function handleKeyDown(e) { const isEditingText = document.activeElement.isContentEditable || document.activeElement.tagName === 'INPUT'; if (isEditingText && e.key !== 'Escape') { if (e.key === 'Enter') document.activeElement.blur(); return; } const ctrlOrMeta = e.ctrlKey || e.metaKey; if (ctrlOrMeta && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; } if (ctrlOrMeta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; } if (ctrlOrMeta && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; } if (ctrlOrMeta && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelection(); return; } const activeObject = fabricCanvas.getActiveObject(); if (activeObject && !isEditingText) handleObjectKeyDown(e, activeObject); else if (!isEditingText) handleGridKeyDown(e); }
    function handleObjectKeyDown(e, activeObject) { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteActiveObject(); } const step = e.shiftKey ? 10 : 1; let needsUpdate = false; switch(e.key) { case 'ArrowUp': activeObject.top -= step; needsUpdate = true; break; case 'ArrowDown': activeObject.top += step; needsUpdate = true; break; case 'ArrowLeft': activeObject.left -= step; needsUpdate = true; break; case 'ArrowRight': activeObject.left += step; needsUpdate = true; break; } if(needsUpdate) { e.preventDefault(); activeObject.setCoords(); fabricCanvas.renderAll(); } }
    function handleGridKeyDown(e) { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); let changed = false; getSelectedSeats().forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; if (state.seats[seatId] && state.seats[seatId].text) { state.seats[seatId].text = ''; seat.textContent = ''; changed = true; } }); if (changed) { recordState(); updateStatusBar(`תוכן נוקה`); } return; } if (!lastSelectedSeatId) return; const [row, col] = lastSelectedSeatId.split('-').map(Number); let nextRow = row, nextCol = col; let keyHandled = true; switch(e.key) { case 'ArrowUp': nextRow = Math.max(1, row - 1); break; case 'ArrowDown': nextRow = Math.min(state.grid.rows, row + 1); break; case 'ArrowLeft': nextCol = Math.min(state.grid.cols, col + 1); break; case 'ArrowRight': nextCol = Math.max(1, col - 1); break; default: keyHandled = false; } if (keyHandled) { e.preventDefault(); const nextSeat = mapContainer.querySelector(`.seat[data-row='${nextRow}'][data-col='${nextCol}']`); if (nextSeat) { if (!e.shiftKey) clearSelection(); toggleSeatSelection(nextSeat, true); lastSelectedSeatId = `${nextRow}-${nextCol}`; updateAllSideBarInputs(); } } }
    function handleDragStart(e) { if (e.target.closest('.canvas-container.fabric-active') || e.target.closest('aside') || isObjectMode) return; isDragging = true; if (!e.ctrlKey && !e.metaKey) clearSelection(); const rect = mapContainer.getBoundingClientRect(); dragStartX = e.clientX - rect.left; dragStartY = e.clientY - rect.top; Object.assign(selectionBox.style, { left: `${dragStartX}px`, top: `${dragStartY}px`, width: '0px', height: '0px', display: 'block' }); }
    function handleDragMove(e) { if (!isDragging) return; const rect = mapContainer.getBoundingClientRect(); let currentX = e.clientX - rect.left, currentY = e.clientY - rect.top; let newX = Math.min(dragStartX, currentX), newY = Math.min(dragStartY, currentY); let width = Math.abs(currentX - dragStartX), height = Math.abs(currentY - dragStartY); Object.assign(selectionBox.style, { left: `${newX}px`, top: `${newY}px`, width: `${width}px`, height: `${height}px` }); const boxRect = selectionBox.getBoundingClientRect(); mapContainer.querySelectorAll('.seat').forEach(seat => { const seatRect = seat.getBoundingClientRect(); const isIntersecting = !(boxRect.right < seatRect.left || boxRect.left > seatRect.right || boxRect.bottom < seatRect.top || boxRect.top > seatRect.bottom); toggleSeatSelection(seat, isIntersecting); }); }
    function handleDragEnd() { if (isDragging) { isDragging = false; selectionBox.style.display = 'none'; updateAllSideBarInputs(); if(isHideMode) handleHideOnSelection(); } }
    function copySelection() { const bounds = getSelectionBounds(); if (!bounds) return; const copiedSeats = []; for (let r = bounds.minRow; r <= bounds.maxRow; r++) { for (let c = bounds.minCol; c <= bounds.maxCol; c++) { const seatId = `${r}-${c}`; if (state.seats[seatId]) { copiedSeats.push({ relRow: r - bounds.minRow, relCol: c - bounds.minCol, data: JSON.parse(JSON.stringify(state.seats[seatId])) }); } } } if (copiedSeats.length > 0) { seatClipboard = copiedSeats; updateStatusBar("הבחירה הועתקה"); } }
    function pasteSelection() { if (!seatClipboard || !lastSelectedSeatId) { updateStatusBar("אין פריטים להדבקה או לא נבחר יעד"); return; } const [startRow, startCol] = lastSelectedSeatId.split('-').map(Number); seatClipboard.forEach(clipboardItem => { const targetRow = startRow + clipboardItem.relRow; const targetCol = startCol + clipboardItem.relCol; if (targetRow <= state.grid.rows && targetCol <= state.grid.cols) { const targetId = `${targetRow}-${targetCol}`; state.seats[targetId] = JSON.parse(JSON.stringify(clipboardItem.data)); } }); recordState(); rebuildUIFromState({ preserveSelection: true }); updateStatusBar("הדבקה בוצעה"); }
    function handlePaste(e) { const items = (e.clipboardData || e.originalEvent.clipboardData).items; for (const item of items) { if (item.kind === 'file' && item.type.startsWith('image/')) { const file = item.getAsFile(); const reader = new FileReader(); reader.onload = (event) => { addImageToCanvas(event.target.result); }; reader.readAsDataURL(file); e.preventDefault(); break; } } }

    // --- FABRIC.JS LOGIC ---
    function initializeFabricCanvas() { fabricCanvas = new fabric.Canvas('object-canvas', { containerClass: 'canvas-container', fireRightClick: true, stopContextMenu: true }); fabricCanvas.on({ 'object:modified': recordState, 'mouse:over': (e) => { if (e.target && !isObjectMode) fabricCanvas.wrapperEl.classList.add('fabric-active'); }, 'mouse:out': (e) => { if (!isObjectMode && (!e.target || (e.target && e.target.type !== 'activeSelection'))) { if (!fabricCanvas.getActiveObject()) { fabricCanvas.wrapperEl.classList.remove('fabric-active'); } } }, 'selection:cleared': () => { if (!isObjectMode) {fabricCanvas.wrapperEl.classList.remove('fabric-active'); mainContent.focus(); } }, 'selection:created': () => mainContent.blur(), }); }
    function resizeFabricCanvas() { const gridRect = mapContainer.getBoundingClientRect(); if (gridRect.width > 0 && gridRect.height > 0) { fabricCanvas.setWidth(gridRect.width); fabricCanvas.setHeight(gridRect.height); fabricCanvas.renderAll(); } }
    function loadObjectsToCanvas() { if (fabricCanvas) { fabricCanvas.loadFromJSON(state.fabricJSON, fabricCanvas.renderAll.bind(fabricCanvas)); } }
    function addObject(type) { if (!isObjectMode) toggleObjectMode(); let obj; const commonProps = { top: 50, left: 50, id: `obj-${Date.now()}` }; switch(type) { case 'textbox': const bgRect = new fabric.Rect({ fill: 'rgba(255, 255, 158, 0.9)', stroke: '#f1c40f', strokeWidth: 1, rx: 5, ry: 5, width: 150, height: 50 }); const text = new fabric.Textbox('טקסט', { width: 140, top: 7, left: 5, fontSize: 16, fontFamily: 'Noto Sans Hebrew', textAlign: 'right', fill: '#333'}); obj = new fabric.Group([bgRect, text], { ...commonProps, cornerColor: '#2980b9', cornerSize: 10, transparentCorners: false, borderColor: '#2980b9' }); break; case 'line': obj = new fabric.Line([50, 50, 150, 150], { ...commonProps, stroke: '#333', strokeWidth: 4, cornerColor: '#2980b9', cornerSize: 10, transparentCorners: false, borderColor: '#2980b9' }); break; } if (obj) { fabricCanvas.add(obj).setActiveObject(obj).renderAll(); recordState(); updateStatusBar("אובייקט נוסף"); } }
    function addImageToCanvas(dataUrl) { if (!isObjectMode) toggleObjectMode(); fabric.Image.fromURL(dataUrl, (img) => { img.set({ left: 100, top: 100, cornerColor: '#2980b9', cornerSize: 10, transparentCorners: false, borderColor: '#2980b9' }); img.scaleToWidth(200); fabricCanvas.add(img).setActiveObject(img).renderAll(); recordState(); updateStatusBar("תמונה נוספה"); }, { crossOrigin: 'anonymous' }); }
    function handleImageUpload(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { addImageToCanvas(event.target.result); }; reader.readAsDataURL(file); e.target.value = ''; } }
    function deleteActiveObject() { fabricCanvas.getActiveObjects().forEach(obj => fabricCanvas.remove(obj)); fabricCanvas.discardActiveObject().renderAll(); recordState(); updateStatusBar("אובייקט נמחק"); }

    // --- SEAT/GRID ACTIONS ---
    function handleSeatClick(e) {
        const seat = e.target.closest('.seat');
        if (!seat || isDragging) return;
        lastSelectedSeatId = `${seat.dataset.row}-${seat.dataset.col}`;
        if (isHideMode) {
            toggleSeatHiddenState(seat);
            seat.classList.toggle('hidden'); // Immediate visual feedback
            recordState();
            updateStatusBar("מצב מושב שונה");
        } else {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                clearSelection();
            }
            toggleSeatSelection(seat, !seat.classList.contains('selected'));
            updateAllSideBarInputs();
        }
    }
    function handleSeatDblClick(e) { const seat = e.target.closest('.seat'); if (!seat || isHideMode) return; makeSeatEditable(seat); }
    function makeSeatEditable(seat) { seat.contentEditable = true; seat.classList.add('editing'); seat.focus(); document.execCommand('selectAll', false, null); const onBlur = () => { seat.contentEditable = false; seat.classList.remove('editing'); seat.removeEventListener('blur', onBlur); seat.removeEventListener('keydown', onSeatKeyDown); recordState(); }; const onSeatKeyDown = (e) => { if (e.key === 'Escape' || e.key === 'Enter') seat.blur(); }; seat.addEventListener('blur', onBlur); seat.addEventListener('keydown', onSeatKeyDown); }
    function handleSeatInput(e) { const seat = e.target.closest('.seat'); if (!seat) return; const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), text: seat.textContent }; }
    function toggleSeatSelection(seat, force) { seat.classList.toggle('selected', force); }
    function clearSelection() { mapContainer.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected')); updateSelectionStatus(); }
    function getSelectedSeats() { return mapContainer.querySelectorAll('.seat.selected'); }
    function restoreSelection(idSet) { idSet.forEach(id => { const seat = mapContainer.querySelector(`.seat[data-row='${id.split('-')[0]}'][data-col='${id.split('-')[1]}']`); if(seat) seat.classList.add('selected'); })}
    function selectColumn(colNum, addToSelection = false) { if (!addToSelection) clearSelection(); mapContainer.querySelectorAll(`.seat[data-col='${colNum}']`).forEach(s => toggleSeatSelection(s, true)); updateAllSideBarInputs(); if(isHideMode) handleHideOnSelection();}
    function selectRow(rowNum, addToSelection = false) { if (!addToSelection) clearSelection(); mapContainer.querySelectorAll(`.seat[data-row='${rowNum}']`).forEach(s => toggleSeatSelection(s, true)); updateAllSideBarInputs(); if(isHideMode) handleHideOnSelection();}
    
    function updateColorIndicators() { bgColorIndicator.style.backgroundColor = bgColorPicker.value; fontColorIndicator.style.backgroundColor = fontColorPicker.value; }
    function applyBgColor() { const newColor = bgColorPicker.value; const selected = getSelectedSeats(); if(selected.length === 0) { updateStatusBar("יש לבחור מושבים"); return; } selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), color: newColor }; seat.style.backgroundColor = newColor; }); recordState(); }
    function applyFontColor() { const newColor = fontColorPicker.value; const selected = getSelectedSeats(); if(selected.length === 0) { updateStatusBar("יש לבחור מושבים"); return; } selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), fontColor: newColor }; seat.style.color = newColor; }); recordState(); }
    function changeSelectedFontSize(isAbsolute = false) { const selected = getSelectedSeats(); if (selected.length === 0) { updateStatusBar("יש לבחור מושבים"); return; } let newSize = parseInt(fontSizeInput.value, 10); if (isNaN(newSize) || newSize < 8) { updateStatusBar("ערך לא חוקי"); updateFontSizeInput(); return; } selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), fontSize: newSize }; seat.style.fontSize = `${newSize}px`; }); recordState(); updateFontSizeInput(); }
    function toggleWritingMode() { const selected = getSelectedSeats(); if (selected.length === 0) { updateStatusBar("יש לבחור מושבים"); return; } const isVertical = state.seats[`${selected[0].dataset.row}-${selected[0].dataset.col}`]?.writingMode === 'vertical-rl'; const newMode = isVertical ? null : 'vertical-rl'; selected.forEach(seat => { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; state.seats[seatId] = { ...(state.seats[seatId] || {}), writingMode: newMode }; seat.style.writingMode = newMode || ''; }); recordState(); }
    function toggleHideMode() { isHideMode = !isHideMode; hideModeBtn.classList.toggle('active'); clearSelection(); updateStatusBar(isHideMode ? "מצב הצג/הסתר פעיל" : "מצב הצג/הסתר כבוי"); }
    function toggleObjectMode() {
        isObjectMode = !isObjectMode;
        toggleObjectModeBtn.classList.toggle('active', isObjectMode);
        const canvasContainer = fabricCanvas.wrapperEl;

        if (isObjectMode) {
            mapContainer.style.pointerEvents = 'none';
            canvasContainer.classList.add('fabric-active');
            updateStatusBar("מצב עריכת אובייקטים פעיל");
        } else {
            mapContainer.style.pointerEvents = 'auto';
            canvasContainer.classList.remove('fabric-active');
            fabricCanvas.discardActiveObject().renderAll();
            updateStatusBar("מצב עריכת אובייקטים כבוי");
        }
    }
    function handleHideOnSelection() { let changedCount = 0; getSelectedSeats().forEach(seat => { toggleSeatHiddenState(seat); changedCount++; }); if (changedCount > 0) { recordState(); rebuildUIFromState({ preserveSelection: true }); updateStatusBar(`${changedCount} מושבים הוחבאו/הוצגו`); } }
    function toggleSeatHiddenState(seat) { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; const isHidden = state.seats[seatId]?.hidden || false; state.seats[seatId] = { ...(state.seats[seatId] || {}), hidden: !isHidden }; }
    function handleMergeUnmerge() { const selected = getSelectedSeats(); if (selected.length === 0) { alert('יש לבחור מושבים.'); return; } const firstSeatId = `${selected[0].dataset.row}-${selected[0].dataset.col}`; if (selected.length === 1 && state.merges[firstSeatId]) { unmergeSeat(selected[0]); } else if (selected.length > 1) { mergeSeats(selected); } else { alert('יש לבחור מושבים מרובים למיזוג, או מושב ממוזג בודד לפיצול.'); return; } recordState(); rebuildUIFromState(); clearSelection(); }
    function mergeSeats(selected) { let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity; selected.forEach(s => { minRow = Math.min(minRow, +s.dataset.row); maxRow = Math.max(maxRow, +s.dataset.row); minCol = Math.min(minCol, +s.dataset.col); maxCol = Math.max(maxCol, +s.dataset.col); }); const anchorId = `${minRow}-${minCol}`; state.merges[anchorId] = { rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 }; }
    function unmergeSeat(seat) { const seatId = `${seat.dataset.row}-${seat.dataset.col}`; delete state.merges[seatId]; }
    function updateAllSideBarInputs() { const selected = getSelectedSeats(); if (selected.length > 0) { const firstSeat = selected[0]; widthInput.value = parseInt(state.grid.colWidths[firstSeat.dataset.col - 1]); heightInput.value = parseInt(state.grid.rowHeights[firstSeat.dataset.row - 1]); } else { widthInput.value = ''; heightInput.value = ''; } updateFontSizeInput(); updateSelectionStatus(); }
    function updateFontSizeInput() { const selected = getSelectedSeats(); if (selected.length > 0) { const firstSeatId = `${selected[0].dataset.row}-${selected[0].dataset.col}`; const firstSize = state.seats[firstSeatId]?.fontSize || DEFAULT_FONT_SIZE; const allSameSize = [...selected].every(s => { const sId = `${s.dataset.row}-${s.dataset.col}`; return (state.seats[sId]?.fontSize || DEFAULT_FONT_SIZE) === firstSize; }); fontSizeInput.value = allSameSize ? firstSize : ''; fontSizeInput.placeholder = allSameSize ? '' : '--'; } else { fontSizeInput.value = ''; fontSizeInput.placeholder = '14'; } }
    function applySize() { const rows = new Set(); const cols = new Set(); const selected = getSelectedSeats(); if (selected.length === 0) return; selected.forEach(s => { rows.add(s.dataset.row); cols.add(s.dataset.col); }); const newWidth = widthInput.value; const newHeight = heightInput.value; let changed = false; if (newWidth && !isNaN(newWidth) && newWidth > 0) { cols.forEach(c => state.grid.colWidths[c - 1] = `${newWidth}px`); changed = true; } if (newHeight && !isNaN(newHeight) && newHeight > 0) { rows.forEach(r => state.grid.rowHeights[r - 1] = `${newHeight}px`); changed = true; } if (changed) { recordState(); rebuildUIFromState({preserveSelection: true}); } }

    // --- GRID MANAGEMENT ---
    function getSelectionBounds() { const selected = getSelectedSeats(); if (selected.length === 0) return null; let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity; selected.forEach(s => { minRow = Math.min(minRow, +s.dataset.row); maxRow = Math.max(maxRow, +s.dataset.row); minCol = Math.min(minCol, +s.dataset.col); maxCol = Math.max(maxCol, +s.dataset.col); }); return { minRow, maxRow, minCol, maxCol }; }
    function addRowsOrCols(mode, position) {
        const isRowMode = mode === 'row';
        const count = +addRowsColsCountInput.value || 1;
        let index = -1;
        const bounds = getSelectionBounds();

        if (position === 'start') {
            index = 0;
        } else if (position === 'end') {
            index = isRowMode ? state.grid.rows : state.grid.cols;
        } else if (bounds) {
            if (isRowMode) {
                index = position === 'before' ? bounds.minRow - 1 : bounds.maxRow;
            } else {
                index = position === 'before' ? bounds.minCol - 1 : bounds.maxCol;
            }
        } else if (position === 'before' || position === 'after') {
            updateStatusBar("יש לבחור מיקום להוספה");
            return;
        }

        if (isRowMode) {
            for (let i = 0; i < count; i++) state.grid.rowHeights.splice(index, 0, DEFAULT_SEAT_SIZE);
            state.grid.rows += count;
        } else {
            for (let i = 0; i < count; i++) state.grid.colWidths.splice(index, 0, DEFAULT_SEAT_SIZE);
            state.grid.cols += count;
        }
        remapStateAfterInsertion(isRowMode, index + 1, count);
        recordState();
        rebuildUIFromState({ preserveSelection: false });
    }
    function deleteSelectedRowsOrCols() {
        const bounds = getSelectionBounds();
        if (!bounds) {
            updateStatusBar("יש לבחור פריטים למחיקה");
            return;
        }
        
        const selectedSeatCount = getSelectedSeats().length;
        const isFullRowSelection = (bounds.maxCol - bounds.minCol + 1) === state.grid.cols && selectedSeatCount === state.grid.cols * (bounds.maxRow - bounds.minRow + 1);
        const isFullColSelection = (bounds.maxRow - bounds.minRow + 1) === state.grid.rows && selectedSeatCount === state.grid.rows * (bounds.maxCol - bounds.minCol + 1);

        if (isFullRowSelection) {
            deleteSelectedRows(bounds);
        } else if (isFullColSelection) {
            deleteSelectedCols(bounds);
        } else {
            updateStatusBar("יש לבחור שורה או טור מלאים למחיקה");
        }
    }
    function deleteSelectedRows(bounds) { const rowsToDelete = Array.from({length: bounds.maxRow - bounds.minRow + 1}, (_, i) => bounds.minRow + i); state.grid.rowHeights.splice(bounds.minRow - 1, rowsToDelete.length); state.grid.rows -= rowsToDelete.length; remapStateAfterDeletion(true, rowsToDelete); recordState(); rebuildUIFromState(); updateStatusBar(`${rowsToDelete.length} שורות נמחקו`); }
    function deleteSelectedCols(bounds) { const colsToDelete = Array.from({length: bounds.maxCol - bounds.minCol + 1}, (_, i) => bounds.minCol + i); state.grid.colWidths.splice(bounds.minCol - 1, colsToDelete.length); state.grid.cols -= colsToDelete.length; remapStateAfterDeletion(false, colsToDelete); recordState(); rebuildUIFromState(); updateStatusBar(`${colsToDelete.length} טורים נמחקו`); }
    function remapStateAfterInsertion(isRow, startIndex, count) { if(startIndex === -1) return; const newSeats = {}; const newMerges = {}; const processItem = (item, r, c) => { const newR = (isRow && r >= startIndex) ? r + count : r; const newC = (!isRow && c >= startIndex) ? c + count : c; return [`${newR}-${newC}`, item]; }; for (const id in state.seats) { const [r, c] = id.split('-').map(Number); const [newId, item] = processItem(state.seats[id], r, c); newSeats[newId] = item; } for (const id in state.merges) { const [r, c] = id.split('-').map(Number); const [newId, item] = processItem(state.merges[id], r, c); newMerges[newId] = item; } state.seats = newSeats; state.merges = newMerges; }
    function remapStateAfterDeletion(isRow, deletedIndices) { const newSeats = {}; const newMerges = {}; const deletedSet = new Set(deletedIndices); const getOffset = (index) => deletedIndices.filter(d => d < index).length; for (const id in state.seats) { const [r, c] = id.split('-').map(Number); if ( (isRow && deletedSet.has(r)) || (!isRow && deletedSet.has(c)) ) continue; const newR = isRow ? r - getOffset(r) : r; const newC = !isRow ? c - getOffset(c) : c; newSeats[`${newR}-${newC}`] = state.seats[id]; } for (const id in state.merges) { const [r, c] = id.split('-').map(Number); if ( (isRow && deletedSet.has(r)) || (!isRow && deletedSet.has(c)) ) continue; const newR = isRow ? r - getOffset(r) : r; const newC = !isRow ? c - getOffset(c) : c; newMerges[`${newR}-${newC}`] = state.merges[id]; } state.seats = newSeats; state.merges = newMerges; }
    
    // --- UI FEEDBACK & IMPORT/EXPORT/SAVE ---
    let statusTimeout;
    function updateStatusBar(message, duration = 3000) { clearTimeout(statusTimeout); statusBar.textContent = message; statusBar.classList.add('visible'); statusTimeout = setTimeout(() => { if (statusBar.textContent === message) { statusBar.classList.remove('visible'); } }, duration); }
    function updateSelectionStatus() { const count = getSelectedSeats().length; const isSelectionMessage = statusBar.textContent.includes('נבחרו'); if (count > 0 && !isHideMode) { clearTimeout(statusTimeout); statusBar.textContent = `${count} מושבים נבחרו`; statusBar.classList.add('visible'); } else if (isSelectionMessage) { statusBar.classList.remove('visible'); } }
    function exportMap() { const current_state_json = JSON.stringify(state, null, 2); const blob = new Blob([current_state_json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'beit-midrash-map.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); updateStatusBar("הייצוא הושלם"); }
    function importMap(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const importedState = JSON.parse(e.target.result); if (importedState && importedState.grid && importedState.seats) { state = importedState; history = [JSON.stringify(state)]; historyIndex = 0; rebuildUIFromState(); importFileInput.value = ""; updateStatusBar("המפה יובאה בהצלחה"); } else { alert('קובץ לא תקין או בפורמט שגוי.'); } } catch (err) { alert('שגיאה בניתוח קובץ ה-JSON.'); console.error(err); } }; reader.readAsText(file); }
    function saveAsImage() { clearSelection(); fabricCanvas.discardActiveObject().renderAll(); const container = document.getElementById('grid-and-canvas-container'); colHeadersContainer.classList.add('print-hidden'); rowHeadersContainer.classList.add('print-hidden'); updateStatusBar("מכין תמונה...", 10000); html2canvas(container, { useCORS: true, backgroundColor: '#ffffff', scale: 4, }).then(canvas => { const link = document.createElement('a'); link.download = 'beit-midrash-map-A3.png'; link.href = canvas.toDataURL('image/png'); link.click(); updateStatusBar("התמונה נשמרה"); }).catch(err => { console.error("Failed to save image:", err); updateStatusBar("שגיאה בשמירת התמונה"); }).finally(() => { colHeadersContainer.classList.remove('print-hidden'); rowHeadersContainer.classList.remove('print-hidden'); }); }

    // --- RUN APPLICATION ---
    initialize();
});