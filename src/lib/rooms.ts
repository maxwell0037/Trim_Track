import { getSupabase } from "./supabase";

export interface DbRoom {
  id: string;
  facility_id: string;
  room_name: string;
  status: string | null;
}

export async function fetchRoomsByFacility(facilityId: string): Promise<{
  data: DbRoom[] | null;
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
    .from("rooms")
    .select("id, facility_id, room_name, status")
    .eq("facility_id", facilityId)
    .eq("status", "active")
    .order("room_name");

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data as DbRoom[],
    error: null,
  };
}
