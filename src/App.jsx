import { useState, useRef, useEffect, useCallback } from "react";

import { SHAPES, SHAPE_KEYS, SIZE } from "./geometry.js";
import { gradeDrawing, buildFeedback, dist } from "./scoring.js";
import {
  clearCanvas,
  drawPaper,
  drawMarks,
  getPointerPos,
} from "./canvas.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum points needed to attempt grading. */
const MIN_DRAW_POINTS = 8;

/** Bounding-box size below which we assume a tap, not a tracing. */
const MIN_BBOX_SIZE = 15;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TraceIt() {
  // -- state --
  const [shapeKey, setShapeKey] = useState("circle");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [graded, setGraded] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // -- refs --
  const paperRef = useRef(null);
  const inkRef = useRef(null);
  const markRef = useRef(null);

  const allPointsRef = useRef([]);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);

  // Build the current shape object
  const shape = SHAPES[shapeKey].build();

  // -- Reset when shape changes --
  useEffect(() => {
    const ctx = paperRef.current.getContext("2d");
    drawPaper(ctx, shape);
    document.fonts?.ready?.then(() => {
      if (paperRef.current) {
        drawPaper(paperRef.current.getContext("2d"), shape);
      }
    });
    clearCanvas(inkRef.current);
    clearCanvas(markRef.current);
    allPointsRef.current = [];
    setHasDrawing(false);
    setGraded(false);
    setResult(null);
    setError(null);
  }, [shapeKey]);

  // -- Drawing handlers --
  const handlePointerDown = useCallback((e) => {
    if (graded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPointerPos(e, markRef.current);
    lastPointRef.current = pos;
    allPointsRef.current.push(pos);
  }, [graded]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current || graded) return;
    const pos = getPointerPos(e, markRef.current);
    const last = lastPointRef.current;
    if (dist(pos, last) < 2) return;

    const ctx = inkRef.current.getContext("2d");
    ctx.strokeStyle = "#2B2B2E";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    allPointsRef.current.push(pos);
    lastPointRef.current = pos;
    if (!hasDrawing) setHasDrawing(true);
  }, [graded, hasDrawing]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  // -- Actions --
  const handleClear = useCallback(() => {
    clearCanvas(inkRef.current);
    clearCanvas(markRef.current);
    allPointsRef.current = [];
    setHasDrawing(false);
    setGraded(false);
    setResult(null);
    setError(null);
  }, []);

  const handleCheck = useCallback(() => {
    setError(null);
    const points = allPointsRef.current;

    if (points.length < MIN_DRAW_POINTS) {
      setError("Draw the shape first \u2014 trace over the dotted line to get started.");
      return;
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    if (w < MIN_BBOX_SIZE && h < MIN_BBOX_SIZE) {
      setError("That looks like just a tap \u2014 try tracing the whole shape.");
      return;
    }

    const res = gradeDrawing(shape, points);
    setResult(res);
    setGraded(true);
    drawMarks(markRef.current.getContext("2d"), res);
  }, [shape]);

  // -- Derived --
  const feedback = result ? buildFeedback(result.score, result.problem) : null;

  // -- Render --
  return (
    <div className="ti-root">
      <div className="ti-card">
        {/* Header */}
        <div className="ti-header">
          <h1 className="ti-title">Trace It</h1>
          <div className="ti-subtitle">Trace the dotted guide, then check your work.</div>
        </div>

        {/* Shape selector */}
        <div className="ti-tabs">
          {SHAPE_KEYS.map((key) => (
            <button
              key={key}
              className={`ti-tab ${key === shapeKey ? "active" : ""}`}
              onClick={() => setShapeKey(key)}
            >
              {SHAPES[key].name}
            </button>
          ))}
        </div>

        {/* Canvas stack */}
        <div className="ti-canvas-card">
          <canvas ref={paperRef} width={SIZE} height={SIZE} />
          <canvas ref={inkRef} width={SIZE} height={SIZE} />
          <canvas
            ref={markRef}
            width={SIZE}
            height={SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {/* Action buttons */}
        <div className="ti-controls">
          <button className="ti-btn ti-btn-secondary" onClick={handleClear}>
            Clear
          </button>
          <button
            className="ti-btn ti-btn-primary"
            onClick={handleCheck}
            disabled={!hasDrawing || graded}
          >
            Check My Drawing
          </button>
        </div>

        {/* Error display */}
        {error && <div className="ti-error">{error}</div>}

        {/* Results panel */}
        {result && feedback && (
          <div className="ti-results">
            <div className="ti-score-badge">
              <div style={{ textAlign: "center" }}>
                <div className="ti-score-num">{result.score}</div>
                <div className="ti-score-pct">%</div>
              </div>
            </div>
            <div className="ti-results-body">
              <p className="ti-headline">{feedback.headline}</p>
              {feedback.tips.map((tip, i) => (
                <p className="ti-tip" key={i}>{tip}</p>
              ))}
            </div>
          </div>
        )}

        {/* Try again */}
        {graded && (
          <div className="ti-controls" style={{ marginTop: 14 }}>
            <button className="ti-btn ti-btn-secondary" onClick={handleClear}>
              Try Again
            </button>
          </div>
        )}

        {/* Explanation */}
        <details className="ti-details">
          <summary>How is this scored?</summary>
          <p>
            Every point you draw is compared against a dense set of points sampled along the
            target shape. The score comes from the average distance between the two point sets
            in both directions \u2014 how well your line covers the guide, and how close your line
            stays to it \u2014 the same idea behind Chamfer and Hausdorff distance in classic computer
            vision. The target shape is also split into labeled segments, so the segment with the
            largest average error gets flagged as the tip.
          </p>
        </details>
      </div>
    </div>
  );
}
