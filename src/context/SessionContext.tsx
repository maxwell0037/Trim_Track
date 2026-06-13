import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SessionCadillacMeta, SessionEmployeeSnapshot, SessionRoomSnapshot, SessionSupervisorSnapshot, TrimCategory, WeightEntry } from "../types";
import { archiveSession } from "../utils/archive";
import { joinRoomNames, joinSupervisorNames } from "../utils/sessionDisplay";
import { generateId } from "../utils/id";
import { getNewestEntry, undoLastEntry } from "../utils/sessionEntries";
import { loadActiveSession, persistActiveSession } from "../utils/sessionPersist";
import { enqueueSync, processSyncQueue } from "../utils/syncQueue";

interface SessionContextValue {
  session: Session | null;
  startSession: (params: {
    facilityId: string;
    facilityName: string;
    supervisors: SessionSupervisorSnapshot[];
    rooms?: SessionRoomSnapshot[];
    cadillac?: SessionCadillacMeta;
    workType?: string;
    employeeIds: string[];
    employees: SessionEmployeeSnapshot[];
  }) => void;
  updateSessionCadillac: (updates: SessionCadillacMeta) => void;
  addEntry: (employeeId: string, category: TrimCategory, weight: number) => void;
  updateEntry: (
    entryId: string,
    updates: { weight?: number; category?: TrimCategory },
  ) => void;
  deleteEntry: (entryId: string) => void;
  undoLastEntry: () => WeightEntry | null;
  addEmployee: (employee: SessionEmployeeSnapshot) => void;
  removeEmployee: (employeeId: string) => void;
  endSession: () => void;
  resumeSession: () => void;
  clearSession: () => void;
  reloadFromStorage: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function commitSession(session: Session | null) {
  persistActiveSession(session);
  if (session) {
    enqueueSync("session_update", session.id);
    if (navigator.onLine) {
      processSyncQueue();
    }
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadActiveSession);

  const reloadFromStorage = useCallback(() => {
    setSession(loadActiveSession());
  }, []);

  useEffect(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        reloadFromStorage();
      }
    }

    window.addEventListener("focus", reloadFromStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", reloadFromStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reloadFromStorage]);

  const startSession = useCallback(
    (params: {
      facilityId: string;
      facilityName: string;
      supervisors: SessionSupervisorSnapshot[];
      rooms?: SessionRoomSnapshot[];
      cadillac?: SessionCadillacMeta;
      workType?: string;
      employeeIds: string[];
      employees: SessionEmployeeSnapshot[];
    }) => {
      const rooms = params.rooms ?? [];
      const supervisors = params.supervisors;
      const newSession: Session = {
        id: generateId(),
        facilityId: params.facilityId,
        facilityName: params.facilityName,
        supervisors,
        rooms: rooms.length > 0 ? rooms : undefined,
        supervisorId: supervisors[0]?.id ?? "",
        supervisorName: joinSupervisorNames(supervisors),
        roomId: rooms[0]?.id,
        roomName: rooms.length > 0 ? joinRoomNames(rooms) : undefined,
        cadillac: params.cadillac,
        workType: params.workType,
        employeeIds: params.employeeIds,
        employees: params.employees,
        startedAt: Date.now(),
        entries: [],
      };
      commitSession(newSession);
      setSession(newSession);
    },
    [],
  );

  const updateSessionCadillac = useCallback((updates: SessionCadillacMeta) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        cadillac: {
          ...prev.cadillac,
          ...updates,
        },
      };
      commitSession(next);
      return next;
    });
  }, []);

  const addEntry = useCallback(
    (employeeId: string, category: TrimCategory, weight: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const entry: WeightEntry = {
          id: generateId(),
          employeeId,
          category,
          weight: Math.round(weight),
          timestamp: Date.now(),
        };
        const next = { ...prev, entries: [...prev.entries, entry] };
        commitSession(next);
        return next;
      });
    },
    [],
  );

  const updateEntry = useCallback(
    (entryId: string, updates: { weight?: number; category?: TrimCategory }) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          entries: prev.entries.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
              ...entry,
              ...(updates.weight !== undefined
                ? { weight: Math.round(updates.weight) }
                : {}),
              ...(updates.category !== undefined ? { category: updates.category } : {}),
            };
          }),
        };
        commitSession(next);
        return next;
      });
    },
    [],
  );

  const deleteEntry = useCallback((entryId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        entries: prev.entries.filter((e) => e.id !== entryId),
      };
      commitSession(next);
      return next;
    });
  }, []);

  const undoLastEntryFn = useCallback((): WeightEntry | null => {
    let removed: WeightEntry | null = null;
    setSession((prev) => {
      if (!prev || prev.endedAt) return prev;
      const newest = getNewestEntry(prev.entries);
      if (!newest) return prev;
      removed = newest;
      const next = undoLastEntry(prev);
      commitSession(next);
      return next;
    });
    return removed;
  }, []);

  const addEmployee = useCallback((employee: SessionEmployeeSnapshot) => {
    setSession((prev) => {
      if (!prev || prev.employeeIds.includes(employee.id)) return prev;
      const next = {
        ...prev,
        employeeIds: [...prev.employeeIds, employee.id],
        employees: [...prev.employees, employee],
      };
      commitSession(next);
      return next;
    });
  }, []);

  const removeEmployee = useCallback((employeeId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        employeeIds: prev.employeeIds.filter((id) => id !== employeeId),
        employees: prev.employees.filter((employee) => employee.id !== employeeId),
      };
      commitSession(next);
      return next;
    });
  }, []);

  const endSession = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.endedAt) return prev;
      const ended = { ...prev, endedAt: Date.now() };
      commitSession(ended);
      archiveSession(ended);
      enqueueSync("session_archived", ended.id);
      processSyncQueue();
      return ended;
    });
  }, []);

  const resumeSession = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const { endedAt: _, ...rest } = prev;
      commitSession(rest);
      return rest;
    });
  }, []);

  const clearSession = useCallback(() => {
    commitSession(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      startSession,
      updateSessionCadillac,
      addEntry,
      updateEntry,
      deleteEntry,
      undoLastEntry: undoLastEntryFn,
      addEmployee,
      removeEmployee,
      endSession,
      resumeSession,
      clearSession,
      reloadFromStorage,
    }),
    [
      session,
      startSession,
      updateSessionCadillac,
      addEntry,
      updateEntry,
      deleteEntry,
      undoLastEntryFn,
      addEmployee,
      removeEmployee,
      endSession,
      resumeSession,
      clearSession,
      reloadFromStorage,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
