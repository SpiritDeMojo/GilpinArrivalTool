import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guest } from '../types';
import BookingStream from './BookingStream';

interface GuestRowProps {
  guest: Guest;
  isEditMode: boolean;
  onUpdate: (updates: Partial<Guest>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  index?: number;
}

/**
 * MODULAR ARCHITECTURE: highlightRaw (v3.72+)
 * Decoupled logic for strategic intelligence highlighting with strict car reg noise exclusion.
 * @deprecated Use <HighlightedRaw> component instead for XSS-safe rendering.
 */
export const highlightRaw = (text: string): string => {
  if (!text) return "";

  // Sanitize
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 1. ID Badging
  html = html.replace(/(\d{5})/g, '<span class="hl-badge hl-id">$1</span>');

  // 2. VIP & POB Highlighting
  const vips = ["VIP", "DIRECTOR", "CELEBRITY", "OWNER", "CHAIRMAN", "HIGH PROFILE", "PRIDE OF BRITAIN", "POB_STAFF", "POB"];
  vips.forEach(word => {
    const re = new RegExp(`\\b(${word})\\b`, 'gi');
    html = html.replace(re, '<span class="hl-badge hl-vip">$1</span>');
  });

  // 3. Operational Alerts (Diets & Issues)
  const alerts = ["OAT MILK", "SOYA MILK", "NUT FREE", "NO NUT", "ANAPHYLAXIS", "PEANUT", "NUT ALLERGY", "GLUTEN FREE", "GF", "COELIAC", "CELIAC", "DAIRY FREE", "COMPLAINT", "PGI", "ISSUE"];
  alerts.forEach(word => {
    const re = new RegExp(`\\b(${word})\\b`, 'gi');
    html = html.replace(re, '<span class="hl-badge hl-ctx-red">$1</span>');
  });

  // 4. Rate Code Extraction
  const rates = ["CEL_DBB_1", "MAGESC", "MIN", "RO", "BB_1", "BB_2", "BB_3", "COMP", "LHBB", "APR_1_BB", "APR_2_BB", "APR_3_BB", "POB_STAFF", "STAFF"];
  rates.forEach(word => {
    const re = new RegExp(`\\b(${word})\\b`, 'gi');
    html = html.replace(re, '<span class="hl-badge hl-ro">$1</span>');
  });

  // 5. Car Number Plate Parser (v3.72+ Strict Deep Match)
  const plateRegex = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{1,2}\d{1,4}\s?[A-Z]{0,3})\b/gi;
  const exclusions = /^(BB\d|APR|RO|COMP|GS|JS|MR|SL|SS|MAG)/i;

  html = html.replace(plateRegex, (match) => {
    if (match.length < 4 || match.match(exclusions)) return match;
    return `<span class="hl-badge hl-plate">${match.toUpperCase()}</span>`;
  });

  // 6. Luxury Symbols & Updated Renames
  html = html.replace(/⭐/g, '<span class="text-yellow-500 font-bold">⭐</span>');
  html = html.replace(/⚠️/g, '<span class="text-rose-600 font-bold">⚠️</span>');
  html = html.replace(/Comp Upgrade: Guest Unaware/g, '<span class="hl-badge hl-vip">Comp Upgrade: Guest Unaware</span>');

  return html;
};

/**
 * XSS-safe React component for highlighted raw text.
 * Renders React elements instead of injecting raw HTML via dangerouslySetInnerHTML.
 */
interface HighlightRule {
  pattern: RegExp;
  className: string;
  transform?: (match: string) => string;
}

const HIGHLIGHT_RULES: HighlightRule[] = [
  // VIP keywords
  ...['VIP', 'DIRECTOR', 'CELEBRITY', 'OWNER', 'CHAIRMAN', 'HIGH PROFILE', 'PRIDE OF BRITAIN', 'POB_STAFF', 'POB']
    .map(w => ({ pattern: new RegExp(`\\b(${w})\\b`, 'gi'), className: 'hl-badge hl-vip' })),
  // Alerts
  ...['OAT MILK', 'SOYA MILK', 'NUT FREE', 'NO NUT', 'ANAPHYLAXIS', 'PEANUT', 'NUT ALLERGY', 'GLUTEN FREE', 'GF', 'COELIAC', 'CELIAC', 'DAIRY FREE', 'COMPLAINT', 'PGI', 'ISSUE']
    .map(w => ({ pattern: new RegExp(`\\b(${w})\\b`, 'gi'), className: 'hl-badge hl-ctx-red' })),
  // Rate codes
  ...['CEL_DBB_1', 'MAGESC', 'MIN', 'RO', 'BB_1', 'BB_2', 'BB_3', 'COMP', 'LHBB', 'APR_1_BB', 'APR_2_BB', 'APR_3_BB', 'POB_STAFF', 'STAFF']
    .map(w => ({ pattern: new RegExp(`\\b(${w})\\b`, 'gi'), className: 'hl-badge hl-ro' })),
  // IDs
  { pattern: /(\d{5})/g, className: 'hl-badge hl-id' },
  // Comp Upgrade
  { pattern: /Comp Upgrade: Guest Unaware/g, className: 'hl-badge hl-vip' },
];

export const HighlightedRaw: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Build a combined regex from all rules
  const allPatterns = HIGHLIGHT_RULES.map(r => `(${r.pattern.source})`).join('|');
  const combinedRegex = new RegExp(allPatterns, 'gi');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Find which rule matched
    const matched = match[0];
    let className = 'hl-badge';
    for (const rule of HIGHLIGHT_RULES) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(matched)) {
        className = rule.className;
        break;
      }
    }

    parts.push(<span key={key++} className={className}>{matched}</span>);
    lastIndex = combinedRegex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};

const ResizableTextArea = ({ field, className, value, bold, center, onUpdate }: {
  field: keyof Guest,
  className?: string,
  value: string,
  bold?: boolean,
  center?: boolean,
  onUpdate: (updates: Partial<Guest>) => void
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value || ''}
      onChange={(e) => onUpdate({ [field]: e.target.value })}
      rows={1}
      spellCheck={false}
      className={`w-full bg-transparent resize-none overflow-hidden outline-none px-2 py-1.5 border border-transparent hover:border-slate-300 dark:hover:border-slate-800 focus:border-[#c5a065] rounded-lg transition-all text-slate-900 dark:text-stone-100 ${center ? 'text-center' : ''} ${bold ? 'font-bold' : 'font-medium'} ${className} block leading-tight text-[11px]`}
    />
  );
};

const GuestRow: React.FC<GuestRowProps> = ({
  guest, onUpdate, onDelete, onDuplicate, isExpanded, onToggleExpand, index = 0
}) => {
  const isReturn = guest.ll.toLowerCase().includes('yes');

  return (
    <>
      <motion.tr
        className="group guest-row hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-200 dark:border-stone-800/40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.04, ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number] }}
      >
        <td className="p-1 text-center no-print">
          <div className="flex items-center justify-center gap-1">
            <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 transition-colors font-bold text-xl" title="Delete guest">×</button>
            {onDuplicate && (
              <button onClick={onDuplicate} className="text-slate-300 hover:text-blue-500 transition-colors text-sm" title="Duplicate guest">⧉</button>
            )}
          </div>
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="room" value={guest.room} bold onUpdate={onUpdate} className="uppercase text-[#c5a065] font-black" />
          {guest.previousRoom && (
            <span className="ml-2 text-[8px] font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full" title={`Moved from Room ${guest.previousRoom}`}>
              ← {guest.previousRoom}
            </span>
          )}
        </td>
        <td className="p-1 align-top">
          <div className="flex flex-col">
            <ResizableTextArea field="name" value={guest.name} onUpdate={onUpdate} className="text-slate-950 dark:text-white" />
            {guest.packageName && (
              <span className="text-[8px] font-black bg-[#c5a065]/10 text-[#c5a065] px-1.5 py-0.5 rounded uppercase tracking-widest w-fit ml-2">
                {guest.packageName}
              </span>
            )}
          </div>
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="duration" value={guest.duration} center onUpdate={onUpdate} className="text-blue-600 dark:text-blue-400" />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="car" value={guest.car} onUpdate={onUpdate} className="uppercase font-mono text-indigo-600 dark:text-indigo-400 tracking-wider" />
        </td>
        <td className="p-1 align-top text-center">
          <ResizableTextArea field="ll" value={guest.ll} center onUpdate={onUpdate} className={isReturn ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''} />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="facilities" value={guest.facilities} onUpdate={onUpdate} />
        </td>
        <td className="p-1 align-top text-center">
          <ResizableTextArea field="eta" value={guest.eta} center onUpdate={onUpdate} className="font-bold" />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="prefillNotes" value={guest.prefillNotes} onUpdate={onUpdate} className="italic text-slate-600 dark:text-slate-400" />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="preferences" value={guest.preferences} onUpdate={onUpdate} className="text-indigo-700 dark:text-indigo-300 font-semibold" />
          {guest.aiTags && guest.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-1 px-2 mt-1">
              {guest.aiTags.map((tag, i) => (
                <span key={i} className="text-[7px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-500/20">
                  🏷️ {tag}
                </span>
              ))}
            </div>
          )}
        </td>
      </motion.tr>
      <tr className="no-print">
        <td colSpan={10} className="px-12 py-0">
          <div className="flex items-center gap-2 cursor-pointer py-1.5 text-[9px] font-black uppercase text-[#c5a065] tracking-widest" onClick={onToggleExpand}>
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'inline-block' }}
            >▶</motion.span>
            <span>Booking Stream</span>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                key="booking-stream"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="raw-intel-box p-5 mb-5 rounded-2xl border border-[#c5a065]/20 bg-[#c5a065]/5">
                  <BookingStream guest={guest} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </td>
      </tr>
    </>
  );
};

export default GuestRow;