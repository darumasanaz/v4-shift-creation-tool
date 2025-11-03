"use client";

import { useEffect, useState } from "react";

import Calendar from "../components/Calendar";
import StaffEditModal, {
  type StaffEditModalPerson,
  type StaffEditModalSavePayload,
} from "../components/StaffEditModal";

export type Person = StaffEditModalPerson & {
  [key: string]: unknown;
};

type CalendarData = {
  year: number;
  month: number;
  days: number;
  weekdayOfDay1: number;
};

type WishOffs = Record<string, number[]>;

type GeneratedShifts = Record<string, Record<string, string[]>>;

type ShiftGenerationResponse = {
  status: string;
  shifts?: GeneratedShifts;
  message?: string;
};

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
  const [baseShiftData, setBaseShiftData] = useState<InitialData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedShifts, setGeneratedShifts] = useState<GeneratedShifts | null>(
    null
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Person | null>(null);

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

          setBaseShiftData(data);

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
          setBaseShiftData(null);
          setGeneratedShifts(null);
          setGenerationError("シフトを作成できませんでした。");
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

  const handleOpenEditModal = (person: Person) => {
    setEditingStaff(person);
    setSelectedStaffId(person.id);
    setIsEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingStaff(null);
  };

  const handleSaveStaff = (updatedPerson: StaffEditModalSavePayload) => {
    setPeople((previous) => {
      const nextPeople = previous.map((person) =>
        person.id === updatedPerson.id ? { ...person, ...updatedPerson } : person
      );
      setBaseShiftData((previousBase) =>
        previousBase ? { ...previousBase, people: nextPeople } : previousBase
      );
      return nextPeople;
    });
    setSelectedStaffId(updatedPerson.id);
    setEditingStaff((current) =>
      current && current.id === updatedPerson.id
        ? { ...current, ...updatedPerson }
        : current
    );
    setIsEditModalOpen(false);
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
    setGeneratedShifts(null);
    setGenerationError(null);
  };

  const handleGenerateShifts = async () => {
    if (!calendarData || !baseShiftData) {
      setGenerationError("シフトを作成できませんでした。");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const payload = {
        ...(baseShiftData ?? {}),
        year: calendarData.year,
        month: calendarData.month,
        days: calendarData.days,
        weekdayOfDay1: calendarData.weekdayOfDay1,
        people,
        wishOffs,
      };

      const response = await fetch("/api/generate-shift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate shifts: ${response.status}`);
      }

      const result: ShiftGenerationResponse = await response.json();

      if (result.status === "success" && result.shifts) {
        setGeneratedShifts(result.shifts);
        setGenerationError(null);
      } else {
        setGeneratedShifts(null);
        setGenerationError("シフトを作成できませんでした。");
      }
    } catch (error) {
      console.error(error);
      setGeneratedShifts(null);
      setGenerationError("シフトを作成できませんでした。");
    } finally {
      setIsGenerating(false);
    }
  };

  const isGenerateDisabled =
    isGenerating || !calendarData || !baseShiftData || people.length === 0;

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
                        onClick={() => handleOpenEditModal(person)}
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
          <section style={{ margin: "1.5rem 0" }}>
            <button
              type="button"
              onClick={handleGenerateShifts}
              disabled={isGenerateDisabled}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: isGenerateDisabled ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: isGenerateDisabled ? "not-allowed" : "pointer",
              }}
            >
              {isGenerating ? "シフトを作成中..." : "シフトを作成する"}
            </button>
            {generationError && (
              <p role="alert" style={{ marginTop: "0.75rem", color: "#dc2626" }}>
                {generationError}
              </p>
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
                generatedShifts={generatedShifts ?? undefined}
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
      <StaffEditModal
        isOpen={isEditModalOpen}
        person={editingStaff}
        onSave={handleSaveStaff}
        onCancel={handleCancelEdit}
      />
    </main>
  );
}
