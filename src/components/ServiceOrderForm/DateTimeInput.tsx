import React from 'react';

interface DateTimeInputProps {
  label: string;
  dateName: string;
  timeName: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  Icon: React.ComponentType<{ size: number; className: string }>;
  dateValue: string;
  timeValue: string;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({ label, dateName, timeName, onDateChange, onTimeChange, required, Icon, dateValue, timeValue }) => {
  return (
    <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded">
      <Icon size={24} className="text-gray-400" />
      <div className="flex flex-col w-full">
        <label className="text-gray-400">{label}</label>
        <div className='flex gap-4 w-1/2'>
          <input
            type="date"
            name={dateName}
            onChange={onDateChange}
            className="w-full p-2 rounded bg-zinc-900 text-white"
            required={required}
            value={dateValue}
          />
          <input
            type="time"
            name={timeName}
            onChange={onTimeChange}
            className="w-full p-2 rounded bg-zinc-900 text-white"
            required={required}
            value={timeValue}
          />
        </div>

      </div>
    </div>
  );
};

export default DateTimeInput;