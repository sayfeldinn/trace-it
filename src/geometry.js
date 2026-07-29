/**
 * Target shape definitions — ported to stay in sync with `shapes.py`.
 *
 * Each shape exposes:
 *   - `pointAtT(t)` → `{x, y}`  for t ∈ [0, 1)
 *   - `segments[]`  — labelled sub-sections for error localisation
 */

const SIZE = 500;

/** Polyline: vertices connected by straight edges with arc-length param. */
function makePolylineShape(vertices, segmentLabels, segmentTips) {
  const segLens = [];
  let total = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segLens.push(len);
    total += len;
  }

  function pointAtT(t) {
    let d = Math.min(Math.max(t, 0), 0.999999) * total;
    for (let i = 0; i < segLens.length; i++) {
      const len = segLens[i];
      if (d <= len || i === segLens.length - 1) {
        const frac = len > 0 ? d / len : 0;
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[i + 1];
        return { x: x1 + (x2 - x1) * frac, y: y1 + (y2 - y1) * frac };
      }
      d -= len;
    }
    return { x: vertices[vertices.length - 1][0], y: vertices[vertices.length - 1][1] };
  }

  // Normalised segment boundaries proportional to arc length
  const bounds = [0];
  let acc = 0;
  for (const l of segLens) {
    acc += l;
    bounds.push(acc / total);
  }

  const segments = segmentLabels.map((label, i) => ({
    label,
    tStart: bounds[i],
    tEnd: bounds[i + 1],
    tip: segmentTips[i],
  }));

  return { pointAtT, segments };
}

/** Circular arc shape — t maps linearly to angle. */
function makeArcShape(cx, cy, r, startDeg, sweepDeg, segmentLabels, segmentTips) {
  function pointAtT(t) {
    const deg = startDeg + Math.min(Math.max(t, 0), 1) * sweepDeg;
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const n = segmentLabels.length;
  const segments = segmentLabels.map((label, i) => ({
    label,
    tStart: i / n,
    tEnd: (i + 1) / n,
    tip: segmentTips[i],
  }));

  return { pointAtT, segments };
}

/** Shape definitions — mirrors `build_shape()` in `shapes.py`. */
export const SHAPES = {
  circle: {
    name: "Circle",
    build: () =>
      makeArcShape(
        250, 260, 125, -90, 360,
        ["top-right", "bottom-right", "bottom-left", "top-left"],
        ["rounder and smoother", "rounder and smoother", "rounder and smoother", "rounder and smoother"]
      ),
  },
  triangle: {
    name: "Triangle",
    build: () =>
      makePolylineShape(
        [[250, 130], [370, 390], [130, 390], [250, 130]],
        ["right side", "bottom", "left side"],
        ["straighter", "straighter", "straighter"]
      ),
  },
  square: {
    name: "Square",
    build: () =>
      makePolylineShape(
        [[140, 140], [360, 140], [360, 380], [140, 380], [140, 140]],
        ["top", "right side", "bottom", "left side"],
        ["straighter", "straighter", "straighter", "straighter"]
      ),
  },
  letterC: {
    name: "Letter C",
    build: () =>
      makeArcShape(
        250, 260, 125, 30, 300,
        ["bottom curve", "left curve", "top curve"],
        ["smoother and rounder", "smoother and rounder", "smoother and rounder"]
      ),
  },
  letterL: {
    name: "Letter L",
    build: () =>
      makePolylineShape(
        [[190, 140], [190, 380], [340, 380]],
        ["vertical line", "bottom line"],
        ["straighter", "straighter"]
      ),
  },
};

export const SHAPE_KEYS = Object.keys(SHAPES);
export { SIZE };
