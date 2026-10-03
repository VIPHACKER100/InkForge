/**
 * layer-panel.js — Layer Manager UI (upgrade plan Phase B3, extracted from
 * index.js).
 *
 * Owns the layer sidebar: the layer list rendering (updateLayerUI), the
 * active-layer selection state, the preset add-dropdown, and the quick tools
 * (move / duplicate / clear / flatten). All layer mutations go through
 * window.layerCompositor (layer-compositor.js — no instance getter is
 * exported, so the namespace is read lazily at call time, same as before the
 * extraction).
 *
 * Dependencies:
 * - state.js: S (updateLayerUI defaults to the current page).
 * - render-pipeline.js: renderSpecificPage (the render entry — see the
 *   sanctioned call-time cycle note in render-pipeline.js: this module imports
 *   it while render-pipeline imports updateLayerUI/maybeUpdateLayerUI from
 *   here; neither side calls the other at module-evaluation time).
 * - window.layerCompositor (layer-compositor.js — no instance getter is
 *   exported, so the namespace is read lazily at call time, same as before the
 *   extraction).
 *
 * bindLayerPanel() binds the section's buttons; index.js calls it next to
 * ui-bindings.js's bindAllUI().
 */
import { S } from './state.js';
import { renderSpecificPage } from './render-pipeline.js';

function qs(id) {
  return document.getElementById(id);
}

let currentLayerPage = 0; // The page whose layers are being viewed/edited in the UI
let activeLayerId = null;

function getActiveLayerId(pageIdx) {
  if (!window.layerCompositor) return null;
  const layers = window.layerCompositor.getLayers(pageIdx);
  if (!layers || layers.length === 0) return null;
  if (activeLayerId != null && layers.some((l) => l.id === activeLayerId)) {
    return activeLayerId;
  }
  // Default to Content layer, or the topmost layer
  const contentLayer = layers.find((l) => l.name === 'Content');
  activeLayerId = contentLayer ? contentLayer.id : layers[layers.length - 1].id;
  return activeLayerId;
}

export function updateLayerUI(pageIdx = S.currentPage) {
  if (!window.layerCompositor) return;
  currentLayerPage = pageIdx;

  // Update header page label
  const pageLabel = qs('layer-page-label');
  if (pageLabel) {
    pageLabel.textContent = `Page ${pageIdx + 1}`;
  }

  const layers = window.layerCompositor.getLayers(pageIdx);
  const container = qs('layer-list');
  if (!container) return;

  container.innerHTML = '';
  const currentActiveId = getActiveLayerId(pageIdx);

  // Render in reverse order (top layer first in UI stack)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const isCurActive = layer.id === currentActiveId;

    const el = document.createElement('div');
    el.className = 'layer-item' + (layer.locked ? ' locked' : '') + (isCurActive ? ' active' : '');
    el.dataset.layerId = layer.id;

    // Selection on click
    el.onclick = () => {
      activeLayerId = layer.id;
      updateLayerUI(pageIdx);
    };

    // HTML5 Drag and drop for reordering (only if not locked)
    if (!layer.locked) {
      el.draggable = true;
      el.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', String(layer.id));
        e.dataTransfer.effectAllowed = 'move';
        el.classList.add('dragging');
      };
      el.ondragend = () => {
        el.classList.remove('dragging');
      };
      el.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      };
      el.ondragleave = () => {
        el.classList.remove('drag-over');
      };
      el.ondrop = (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (draggedId && draggedId !== layer.id) {
          const targetIdx = layers.findIndex((l) => l.id === layer.id);
          if (targetIdx !== -1) {
            window.layerCompositor.reorderLayers(pageIdx, draggedId, targetIdx);
            requestPageRender(pageIdx);
            updateLayerUI(pageIdx);
          }
        }
      };
    }

    // --- MAIN ROW ---
    const mainRow = document.createElement('div');
    mainRow.className = 'layer-main-row';

    // Drag handle
    const drag = document.createElement('div');
    drag.className = 'layer-drag';
    drag.textContent = '≡';
    drag.title = layer.locked ? 'Locked layer' : 'Drag to reorder';

    // Visibility toggle
    const vis = document.createElement('div');
    vis.className = 'layer-vis';
    vis.textContent = layer.visible ? '👁️' : '🚫';
    vis.title = layer.visible ? 'Hide layer' : 'Show layer';
    vis.onclick = (e) => {
      e.stopPropagation();
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'visible', !layer.visible);
      requestPageRender(pageIdx);
      updateLayerUI(pageIdx);
    };

    // Name container with badge
    const nameWrap = document.createElement('div');
    nameWrap.className = 'layer-name-wrap';

    const nameEl = document.createElement('div');
    nameEl.className = 'layer-name';
    nameEl.textContent = layer.name;
    nameEl.title = layer.locked ? `${layer.name} (locked)` : 'Click to rename';
    nameEl.onclick = (e) => {
      e.stopPropagation();
      if (layer.locked) return;
      const newName = prompt('Rename layer:', layer.name);
      if (newName && newName.trim()) {
        window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'name', newName.trim());
        updateLayerUI(pageIdx);
      }
    };
    nameWrap.appendChild(nameEl);

    // Optional badge
    if (layer.locked) {
      const badge = document.createElement('span');
      badge.className = 'layer-badge locked';
      badge.textContent = 'LOCKED';
      nameWrap.appendChild(badge);
    } else if (layer.name === 'Content') {
      const badge = document.createElement('span');
      badge.className = 'layer-badge';
      badge.textContent = 'MAIN';
      nameWrap.appendChild(badge);
    }

    // Actions (Delete button)
    const actions = document.createElement('div');
    actions.className = 'layer-item-actions';
    if (!layer.locked) {
      const del = document.createElement('div');
      del.className = 'layer-delete';
      del.textContent = '✖';
      del.title = 'Delete layer';
      del.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete layer "${layer.name}"?`)) {
          window.layerCompositor.deleteLayer(pageIdx, layer.id);
          if (activeLayerId === layer.id) activeLayerId = null;
          requestPageRender(pageIdx);
          updateLayerUI(pageIdx);
        }
      };
      actions.appendChild(del);
    }

    mainRow.appendChild(drag);
    mainRow.appendChild(vis);
    mainRow.appendChild(nameWrap);
    mainRow.appendChild(actions);

    // --- SUB ROW / PROPERTIES (Dedicated lines: Opacity and Blend Mode) ---
    const subRow = document.createElement('div');
    subRow.className = 'layer-props layer-sub-row';

    // Opacity Line
    const opLine = document.createElement('div');
    opLine.className = 'layer-prop-line';

    const opLabel = document.createElement('span');
    opLabel.className = 'layer-prop-label';
    opLabel.textContent = 'Opacity';

    const opWrap = document.createElement('div');
    opWrap.className = 'layer-opacity-wrap';

    const opSlider = document.createElement('input');
    opSlider.type = 'range';
    opSlider.className = 'layer-opacity';
    opSlider.min = '0';
    opSlider.max = '1';
    opSlider.step = '0.05';
    opSlider.value = String(layer.opacity);
    opSlider.title = `Opacity: ${Math.round(layer.opacity * 100)}%`;
    opSlider.onclick = (e) => e.stopPropagation();

    const opVal = document.createElement('span');
    opVal.className = 'layer-opacity-val';
    opVal.textContent = `${Math.round(layer.opacity * 100)}%`;

    opSlider.oninput = (e) => {
      e.stopPropagation();
      const val = parseFloat(e.target.value);
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'opacity', val);
      opVal.textContent = `${Math.round(val * 100)}%`;
      opSlider.title = `Opacity: ${Math.round(val * 100)}%`;
      requestPageRender(pageIdx);
    };

    opWrap.appendChild(opSlider);
    opWrap.appendChild(opVal);
    opLine.appendChild(opLabel);
    opLine.appendChild(opWrap);

    // Blend Mode Line
    const blendLine = document.createElement('div');
    blendLine.className = 'layer-prop-line';

    const blendLabel = document.createElement('span');
    blendLabel.className = 'layer-prop-label';
    blendLabel.textContent = 'Blend';

    const blend = document.createElement('select');
    blend.className = 'layer-blend';
    blend.title = 'Blend Mode';
    blend.onclick = (e) => e.stopPropagation();
    const modes = window.layerCompositor.BLEND_MODES;
    modes.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m
        .split('-')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
      if (m === layer.blendMode) opt.selected = true;
      blend.appendChild(opt);
    });
    blend.onchange = (e) => {
      e.stopPropagation();
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'blendMode', e.target.value);
      requestPageRender(pageIdx);
    };

    blendLine.appendChild(blendLabel);
    blendLine.appendChild(blend);

    subRow.appendChild(opLine);
    subRow.appendChild(blendLine);

    el.appendChild(mainRow);
    el.appendChild(subRow);
    container.appendChild(el);
  }
}

/* Called from index.js's renderSpecificPage: only refresh the list when the
   rendered page is the one the panel is showing. */
export function maybeUpdateLayerUI(pageIdx) {
  if (window.layerCompositor && pageIdx === currentLayerPage) {
    updateLayerUI(pageIdx);
  }
}

function addNewLayerPreset(preset = 'standard') {
  if (!window.layerCompositor) return;
  const pageIdx = currentLayerPage;
  const layers = window.layerCompositor.getLayers(pageIdx);
  let name = `Layer ${layers.length}`;
  let options = { opacity: 1, blendMode: 'source-over' };

  if (preset === 'highlighter') {
    const hlCount = layers.filter((l) => l.name.startsWith('Highlighter')).length + 1;
    name = `Highlighter ${hlCount}`;
    options = { opacity: 0.75, blendMode: 'multiply' };
  } else if (preset === 'draft') {
    const draftCount = layers.filter((l) => l.name.startsWith('Draft')).length + 1;
    name = `Draft Sketch ${draftCount}`;
    options = { opacity: 0.5, blendMode: 'source-over' };
  } else if (preset === 'watermark') {
    const wmCount = layers.filter((l) => l.name.startsWith('Watermark')).length + 1;
    name = `Watermark ${wmCount}`;
    options = { opacity: 0.25, blendMode: 'overlay' };
  }

  const created = window.layerCompositor.createLayer(pageIdx, name, options);
  if (created) {
    activeLayerId = created.id;
  }
  requestPageRender(pageIdx);
  updateLayerUI(pageIdx);
}

function moveActiveLayer(dir) {
  if (!window.layerCompositor || activeLayerId == null) return;
  const pageIdx = currentLayerPage;
  let ok = false;
  if (dir === 'up') {
    ok = window.layerCompositor.moveLayerUp(pageIdx, activeLayerId);
  } else if (dir === 'down') {
    ok = window.layerCompositor.moveLayerDown(pageIdx, activeLayerId);
  }
  if (ok) {
    requestPageRender(pageIdx);
    updateLayerUI(pageIdx);
  }
}

function duplicateActiveLayer() {
  if (!window.layerCompositor || activeLayerId == null) return;
  const pageIdx = currentLayerPage;
  const dup = window.layerCompositor.duplicateLayer(pageIdx, activeLayerId);
  if (dup) {
    activeLayerId = dup.id;
    requestPageRender(pageIdx);
    updateLayerUI(pageIdx);
  }
}

function clearActiveLayer() {
  if (!window.layerCompositor || activeLayerId == null) return;
  const pageIdx = currentLayerPage;
  const stack = window.layerCompositor.getStack(pageIdx);
  const layer = stack.getLayer(activeLayerId);
  if (!layer) return;
  if (layer.locked) {
    alert('Cannot clear locked layer.');
    return;
  }
  if (confirm(`Clear all drawings on layer "${layer.name}"?`)) {
    window.layerCompositor.clearLayer(pageIdx, activeLayerId);
    requestPageRender(pageIdx);
    updateLayerUI(pageIdx);
  }
}

function flattenAllLayers() {
  if (!window.layerCompositor) return;
  const pageIdx = currentLayerPage;
  const layers = window.layerCompositor.getLayers(pageIdx);
  if (!layers || layers.length <= 1) {
    alert('Only one layer exists. Nothing to flatten.');
    return;
  }
  if (!confirm(`Flatten all ${layers.length} layers on Page ${pageIdx + 1}? This combines everything into the Content layer.`)) return;

  const contentLayer = window.layerCompositor.getLayerByName(pageIdx, 'Content');
  const bgLayer = window.layerCompositor.getLayerByName(pageIdx, 'Background');
  const targetLayer = contentLayer || layers[0];
  const targetCtx = targetLayer.canvas.getContext('2d');

  // Draw all non-target, non-background visible layers onto the target layer
  for (const layer of layers) {
    if (layer === targetLayer || layer === bgLayer) continue;
    if (layer.visible && layer.canvas) {
      targetCtx.save();
      targetCtx.globalAlpha = layer.opacity;
      targetCtx.globalCompositeOperation = layer.blendMode;
      targetCtx.drawImage(layer.canvas, 0, 0);
      targetCtx.restore();
    }
  }

  // Delete the merged extra layers
  const toDelete = layers.filter((l) => l !== targetLayer && l !== bgLayer && !l.locked);
  for (const l of toDelete) {
    window.layerCompositor.deleteLayer(pageIdx, l.id);
  }

  activeLayerId = targetLayer.id;
  requestPageRender(pageIdx);
  updateLayerUI(pageIdx);
}

function requestPageRender(pageIdx) {
  // Simple re-render wrapper
  renderSpecificPage(pageIdx, true);
}

function toggleLayerAddDropdown(event) {
  event?.stopPropagation?.();
  qs('layer-add-dropdown')?.classList.toggle('open');
}

function closeLayerAddDropdown() {
  qs('layer-add-dropdown')?.classList.remove('open');
}

/* Sidebar controls for the Layer Manager section (preset links keep the
   inline `return false` semantics via e.preventDefault()). */
export function bindLayerPanel() {
  qs('btn-layer-move-up')?.addEventListener('click', () => moveActiveLayer('up'));
  qs('btn-layer-move-down')?.addEventListener('click', () => moveActiveLayer('down'));
  qs('btn-layer-duplicate')?.addEventListener('click', duplicateActiveLayer);
  qs('btn-layer-clear')?.addEventListener('click', clearActiveLayer);
  qs('btn-add-layer-dropdown')?.addEventListener('click', (e) => toggleLayerAddDropdown(e));
  [
    ['layer-preset-standard', 'standard'],
    ['layer-preset-highlighter', 'highlighter'],
    ['layer-preset-draft', 'draft'],
    ['layer-preset-watermark', 'watermark'],
  ].forEach(([id, preset]) => {
    qs(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      addNewLayerPreset(preset);
      closeLayerAddDropdown();
    });
  });
  qs('btn-flatten-layers')?.addEventListener('click', flattenAllLayers);
}
