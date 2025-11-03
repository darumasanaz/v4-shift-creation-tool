"use client";

import { useEffect, useState } from "react";

import Calendar, { CalendarProps } from "../components/Calendar";

type Person = {
  id: string;
  [key: string]: unknown;
};

type InitialData = {
  people?: Person[];
  year?: number;
  month?: number;
  days?: number;
  weekdayOfDay1?: number;
  [key: string]: unknown;
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarProps | null>(null);

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

  return (
    <main>
      <h1>シフト作成ツール v4</h1>
      {isLoading ? (
        <p>ローディング中...</p>
      ) : (
        <>
          <section>
            <h2>スタッフ一覧</h2>
            <ul>
              {people.map((person) => (
                <li key={person.id}>{person.id}</li>
              ))}
            </ul>
          </section>
          {calendarData ? (
            <section>
              <h2>
                {calendarData.year}年{calendarData.month}月
              </h2>
              <Calendar {...calendarData} />
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
