import {
  MinusCircleOutlined,
  RollbackOutlined,
  StopOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Empty, Input, Row, Space, Statistic, Typography } from "antd";
import type { InputRef } from "antd/es/input";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const CATEGORY_CLASS: Record<TrimCategory, string> = {
  regular: "tt-cat-regular",
  stick: "tt-cat-stick",
  smalls: "tt-cat-smalls",
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
  const entryActionsRef = useRef<HTMLDivElement>(null);

  const sessionEmployees = useMemo(() => {
    if (!session) return [];
    return getSessionEmployees(session, activeEmployees);
  }, [session, activeEmployees]);

  const recentEntries = useMemo(
    () => (session ? getRecentEntries(session.entries, 20) : []),
    [session],
  );

  const scrollEntryIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      entryActionsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    reloadFromStorage();
  }, [reloadFromStorage]);

  useEffect(() => {
    const inputEl = inputRef.current?.input;
    const entryEl = entryActionsRef.current;
    const vv = window.visualViewport;
    if (!inputEl || !entryEl || !vv) return;

    const entryNode = entryEl;

    function keepEntryVisible() {
      const viewport = window.visualViewport;
      if (!viewport || document.activeElement !== inputEl) return;
      const rect = entryNode.getBoundingClientRect();
      const visibleBottom = viewport.height + viewport.offsetTop;
      if (rect.bottom > visibleBottom - 16) {
        entryNode.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    }

    inputEl.addEventListener("focus", scrollEntryIntoView);
    vv.addEventListener("resize", keepEntryVisible);
    vv.addEventListener("scroll", keepEntryVisible);

    return () => {
      inputEl.removeEventListener("focus", scrollEntryIntoView);
      vv.removeEventListener("resize", keepEntryVisible);
      vv.removeEventListener("scroll", keepEntryVisible);
    };
  }, [session, scrollEntryIntoView]);

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

  const currentEmployeeCard = (
    <Card
      size="small"
      className={`tt-live-current-card ${activeEmployee ? "tt-live-current-card--active" : ""}`}
      styles={{ body: { padding: "12px 16px" } }}
    >
      <p className="tt-section-label text-center">Current Employee</p>
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
              valueStyle={{ fontSize: 14, color: "#34d399" }}
              className="tt-summary-stat"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Stick"
              value={activeTotals.stick}
              suffix="g"
              valueStyle={{ fontSize: 14, color: "#fbbf24" }}
              className="tt-summary-stat"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Smalls"
              value={activeTotals.smalls}
              suffix="g"
              valueStyle={{ fontSize: 14, color: "#a78bfa" }}
              className="tt-summary-stat"
            />
          </Col>
        </Row>
      )}
    </Card>
  );

  const weightEntrySection = (
    <div ref={entryActionsRef} className="tt-live-entry-actions">
      <div>
        <p className="tt-section-label mb-1.5 text-center">Weight (grams)</p>
        <Input
          ref={inputRef}
          id="weight-input"
          className="tt-weight-input"
          size="large"
          inputMode="numeric"
          placeholder="0"
          value={weight}
          onChange={(e) => handleWeightChange(e.target.value)}
          onFocus={scrollEntryIntoView}
          autoFocus
          style={{ borderRadius: 14 }}
        />
      </div>

      <Space direction="vertical" size={10} style={{ width: "100%", marginTop: 12 }}>
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
    </div>
  );

  const recentEntriesSection = (
    <Card
      className="tt-dashboard-panel"
      title="Recent Entries"
      size="small"
      style={{ borderRadius: 12, height: "100%", display: "flex", flexDirection: "column" }}
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
  );

  return (
    <Layout
      onBack={handleBack}
      backLabel="Setup"
      headerLayout="responsive"
      headerCenter={<SessionInfoHeader session={activeSession} compact />}
      headerRight={
        <>
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
        </>
      }
    >
      <div className="tt-live-session">
        {/* Row 1 (portrait) / Left column (landscape): employee roster */}
        <section className="tt-live-section tt-live-employees">
          <Card
            className="tt-dashboard-panel"
            title="Select Employee"
            bordered={false}
            style={{ height: "100%", borderRadius: 0, background: "transparent" }}
            styles={{ body: { display: "flex", flexDirection: "column", overflow: "hidden" } }}
          >
            <div className="tt-live-employees-scroll">
              <Row gutter={[6, 6]} style={{ alignContent: "flex-start" }}>
                {sessionEmployees.map((employee) => {
                  const totals = getEmployeeTotals(employee.id, activeSession.entries);
                  const isActive = employee.id === activeEmployeeId;
                  return (
                    <Col key={employee.id} xs={12} sm={8} lg={24}>
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
            </div>
          </Card>
        </section>

        {/* Rows 2–4 (portrait) / Center column (landscape) */}
        <div className="tt-live-center tt-live-section">
          <section className="tt-live-current">{currentEmployeeCard}</section>
          <section className="tt-live-weight">{weightEntrySection}</section>
          <section className="tt-live-recent">{recentEntriesSection}</section>
        </div>

        {/* Row 5 (portrait) / Right column (landscape): production breakdown */}
        <section className="tt-live-section tt-live-breakdown">
          <Card
            className="tt-dashboard-panel"
            title="Production Breakdown"
            bordered={false}
            style={{ height: "100%", borderRadius: 0, background: "transparent" }}
            styles={{ body: { padding: 16 } }}
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
        </section>
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
        <div className="tt-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 text-sm font-semibold">
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
      className={`tt-employee-roster-card tt-select-card tt-surface-card ${isActive ? "tt-employee-card--active" : ""}`}
      style={{ width: "100%" }}
    >
      <div className="tt-employee-roster-card__body">
        <span className="tt-employee-roster-card__id">{formatEmployeeId(employee.employeeNumber)}</span>
        <span className="tt-employee-roster-card__name" title={employee.legalName}>
          {employee.legalName}
        </span>
        {nick ? (
          <span className="tt-employee-roster-card__nick" title={nick}>
            ({nick})
          </span>
        ) : null}
        <span className="tt-employee-roster-card__weight">{formatWeight(total)}</span>
      </div>
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
            className={`tt-category-panel ${CATEGORY_CLASS[category]}`}
            title={CATEGORY_LABELS[category]}
            style={{
              borderRadius: 14,
              borderLeft: "3px solid var(--tt-cat-color)",
            }}
          >
            <div className="tt-category-entries-scroll">
              {categoryEntries.length > 0 ? (
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  {categoryEntries.map((entry) => (
                    <div key={entry.id} className="tt-entry-row">
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 14 }}>
                          {formatWeight(entry.weight)}
                        </Text>
                        <Text type="secondary" style={{ display: "block", fontSize: 10 }}>
                          {formatTime(entry.timestamp)}
                        </Text>
                      </div>
                      <Space size={4} wrap>
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
            </div>
            <div className="tt-category-subtotal">
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Subtotal
              </Text>
              <Text strong style={{ fontSize: 14 }}>
                {formatWeightWithLbs(subtotal)}
              </Text>
            </div>
          </Card>
        );
      })}

      <Card size="small" className="tt-category-total-card" styles={{ body: { padding: "12px 16px" } }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text strong style={{ fontSize: 14, letterSpacing: "0.06em" }}>
            TOTAL
          </Text>
          <Text strong className="text-brand-400" style={{ fontSize: 20 }}>
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
      className={`tt-category-btn ${CATEGORY_CLASS[variant]} ${flash ? "tt-category-btn--flash" : ""}`}
    >
      {label}
    </Button>
  );
}
