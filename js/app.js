/* ============================================================
   BlurKit — Client-side blur tool
   ============================================================ */

'use strict';

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
const state = {
  image: null,
  faces: [],
  customRegions: [],
  style: 'gaussian',
  intensity: 20,
  mode: 'click',
  scale: 1,
  drawing: null,
  modelsLoaded: false,
  nextId: 1,
};

// ------------------------------------------------------------
// Theme colors (sync with CSS)
// ------------------------------------------------------------
const THEME = {
  accent:        '#00e0ff',
  accentAlpha90: 'rgba(0, 224, 255, 0.9)',
  accentAlpha25: 'rgba(0, 224, 255, 0.25)',
  accentAlpha10: 'rgba(0, 224, 255, 0.1)',
  danger:        '#ff5e7a',
  dangerAlpha95: 'rgba(255, 94, 122, 0.95)',
  ink:           '#0a1024',
  white:         '#ffffff',
};

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------
const els = {
  uploadZone:       document.getElementById('uploadZone'),
  fileInput:        document.getElementById('fileInput'),
  workspace:        document.getElementById('workspace'),
  mainCanvas:       document.getElementById('mainCanvas'),
  overlayCanvas:    document.getElementById('overlayCanvas'),
  canvasWrap:       document.getElementById('canvasWrap'),
  loader:           document.getElementById('editorLoader'),
  loaderText:       document.getElementById('loaderText'),
  status:           document.getElementById('statusText'),
  intensitySlider:  document.getElementById('intensitySlider'),
  intensityValue:   document.getElementById('intensityValue'),
  regionCount:      document.getElementById('regionCount'),
  facesDetected:    document.getElementById('facesDetected'),
  blurAllFacesBtn:  document.getElementById('blurAllFacesBtn'),
  clearAllBtn:      document.getElementById('clearAllBtn'),
  downloadBtn:      document.getElementById('downloadBtn'),
  newImageBtn:      document.getElementById('newImageBtn'),
  toast:            document.getElementById('toast'),
};

const mainCtx = els.mainCanvas.getContext('2d');
const overlayCtx = els.overlayCanvas.getContext('2d');

// ------------------------------------------------------------
// Toast
// ------------------------------------------------------------
let toastTimeout;
function toast(message, duration = 2800) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => els.toast.classList.remove('show'), duration);
}

function updateStatus(text) {
  els.status.textContent = text;
}

// ------------------------------------------------------------
// Model loading (lazy)
// ------------------------------------------------------------
async function ensureModelsLoaded() {
  if (state.modelsLoaded) return true;
  if (typeof faceapi === 'undefined') {
    toast('AI library not loaded yet — try again in a moment');
    return false;
  }
  try {
    els.loaderText.textContent = 'Loading AI model…';
    els.loader.classList.add('active');
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    state.modelsLoaded = true;
    return true;
  } catch (err) {
    console.error('Model load failed', err);
    toast('Could not load face detection model. Manual blur still works.');
    return false;
  }
}

// ------------------------------------------------------------
// Upload handling
// ------------------------------------------------------------
els.uploadZone.addEventListener('click', () => els.fileInput.click());
els.uploadZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.fileInput.click();
  }
});

els.fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) loadImage(e.target.files[0]);
});

els.uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.uploadZone.classList.add('drag-over');
});
els.uploadZone.addEventListener('dragleave', () => {
  els.uploadZone.classList.remove('drag-over');
});
els.uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
});

// Paste anywhere on the page
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) loadImage(file);
      return;
    }
  }
});

async function loadImage(file) {
  if (file.size > 20 * 1024 * 1024) {
    toast('File too large — max 20MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const img = new Image();
    img.onload = async () => {
      state.image = img;
      state.faces = [];
      state.customRegions = [];
      state.nextId = 1;

      const MAX_W = 1200;
      const MAX_H = 900;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      state.scale = 1;
      if (w > MAX_W || h > MAX_H) {
        state.scale = Math.min(MAX_W / w, MAX_H / h);
        w = Math.round(w * state.scale);
        h = Math.round(h * state.scale);
      }

      els.mainCanvas.width = w;
      els.mainCanvas.height = h;
      els.overlayCanvas.width = w;
      els.overlayCanvas.height = h;

      els.uploadZone.style.display = 'none';
      els.workspace.classList.add('active');

      renderMainCanvas();
      await runFaceDetection();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ------------------------------------------------------------
// Face detection
// ------------------------------------------------------------
async function runFaceDetection() {
  const loaded = await ensureModelsLoaded();
  if (!loaded) {
    els.loader.classList.remove('active');
    updateStatus('Manual mode — draw regions to blur');
    return;
  }

  els.loaderText.textContent = 'Detecting faces…';
  els.loader.classList.add('active');

  try {
    const detections = await faceapi.detectAllFaces(
      els.mainCanvas,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
    );

    state.faces = detections.map((d) => ({
      id: state.nextId++,
      box: {
        x:      Math.max(0, d.box.x - d.box.width * 0.1),
        y:      Math.max(0, d.box.y - d.box.height * 0.15),
        width:  d.box.width * 1.2,
        height: d.box.height * 1.3,
      },
      blurred: false,
    }));

    els.facesDetected.textContent = `${state.faces.length} found`;
    if (state.faces.length === 0) {
      updateStatus('No faces detected — use Draw mode for manual blur');
    } else {
      updateStatus(`${state.faces.length} face${state.faces.length === 1 ? '' : 's'} detected — click to blur`);
    }
  } catch (err) {
    console.error(err);
    toast('Face detection failed — manual blur still works');
  }

  els.loader.classList.remove('active');
  renderMainCanvas();
  renderOverlay();
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function renderMainCanvas() {
  if (!state.image) return;
  const { width: w, height: h } = els.mainCanvas;

  mainCtx.drawImage(state.image, 0, 0, w, h);

  state.faces.forEach((face) => {
    if (face.blurred) {
      applyBlurToRegion(mainCtx, els.mainCanvas, face.box.x, face.box.y, face.box.width, face.box.height);
    }
  });

  state.customRegions.forEach((r) => {
    applyBlurToRegion(mainCtx, els.mainCanvas, r.x, r.y, r.w, r.h);
  });
}

function applyBlurToRegion(ctx, canvas, x, y, w, h) {
  x = Math.round(Math.max(0, x));
  y = Math.round(Math.max(0, y));
  w = Math.round(Math.min(w, canvas.width - x));
  h = Math.round(Math.min(h, canvas.height - y));
  if (w <= 0 || h <= 0) return;

  if (state.style === 'gaussian') {
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.filter = `blur(${Math.round(state.intensity / 2)}px)`;
    tctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    ctx.drawImage(tmp, x, y);

  } else if (state.style === 'pixelate') {
    const pixSize = Math.max(2, Math.round(state.intensity / 2));
    const tmp = document.createElement('canvas');
    const sw = Math.max(1, Math.floor(w / pixSize));
    const sh = Math.max(1, Math.floor(h / pixSize));
    tmp.width = sw;
    tmp.height = sh;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(canvas, x, y, w, h, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, sw, sh, x, y, w, h);
    ctx.imageSmoothingEnabled = true;

  } else if (state.style === 'black') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);

  } else if (state.style === 'emoji') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);
    const fontSize = Math.min(w, h) * 0.75;
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🙂', x + w / 2, y + h / 2);
  }
}

function renderOverlay() {
  const { width: w, height: h } = els.overlayCanvas;
  overlayCtx.clearRect(0, 0, w, h);

  // Face boxes
  state.faces.forEach((face) => {
    const { x, y, width, height } = face.box;
    if (face.blurred) {
      overlayCtx.strokeStyle = THEME.accentAlpha90;
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([6, 4]);
      overlayCtx.strokeRect(x, y, width, height);
      overlayCtx.setLineDash([]);
      drawBadge(x + width - 24, y + 4, '✓', THEME.accent, THEME.ink);
    } else {
      overlayCtx.strokeStyle = THEME.accentAlpha90;
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(x, y, width, height);
      // Corner brackets
      const b = Math.min(14, width / 4, height / 4);
      overlayCtx.lineWidth = 3;
      const corners = [
        [x,          y,           x+b,          y,           x,          y+b],
        [x+width,    y,           x+width-b,    y,           x+width,    y+b],
        [x,          y+height,    x+b,          y+height,    x,          y+height-b],
        [x+width,    y+height,    x+width-b,    y+height,    x+width,    y+height-b],
      ];
      corners.forEach(([ax,ay,bx,by,cx,cy]) => {
        overlayCtx.beginPath();
        overlayCtx.moveTo(bx, by);
        overlayCtx.lineTo(ax, ay);
        overlayCtx.lineTo(cx, cy);
        overlayCtx.stroke();
      });
    }
  });

  // Custom regions
  state.customRegions.forEach((r) => {
    overlayCtx.strokeStyle = THEME.accentAlpha90;
    overlayCtx.lineWidth = 2;
    overlayCtx.setLineDash([6, 4]);
    overlayCtx.strokeRect(r.x, r.y, r.w, r.h);
    overlayCtx.setLineDash([]);
    drawBadge(r.x + r.w - 22, r.y + 2, '×', THEME.dangerAlpha95, THEME.white);
  });

  // In-progress drawing rectangle
  if (state.drawing) {
    const { startX, startY, currentX, currentY } = state.drawing;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);
    overlayCtx.fillStyle = THEME.accentAlpha10;
    overlayCtx.fillRect(x, y, w, h);
    overlayCtx.strokeStyle = THEME.accent;
    overlayCtx.lineWidth = 2;
    overlayCtx.setLineDash([4, 4]);
    overlayCtx.strokeRect(x, y, w, h);
    overlayCtx.setLineDash([]);
  }

  updateRegionCount();
}

function drawBadge(x, y, text, bg, fg) {
  overlayCtx.fillStyle = bg;
  if (overlayCtx.roundRect) {
    overlayCtx.beginPath();
    overlayCtx.roundRect(x, y, 20, 20, 4);
    overlayCtx.fill();
  } else {
    overlayCtx.fillRect(x, y, 20, 20);
  }
  overlayCtx.fillStyle = fg;
  overlayCtx.font = 'bold 14px sans-serif';
  overlayCtx.textAlign = 'center';
  overlayCtx.textBaseline = 'middle';
  overlayCtx.fillText(text, x + 10, y + 11);
}

function updateRegionCount() {
  const blurredFaces = state.faces.filter((f) => f.blurred).length;
  const total = blurredFaces + state.customRegions.length;
  els.regionCount.textContent = total;
}

// ------------------------------------------------------------
// Pointer interaction
// ------------------------------------------------------------
function getCanvasCoords(e) {
  const rect = els.overlayCanvas.getBoundingClientRect();
  const sx = els.overlayCanvas.width / rect.width;
  const sy = els.overlayCanvas.height / rect.height;
  const point = e.touches ? e.touches[0] : e;
  return {
    x: (point.clientX - rect.left) * sx,
    y: (point.clientY - rect.top) * sy,
  };
}

els.overlayCanvas.addEventListener('mousedown',  onPointerDown);
els.overlayCanvas.addEventListener('mousemove',  onPointerMove);
els.overlayCanvas.addEventListener('mouseup',    onPointerUp);
els.overlayCanvas.addEventListener('mouseleave', onPointerUp);
els.overlayCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
els.overlayCanvas.addEventListener('touchmove',  onPointerMove, { passive: false });
els.overlayCanvas.addEventListener('touchend',   onPointerUp);

function onPointerDown(e) {
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);

  if (state.mode === 'click') {
    // Clicked a custom region's close badge?
    for (let i = state.customRegions.length - 1; i >= 0; i--) {
      const r = state.customRegions[i];
      const bx = r.x + r.w - 22;
      const by = r.y + 2;
      if (x >= bx && x <= bx + 20 && y >= by && y <= by + 20) {
        state.customRegions.splice(i, 1);
        renderMainCanvas();
        renderOverlay();
        return;
      }
    }

    // Toggle a face?
    for (let i = state.faces.length - 1; i >= 0; i--) {
      const f = state.faces[i];
      if (
        x >= f.box.x && x <= f.box.x + f.box.width &&
        y >= f.box.y && y <= f.box.y + f.box.height
      ) {
        f.blurred = !f.blurred;
        renderMainCanvas();
        renderOverlay();
        return;
      }
    }
  } else if (state.mode === 'draw') {
    state.drawing = { startX: x, startY: y, currentX: x, currentY: y };
  }
}

function onPointerMove(e) {
  if (!state.drawing) return;
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);
  state.drawing.currentX = x;
  state.drawing.currentY = y;
  renderOverlay();
}

function onPointerUp() {
  if (!state.drawing) return;
  const { startX, startY, currentX, currentY } = state.drawing;
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(currentX - startX);
  const h = Math.abs(currentY - startY);
  state.drawing = null;

  if (w > 10 && h > 10) {
    state.customRegions.push({ id: state.nextId++, x, y, w, h });
    renderMainCanvas();
    renderOverlay();
  } else {
    renderOverlay();
  }
}

// ------------------------------------------------------------
// Control handlers
// ------------------------------------------------------------
document.querySelectorAll('.style-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.style-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    state.style = btn.dataset.style;
    renderMainCanvas();
    renderOverlay();
  });
});

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    state.mode = btn.dataset.mode;
    els.canvasWrap.className = 'canvas-wrap mode-' + state.mode;
    updateStatus(state.mode === 'draw'
      ? 'Draw mode — drag a box over anything to blur'
      : 'Click mode — click a face or drawn region');
  });
});

els.intensitySlider.addEventListener('input', (e) => {
  state.intensity = parseInt(e.target.value, 10);
  els.intensityValue.textContent = state.intensity;
  renderMainCanvas();
  renderOverlay();
});

els.blurAllFacesBtn.addEventListener('click', () => {
  if (state.faces.length === 0) {
    toast('No faces detected in this image');
    return;
  }
  const allBlurred = state.faces.every((f) => f.blurred);
  state.faces.forEach((f) => { f.blurred = !allBlurred; });
  renderMainCanvas();
  renderOverlay();
  toast(allBlurred
    ? 'Unblurred all faces'
    : `Blurred ${state.faces.length} face${state.faces.length === 1 ? '' : 's'}`);
});

els.clearAllBtn.addEventListener('click', () => {
  state.faces.forEach((f) => { f.blurred = false; });
  state.customRegions = [];
  renderMainCanvas();
  renderOverlay();
  toast('Cleared all blur regions');
});

els.downloadBtn.addEventListener('click', () => {
  if (!state.image) return;

  // Render at original resolution for best quality
  const outCanvas = document.createElement('canvas');
  outCanvas.width  = state.image.naturalWidth;
  outCanvas.height = state.image.naturalHeight;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(state.image, 0, 0);

  const scaleX = outCanvas.width  / els.mainCanvas.width;
  const scaleY = outCanvas.height / els.mainCanvas.height;

  const applyScaled = (x, y, w, h) => {
    applyBlurToRegion(
      outCtx,
      outCanvas,
      x * scaleX, y * scaleY,
      w * scaleX, h * scaleY
    );
  };

  state.faces.forEach((f) => {
    if (f.blurred) applyScaled(f.box.x, f.box.y, f.box.width, f.box.height);
  });
  state.customRegions.forEach((r) => applyScaled(r.x, r.y, r.w, r.h));

  outCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blurkit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Downloaded ✓');
  }, 'image/png');
});

els.newImageBtn.addEventListener('click', () => {
  state.image = null;
  state.faces = [];
  state.customRegions = [];
  els.workspace.classList.remove('active');
  els.uploadZone.style.display = 'flex';
  els.fileInput.value = '';
  updateStatus('Ready');
});

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
updateStatus('Ready — drop an image to begin');
