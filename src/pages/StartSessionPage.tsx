import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActiveSessionFound } from "../components/ActiveSessionFound";
import { AppNav } from "../components/AppNav";
import { Button } from "../components/Button";
import { DeleteSessionModal } from "../components/DeleteSessionModal";
import { Layout } from "../components/Layout";
import { selectClass, SettingsField } from "../components/settings/SettingsUi";
import { useSession } from "../context/SessionContext";
import { type DbFacility, fetchFacilities } from "../lib/facilities";
import { fetchRoomsByFacility, type DbRoom } from "../lib/rooms";
import { createSession } from "../lib/sessions";
import { fetchSupervisors, type DbSupervisor } from "../lib/supervisors";

const WORK_TYPE_OPTIONS = [
  { value: "trim", label: "Trim" },
  { value: "pre-trim", label: "Pre-Trim" },
  { value: "sorting", label: "Sorting" },
];

export function StartSessionPage() {
  const navigate = useNavigate();
  const { session, endSession, clearSession } = useSession();

  const [facilities, setFacilities] = useState<DbFacility[]>([]);
  const [supervisors, setSupervisors] = useState<DbSupervisor[]>([]);
  const [rooms, setRooms] = useState<DbRoom[]>([]);

  const [facilityId, setFacilityId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [workType, setWorkType] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormData() {
      setLoading(true);
      setLoadError(null);

      const [facilitiesResult, supervisorsResult] = await Promise.all([
        fetchFacilities(),
        fetchSupervisors(),
      ]);

      if (facilitiesResult.error || supervisorsResult.error) {
        setLoadError(facilitiesResult.error ?? supervisorsResult.error);
        setFacilities([]);
        setSupervisors([]);
      } else {
        const activeFacilities = (facilitiesResult.data ?? []).filter(
          (facility) => facility.status === "active",
        );
        setFacilities(activeFacilities);
        setSupervisors(supervisorsResult.data ?? []);
      }

      setLoading(false);
    }

    void loadFormData();
  }, []);

  useEffect(() => {
    if (!facilityId) {
      setRooms([]);
      setRoomId("");
      setRoomsError(null);
      return;
    }

    async function loadRooms() {
      setLoadingRooms(true);
      setRoomsError(null);
      setRoomId("");

      const result = await fetchRoomsByFacility(facilityId);
      if (result.error) {
        setRoomsError(result.error);
        setRooms([]);
      } else {
        setRooms(result.data ?? []);
      }

      setLoadingRooms(false);
    }

    void loadRooms();
  }, [facilityId]);

  useEffect(() => {
    if (session?.endedAt) {
      navigate("/summary", { replace: true });
    }
  }, [session, navigate]);

  const canStart =
    facilityId !== "" &&
    workType !== "" &&
    supervisorId !== "" &&
    !loading &&
    !loadError &&
    !starting;

  async function handleStart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!canStart) return;

    setStarting(true);
    setStartError(null);

    const { data, error } = await createSession({
      facility_id: facilityId,
      room_id: roomId || null,
      supervisor_id: supervisorId,
      work_type: workType,
    });

    setStarting(false);

    if (error || !data) {
      setStartError(error ?? "Failed to create session.");
      return;
    }

    if (workType === "trim") {
      navigate(`/trim-track/${data.id}`, { state: { session: data } });
    }
  }

  const hasActiveSession = session !== null && !session.endedAt;

  function handleResume() {
    navigate("/session");
  }

  function handleEndSession() {
    endSession();
    navigate("/summary");
  }

  function handleDeleteSession() {
    clearSession();
    setShowDeleteModal(false);
  }

  return (
    <Layout
      title="Start Session"
      subtitle="Set up a new trim production session"
      onBack={hasActiveSession ? handleResume : undefined}
      backLabel="Resume Session"
      headerRight={<AppNav />}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 pb-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {hasActiveSession && session && (
              <ActiveSessionFound
                session={session}
                onResume={handleResume}
                onEnd={handleEndSession}
                onDelete={() => setShowDeleteModal(true)}
              />
            )}

            {showDeleteModal && session && (
              <DeleteSessionModal
                session={session}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteSession}
              />
            )}

            {loadError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                Failed to load form data: {loadError}
              </div>
            )}

            {startError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                Failed to start session: {startError}
              </div>
            )}

            {loading ? (
              <p className="text-sm text-white/50">Loading facilities and supervisors…</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SettingsField label="Facility">
                  <select
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select facility…</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.facility_code} — {facility.facility_name}
                      </option>
                    ))}
                  </select>
                </SettingsField>

                <SettingsField label="Room (optional)">
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className={selectClass}
                    disabled={!facilityId || loadingRooms}
                  >
                    <option value="">
                      {!facilityId
                        ? "Select a facility first…"
                        : loadingRooms
                          ? "Loading rooms…"
                          : "No room"}
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_name}
                      </option>
                    ))}
                  </select>
                  {roomsError && (
                    <p className="mt-1 text-xs text-red-300">Could not load rooms: {roomsError}</p>
                  )}
                  {facilityId && !loadingRooms && !roomsError && rooms.length === 0 && (
                    <p className="mt-1 text-xs text-white/40">No rooms configured for this facility.</p>
                  )}
                </SettingsField>

                <SettingsField label="Work Type">
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select work type…</option>
                    {WORK_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </SettingsField>

                <SettingsField label="Supervisor">
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select supervisor…</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.supervisor_name}
                      </option>
                    ))}
                  </select>
                </SettingsField>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 shrink-0 border-t border-surface-600/50 bg-surface-900 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-3xl">
            <Button size="lg" fullWidth disabled={!canStart} onClick={(e) => void handleStart(e)}>
              {starting ? "Starting…" : "Start Session"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
