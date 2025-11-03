import React from 'react';

// 型定義
interface ShiftData {
  [shiftCode: string]: string[];
}

interface GeneratedShifts {
  [day: string]: ShiftData;
}

interface WishOffs {
  [personId: string]: number[];
}

interface Shortage {
  date: number;
  time_range: string;
  shortage_count: number;
}

interface CalendarProps {
  year: number;
  month: number;
  daysInMonth: number;
  firstDayOfWeek: number;
  wishOffs: WishOffs;
  selectedStaff: string | null;
  onDayClick: (day: number) => void;
  generatedShifts: GeneratedShifts | null;
}

const Calendar: React.FC<CalendarProps> = ({
  year,
  month,
  daysInMonth,
  firstDayOfWeek,
  wishOffs,
  selectedStaff,
  onDayClick,
  generatedShifts,
}) => {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  const blanks = Array(firstDayOfWeek).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getWishOffsForDay = (day: number) => {
    return Object.entries(wishOffs)
      .filter(([_, dates]) => dates.includes(day))
      .map(([personId, _]) => personId);
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-center mb-4">{`${year}年${month}月`}</h2>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => (
          <div key={day} className="font-bold p-2 bg-gray-200 rounded-t-lg">
            {day}
          </div>
        ))}
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} className="border rounded-lg" style={{ minHeight: '120px' }}></div>
        ))}
        {days.map((day) => {
          const dayWishes = getWishOffsForDay(day);
          // ここからが重要な修正
          const dayShifts = generatedShifts ? generatedShifts[day.toString()] : null;

          return (
            <div
              key={day}
              className="border rounded-lg p-2 flex flex-col cursor-pointer hover:bg-blue-100 transition-colors"
              style={{ minHeight: '120px' }}
              onClick={() => onDayClick(day)}
            >
              <div className="font-bold self-start">{day}</div>
              <div className="flex-grow text-xs text-left mt-1">
                {/* 希望休の表示 */}
                {dayWishes.length > 0 && (
                  <div className="bg-yellow-200 p-1 rounded mb-1">
                    <div className="font-semibold text-yellow-800">希望休:</div>
                    {dayWishes.map((name) => (
                      <div key={name}>{name}</div>
                    ))}
                  </div>
                )}
                {/* 生成されたシフトの表示 (ここからが重要な修正) */}
                {dayShifts && Object.keys(dayShifts).length > 0 && (
                   <div className="bg-green-200 p-1 rounded">
                     {Object.entries(dayShifts).map(([shiftCode, people]) => (
                       <div key={shiftCode}>
                         <span className="font-semibold text-green-800">{shiftCode}:</span>
                         {/* 配列をカンマ区切りで表示 */}
                         <span>{people.join(', ')}</span>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
