"use client";

import React, { useState, useEffect } from 'react';
import Calendar from '../components/Calendar';
import StaffEditModal from '../components/StaffEditModal';

// 型定義
interface Person {
  id: string;
  canWork: string[];
  monthlyMin: number;
  monthlyMax: number;
  weeklyMax: number;
  consecMax: number;
  // 他のプロパティも必要に応じて追加
}

interface InitialData {
  year: number;
  month: number;
  days: number;
  weekdayOfDay1: number;
  people: Person[];
  wishOffs: { [personId: string]: number[] };
  // 他のプロパティも網羅的に定義
  [key: string]: any;
}

interface GeneratedShifts {
  [day: string]: {
    [shiftCode: string]: string[];
  };
}

interface Shortage {
  date: number;
  time_range: string;
  shortage_count: number;
}

export default function Home() {
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [wishOffs, setWishOffs] = useState<{ [personId: string]: number[] }>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generatedShifts, setGeneratedShifts] = useState<GeneratedShifts | null>(null);
  const [shortageInfo, setShortageInfo] = useState<Shortage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 編集モーダル用のstate
  const [editingStaff, setEditingStaff] = useState<Person | null>(null);

  useEffect(() => {
    fetch('/api/initial-data')
      .then(res => res.json())
      .then(data => {
        setInitialData(data);
        setWishOffs(data.wishOffs || {});
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch initial data:", error);
        setErrorMessage("初期データの読み込みに失敗しました。");
        setIsLoading(false);
      });
  }, []);

  const handleDayClick = (day: number) => {
    if (!selectedStaff) {
      alert('先にスタッフを選択してください。');
      return;
    }
    setWishOffs(prev => {
      const currentWishes = prev[selectedStaff] || [];
      const newWishes = currentWishes.includes(day)
        ? currentWishes.filter(d => d !== day)
        : [...currentWishes, day];
      return { ...prev, [selectedStaff]: newWishes };
    });
  };

  const handleGenerateShift = async () => {
    if (!initialData) return;
    setIsGenerating(true);
    setErrorMessage('');
    setShortageInfo([]);
    setGeneratedShifts(null);

    const payload = { ...initialData, wishOffs };

    try {
      const response = await fetch('/api/generate-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('サーバーからエラーが返されました。');
      }

      const result = await response.json();

      if (result.status === 'success') {
        setGeneratedShifts(result.shifts);
        setShortageInfo(result.shortages || []);
      } else {
        setErrorMessage(result.message || 'シフトを作成できませんでした。');
      }
    } catch (error) {
      console.error("Shift generation failed:", error);
      setErrorMessage('シフト作成中にエラーが発生しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveStaff = (updatedStaff: Person) => {
    if (!initialData) return;
    const updatedPeople = initialData.people.map(p => 
      p.id === updatedStaff.id ? updatedStaff : p
    );
    setInitialData({ ...initialData, people: updatedPeople });
    setEditingStaff(null);
  };


  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">ローディング中...</div>;
  }

  if (!initialData) {
    return <div className="min-h-screen flex items-center justify-center">{errorMessage || "データを読み込めませんでした。"}</div>;
  }

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">シフト作成ツール v4</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">スタッフ一覧</h2>
          <div className="space-y-2">
            {initialData.people.map(person => (
              <div
                key={person.id}
                onClick={() => setSelectedStaff(person.id)}
                onDoubleClick={() => setEditingStaff(person)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedStaff === person.id ? 'bg-blue-500 text-white shadow-lg' : 'bg-white hover:bg-gray-100'
                }`}
              >
                {person.id} {selectedStaff === person.id && '(選択中)'}
              </div>
            ))}
          </div>
           <p className="text-sm text-gray-500 mt-2">※ダブルクリックでスタッフ情報を編集できます。</p>
        </div>

        <div className="md:col-span-3">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={handleGenerateShift}
              disabled={isGenerating}
              className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isGenerating ? '作成中...' : 'シフトを作成する'}
            </button>
            
            <div className="mt-4 text-center">
              {errorMessage && <p className="text-red-500 font-semibold">{errorMessage}</p>}
              {shortageInfo.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-yellow-600 mb-2">シフトの問題点:</h3>
                  <ul className="list-disc list-inside text-left">
                    {shortageInfo.map((shortage, i) => (
                      <li key={i} className="text-yellow-700">
                        {initialData.month}月{shortage.date}日 {shortage.time_range}: {shortage.shortage_count}人不足
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generatedShifts && shortageInfo.length === 0 && !errorMessage && (
                <p className="text-green-600 font-bold text-xl">✓ 全ての条件を満たしました！</p>
              )}
            </div>
          </div>

          <Calendar
            year={initialData.year}
            month={initialData.month}
            daysInMonth={initialData.days}
            firstDayOfWeek={initialData.weekdayOfDay1}
            wishOffs={wishOffs}
            selectedStaff={selectedStaff}
            onDayClick={handleDayClick}
            generatedShifts={generatedShifts}
          />
        </div>
      </div>
      
      {editingStaff && (
        <StaffEditModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={handleSaveStaff}
        />
      )}
    </main>
  );
}
