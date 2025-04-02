import React from 'react';
import { IconProps } from 'phosphor-react';

interface TextAreaInputProps {
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  Icon: React.ComponentType<IconProps>;
}

const TextAreaInput: React.FC<TextAreaInputProps> = ({ label, name, onChange, required = false, Icon }) => {
  return (
    <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded">
      <Icon size={24} className="text-gray-400" />
      <div className="flex flex-col w-full">
        <label className="text-gray-400">{label}</label>
        <textarea
          name={name}
          onChange={onChange}
          className="w-full p-2 rounded bg-zinc-900 text-white"
          required={required}
        />
      </div>
    </div>
  );
};

export default TextAreaInput;