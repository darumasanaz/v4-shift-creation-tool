"use client";

import { useEffect, useState } from "react";

import Calendar from "../components/Calendar";

type Person = {
  id: string;
  [key: string]: unknown;
};

type CalendarData = {
  year: number;
  month: number;
  days: number;
  weekdayOfDay1: number;
};

type WishOffs = Record<string, number[]>;

type InitialData = {
  people?: Person[];
  year?: number;
  month?: number;
  days?: number;
  weekdayOfDay1?: number;
  wishOffs?: unknown;
  [key: string]: unknown;
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [wishOffs, setWishOffs] = useState<WishOffs>({});

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const response = await fetch("/api/initial-data");
        if (!response.ok) {
          throw new Error(`Failed to fetch initial data: ${response.status}`);
        }

        const data: InitialData = await response.json();
        if (isMounted) {
          const nextPeople = Array.isArray(data.people) ? data.people : [];
          setPeople(nextPeople);
          setSelectedStaffId((current) => {
            if (current && nextPeople.some((person) => person.id === current)) {
              return current;
            }
            return nextPeople.length > 0 ? nextPeople[0].id : null;
          });

          const isWishOffsRecord = (value: unknown): value is WishOffs => {
            if (!value || typeof value !== "object") {
              return false;
            }

            return Object.entries(value).every(([key, days]) => {
              if (typeof key !== "string" || !Array.isArray(days)) {
                return false;
              }

              return days.every(
                (day) => typeof day === "number" && Number.isInteger(day)
              );
            });
          };

          setWishOffs(() => {
            if (isWishOffsRecord(data.wishOffs)) {
              return data.wishOffs;
            }
            return {};
          });

          const isValidNumber = (value: unknown): value is number =>
            typeof value === "number" && Number.isFinite(value);

          if (
            isValidNumber(data.year) &&
            isValidNumber(data.month) &&
            isValidNumber(data.days) &&
            isValidNumber(data.weekdayOfDay1)
          ) {
            setCalendarData({
              year: data.year,
              month: data.month,
              days: data.days,
              weekdayOfDay1: data.weekdayOfDay1,
            });
          } else {
            setCalendarData(null);
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setPeople([]);
          setCalendarData(null);
          setSelectedStaffId(null);
          setWishOffs({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectStaff = (personId: string) => {
    setSelectedStaffId(personId);
  };

  const handleRegisterWishOff = (day: number) => {
    setWishOffs((previous) => {
      if (!selectedStaffId) {
        return previous;
      }

      const existingDays = previous[selectedStaffId] ?? [];
      if (existingDays.includes(day)) {
        return previous;
      }

      const updatedDays = [...existingDays, day].sort((a, b) => a - b);
      return {
        ...previous,
        [selectedStaffId]: updatedDays,
      };
    });
  };

  return (
    <main>
      <h1>シフト作成ツール v4</h1>
      {isLoading ? (
        <p>ローディング中...</p>
      ) : (
        <>
          <section>
            <h2>スタッフ一覧</h2>
            {people.length === 0 ? (
              <p>スタッフ情報がありません。</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {people.map((person) => {
                  const isSelected = selectedStaffId === person.id;

                  return (
                    <li key={person.id} style={{ marginBottom: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSelectStaff(person.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid",
                          borderColor: isSelected ? "#2563eb" : "#d1d5db",
                          backgroundColor: isSelected ? "#dbeafe" : "#ffffff",
                          cursor: "pointer",
                          fontWeight: isSelected ? "bold" : "normal",
                        }}
                      >
                        {person.id}
                        {isSelected && <span style={{ marginLeft: "0.5rem" }}>（選択中）</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          {calendarData ? (
            <section>
              <h2>
                {calendarData.year}年{calendarData.month}月
              </h2>
              <Calendar
                {...calendarData}
                wishOffs={wishOffs}
                selectedStaffId={selectedStaffId}
                onSelectDate={handleRegisterWishOff}
              />
            </section>
          ) : (
            <section>
              <h2>カレンダー</h2>
              <p>カレンダー情報を取得できませんでした。</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
