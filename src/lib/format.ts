export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function fmtMB(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function fmtThreshold(mb: number): string {
  if (mb < 1024) return `${mb} MB`;
  return mb % 1024 === 0 ? `${mb / 1024} GB` : `${(mb / 1024).toFixed(1)} GB`;
}

export const THRESHOLD_STEPS = [100, 500, 1024, 2048, 3072, 5120, 10240] as const;

export function stepThreshold(current: number, dir: 1 | -1): number {
  if (dir > 0) {
    const nxt = THRESHOLD_STEPS.find(s => s > current);
    return nxt ?? THRESHOLD_STEPS[THRESHOLD_STEPS.length - 1];
  }
  const lst = [...THRESHOLD_STEPS].reverse().find(s => s < current);
  return lst ?? THRESHOLD_STEPS[0];
}
