import type { TrimCategory } from "../types";
import { formatEmployeeId } from "../utils/employees";
import { formatWeight } from "../utils/format";

const CATEGORY_CLASS: Record<TrimCategory, string> = {
  regular: "tt-cat-regular",
  stick: "tt-cat-stick",
  smalls: "tt-cat-smalls",
};

interface EntryConfirmPopupProps {
  category: TrimCategory;
  weight: number;
  employeeNumber: number;
}

export function EntryConfirmPopup({ category, weight, employeeNumber }: EntryConfirmPopupProps) {
  const shortLabel =
    category === "regular" ? "Regular Trim" : category === "stick" ? "Stick Trim" : "Smalls";

  return (
    <div className="tt-entry-confirm-popup" role="status" aria-live="polite">
      <div className={`tt-entry-confirm-popup__bubble ${CATEGORY_CLASS[category]}`}>
        <span className="tt-entry-confirm-popup__category">{shortLabel}</span>
        <span className="tt-entry-confirm-popup__weight">{formatWeight(weight)}</span>
        <span className="tt-entry-confirm-popup__employee">
          {formatEmployeeId(employeeNumber)}
        </span>
      </div>
    </div>
  );
}
