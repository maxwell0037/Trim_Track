import {
  MinusCircleOutlined,
  SearchOutlined,
  StopOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Empty, Input, Row, Space, Typography } from "antd";
import type { InputRef } from "antd/es/input";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditEntryModal } from "../components/EditEntryModal";
import { UndoLastEntryModal } from "../components/UndoLastEntryModal";
import { CadillacSessionFields } from "../components/CadillacSessionFields";
import { EntryConfirmPopup } from "../components/EntryConfirmPopup";
import { EntryHistoryPanel } from "../components/EntryHistoryPanel";
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
import { formatTime, formatWeight, formatWeightWithLbs, parseWholeWeight } from "../utils/format";
import { employeeNickname, filterEmployees, formatEmployeeId } from "../utils/employees";
import { isCadillacFacility } from "../utils/sessionDisplay";
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
    updateSessionCadillac,
  } = useSession();
  const { activeEmployees } = useMasterData();

  const [activeEmployeeId, setActiveEmployeeId] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [flash, setFlash] = useState<TrimCategory | null>(null);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [undoEntry, setUndoEntry] = useState<WeightEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [entryFocused, setEntryFocused] = useState(false);
  const [entryConfirm, setEntryConfirm] = useState<{
    category: TrimCategory;
    weight: number;
    employeeNumber: number;
  } | null>(null);
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

  const filteredSessionEmployees = useMemo(
    () => filterEmployees(sessionEmployees, employeeSearchQuery),
    [sessionEmployees, employeeSearchQuery],
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
    const entryEl = entryActionsRef.current;
    if (!entryEl) return;

    const entryNode = entryEl;

    function handleFocusIn() {
      setEntryFocused(true);
    }

    function handleFocusOut(event: FocusEvent) {
      const next = event.relatedTarget;
      if (next instanceof Node && entryNode.contains(next)) return;
      setEntryFocused(false);
    }

    entryNode.addEventListener("focusin", handleFocusIn);
    entryNode.addEventListener("focusout", handleFocusOut);

    return () => {
      entryNode.removeEventListener("focusin", handleFocusIn);
      entryNode.removeEventListener("focusout", handleFocusOut);
    };
  }, [session]);

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
    if (!activeEmployeeId || parsedWeight === null || !activeEmployee) return;

    addEntry(activeEmployeeId, category, parsedWeight);
    setWeight("");
    setFlash(category);
    setTimeout(() => setFlash(null), 400);
    setEntryConfirm({
      category,
      weight: parsedWeight,
      employeeNumber: activeEmployee.employeeNumber,
    });
    setTimeout(() => setEntryConfirm(null), 1500);
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
      className={`tt-live-current-card tt-live-current-card--compact ${activeEmployee ? "tt-live-current-card--active" : ""}`}
      styles={{ body: { padding: "8px 12px" } }}
    >
      {activeEmployee ? (
        <div className="tt-live-current-compact">
          <div className="tt-live-current-compact__identity">
            <span className="tt-live-current-compact__id">
              {formatEmployeeId(activeEmployee.employeeNumber)}
            </span>
            <span className="tt-live-current-compact__name">{activeEmployee.legalName}</span>
          </div>
          {activeTotals ? (
            <div className="tt-live-current-compact__totals">
              <span className="tt-live-current-compact__stat tt-cat-regular">
                R {activeTotals.regular}g
              </span>
              <span className="tt-live-current-compact__stat tt-cat-stick">
                S {activeTotals.stick}g
              </span>
              <span className="tt-live-current-compact__stat tt-cat-smalls">
                Sm {activeTotals.smalls}g
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="tt-section-label text-center">Select an employee</p>
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
          className="tt-weight-input tt-weight-input--compact"
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

      <Space direction="vertical" size={6} style={{ width: "100%", marginTop: 8 }}>
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

  const isCadillac = isCadillacFacility(activeSession.facilityName);

  return (
    <Layout
      onBack={handleBack}
      backLabel="Setup"
      headerLayout="responsive"
      headerDensity="compact"
      headerCenter={<SessionInfoHeader session={activeSession} variant="live" />}
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
      <div className="tt-live-page">
        {isCadillac ? (
          <div className="tt-live-cadillac-bar">
            <CadillacSessionFields
              compact
              values={activeSession.cadillac ?? {}}
              onChange={updateSessionCadillac}
            />
          </div>
        ) : null}

        <div
          className={`tt-live-session${entryFocused ? " tt-live-session--entry-focus" : ""}`}
        >
        {/* Row 1 (portrait) / Left column (landscape): employee roster */}
        <section className="tt-live-section tt-live-employees">
          <Card
            className="tt-dashboard-panel"
            title="Select Employee"
            bordered={false}
            style={{ height: "100%", borderRadius: 0, background: "transparent" }}
            styles={{ body: { display: "flex", flexDirection: "column", overflow: "hidden" } }}
          >
            <Input
              className="tt-live-employee-search"
              allowClear
              prefix={<SearchOutlined style={{ color: "rgba(255,255,255,0.35)" }} />}
              placeholder="Search #, name, or preferred name…"
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              aria-label="Search employees"
            />
            <div className="tt-live-employees-scroll">
              {filteredSessionEmployees.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No matching employees"
                  style={{ margin: "12px 0" }}
                />
              ) : (
                <Row gutter={[10, 10]} style={{ alignContent: "flex-start" }}>
                  {filteredSessionEmployees.map((employee) => {
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
              )}
            </div>
          </Card>
        </section>

        {/* Center: current employee + weight entry */}
        <div className="tt-live-center tt-live-section">
          <section className="tt-live-current">{currentEmployeeCard}</section>
          <section className="tt-live-weight">{weightEntrySection}</section>
        </div>

        {/* Right: production breakdown + entry history */}
        <section className="tt-live-section tt-live-right">
          <div className="tt-live-breakdown">
            <Card
              className="tt-dashboard-panel"
              title="Production Breakdown"
              bordered={false}
              style={{ height: "100%", borderRadius: 0, background: "transparent" }}
              styles={{ body: { padding: 12, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" } }}
            >
              <div className="tt-live-breakdown-scroll">
                {activeEmployee ? (
                  <LiveEmployeeBreakdown
                    employee={activeEmployee}
                    entries={activeSession.entries}
                    onEdit={setEditingEntry}
                    onDelete={deleteEntry}
                  />
                ) : (
                  <Empty description="Select an employee" />
                )}
              </div>
            </Card>
          </div>
          <div className="tt-live-history">
            <EntryHistoryPanel
              entries={recentEntries}
              employees={sessionEmployees}
              canUndo={canUndo}
              onUndoLatest={handleUndoClick}
            />
          </div>
        </section>
        </div>

        {entryConfirm ? (
          <EntryConfirmPopup
            category={entryConfirm.category}
            weight={entryConfirm.weight}
            employeeNumber={entryConfirm.employeeNumber}
          />
        ) : null}
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
      className={`tt-category-btn tt-category-btn--compact ${CATEGORY_CLASS[variant]} ${flash ? "tt-category-btn--flash" : ""}`}
    >
      {label}
    </Button>
  );
}
