import { useEffect, useMemo, useState } from "react";

export type StaffEditModalPerson = {
  id: string;
  canWork?: string[] | null;
  monthlyMin?: number | null;
  monthlyMax?: number | null;
  weeklyMax?: number | null;
  consecMax?: number | null;
  [key: string]: unknown;
};

export type StaffEditModalSavePayload = StaffEditModalPerson & {
  canWork: string[];
  monthlyMin?: number | null;
  monthlyMax?: number | null;
  weeklyMax?: number | null;
  consecMax?: number | null;
};

type StaffEditModalProps = {
  isOpen: boolean;
  person: StaffEditModalPerson | null;
  onSave: (updatedPerson: StaffEditModalSavePayload) => void;
  onCancel: () => void;
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.25rem",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  fontSize: "0.95rem",
};

export default function StaffEditModal({
  isOpen,
  person,
  onSave,
  onCancel,
}: StaffEditModalProps) {
  const [canWorkInput, setCanWorkInput] = useState("");
  const [monthlyMinInput, setMonthlyMinInput] = useState("");
  const [monthlyMaxInput, setMonthlyMaxInput] = useState("");
  const [weeklyMaxInput, setWeeklyMaxInput] = useState("");
  const [consecMaxInput, setConsecMaxInput] = useState("");

  useEffect(() => {
    if (!isOpen || !person) {
      return;
    }

    setCanWorkInput(
      Array.isArray(person.canWork) ? person.canWork.join(", ") : ""
    );
    setMonthlyMinInput(
      person.monthlyMin !== undefined && person.monthlyMin !== null
        ? String(person.monthlyMin)
        : ""
    );
    setMonthlyMaxInput(
      person.monthlyMax !== undefined && person.monthlyMax !== null
        ? String(person.monthlyMax)
        : ""
    );
    setWeeklyMaxInput(
      person.weeklyMax !== undefined && person.weeklyMax !== null
        ? String(person.weeklyMax)
        : ""
    );
    setConsecMaxInput(
      person.consecMax !== undefined && person.consecMax !== null
        ? String(person.consecMax)
        : ""
    );
  }, [isOpen, person]);

  const modalTitle = useMemo(() => {
    if (!person) {
      return "スタッフ情報";
    }
    return `${person.id} のスタッフ情報`;
  }, [person]);

  if (!isOpen || !person) {
    return null;
  }

  const parseNumber = (value: string, fallback: number | null | undefined) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return parsed;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCanWork = canWorkInput
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const updatedPerson: StaffEditModalSavePayload = {
      ...person,
      canWork: normalizedCanWork,
      monthlyMin: parseNumber(monthlyMinInput, person.monthlyMin),
      monthlyMax: parseNumber(monthlyMaxInput, person.monthlyMax),
      weeklyMax: parseNumber(weeklyMaxInput, person.weeklyMax),
      consecMax: parseNumber(consecMaxInput, person.consecMax),
    };

    onSave(updatedPerson);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-edit-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          width: "min(32rem, 100%)",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
        }}
      >
        <h2 id="staff-edit-modal-title" style={{ marginBottom: "1rem" }}>
          {modalTitle}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="staff-can-work" style={fieldLabelStyle}>
              勤務可能シフト
            </label>
            <input
              id="staff-can-work"
              type="text"
              value={canWorkInput}
              onChange={(event) => setCanWorkInput(event.target.value)}
              placeholder="例: EA, DA, NA"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label htmlFor="staff-monthly-min" style={fieldLabelStyle}>
                月間勤務日数 下限
              </label>
              <input
                id="staff-monthly-min"
                type="number"
                inputMode="numeric"
                value={monthlyMinInput}
                onChange={(event) => setMonthlyMinInput(event.target.value)}
                style={inputStyle}
                min={0}
              />
            </div>
            <div>
              <label htmlFor="staff-monthly-max" style={fieldLabelStyle}>
                月間勤務日数 上限
              </label>
              <input
                id="staff-monthly-max"
                type="number"
                inputMode="numeric"
                value={monthlyMaxInput}
                onChange={(event) => setMonthlyMaxInput(event.target.value)}
                style={inputStyle}
                min={0}
              />
            </div>
            <div>
              <label htmlFor="staff-weekly-max" style={fieldLabelStyle}>
                週間勤務日数 上限
              </label>
              <input
                id="staff-weekly-max"
                type="number"
                inputMode="numeric"
                value={weeklyMaxInput}
                onChange={(event) => setWeeklyMaxInput(event.target.value)}
                style={inputStyle}
                min={0}
              />
            </div>
            <div>
              <label htmlFor="staff-consec-max" style={fieldLabelStyle}>
                最大連続勤務日数
              </label>
              <input
                id="staff-consec-max"
                type="number"
                inputMode="numeric"
                value={consecMaxInput}
                onChange={(event) => setConsecMaxInput(event.target.value)}
                style={inputStyle}
                min={0}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "9999px",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "9999px",
                border: "none",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
