"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string;
  [key: string]: unknown;
};

type InitialData = {
  people?: Person[];
  [key: string]: unknown;
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);

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
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setPeople([]);
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
        <section>
          <h2>スタッフ一覧</h2>
          <ul>
            {people.map((person) => (
              <li key={person.id}>{person.id}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
