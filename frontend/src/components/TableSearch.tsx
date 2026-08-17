import { forwardRef } from "react";
import { Search } from "lucide-react";

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const TableSearch = forwardRef<HTMLInputElement, TableSearchProps>(
  function TableSearch(
    { value, onChange, placeholder = "Search...", className = "", autoFocus = false },
    ref
  ) {
    return (
      <div className={className}>
        <label className="input bg-base-300 w-full">
          <Search size={14} />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
          />
        </label>
      </div>
    );
  }
);
