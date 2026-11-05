/**
 * Shared geometry for the line charts.
 *
 * `smoothPath` is a monotone cubic (Fritsch-Carlson). Unlike Catmull-Rom it
 * never overshoots between two points, so a day of zero spending next to a
 * big day stays on the baseline instead of dipping below it, and a rising
 * balance never wobbles downwards on its way up.
 */
export interface Pt { x: number; y: number }

export function smoothPath(pts: Pt[]): string {
    const n = pts.length;
    if (n === 0) return '';
    if (n === 1) return `M${pts[0].x},${pts[0].y}`;
    const dx: number[] = [];
    const slope: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1].x - pts[i].x || 1e-6;
        slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
    }
    const t: number[] = new Array(n);
    t[0] = slope[0];
    t[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i++) {
        t[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }
    for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
        const a = t[i] / slope[i];
        const b = t[i + 1] / slope[i];
        const h = a * a + b * b;
        if (h > 9) {
            const k = 3 / Math.sqrt(h);
            t[i] = k * a * slope[i];
            t[i + 1] = k * b * slope[i];
        }
    }
    const f = (v: number) => v.toFixed(1);
    let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += ` C${f(pts[i].x + h)},${f(pts[i].y + t[i] * h)} ${f(pts[i + 1].x - h)},${f(pts[i + 1].y - t[i + 1] * h)} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
    }
    return d;
}

/** The same curve closed down to a baseline, for the gradient under it. */
export function areaPath(line: string, pts: Pt[], baseline: number): string {
    if (pts.length < 2) return '';
    return `${line} L${pts[pts.length - 1].x.toFixed(1)},${baseline} L${pts[0].x.toFixed(1)},${baseline} Z`;
}

/** Index of the point nearest an x position, for scrubbing. */
export function nearestIndex(pts: Pt[], x: number): number {
    if (pts.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
        if (Math.abs(pts[i].x - x) < Math.abs(pts[best].x - x)) best = i;
    }
    return best;
}

/**
 * A ceiling for the y axis that one huge day cannot flatten the rest under.
 * Rent on the 1st should not turn a month of coffees into a flat line, so
 * when the biggest value is far above the rest the scale stops short of it
 * and that point is drawn clipped at the top, with its real value labelled.
 */
export function softMax(values: number[]): number {
    const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const max = sorted[sorted.length - 1];
    if (sorted.length < 4) return max;
    const second = sorted[sorted.length - 2];
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    const ceiling = Math.max(second * 1.25, p80 * 2.5);
    return max > ceiling * 1.2 ? ceiling : max;
}

/** A round number at or above `v`, for gridline labels. */
export function niceCeil(v: number): number {
    if (v <= 0) return 0;
    const mag = 10 ** Math.floor(Math.log10(v));
    const n = v / mag;
    const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) ?? 10;
    return step * mag;
}
