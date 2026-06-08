import { getSupabase } from "./supabase";

export interface DbSupervisor {
  id: string;
  supervisor_name: string;
  status: string | null;
  email: string | null;
  phone_number: string | null;
  created_at?: string;
}

export async function fetchSupervisors(): Promise<{
  data: DbSupervisor[] | null;
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
    .from("supervisors")
    .select("id, supervisor_name, status, email, phone_number, created_at")
    .eq("status", "active")
    .order("supervisor_name");

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data as DbSupervisor[],
    error: null,
  };
}
