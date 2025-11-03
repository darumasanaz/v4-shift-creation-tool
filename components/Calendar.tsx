import React from "react";

export type CalendarProps = {
  year: number;
  month: number;
  days: number;
  weekdayOfDay1: number;
};

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

const Calendar: React.FC<CalendarProps> = ({ days, weekdayOfDay1 }) => {
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
            {row.map((cell, cellIndex) => (
              <td key={`cell-${rowIndex}-${cellIndex}`}>
                {cell !== null ? cell : ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Calendar;
