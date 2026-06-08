import {
  CheckCircleFilled,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Badge, Button, Card, Col, Empty, Input, Row, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActiveSessionFound } from "../components/ActiveSessionFound";
import { AppNav } from "../components/AppNav";
import { DeleteSessionModal } from "../components/DeleteSessionModal";
import { EmployeeIdentity } from "../components/EmployeeIdentity";
import { Layout } from "../components/Layout";
import { useMasterData } from "../context/MasterDataContext";
import { useSession } from "../context/SessionContext";
import { filterEmployees } from "../utils/employees";
import {
  getSessionTrackPath,
  HOURLY_TRACK_PATH,
  SUMMARY_PATH,
  TRIM_TRACK_LIVE_PATH,
} from "../lib/sessionRoutes";

const { Text } = Typography;

const WORK_TYPE_OPTIONS = [
  { value: "trim", label: "TRIM" },
  { value: "deleaf", label: "DELEAF" },
  { value: "chop", label: "CHOP" },
  { value: "skirt", label: "SKIRT" },
  { value: "package", label: "PACKAGE" },
  { value: "sorting", label: "SORTING" },
];

function SectionCard({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      title={
        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {title}
        </Text>
      }
      extra={extra}
      styles={{
        header: { borderBottom: "1px solid rgba(46, 61, 82, 0.5)", minHeight: 48 },
        body: { padding: 16 },
      }}
      style={{ borderRadius: 16 }}
    >
      {children}
    </Card>
  );
}

function SelectCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      hoverable
      onClick={onClick}
      className={`tt-select-card ${selected ? "tt-select-card--active" : ""}`}
      styles={{ body: { padding: "14px 16px", minHeight: 52 } }}
      style={{
        borderRadius: 12,
        border: "2px solid #2e3d52",
        background: selected ? undefined : "#1a222d",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text strong style={{ fontSize: 15, color: selected ? "#fff" : "rgba(255,255,255,0.85)" }}>
          {label}
        </Text>
        {selected && <CheckCircleFilled style={{ color: "#22c55e", fontSize: 18 }} />}
      </div>
    </Card>
  );
}

export function StartSessionPage() {
  const navigate = useNavigate();
  const { session, startSession, endSession, clearSession } = useSession();
  const { facilities, activeSupervisors, activeEmployees, rooms } = useMasterData();

  const [facilityId, setFacilityId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [workType, setWorkType] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const facilityRooms = useMemo(
    () =>
      rooms.filter(
        (room) => room.facilityId === facilityId && room.active !== false,
      ),
    [rooms, facilityId],
  );
  const facilityHasRooms = facilityRooms.length > 0;

  const filteredEmployees = useMemo(
    () => filterEmployees(activeEmployees, searchQuery),
    [activeEmployees, searchQuery],
  );

  useEffect(() => {
    if (session?.endedAt) {
      navigate(SUMMARY_PATH, { replace: true });
    }
  }, [session, navigate]);

  const canStart =
    facilityId !== "" &&
    workType !== "" &&
    supervisorId !== "" &&
    selectedEmployeeIds.length > 0;

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((employeeId) => employeeId !== id) : [...prev, id],
    );
  }

  function handleStart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!canStart) return;

    const facility = facilities.find((item) => item.id === facilityId);
    const supervisor = activeSupervisors.find((item) => item.id === supervisorId);
    const room = roomId ? facilityRooms.find((item) => item.id === roomId) : undefined;

    if (!facility || !supervisor) return;

    const employees = selectedEmployeeIds
      .map((id) => activeEmployees.find((employee) => employee.id === id))
      .filter((employee): employee is NonNullable<typeof employee> => employee !== undefined)
      .map((employee) => ({
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        legalName: employee.legalName,
        nickname: employee.nickname,
      }));

    startSession({
      facilityId: facility.id,
      facilityName: facility.name,
      roomId: room?.id,
      roomName: room?.name,
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      workType,
      employeeIds: employees.map((employee) => employee.id),
      employees,
    });

    navigate(getSessionTrackPath(workType));
  }

  const hasActiveSession = session !== null && !session.endedAt;

  function handleResume() {
    navigate(session?.workType === "trim" ? TRIM_TRACK_LIVE_PATH : HOURLY_TRACK_PATH);
  }

  function handleEndSession() {
    endSession();
    navigate(SUMMARY_PATH);
  }

  function handleDeleteSession() {
    clearSession();
    setShowDeleteModal(false);
  }

  return (
    <Layout
      title="Start Session"
      subtitle="Set up a new production session"
      onBack={hasActiveSession ? handleResume : undefined}
      backLabel="Resume Session"
      headerRight={<AppNav />}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 pb-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
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

            <SectionCard title="Facility">
              <Row gutter={[10, 10]}>
                {facilities.map((facility) => (
                  <Col key={facility.id} xs={12} sm={8}>
                    <SelectCard
                      label={facility.name.toUpperCase()}
                      selected={facilityId === facility.id}
                      onClick={() => {
                        setFacilityId(facility.id);
                        setRoomId("");
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </SectionCard>

            {facilityId && facilityHasRooms && (
              <SectionCard title="Room">
                <Row gutter={[10, 10]}>
                  {facilityRooms.map((room) => (
                    <Col key={room.id} xs={24} sm={8}>
                      <SelectCard
                        label={room.name}
                        selected={roomId === room.id}
                        onClick={() => setRoomId(room.id)}
                      />
                    </Col>
                  ))}
                </Row>
              </SectionCard>
            )}

            <SectionCard title="Supervisor">
              <Row gutter={[10, 10]}>
                {activeSupervisors.map((supervisor) => (
                  <Col key={supervisor.id} xs={24} sm={8}>
                    <SelectCard
                      label={supervisor.name}
                      selected={supervisorId === supervisor.id}
                      onClick={() => setSupervisorId(supervisor.id)}
                    />
                  </Col>
                ))}
              </Row>
            </SectionCard>

            <SectionCard title="Work Type">
              <Row gutter={[10, 10]}>
                {WORK_TYPE_OPTIONS.map((option) => (
                  <Col key={option.value} xs={12} sm={8}>
                    <SelectCard
                      label={option.label}
                      selected={workType === option.value}
                      onClick={() => setWorkType(option.value)}
                    />
                  </Col>
                ))}
              </Row>
            </SectionCard>

            <SectionCard
              title="Employees"
              extra={
                selectedEmployeeIds.length > 0 ? (
                  <Badge
                    count={selectedEmployeeIds.length}
                    style={{ backgroundColor: "#22c55e" }}
                    overflowCount={99}
                  >
                    <TeamOutlined style={{ fontSize: 18, color: "rgba(255,255,255,0.5)" }} />
                  </Badge>
                ) : undefined
              }
            >
              <Input
                size="large"
                allowClear
                prefix={<SearchOutlined style={{ color: "rgba(255,255,255,0.35)" }} />}
                placeholder="Search by ID, name, or preferred name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: 12, borderRadius: 12 }}
              />

              {filteredEmployees.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No employees match your search"
                  style={{ margin: "12px 0" }}
                />
              ) : (
                <Row gutter={[10, 10]}>
                  {filteredEmployees.map((employee) => {
                    const selected = selectedEmployeeIds.includes(employee.id);
                    return (
                      <Col key={employee.id} xs={12} sm={8}>
                        <Card
                          hoverable
                          onClick={() => toggleEmployee(employee.id)}
                          className={`tt-select-card ${selected ? "tt-select-card--active" : ""}`}
                          styles={{ body: { padding: 14 } }}
                          style={{
                            borderRadius: 12,
                            border: "2px solid #2e3d52",
                            background: selected ? undefined : "#1a222d",
                            height: "100%",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <EmployeeIdentity employee={employee} size="sm" />
                            {selected && (
                              <CheckCircleFilled style={{ color: "#22c55e", fontSize: 16, flexShrink: 0 }} />
                            )}
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </SectionCard>
          </div>
        </div>

        <div
          className="relative z-10 shrink-0 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          style={{
            borderTop: "1px solid rgba(46, 61, 82, 0.5)",
            background: "linear-gradient(180deg, transparent 0%, #0f1419 20%)",
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            <Button
              type="primary"
              size="large"
              block
              disabled={!canStart}
              onClick={handleStart}
              style={{ height: 56, fontSize: 17, fontWeight: 700, borderRadius: 14 }}
            >
              Start Session
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
