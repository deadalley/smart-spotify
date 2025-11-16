import { Search } from "lucide-react";

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TableSearch({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: TableSearchProps) {
  return (
    <div className={className}>
      <label className="input bg-base-300 w-full">
        <Search size={14} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </label>
    </div>
  );
}
