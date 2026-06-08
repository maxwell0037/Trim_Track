import { getSupabase } from "./supabase";

export interface DbFacility {
  id: string;
  facility_code: string | number;
  facility_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  status: string | null;
  created_at?: string;
}

export async function fetchFacilities(): Promise<{
  data: DbFacility[] | null;
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
    .from("facilities")
    .select("id, facility_code, facility_name, address, city, state, zipcode, status, created_at")
    .order("facility_code");

  console.log("[fetchFacilities] result:", { rowCount: data?.length ?? 0, error: error?.message ?? null });

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data as DbFacility[],
    error: null,
  };
}
