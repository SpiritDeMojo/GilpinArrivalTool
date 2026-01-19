import { useState, useMemo, useCallback } from 'react';
import { Guest, FilterType, Flag, RefinementField } from '../types';
import { PDFService } from '../services/pdfService';
import { GeminiService } from '../services/geminiService';
import { ExcelService } from '../services/excelService';
import { BATCH_SIZE } from '../constants';

export const useGuestManager = (initialFlags: Flag[]) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [arrivalDateStr, setArrivalDateStr] = useState<string>(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const [isOldFile, setIsOldFile] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgressMsg("DECRYPTING ARRIVALS STREAM...");
    try {
      await new Promise(r => setTimeout(r, 1000));
      const result = await PDFService.parse(file, initialFlags);
      setGuests(result.guests);
      setArrivalDateStr(result.arrivalDateStr);
      const today = new Date(); today.setHours(0,0,0,0);
      if (result.arrivalDateObj) {
        const fileDate = new Date(result.arrivalDateObj); fileDate.setHours(0,0,0,0);
        setIsOldFile(fileDate < today);
      }
    } catch (err) {
      console.error(err);
      alert("Extraction Error: Invalid Gilpin PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    setProgressMsg("REFINING STRATEGIC INTELLIGENCE...");
    const refinementFields: RefinementField[] = ['notes', 'facilities', 'inRoomItems', 'preferences', 'packages', 'history'];
    const validGuests = guests.filter(g => g.id && !g.id.toString().startsWith('MAN-'));
    const chunks: Guest[][] = [];
    for (let i = 0; i < validGuests.length; i += BATCH_SIZE) chunks.push(validGuests.slice(i, i + BATCH_SIZE));
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatch = chunks[i];
        setProgressMsg(`AUDITING INTEL: ${i + 1}/${chunks.length}...`);
        const refinements = await GeminiService.refineGuestBatch(currentBatch, refinementFields);
        if (refinements) {
          setGuests(prev => {
            const next = [...prev];
            currentBatch.forEach((guest, index) => {
              const ref = refinements[index];
              if (ref) {
                const idx = next.findIndex(g => g.id === guest.id);
                if (idx !== -1) next[idx] = { ...next[idx], prefillNotes: ref.notes, facilities: ref.facilities, inRoomItems: ref.inRoomItems, preferences: ref.preferences, packageName: ref.packages, ll: ref.history };
              }
            });
            return next;
          });
        }
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => setGuests(p => p.map(g => g.id === id ? { ...g, ...updates } : g)), []);
  const deleteGuest = useCallback((id: string) => setGuests(p => p.filter(g => g.id !== id)), []);
  const addManual = () => {
    const g: Guest = { id: "MAN-" + Date.now(), room: "TBD", name: "New Guest", car: "", ll: "No", eta: "14:00", duration: "1", facilities: "", prefillNotes: "", inRoomItems: "", preferences: "", rawHtml: "Manual", isManual: true };
    setGuests(p => [g, ...p]);
  };

  const filteredGuests = useMemo(() => guests.filter(g => {
    if (activeFilter === 'all') return true;
    const rNum = parseInt(g.room.split(' ')[0]);
    if (activeFilter === 'main') return rNum > 0 && rNum <= 31;
    if (activeFilter === 'lake') return rNum >= 51 && rNum <= 60;
    if (activeFilter === 'vip') return g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP') || g.packageName === 'POB_STAFF';
    if (activeFilter === 'allergy') return ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e));
    if (activeFilter === 'return') return g.ll.toLowerCase().includes('yes');
    return true;
  }), [guests, activeFilter]);

  const onExcelExport = () => ExcelService.export(guests);

  return {
    guests,
    filteredGuests,
    arrivalDateStr,
    isOldFile,
    activeFilter,
    setActiveFilter,
    isProcessing,
    setIsProcessing,
    progressMsg,
    setProgressMsg,
    handleFileUpload,
    handleAIRefine,
    updateGuest,
    deleteGuest,
    addManual,
    onExcelExport
  };
};