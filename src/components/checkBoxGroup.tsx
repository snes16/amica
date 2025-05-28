import { useState, useEffect } from "react";
import { clsx } from "clsx";

type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
};

export const CheckBoxGroup = ({ options, selectedValues, onChange, disabled = false }: Props) => {
  const [selected, setSelected] = useState<string[]>(selectedValues);

  useEffect(() => {
    setSelected(selectedValues);
  }, [selectedValues]);

  const toggleValue = (value: string) => {
    if (disabled) return;

    let updated: string[];
    if (selected.includes(value)) {
      updated = selected.filter((v) => v !== value);
    } else {
      updated = [...selected, value];
    }

    setSelected(updated);
    onChange(updated);
  };

  return (
    <div className="flex space-x-2 mt-2">
      {options.map((option) => (
        <button
          key={option.value}
          className={clsx(
            "px-4 py-2 rounded-lg border-2 text-sm font-medium transition",
            selected.includes(option.value) ? "border-indigo-600 bg-indigo-100" : "border-gray-300 bg-white",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200"
          )}
          onClick={() => toggleValue(option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
