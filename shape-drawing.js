/**
 * shape-drawing.js — rough.js painters for diagram queue items
 * (upgrade plan M2 pass: extracted from index.js, zero behavior change).
 *
 * drawShapeOrEdge renders 'shape' and 'edge' queue items produced by the
 * diagram layout in diagram-engine.js — shared by index.js's
 * renderSpecificPage (with an rc cache) and startAnimation (cacheless).
 * drawArrowhead strokes a natural pen-barb arrowhead, with a plain-canvas
 * fallback when rough.js is unavailable (CDN global).
 */
import { S } from './state.js';

function drawArrowhead(ctx, rc, x, y, angle, size = 14, color = S.inkColor, roughness = 1.4) {
  const barbAngle = Math.PI / 6.5; // ~27 degrees natural pen barb
  const p1 = { x, y };
  const p2 = {
    x: x - size * Math.cos(angle - barbAngle),
    y: y - size * Math.sin(angle - barbAngle),
  };
  const p3 = {
    x: x - size * Math.cos(angle + barbAngle),
    y: y - size * Math.sin(angle + barbAngle),
  };

  if (rc) {
    rc.line(p1.x, p1.y, p2.x, p2.y, { stroke: color, strokeWidth: 1.6, roughness });
    rc.line(p1.x, p1.y, p3.x, p3.y, { stroke: color, strokeWidth: 1.6, roughness });
  } else {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.restore();
  }
}

// ponytail: shared shape/edge renderer — deduplicates renderSpecificPage and startAnimation
function drawShapeOrEdge(ctx, canvas, item, options, rcCache) {
  let rc = rcCache ? rcCache.get(item.pageIdx) : null;
  if (!rc && typeof rough !== 'undefined') {
    rc = rough.canvas(canvas);
    if (rcCache) rcCache.set(item.pageIdx, rc);
  }

  const strokeColor = options.stroke || S.inkColor;
  const strokeW = options.strokeWidth || 1.5;
  const shapeRoughness = options.roughness || 1.4;

  if (item.type === 'shape') {
    if (rc) {
      if (item.shape === 'circle') {
        rc.circle(item.x, item.y, Math.max(item.w, item.h), options);
      } else if (item.shape === 'diamond') {
        const halfW = item.w / 2, halfH = item.h / 2;
        rc.polygon(
          [[item.x, item.y - halfH], [item.x + halfW, item.y], [item.x, item.y + halfH], [item.x - halfW, item.y]],
          options
        );
      } else if (item.shape === 'pill' || item.shape === 'rounded') {
        rc.roundRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, 12, options);
      } else if (item.shape === 'hexagon') {
        const hw = item.w / 2, hh = item.h / 2, inset = hw * 0.3;
        rc.polygon(
          [
            [item.x - hw + inset, item.y - hh], [item.x + hw - inset, item.y - hh],
            [item.x + hw, item.y], [item.x + hw - inset, item.y + hh],
            [item.x - hw + inset, item.y + hh], [item.x - hw, item.y],
          ],
          options
        );
      } else {
        rc.rectangle(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, options);
      }
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      if (item.shape === 'circle') {
        ctx.arc(item.x, item.y, Math.max(item.w, item.h) / 2, 0, Math.PI * 2);
      } else if (item.shape === 'diamond') {
        const halfW = item.w / 2, halfH = item.h / 2;
        ctx.moveTo(item.x, item.y - halfH);
        ctx.lineTo(item.x + halfW, item.y);
        ctx.lineTo(item.x, item.y + halfH);
        ctx.lineTo(item.x - halfW, item.y);
        ctx.closePath();
      } else if (item.shape === 'pill' || item.shape === 'rounded') {
        const rad = Math.min(12, item.h / 2);
        ctx.roundRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, rad);
      } else if (item.shape === 'hexagon') {
        const hw = item.w / 2, hh = item.h / 2, inset = hw * 0.3;
        ctx.moveTo(item.x - hw + inset, item.y - hh);
        ctx.lineTo(item.x + hw - inset, item.y - hh);
        ctx.lineTo(item.x + hw, item.y);
        ctx.lineTo(item.x + hw - inset, item.y + hh);
        ctx.lineTo(item.x - hw + inset, item.y + hh);
        ctx.lineTo(item.x - hw, item.y);
        ctx.closePath();
      } else {
        ctx.rect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
      }
      ctx.stroke();
    }
  } else if (item.type === 'edge') {
    if (item.isCurved && item.control) {
      // Natural hand-drawn curved arrow for cycles
      if (rc) {
        const pathD = `M ${item.from.x.toFixed(1)} ${item.from.y.toFixed(1)} Q ${item.control.x.toFixed(1)} ${item.control.y.toFixed(1)} ${item.to.x.toFixed(1)} ${item.to.y.toFixed(1)}`;
        rc.path(pathD, { ...options, stroke: strokeColor, strokeWidth: strokeW, roughness: shapeRoughness });
        const angle = Math.atan2(item.to.y - item.control.y, item.to.x - item.control.x);
        drawArrowhead(ctx, rc, item.to.x, item.to.y, angle, 14, strokeColor, shapeRoughness);
      } else {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(item.from.x, item.from.y);
        ctx.quadraticCurveTo(item.control.x, item.control.y, item.to.x, item.to.y);
        ctx.stroke();
        const angle = Math.atan2(item.to.y - item.control.y, item.to.x - item.control.x);
        drawArrowhead(ctx, null, item.to.x, item.to.y, angle, 14, strokeColor, shapeRoughness);
        ctx.restore();
      }
    } else {
      // Perimeter-clipped straight arrow
      if (rc) {
        rc.line(item.from.x, item.from.y, item.to.x, item.to.y, { ...options, stroke: strokeColor, strokeWidth: strokeW, roughness: shapeRoughness });
        const angle = Math.atan2(item.to.y - item.from.y, item.to.x - item.from.x);
        drawArrowhead(ctx, rc, item.to.x, item.to.y, angle, 14, strokeColor, shapeRoughness);
      } else {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(item.from.x, item.from.y);
        ctx.lineTo(item.to.x, item.to.y);
        ctx.stroke();
        const angle = Math.atan2(item.to.y - item.from.y, item.to.x - item.from.x);
        drawArrowhead(ctx, null, item.to.x, item.to.y, angle, 14, strokeColor, shapeRoughness);
        ctx.restore();
      }
    }

    if (item.label) {
      let mx, my;
      if (item.isCurved && item.control) {
        mx = 0.25 * item.from.x + 0.5 * item.control.x + 0.25 * item.to.x;
        my = 0.25 * item.from.y + 0.5 * item.control.y + 0.25 * item.to.y;
      } else {
        mx = (item.from.x + item.to.x) / 2;
        my = (item.from.y + item.to.y) / 2;
      }
      ctx.save();
      ctx.font = `${Math.max(10, S.fontSize * 0.7)}px ${S.font}`;
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = 0.85;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(item.label).width;
      const isDark = S.paperStyle === 'dark';
      ctx.fillStyle = isDark ? 'rgba(26,26,46,0.85)' : 'rgba(247,243,234,0.85)';
      ctx.fillRect(mx - tw / 2 - 3, my - S.fontSize * 0.4, tw + 6, S.fontSize * 0.9);
      ctx.fillStyle = strokeColor;
      ctx.fillText(item.label, mx, my);
      ctx.restore();
    }
  }
}

export { drawArrowhead, drawShapeOrEdge };
