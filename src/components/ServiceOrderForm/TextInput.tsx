import React from 'react';

interface TextInputProps {
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  Icon: React.ComponentType<{ size: number; className: string }>;
  value: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, name, onChange, required, Icon, value }) => {
  return (
    <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded">
      <Icon size={24} className="text-gray-400" />
      <div className="flex flex-col w-full">
        <label className="text-gray-400">{label}</label>
        <input
          type="text"
          name={name}
          onChange={onChange}
          className="w-full p-2 rounded bg-zinc-900 text-white"
          required={required}
          value={value}
        />
      </div>
    </div>
  );
};

export default TextInput;