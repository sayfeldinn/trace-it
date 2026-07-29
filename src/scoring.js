/**
 * Client-side scoring pipeline — mirrors `scoring.py`.
 *
 * Uses symmetric nearest-neighbour distance (Chamfer distance) to compare
 * the child's drawn points against the target shape's guide points.
 */

// ---------------------------------------------------------------------------
// Tunable parameters (must match scoring.py)
// ---------------------------------------------------------------------------

const TAU = 34;             // Pixel tolerance
const PROBLEM_RATIO = 0.65; // Threshold multiplier for flagging problem areas
const N_GUIDE = 220;        // Number of sampled guide points
const MAX_PROBLEM = 2;      // Max problem segments to report

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/** Arithmetic mean of an array of numbers. */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Euclidean distance between two 2-D points `{x, y}`. */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from `pt` to the nearest point in the `pts` array. */
function nearestDist(pt, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = dist(pt, pts[i]);
    if (d < min) min = d;
  }
  return min;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a drawing against a target shape.
 *
 * @param {{ pointAtT: Function, segments: Array }} shape — target shape
 * @param {Array<{x: number, y: number}>} drawnPoints — drawn stroke points
 * @returns {{ score, segStats, problem, avgError }}
 */
export function gradeDrawing(shape, drawnPoints) {
  // Sample the guide shape uniformly
  const guidePoints = [];
  for (let i = 0; i < N_GUIDE; i++) {
    const t = i / N_GUIDE;
    const p = shape.pointAtT(t);
    guidePoints.push({ x: p.x, y: p.y, t });
  }

  // Symmetric Chamfer distance
  const coverageErrors = guidePoints.map((gp) => nearestDist(gp, drawnPoints));
  const accuracyErrors = drawnPoints.map((dp) => nearestDist(dp, guidePoints));
  const avgError = (mean(coverageErrors) + mean(accuracyErrors)) / 2;

  // Exponential score mapping: 0 px → 100%, large error → 0%
  const score = Math.round(Math.max(0, Math.min(100, 100 * Math.exp(-avgError / TAU))));

  // Per-segment breakdown (coverage only — did they trace this part?)
  const segStats = shape.segments.map((seg) => {
    const pts = guidePoints.filter((gp) => gp.t >= seg.tStart && gp.t < seg.tEnd);
    const errs = pts.map((gp) => nearestDist(gp, drawnPoints));
    const avg = errs.length ? mean(errs) : 0;
    const mid = shape.pointAtT((seg.tStart + seg.tEnd) / 2);
    return { ...seg, avgError: avg, x: mid.x, y: mid.y };
  });

  // Identify segments above threshold
  const threshold = TAU * PROBLEM_RATIO;
  const problem = segStats
    .filter((s) => s.avgError > threshold)
    .sort((a, b) => b.avgError - a.avgError)
    .slice(0, MAX_PROBLEM);

  return { score, segStats, problem, avgError };
}

/**
 * Convert a score + problem list to child-friendly text.
 *
 * @returns {{ headline: string, tips: string[] }}
 */
export function buildFeedback(score, problem) {
  let headline;
  if (score >= 90) headline = "Amazing tracing!";
  else if (score >= 75) headline = "Great job!";
  else if (score >= 55) headline = "Good try!";
  else headline = "Keep practicing!";

  const tips = problem.length
    ? problem.map((p) => `Try making the ${p.label} a little ${p.tip}.`)
    : ["Everything looks great \u2014 no changes needed!"];

  return { headline, tips };
}
