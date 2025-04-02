import React from 'react';
import { IconProps } from 'phosphor-react';

interface SelectInputProps {
  label: string;
  name: string;
  options: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  multiple?: boolean;
  required?: boolean;
  Icon: React.ComponentType<IconProps>;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, name, options, onChange, multiple = false, required = false, Icon }) => {
  return (
    <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded">
      <Icon size={24} className="text-gray-400" />
      <div className="flex flex-col w-full">
        <label className="text-gray-400">{label}</label>
        <select
          name={name}
          onChange={onChange}
          className="w-full p-2 rounded bg-zinc-900 text-white"
          multiple={multiple}
          required={required}
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SelectInput;