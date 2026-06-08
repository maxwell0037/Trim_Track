import {
  MinusCircleOutlined,
  RollbackOutlined,
  StopOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Empty, Input, Row, Space, Statistic, Typography } from "antd";
import type { InputRef } from "antd/es/input";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditEntryModal } from "../components/EditEntryModal";
import { UndoLastEntryModal } from "../components/UndoLastEntryModal";
import { EmployeeIdentity } from "../components/EmployeeIdentity";
import { Layout } from "../components/Layout";
import { PrototypeAddEmployeeModal } from "../components/PrototypeAddEmployeeModal";
import { SessionInfoHeader } from "../components/SessionInfoHeader";
import { useSession } from "../context/SessionContext";
import { useMasterData } from "../context/MasterDataContext";
import type { Employee, TrimCategory, WeightEntry } from "../types";
import { CATEGORY_LABELS, getEntriesByCategory, getEmployeeTotals, getGrandTotal } from "../types";
import { getRecentEntries } from "../utils/export";
import { getNewestEntry } from "../utils/sessionEntries";
import { getSessionEmployees } from "../utils/sessionEmployees";
import { categoryLabel, formatTime, formatWeight, formatWeightWithLbs, parseWholeWeight } from "../utils/format";
import { employeeNickname, formatEmployeeId } from "../utils/employees";
import {
  HOURLY_TRACK_PATH,
  START_SESSION_PATH,
  SUMMARY_PATH,
} from "../lib/sessionRoutes";

const { Text } = Typography;

const CATEGORY_COLORS: Record<TrimCategory, string> = {
  regular: "#22c55e",
  stick: "#f59e0b",
  smalls: "#8b5cf6",
};

export function LiveSessionPage() {
  const navigate = useNavigate();
  const {
    session,
    addEntry,
    updateEntry,
    deleteEntry,
    undoLastEntry,
    addEmployee,
    removeEmployee,
    endSession,
    reloadFromStorage,
  } = useSession();
  const { activeEmployees } = useMasterData();

  const [activeEmployeeId, setActiveEmployeeId] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [flash, setFlash] = useState<TrimCategory | null>(null);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [undoEntry, setUndoEntry] = useState<WeightEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const inputRef = useRef<InputRef>(null);

  const sessionEmployees = useMemo(() => {
    if (!session) return [];
    return getSessionEmployees(session, activeEmployees);
  }, [session, activeEmployees]);

  const recentEntries = useMemo(
    () => (session ? getRecentEntries(session.entries, 20) : []),
    [session],
  );

  const gridCols = sessionEmployees.length > 12 ? 3 : 2;

  useEffect(() => {
    reloadFromStorage();
  }, [reloadFromStorage]);

  useEffect(() => {
    if (!session) {
      navigate(START_SESSION_PATH, { replace: true });
      return;
    }
    if (session.workType && session.workType !== "trim") {
      navigate(HOURLY_TRACK_PATH, { replace: true });
      return;
    }
    if (session.endedAt) {
      navigate(SUMMARY_PATH, { replace: true });
      return;
    }
    if (!activeEmployeeId && sessionEmployees.length > 0) {
      setActiveEmployeeId(sessionEmployees[0].id);
    }
  }, [session, sessionEmployees, activeEmployeeId, navigate]);

  const activeEmployee = sessionEmployees.find((e) => e.id === activeEmployeeId);
  const parsedWeight = parseWholeWeight(weight);

  function handleEmployeeClick(employeeId: string) {
    setActiveEmployeeId(employeeId);
    inputRef.current?.input?.focus();
  }

  function handleCategoryClick(category: TrimCategory) {
    if (!activeEmployeeId || parsedWeight === null) return;

    addEntry(activeEmployeeId, category, parsedWeight);
    setWeight("");
    setFlash(category);
    setTimeout(() => setFlash(null), 400);
    inputRef.current?.input?.focus();
  }

  function handleBack() {
    if (
      window.confirm(
        "Return to session setup? Your entries are saved and you can resume this session.",
      )
    ) {
      navigate(START_SESSION_PATH);
    }
  }

  function handleEndSession() {
    endSession();
    navigate(SUMMARY_PATH);
  }

  function handleAddEmployee(employee: (typeof activeEmployees)[number]) {
    addEmployee({
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      legalName: employee.legalName,
      nickname: employee.nickname,
    });
    setShowAddEmployee(false);
    setActiveEmployeeId(employee.id);
  }

  function handleRemoveEmployee() {
    if (!activeEmployeeId) return;
    const employee = sessionEmployees.find((item) => item.id === activeEmployeeId);
    if (
      !window.confirm(
        `Remove ${employee?.legalName ?? "this employee"} from the session? Existing entries will be kept.`,
      )
    ) {
      return;
    }
    removeEmployee(activeEmployeeId);
    setActiveEmployeeId("");
  }

  function handleWeightChange(value: string) {
    setWeight(value.replace(/\D/g, ""));
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-900 text-white/50">
        Loading session…
      </div>
    );
  }

  const activeSession = session;

  const editingEmployee = editingEntry
    ? activeEmployees.find((e) => e.id === editingEntry.employeeId)
    : null;

  const canUndo = activeSession.entries.length > 0;

  const undoEmployee = undoEntry
    ? sessionEmployees.find((employee) => employee.id === undoEntry.employeeId)
    : null;

  function handleUndoClick() {
    const newest = getNewestEntry(activeSession.entries);
    if (!newest) return;
    setUndoEntry(newest);
  }

  function handleConfirmUndo() {
    const entryToRemove = undoEntry;
    undoLastEntry();
    setUndoEntry(null);
    setToast("Last entry removed");
    setTimeout(() => setToast(null), 2500);
    if (editingEntry && entryToRemove && editingEntry.id === entryToRemove.id) {
      setEditingEntry(null);
    }
  }

  const activeTotals = activeEmployee
    ? getEmployeeTotals(activeEmployee.id, activeSession.entries)
    : null;

  return (
    <Layout
      onBack={handleBack}
      backLabel="Setup"
      headerCenter={<SessionInfoHeader session={activeSession} compact />}
      headerRight={
        <Space wrap size="small">
          <Button size="large" icon={<UserAddOutlined />} onClick={() => setShowAddEmployee(true)}>
            Add Employee
          </Button>
          <Button
            size="large"
            icon={<MinusCircleOutlined />}
            onClick={handleRemoveEmployee}
            disabled={!activeEmployeeId}
          >
            Remove
          </Button>
          <Button danger size="large" icon={<StopOutlined />} onClick={handleEndSession}>
            End Session
          </Button>
        </Space>
      }
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Left: employee roster */}
        <div
          className="flex flex-col"
          style={{
            width: "24%",
            minWidth: 200,
            maxWidth: 280,
            borderRight: "1px solid rgba(46, 61, 82, 0.5)",
            background: "rgba(26, 34, 45, 0.6)",
          }}
        >
          <Card
            className="tt-dashboard-panel"
            title="Select Employee"
            bordered={false}
            style={{ height: "100%", borderRadius: 0, background: "transparent" }}
            styles={{ body: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" } }}
          >
            <Row gutter={[6, 6]} style={{ overflowY: "auto", flex: 1, alignContent: "flex-start" }}>
              {sessionEmployees.map((employee) => {
                const totals = getEmployeeTotals(employee.id, activeSession.entries);
                const isActive = employee.id === activeEmployeeId;
                return (
                  <Col key={employee.id} span={24 / gridCols}>
                    <LiveEmployeeCard
                      employee={employee}
                      totals={totals}
                      isActive={isActive}
                      onClick={() => handleEmployeeClick(employee.id)}
                    />
                  </Col>
                );
              })}
            </Row>
          </Card>
        </div>

        {/* Center: entry panel */}
        <div
          className="flex flex-col"
          style={{
            width: "38%",
            minWidth: 280,
            borderRight: "1px solid rgba(46, 61, 82, 0.5)",
            background: "#0f1419",
          }}
        >
          <div className="flex flex-1 flex-col overflow-hidden p-4 gap-3">
            <Card
              size="small"
              style={{ borderRadius: 12, background: "#1a222d", textAlign: "center" }}
              styles={{ body: { padding: "12px 16px" } }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Current Employee
              </Text>
              {activeEmployee && (
                <div style={{ marginTop: 4 }}>
                  <EmployeeIdentity employee={activeEmployee} size="md" align="center" />
                </div>
              )}
              {activeTotals && (
                <Row gutter={8} style={{ marginTop: 12 }}>
                  <Col span={8}>
                    <Statistic
                      title="Regular"
                      value={activeTotals.regular}
                      suffix="g"
                      valueStyle={{ fontSize: 14, color: "#22c55e" }}
                      className="tt-summary-stat"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Stick"
                      value={activeTotals.stick}
                      suffix="g"
                      valueStyle={{ fontSize: 14, color: "#f59e0b" }}
                      className="tt-summary-stat"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Smalls"
                      value={activeTotals.smalls}
                      suffix="g"
                      valueStyle={{ fontSize: 14, color: "#8b5cf6" }}
                      className="tt-summary-stat"
                    />
                  </Col>
                </Row>
              )}
            </Card>

            <div>
              <Text
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 6,
                }}
              >
                Weight (grams)
              </Text>
              <Input
                ref={inputRef}
                id="weight-input"
                className="tt-weight-input"
                size="large"
                inputMode="numeric"
                placeholder="0"
                value={weight}
                onChange={(e) => handleWeightChange(e.target.value)}
                autoFocus
                style={{ borderRadius: 14, borderWidth: 2 }}
              />
            </div>

            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <CategoryButton
                label="Regular Trim"
                variant="regular"
                flash={flash === "regular"}
                disabled={parsedWeight === null}
                onClick={() => handleCategoryClick("regular")}
              />
              <CategoryButton
                label="Stick Trim"
                variant="stick"
                flash={flash === "stick"}
                disabled={parsedWeight === null}
                onClick={() => handleCategoryClick("stick")}
              />
              <CategoryButton
                label="Smalls"
                variant="smalls"
                flash={flash === "smalls"}
                disabled={parsedWeight === null}
                onClick={() => handleCategoryClick("smalls")}
              />
            </Space>

            <Card
              className="tt-dashboard-panel"
              title="Recent Entries"
              size="small"
              style={{ flex: 1, minHeight: 0, borderRadius: 12, display: "flex", flexDirection: "column" }}
              styles={{ body: { flex: 1, minHeight: 0, overflow: "hidden", padding: 8 } }}
              extra={
                canUndo ? (
                  <Button
                    size="small"
                    icon={<RollbackOutlined />}
                    onClick={handleUndoClick}
                    style={{
                      borderColor: "rgba(245, 158, 11, 0.5)",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fcd34d",
                    }}
                  >
                    Undo
                  </Button>
                ) : undefined
              }
            >
              {recentEntries.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No entries yet" />
              ) : (
                <div style={{ overflowY: "auto", maxHeight: "100%" }}>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {recentEntries.map((entry) => (
                      <Card
                        key={entry.id}
                        size="small"
                        styles={{ body: { padding: "8px 12px" } }}
                        style={{ borderRadius: 8, background: "rgba(15, 20, 25, 0.6)" }}
                      >
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {formatTime(entry.timestamp)}
                        </Text>
                        <div>
                          <Text strong style={{ fontSize: 15 }}>
                            {formatWeight(entry.weight)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            {categoryLabel(entry.category)}
                          </Text>
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right: production breakdown */}
        <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "rgba(15, 20, 25, 0.85)" }}>
          <Card
            className="tt-dashboard-panel"
            title="Production Breakdown"
            bordered={false}
            style={{ height: "100%", borderRadius: 0, background: "transparent" }}
            styles={{ body: { flex: 1, overflow: "auto", padding: 16 } }}
          >
            {activeEmployee ? (
              <LiveEmployeeBreakdown
                employee={activeEmployee}
                entries={activeSession.entries}
                onEdit={setEditingEntry}
                onDelete={deleteEntry}
              />
            ) : (
              <Empty description="Select an employee to view breakdown" />
            )}
          </Card>
        </div>
      </div>

      {showAddEmployee && (
        <PrototypeAddEmployeeModal
          allEmployees={activeEmployees}
          enrolledEmployeeIds={sessionEmployees.map((employee) => employee.id)}
          onAdd={handleAddEmployee}
          onClose={() => setShowAddEmployee(false)}
        />
      )}

      {editingEntry && editingEmployee && (
        <EditEntryModal
          entry={editingEntry}
          employee={editingEmployee}
          onSave={(updates) => {
            updateEntry(editingEntry.id, updates);
            setEditingEntry(null);
          }}
          onDelete={() => {
            deleteEntry(editingEntry.id);
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}
      {undoEntry && undoEmployee && (
        <UndoLastEntryModal
          entry={undoEntry}
          employee={undoEmployee}
          onConfirm={handleConfirmUndo}
          onClose={() => setUndoEntry(null)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-5 py-3 text-sm font-semibold shadow-lg"
          style={{
            borderColor: "rgba(34, 197, 94, 0.4)",
            background: "#1a222d",
            color: "#86efac",
          }}
        >
          {toast}
        </div>
      )}
    </Layout>
  );
}

function LiveEmployeeCard({
  employee,
  totals,
  isActive,
  onClick,
}: {
  employee: Employee;
  totals: ReturnType<typeof getEmployeeTotals>;
  isActive: boolean;
  onClick: () => void;
}) {
  const total = getGrandTotal(totals);
  const nick = employeeNickname(employee);

  return (
    <Card
      hoverable
      onClick={onClick}
      size="small"
      className={`tt-select-card ${isActive ? "tt-employee-card--active" : ""}`}
      styles={{ body: { padding: "8px 10px" } }}
      style={{
        borderRadius: 10,
        border: "1px solid #2e3d52",
        background: isActive ? undefined : "#1a222d",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
        <Text strong style={{ color: "#4ade80", fontSize: 13 }}>
          {formatEmployeeId(employee.employeeNumber)}
        </Text>
        <Text strong style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          {formatWeight(total)}
        </Text>
      </div>
      <Text
        ellipsis
        style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#fff", lineHeight: 1.3 }}
      >
        {employee.legalName}
      </Text>
      {nick && (
        <Text ellipsis style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          ({nick})
        </Text>
      )}
    </Card>
  );
}

function LiveEmployeeBreakdown({
  employee,
  entries,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entryId: string) => void;
}) {
  const totals = getEmployeeTotals(employee.id, entries);
  const grandTotal = getGrandTotal(totals);
  const categories: TrimCategory[] = ["regular", "stick", "smalls"];

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <EmployeeIdentity employee={employee} size="sm" align="center" />

      {categories.map((category) => {
        const categoryEntries = getEntriesByCategory(employee.id, category, entries);
        const subtotal = categoryEntries.reduce((sum, e) => sum + e.weight, 0);

        return (
          <Card
            key={category}
            size="small"
            title={CATEGORY_LABELS[category]}
            style={{
              borderRadius: 12,
              borderLeft: `3px solid ${CATEGORY_COLORS[category]}`,
            }}
            styles={{ body: { padding: "10px 14px" } }}
          >
            {categoryEntries.length > 0 ? (
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                {categoryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(15, 20, 25, 0.6)",
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        {formatWeight(entry.weight)}
                      </Text>
                      <Text type="secondary" style={{ display: "block", fontSize: 10 }}>
                        {formatTime(entry.timestamp)}
                      </Text>
                    </div>
                    <Space size={4}>
                      <Button size="small" onClick={() => onEdit(entry)}>
                        Edit
                      </Button>
                      <Button size="small" danger onClick={() => onDelete(entry.id)}>
                        Delete
                      </Button>
                    </Space>
                  </div>
                ))}
              </Space>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No entries
              </Text>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                paddingTop: 8,
                borderTop: "1px solid rgba(46, 61, 82, 0.5)",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                Subtotal
              </Text>
              <Text strong style={{ fontSize: 14 }}>
                {formatWeightWithLbs(subtotal)}
              </Text>
            </div>
          </Card>
        );
      })}

      <Card
        size="small"
        style={{
          borderRadius: 12,
          border: "2px solid #22c55e",
          background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)",
        }}
        styles={{ body: { padding: "12px 16px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text strong style={{ fontSize: 14, letterSpacing: "0.06em" }}>
            TOTAL
          </Text>
          <Text strong style={{ fontSize: 20, color: "#4ade80" }}>
            {formatWeightWithLbs(grandTotal)}
          </Text>
        </div>
      </Card>
    </Space>
  );
}

function CategoryButton({
  label,
  variant,
  flash,
  disabled,
  onClick,
}: {
  label: string;
  variant: TrimCategory;
  flash: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      block
      size="large"
      disabled={disabled}
      onClick={onClick}
      className={flash ? "tt-category-btn--flash" : ""}
      style={{
        height: 56,
        fontSize: 16,
        fontWeight: 700,
        borderRadius: 14,
        background: CATEGORY_COLORS[variant],
        borderColor: CATEGORY_COLORS[variant],
        color: "#fff",
        opacity: disabled ? 0.4 : 1,
        transition: "transform 0.15s ease, filter 0.15s ease",
      }}
    >
      {label}
    </Button>
  );
}
