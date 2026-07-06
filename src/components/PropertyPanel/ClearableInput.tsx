import { X } from 'lucide-react';

interface ClearableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  rows?: number;
  isTextarea?: boolean;
}

export function ClearableInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  rows,
  isTextarea = false,
}: ClearableInputProps) {
  const handleClear = () => {
    onChange('');
  };

  if (isTextarea) {
    return (
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            title="Clear"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          title="Clear"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
