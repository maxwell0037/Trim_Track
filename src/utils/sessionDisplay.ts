import type { Session, SessionRoomSnapshot, SessionSupervisorSnapshot } from "../types";

export function isCadillacFacility(facilityName: string, code?: string): boolean {
  const name = facilityName.toLowerCase();
  const facilityCode = (code ?? "").toLowerCase();
  return name.includes("cadillac") || facilityCode.includes("cadillac") || facilityCode === "cad";
}

export function getSessionSupervisors(session: Session): SessionSupervisorSnapshot[] {
  if (session.supervisors?.length) return session.supervisors;
  if (session.supervisorId) {
    return [{ id: session.supervisorId, name: session.supervisorName || "Unknown" }];
  }
  return [];
}

export function getSessionRooms(session: Session): SessionRoomSnapshot[] {
  if (session.rooms?.length) return session.rooms;
  if (session.roomId) {
    return [{ id: session.roomId, name: session.roomName ?? "" }];
  }
  return [];
}

export function formatSupervisorHeader(session: Session): string {
  const supervisors = getSessionSupervisors(session);
  if (supervisors.length === 0) return "—";
  if (supervisors.length === 1) return supervisors[0].name;
  if (supervisors.length === 2) {
    return `${supervisors[0].name}, ${supervisors[1].name}`;
  }
  return `${supervisors.length} Supervisors`;
}

export function formatRoomHeader(session: Session): string {
  const rooms = getSessionRooms(session);
  if (rooms.length === 0) return "—";
  if (rooms.length <= 3) return rooms.map((room) => room.name).join(", ");
  return `${rooms.length} Rooms`;
}

export function joinSupervisorNames(supervisors: SessionSupervisorSnapshot[]): string {
  return supervisors.map((supervisor) => supervisor.name).join(", ");
}

export function joinRoomNames(rooms: SessionRoomSnapshot[]): string {
  return rooms.map((room) => room.name).join(", ");
}
