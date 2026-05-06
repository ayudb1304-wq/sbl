/** Points awarded per correct KO prediction. */
export const STAGE_POINTS: Record<string, number> = {
  qf: 1,
  sf: 2,
  final: 4,
}

export function pointsForStage(stage: string): number {
  return STAGE_POINTS[stage] ?? 0
}
