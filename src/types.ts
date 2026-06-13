export type TrimCategory = "regular" | "stick" | "smalls";

export interface Facility {
  id: string;
  code: string;
  name: string;
  active?: boolean;
}

export interface Room {
  id: string;
  facilityId: string;
  name: string;
  active?: boolean;
}

export interface Supervisor {
  id: string;
  name: string;
  active: boolean;
}

export interface Employee {
  id: string;
  employeeNumber: number;
  legalName: string;
  nickname?: string;
  active: boolean;
}

export interface MasterData {
  employees: Employee[];
  facilities: Facility[];
  rooms: Room[];
  supervisors: Supervisor[];
}

export interface EmployeeTotals {
  regular: number;
  stick: number;
  smalls: number;
}

export interface SessionEmployeeSnapshot {
  id: string;
  employeeNumber: number;
  legalName: string;
  nickname?: string;
}

export interface SessionSupervisorSnapshot {
  id: string;
  name: string;
}

export interface SessionRoomSnapshot {
  id: string;
  name: string;
}

export interface SessionCadillacMeta {
  strain?: string;
  binNumber?: string;
  uid?: string;
}

export interface WeightEntry {
  id: string;
  employeeId: string;
  category: TrimCategory;
  weight: number;
  timestamp: number;
}

export interface ArchivedWeightEntry extends WeightEntry {
  deletedAt?: number;
  deletedBy?: string;
}

export type ArchiveAuditAction =
  | "session_update"
  | "entry_create"
  | "entry_update"
  | "entry_delete"
  | "session_delete"
  | "session_restore"
  | "session_duplicate"
  | "category_total_adjust";

export interface ArchiveAuditEntry {
  id: string;
  action: ArchiveAuditAction;
  editedBy: string;
  editedAt: number;
  field?: string;
  originalValue?: string;
  newValue?: string;
  entryId?: string;
  employeeId?: string;
}

export interface Session {
  id: string;
  facilityId: string;
  facilityName: string;
  /** @deprecated Use rooms[] — kept for export/archive compatibility */
  roomId?: string;
  /** @deprecated Use rooms[] — comma-joined snapshot */
  roomName?: string;
  /** @deprecated Use supervisors[] — kept for export/archive compatibility */
  supervisorId: string;
  /** @deprecated Use supervisors[] — comma-joined snapshot */
  supervisorName: string;
  supervisors?: SessionSupervisorSnapshot[];
  rooms?: SessionRoomSnapshot[];
  cadillac?: SessionCadillacMeta;
  workType?: string;
  employeeIds: string[];
  employees: SessionEmployeeSnapshot[];
  startedAt: number;
  endedAt?: number;
  entries: WeightEntry[];
}

export interface ArchivedEmployeeSnapshot extends SessionEmployeeSnapshot {
  totals: EmployeeTotals;
}

export interface ArchivedSession {
  id: string;
  facilityId: string;
  facilityName: string;
  roomId?: string;
  roomName?: string;
  supervisorId: string;
  supervisorName: string;
  employees: ArchivedEmployeeSnapshot[];
  entries: ArchivedWeightEntry[];
  sessionTotals: EmployeeTotals;
  startedAt: number;
  endedAt: number;
  archivedAt: number;
  notes?: string;
  deletedAt?: number;
  deletedBy?: string;
  auditLog: ArchiveAuditEntry[];
}

export interface SyncQueueItem {
  id: string;
  type: "session_update" | "session_archived";
  sessionId: string;
  timestamp: number;
}

export const CATEGORY_LABELS: Record<TrimCategory, string> = {
  regular: "Regular Trim",
  stick: "Stick Trim",
  smalls: "Smalls",
};

export function getEmployeeTotals(
  employeeId: string,
  entries: WeightEntry[],
): EmployeeTotals {
  return entries
    .filter((e) => e.employeeId === employeeId)
    .reduce(
      (acc, entry) => {
        acc[entry.category] += entry.weight;
        return acc;
      },
      { regular: 0, stick: 0, smalls: 0 },
    );
}

export function getGrandTotal(totals: EmployeeTotals): number {
  return totals.regular + totals.stick + totals.smalls;
}

export function getSessionTotals(entries: WeightEntry[]): EmployeeTotals {
  return entries.reduce(
    (acc, entry) => {
      acc[entry.category] += entry.weight;
      return acc;
    },
    { regular: 0, stick: 0, smalls: 0 },
  );
}

export function getEntriesByCategory(
  employeeId: string,
  category: TrimCategory,
  entries: WeightEntry[],
): WeightEntry[] {
  return entries
    .filter((e) => e.employeeId === employeeId && e.category === category)
    .sort((a, b) => a.timestamp - b.timestamp);
}
