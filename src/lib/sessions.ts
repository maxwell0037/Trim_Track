import { getSupabase } from "./supabase";

export interface DbSession {
  id: string;
  facility_id: string;
  room_id: string | null;
  supervisor_id: string;
  work_type: string;
  session_date: string;
  started_at: string;
  status: string;
  created_at?: string;
}

export interface CreateSessionInput {
  facility_id: string;
  room_id?: string | null;
  supervisor_id: string;
  work_type: string;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createSession(input: CreateSessionInput): Promise<{
  data: DbSession | null;
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      data: null,
      error: "Supabase is not configured. Add your URL and anon key to .env.local and restart the dev server.",
    };
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      facility_id: input.facility_id,
      room_id: input.room_id ?? null,
      supervisor_id: input.supervisor_id,
      work_type: input.work_type,
      session_date: todayDateString(),
      started_at: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data as DbSession,
    error: null,
  };
}

export interface SessionDisplay {
  session: DbSession;
  facilityLabel: string;
  roomName: string | null;
  supervisorName: string;
}

export async function fetchSessionDisplay(sessionId: string): Promise<{
  data: SessionDisplay | null;
  error: string | null;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      data: null,
      error: "Supabase is not configured. Add your URL and anon key to .env.local and restart the dev server.",
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, facility_id, room_id, supervisor_id, work_type, session_date, started_at, status, created_at")
    .eq("id", sessionId)
    .single();

  if (sessionError) {
    return { data: null, error: sessionError.message };
  }

  const dbSession = session as DbSession;

  const [facilityResult, supervisorResult, roomResult] = await Promise.all([
    supabase
      .from("facilities")
      .select("facility_code, facility_name")
      .eq("id", dbSession.facility_id)
      .single(),
    supabase
      .from("supervisors")
      .select("supervisor_name")
      .eq("id", dbSession.supervisor_id)
      .single(),
    dbSession.room_id
      ? supabase.from("rooms").select("room_name").eq("id", dbSession.room_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (facilityResult.error) {
    return { data: null, error: facilityResult.error.message };
  }
  if (supervisorResult.error) {
    return { data: null, error: supervisorResult.error.message };
  }
  if (roomResult.error) {
    return { data: null, error: roomResult.error.message };
  }

  const facility = facilityResult.data as { facility_code: string | number; facility_name: string };
  const supervisor = supervisorResult.data as { supervisor_name: string };
  const room = roomResult.data as { room_name: string } | null;

  return {
    data: {
      session: dbSession,
      facilityLabel: `${facility.facility_code} — ${facility.facility_name}`,
      roomName: room?.room_name ?? null,
      supervisorName: supervisor.supervisor_name,
    },
    error: null,
  };
}
