import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <motion.div
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 bg-white/50 dark:bg-white/5 backdrop-blur-lg ${isFocused
                    ? 'border-[#c5a065] shadow-lg shadow-[#c5a065]/10'
                    : 'border-slate-200 dark:border-stone-800 hover:border-[#c5a065]/50'
                    }`}
                animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                {/* Search Icon — animates on focus */}
                <motion.span
                    className="text-lg text-slate-400"
                    animate={isFocused ? { scale: 1.15, rotate: -10 } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                    🔍
                </motion.span>

                {/* Input */}
                <input
                    id="guest-search"
                    name="guestSearch"
                    autoComplete="off"
                    aria-label="Search guests"
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-slate-400 dark:text-white"
                />

                {/* Result Count Badge — animated pop-in */}
                <AnimatePresence>
                    {showCount && (
                        <motion.span
                            className="px-2 py-0.5 rounded-full bg-[#c5a065]/10 text-[#c5a065] text-[10px] font-black uppercase tracking-wider"
                            initial={{ opacity: 0, scale: 0, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0, x: 10 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        >
                            {filteredCount} found
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Clear Button — animated spring */}
                <AnimatePresence>
                    {value && (
                        <motion.button
                            onClick={handleClear}
                            className="w-6 h-6 rounded-full bg-slate-200 dark:bg-stone-700 hover:bg-slate-300 dark:hover:bg-stone-600 flex items-center justify-center transition-colors"
                            initial={{ opacity: 0, scale: 0, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0, rotate: 90 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                        >
                            <span className="text-xs text-slate-600 dark:text-slate-300">×</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Keyboard Hint — animated */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        className="absolute -bottom-6 left-0 text-[9px] font-medium text-slate-400 tracking-wide"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                    >
                        Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-stone-800 font-mono">Esc</kbd> to clear
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default React.memo(SearchFilter);
