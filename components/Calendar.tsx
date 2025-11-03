import React from "react";

export type CalendarProps = {
  year: number;
  month: number;
  days: number;
  weekdayOfDay1: number;
  wishOffs: Record<string, number[]>;
  selectedStaffId: string | null;
  onSelectDate: (day: number) => void;
};

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

const Calendar: React.FC<CalendarProps> = ({
  days,
  weekdayOfDay1,
  wishOffs,
  selectedStaffId,
  onSelectDate,
}) => {
  const leadingEmptyCells = ((weekdayOfDay1 % 7) + 7) % 7;
  const totalCells = Math.ceil((leadingEmptyCells + days) / 7) * 7;
  const cells: Array<number | null> = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyCells + 1;
    return dayNumber > 0 && dayNumber <= days ? dayNumber : null;
  });

  const rows = Array.from({ length: cells.length / 7 }, (_, rowIndex) =>
    cells.slice(rowIndex * 7, rowIndex * 7 + 7)
  );

  return (
    <table>
      <thead>
        <tr>
          {dayLabels.map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => {
              if (cell === null) {
                return (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    style={{ border: "1px solid #d1d5db" }}
                  />
                );
              }

              const wishers = Object.entries(wishOffs)
                .filter(([, daysOfStaff]) => daysOfStaff.includes(cell))
                .map(([staffId]) => staffId);

              const isSelectedStaffWish =
                selectedStaffId !== null && wishers.includes(selectedStaffId);

              const backgroundColor = isSelectedStaffWish
                ? "#bfdbfe"
                : wishers.length > 0
                ? "#fef3c7"
                : undefined;

              const handleClick = () => {
                if (selectedStaffId) {
                  onSelectDate(cell);
                }
              };

              return (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  onClick={handleClick}
                  style={{
                    cursor: selectedStaffId ? "pointer" : "not-allowed",
                    padding: "0.5rem",
                    verticalAlign: "top",
                    border: "1px solid #d1d5db",
                    backgroundColor,
                    opacity: selectedStaffId ? 1 : 0.6,
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{cell}</div>
                  {wishers.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.25rem",
                        fontSize: "0.75rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {wishers.join(", ")}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Calendar;
