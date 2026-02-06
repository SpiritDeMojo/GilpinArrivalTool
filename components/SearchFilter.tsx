import React, { useState, useCallback } from 'react';

interface SearchFilterProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    guestCount?: number;
    filteredCount?: number;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
    value,
    onChange,
    placeholder = "Search guests by name...",
    guestCount = 0,
    filteredCount = 0
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = useCallback(() => {
        onChange('');
    }, [onChange]);

    const showCount = value.length > 0 && filteredCount !== guestCount;

    return (
        <div className="relative w-full max-w-md">
            <div
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 bg-white/50 dark:bg-white/5 backdrop-blur-lg ${isFocused
                        ? 'border-[#c5a065] shadow-lg shadow-[#c5a065]/10'
                        : 'border-slate-200 dark:border-stone-800 hover:border-[#c5a065]/50'
                    }`}
            >
                {/* Search Icon */}
                <span className="text-lg text-slate-400">🔍</span>

                {/* Input */}
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-slate-400 dark:text-white"
                />

                {/* Result Count Badge */}
                {showCount && (
                    <span className="px-2 py-0.5 rounded-full bg-[#c5a065]/10 text-[#c5a065] text-[10px] font-black uppercase tracking-wider">
                        {filteredCount} found
                    </span>
                )}

                {/* Clear Button */}
                {value && (
                    <button
                        onClick={handleClear}
                        className="w-6 h-6 rounded-full bg-slate-200 dark:bg-stone-700 hover:bg-slate-300 dark:hover:bg-stone-600 flex items-center justify-center transition-colors"
                    >
                        <span className="text-xs text-slate-600 dark:text-slate-300">×</span>
                    </button>
                )}
            </div>

            {/* Keyboard Hint */}
            {isFocused && (
                <div className="absolute -bottom-6 left-0 text-[9px] font-medium text-slate-400 tracking-wide">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-stone-800 font-mono">Esc</kbd> to clear
                </div>
            )}
        </div>
    );
};

export default SearchFilter;
