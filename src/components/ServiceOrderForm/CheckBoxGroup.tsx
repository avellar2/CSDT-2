"use client";

import { ServiceOrderFormData } from '@/utils/types';
import React from 'react';

interface CheckboxGroupProps {
  label: string;
  name: keyof ServiceOrderFormData;
  options: string[];
  onChange: (name: keyof ServiceOrderFormData, value: string) => void;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, name, options, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-gray-400">{label}</label>
      {options.map(option => (
        <label key={option} className="flex items-center space-x-2">
          <input type="checkbox" value={option} onChange={handleChange} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
};

export default CheckboxGroup;