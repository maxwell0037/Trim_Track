import { RollbackOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import type { Employee, TrimCategory, WeightEntry } from "../types";
import { formatEmployeeId } from "../utils/employees";
import { categoryLabel, formatTime, formatWeight } from "../utils/format";

const CATEGORY_CLASS: Record<TrimCategory, string> = {
  regular: "tt-cat-regular",
  stick: "tt-cat-stick",
  smalls: "tt-cat-smalls",
};

interface EntryHistoryPanelProps {
  entries: WeightEntry[];
  employees: Employee[];
  onUndoLatest?: () => void;
  canUndo?: boolean;
}

export function EntryHistoryPanel({
  entries,
  employees,
  onUndoLatest,
  canUndo = false,
}: EntryHistoryPanelProps) {
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

  if (entries.length === 0) {
    return (
      <div className="tt-entry-history">
        <div className="tt-entry-history__header">
          <span className="tt-section-label">Entry History</span>
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No entries yet" />
      </div>
    );
  }

  const latestId = entries[0]?.id;

  return (
    <div className="tt-entry-history">
      <div className="tt-entry-history__header">
        <span className="tt-section-label">Entry History</span>
        {canUndo && onUndoLatest ? (
          <Button
            size="small"
            icon={<RollbackOutlined />}
            onClick={onUndoLatest}
            className="tt-entry-history__undo"
          >
            Undo
          </Button>
        ) : null}
      </div>
      <div className="tt-entry-history__scroll">
        {entries.map((entry) => {
          const employee = employeeMap.get(entry.employeeId);
          const isLatest = entry.id === latestId;
          return (
            <div
              key={entry.id}
              className={`tt-entry-history__row ${isLatest ? "tt-entry-history__row--latest" : ""}`}
            >
              <div className="tt-entry-history__employee">
                <span className="tt-entry-history__id">
                  {employee ? formatEmployeeId(employee.employeeNumber) : "—"}
                </span>
                <span className="tt-entry-history__name" title={employee?.legalName}>
                  {employee?.legalName ?? "Unknown"}
                </span>
              </div>
              <span className={`tt-entry-history__cat ${CATEGORY_CLASS[entry.category]}`}>
                {categoryLabel(entry.category)}
              </span>
              <span className="tt-entry-history__weight">{formatWeight(entry.weight)}</span>
              <span className="tt-entry-history__time">{formatTime(entry.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
