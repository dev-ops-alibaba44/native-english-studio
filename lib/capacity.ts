export const DEFAULT_ADVISOR_CAPACITY = 25;

export type AdvisorStatus = "available" | "near" | "overloaded";

export function advisorStatus(
  caseload: number,
  capacity: number,
  overdueCount: number
): { status: AdvisorStatus; label: string } {
  const util = capacity > 0 ? caseload / capacity : 0;
  if (overdueCount >= 3 || util >= 0.95) {
    return { status: "overloaded", label: "已超載" };
  }
  if (util >= 0.8) {
    return { status: "near", label: "接近飽和" };
  }
  return { status: "available", label: "可承接更多" };
}

export function utilizationPct(caseload: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((caseload / capacity) * 100);
}
