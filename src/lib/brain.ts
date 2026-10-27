// Tiny logistic-regression brain for the Teach block: N inputs (2..6) plus a
// bias, trained by batch gradient descent. Pure: no React, DOM or network.

export const LR = 8;
export const LIM = 6;

export type Example = { id?: string; x: number[]; y: 0 | 1 };

export type Brain = {
  labels: [string, string];
  dims: string[];
  w: number[];
  b: number;
  rounds: number;
  curve: number[];
  train: Example[];
};

export type Snapshot = {
  labels: [string, string];
  dims: string[];
  w: number[];
  b: number;
  rounds: number;
  curve: number[];
};

export type Answer = { p: number; side: 0 | 1; conf: number; label: string };

const clamp = (v: number): number => Math.min(LIM, Math.max(-LIM, v));

export function sigmoid(s: number): number {
  return 1 / (1 + Math.exp(-s));
}

export function createBrain(
  labels: [string, string],
  dims: string[],
): Brain {
  if (dims.length < 2 || dims.length > 6) {
    throw new Error(`brain: need 2..6 dims, got ${dims.length}`);
  }
  return {
    labels,
    dims: [...dims],
    w: new Array(dims.length).fill(0),
    b: 0,
    rounds: 0,
    curve: [],
    train: [],
  };
}

/** Raw score w·x + b. Throws when x has the wrong length. */
export function score(br: Brain, x: number[]): number {
  if (x.length !== br.w.length) {
    throw new Error(`brain: need ${br.w.length} inputs, got ${x.length}`);
  }
  let s = br.b;
  for (let k = 0; k < br.w.length; k++) s += br.w[k] * x[k];
  return s;
}

/** Chance of labels[1]. Throws when x has the wrong length. */
export function prob(br: Brain, x: number[]): number {
  return sigmoid(score(br, x));
}

/** Chance the brain gives to the right answer of one example. */
function rightChance(br: Brain, e: Example): number {
  const p = prob(br, e.x);
  return e.y === 1 ? p : 1 - p;
}

/** Mean (1 - chance given to the right answer); 0.5 when train is empty. */
export function wrongness(br: Brain): number {
  if (br.train.length === 0) return 0.5;
  let total = 0;
  for (const e of br.train) total += 1 - rightChance(br, e);
  return total / br.train.length;
}

/** Examples where the chance given to the right answer is below 0.5. */
export function mistakes(br: Brain): number {
  let n = 0;
  for (const e of br.train) if (rightChance(br, e) < 0.5) n++;
  return n;
}

/** Reset learning (keeps labels, dims and train); curve restarts. */
export function zero(br: Brain): Brain {
  br.w.fill(0);
  br.b = 0;
  br.rounds = 0;
  br.curve = [wrongness(br)];
  return br;
}

/** One batch gradient step. No-op on an empty train set. */
export function trainRound(br: Brain): Brain {
  const n = br.train.length;
  if (n === 0) return br;
  const g = new Array(br.w.length).fill(0);
  let gb = 0;
  for (const e of br.train) {
    const err = e.y - prob(br, e.x);
    for (let k = 0; k < br.w.length; k++) g[k] += err * e.x[k];
    gb += err;
  }
  for (let k = 0; k < br.w.length; k++) {
    br.w[k] = clamp(br.w[k] + (LR * g[k]) / n);
  }
  br.b = clamp(br.b + (LR * gb) / n);
  br.rounds += 1;
  br.curve.push(wrongness(br));
  return br;
}

export function train(br: Brain, rounds: number): Brain {
  for (let i = 0; i < rounds; i++) trainRound(br);
  return br;
}

export function answer(br: Brain, x: number[]): Answer {
  const p = prob(br, x);
  const side = (p >= 0.5 ? 1 : 0) as 0 | 1;
  return { p, side, conf: side === 1 ? p : 1 - p, label: br.labels[side] };
}

/** Plain words for how hard one input value pushes the answer. */
export function pushWords(v: number, br: Brain): string {
  const a = Math.abs(v);
  if (a < 0.15) return "barely pushes";
  const x = br.labels[v >= 0 ? 1 : 0];
  if (a < 1) return `pushes a little toward ${x}`;
  if (a < 2.5) return `pushes toward ${x}`;
  return `pushes hard toward ${x}`;
}

/** Rounded percent string, e.g. pct(0.734) === "73%". */
export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** Plain-JSON copy of the learned state, for the models table. */
export function snapshot(br: Brain): Snapshot {
  return {
    labels: [...br.labels] as [string, string],
    dims: [...br.dims],
    w: [...br.w],
    b: br.b,
    rounds: br.rounds,
    curve: [...br.curve],
  };
}

export function restore(snap: Snapshot, trainSet: Example[]): Brain {
  return {
    labels: [...snap.labels] as [string, string],
    dims: [...snap.dims],
    w: [...snap.w],
    b: snap.b,
    rounds: snap.rounds,
    curve: [...snap.curve],
    train: trainSet,
  };
}
