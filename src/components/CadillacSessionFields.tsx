import { Input } from "antd";
import type { SessionCadillacMeta } from "../types";

interface CadillacSessionFieldsProps {
  values: SessionCadillacMeta;
  onChange: (updates: SessionCadillacMeta) => void;
  compact?: boolean;
}

export function CadillacSessionFields({
  values,
  onChange,
  compact = false,
}: CadillacSessionFieldsProps) {
  if (compact) {
    return (
      <div className="tt-cadillac-fields tt-cadillac-fields--compact">
        <Input
          size="small"
          placeholder="Strain"
          value={values.strain ?? ""}
          onChange={(e) => onChange({ strain: e.target.value })}
          aria-label="Strain"
        />
        <Input
          size="small"
          placeholder="Bin #"
          value={values.binNumber ?? ""}
          onChange={(e) => onChange({ binNumber: e.target.value })}
          aria-label="Bin number"
        />
        <Input
          size="small"
          placeholder="UID"
          value={values.uid ?? ""}
          onChange={(e) => onChange({ uid: e.target.value })}
          aria-label="UID"
        />
      </div>
    );
  }

  return (
    <div className="tt-cadillac-fields">
      <Input
        size="large"
        placeholder="Strain"
        value={values.strain ?? ""}
        onChange={(e) => onChange({ strain: e.target.value })}
        style={{ borderRadius: 12 }}
      />
      <Input
        size="large"
        placeholder="Bin Number"
        value={values.binNumber ?? ""}
        onChange={(e) => onChange({ binNumber: e.target.value })}
        style={{ borderRadius: 12 }}
      />
      <Input
        size="large"
        placeholder="UID"
        value={values.uid ?? ""}
        onChange={(e) => onChange({ uid: e.target.value })}
        style={{ borderRadius: 12 }}
      />
    </div>
  );
}
