import type { Session } from "../types";
import {
  getSessionRooms,
  getSessionSupervisors,
  joinRoomNames,
  joinSupervisorNames,
} from "./sessionDisplay";

export const ACTIVE_SESSION_KEY = "trimtrack-active-session";
const LEGACY_SESSION_KEY = "trimtrack-session";

function normalizeSession(parsed: Session): Session {
  const supervisors = getSessionSupervisors(parsed);
  const rooms = getSessionRooms(parsed);

  return {
    ...parsed,
    supervisors,
    rooms: rooms.length > 0 ? rooms : undefined,
    supervisorId: supervisors[0]?.id ?? parsed.supervisorId ?? "",
    supervisorName: joinSupervisorNames(supervisors) || parsed.supervisorName || "Unknown",
    roomId: rooms[0]?.id ?? parsed.roomId,
    roomName: rooms.length > 0 ? joinRoomNames(rooms) : parsed.roomName,
    employeeIds: Array.isArray(parsed.employeeIds) ? parsed.employeeIds : [],
    employees: Array.isArray(parsed.employees) ? parsed.employees : [],
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
}

export function loadActiveSession(): Session | null {
  try {
    let raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(LEGACY_SESSION_KEY);
      if (raw) {
        localStorage.setItem(ACTIVE_SESSION_KEY, raw);
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
      }
    }
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Session;
    if (!parsed.id || !parsed.facilityName) return null;

    return normalizeSession(parsed);
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    return null;
  }
}

export function persistActiveSession(session: Session | null) {
  if (session) {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(normalizeSession(session)));
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }
}
