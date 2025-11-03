// components/StaffEditModal.tsx
import React, { useState, useEffect } from 'react';

// Define the shape of the staff data
interface Person {
  id: string;
  canWork: string[];
  monthlyMin: number;
  monthlyMax: number;
  weeklyMax: number;
  consecMax: number;
}

// Define the shape of the props this component receives
interface StaffEditModalProps {
  staff: Person;
  onClose: () => void;
  onSave: (updatedStaff: Person) => void;
}

const StaffEditModal: React.FC<StaffEditModalProps> = ({ staff, onClose, onSave }) => {
  // Use state to manage the form data, initialized with the staff prop
  const [formData, setFormData] = useState({
    ...staff,
    canWork: staff.canWork.join(', '), // Convert array to comma-separated string for input field
  });

  // Effect to update form data if the staff prop changes
  useEffect(() => {
    setFormData({
      ...staff,
      canWork: staff.canWork.join(', '),
    });
  }, [staff]);

  // Handle changes in form inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle the save action
  const handleSave = () => {
    // Prepare the data to be saved
    const updatedStaff: Person = {
      ...formData,
      // Convert numeric string inputs back to numbers
      monthlyMin: Number(formData.monthlyMin) || 0,
      monthlyMax: Number(formData.monthlyMax) || 0,
      weeklyMax: Number(formData.weeklyMax) || 0,
      consecMax: Number(formData.consecMax) || 0,
      // Convert comma-separated string back to an array of strings
      canWork: formData.canWork.split(',').map(s => s.trim()).filter(Boolean),
    };
    onSave(updatedStaff);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">「{staff.id}」さんの情報を編集</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">勤務可能シフト (カンマ区切り)</label>
            <input
              type="text"
              name="canWork"
              value={formData.canWork}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">月間勤務日数 (下限)</label>
              <input
                type="number"
                name="monthlyMin"
                value={formData.monthlyMin}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">月間勤務日数 (上限)</label>
              <input
                type="number"
                name="monthlyMax"
                value={formData.monthlyMax}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">週間勤務日数 (上限)</label>
              <input
                type="number"
                name="weeklyMax"
                value={formData.weeklyMax}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">最大連勤日数</label>
              <input
                type="number"
                name="consecMax"
                value={formData.consecMax}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffEditModal;
