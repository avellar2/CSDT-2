import React from 'react';
import { IconProps } from 'phosphor-react';

interface FileInputProps {
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
  required?: boolean;
  Icon: React.ComponentType<IconProps>;
}

const FileInput: React.FC<FileInputProps> = ({ label, name, onChange, multiple = false, required = false, Icon }) => {
  return (
    <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded">
      <Icon size={24} className="text-gray-400" />
      <div className="flex flex-col w-full">
        <label className="text-gray-400">{label}</label>
        <input
          type="file"
          name={name}
          onChange={onChange}
          className="w-full p-2 rounded bg-zinc-900 text-white"
          accept="image/*"
          multiple={multiple}
          required={required}
        />
      </div>
    </div>
  );
};

export default FileInput;