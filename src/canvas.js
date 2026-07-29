/**
 * Canvas drawing utilities for the Trace It prototype.
 *
 * Three stacked canvases are used:
 *   1. **paper** — the guide shape + background (drawn once per shape)
 *   2. **ink**   — the child's strokes
 *   3. **marks** — feedback annotations (problem circles, checkmark)
 */

import { SIZE } from "./geometry.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Margin / guide lines on the paper background. */
const GUIDE_TOP = 130;
const GUIDE_BOTTOM = 390;
const GUIDE_MID = 260;

/** Colours matching the CSS custom properties. */
const COLORS = {
  guideLine: "#DDD3C0",
  midLine: "#E6DDC9",
  shapeGuide: "#B9AE99",
  startDot: "#1F4B3F",
  mark: "#B5423A",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear an entire canvas. */
export function clearCanvas(canvas) {
  if (!canvas) return;
  canvas.getContext("2d").clearRect(0, 0, SIZE, SIZE);
}

/** Convert a pointer event to canvas coordinates. */
export function getPointerPos(e, canvasElement) {
  const rect = canvasElement.getBoundingClientRect();
  const scaleX = SIZE / rect.width;
  const scaleY = SIZE / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

// ---------------------------------------------------------------------------
// Paper (background) drawing
// ---------------------------------------------------------------------------

/**
 * Draw the paper background, guide lines, and the dotted target shape.
 * Also marks the starting point with a dot and label.
 */
export function drawPaper(ctx, shape) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Top and bottom guide lines
  ctx.strokeStyle = COLORS.guideLine;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(45, GUIDE_TOP); ctx.lineTo(455, GUIDE_TOP); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(45, GUIDE_BOTTOM); ctx.lineTo(455, GUIDE_BOTTOM); ctx.stroke();

  // Middle dashed guide
  ctx.strokeStyle = COLORS.midLine;
  ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.moveTo(45, GUIDE_MID); ctx.lineTo(455, GUIDE_MID); ctx.stroke();
  ctx.setLineDash([]);

  // Dotted target shape
  ctx.strokeStyle = COLORS.shapeGuide;
  ctx.lineWidth = 3;
  ctx.setLineDash([11, 9]);
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = Math.min(i / 200, 0.999);
    const p = shape.pointAtT(t);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Starting-point indicator
  const start = shape.pointAtT(0);
  ctx.fillStyle = COLORS.startDot;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "16px Nunito, sans-serif";
  ctx.fillText("start", start.x + 10, start.y - 10);
}

// ---------------------------------------------------------------------------
// Feedback marks
// ---------------------------------------------------------------------------

/**
 * Draw problem-area circles or a checkmark on the marks canvas.
 */
export function drawMarks(ctx, result) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = COLORS.mark;
  ctx.fillStyle = COLORS.mark;
  ctx.lineWidth = 3;

  // Circle each problem segment
  result.problem.forEach((p) => {
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Show a checkmark when the drawing is flawless
  if (result.problem.length === 0 && result.score >= 90) {
    ctx.font = "40px Caveat, cursive";
    ctx.fillText("\u2713", SIZE / 2 - 12, 96);
  }
}
