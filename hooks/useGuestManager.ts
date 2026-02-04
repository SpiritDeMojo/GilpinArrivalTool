import { useState, useMemo, useEffect, useCallback } from 'react';
import { Guest, Flag, FilterType, RefinementField, ArrivalSession } from '../types';
import { PDFService } from '../services/pdfService';
import { GeminiService } from '../services/geminiService';
import { ExcelService } from '../services/excelService';
import { BATCH_SIZE } from '../constants';

export const useGuestManager = (initialFlags: Flag[]) => {
  // 1. Initialize Sessions from LocalStorage
  const [sessions, setSessions] = useState<ArrivalSession[]>(() => {
    const saved = localStorage.getItem('gilpin_sessions_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('gilpin_active_id_v4') || "";
  });

  // 2. Computed "Current" State
  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId) || (sessions.length > 0 ? sessions[0] : null)
  , [sessions, activeSessionId]);

  const guests = useMemo(() => activeSession?.guests || [], [activeSession]);
  
  const arrivalDateStr = useMemo(() => 
    activeSession?.label || activeSession?.id || "No Selection"
  , [activeSession]);

  const isOldFile = useMemo(() => {
    if (!activeSession?.dateObj) return false;
    const fileDate = new Date(activeSession.dateObj);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return fileDate < today;
  }, [activeSession]);

  // 3. UI State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  // 4. Persistence
  useEffect(() => {
    localStorage.setItem('gilpin_sessions_v4', JSON.stringify(sessions));
    if (activeSessionId) {
      localStorage.setItem('gilpin_active_id_v4', activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // 5. Actions
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgressMsg("ANALYSING ARRIVALS...");
    try {
      const result = await PDFService.parse(file, initialFlags);
      const sessionId = result.arrivalDateStr;

      setSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === sessionId);
        const newSessionData: ArrivalSession = {
          id: sessionId,
          label: result.arrivalDateStr,
          dateObj: result.arrivalDateObj ? result.arrivalDateObj.toISOString() : new Date().toISOString(),
          guests: result.guests,
          lastModified: Date.now()
        };

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newSessionData;
          return updated;
        } else {
          return [...prev, newSessionData].sort((a, b) => 
            new Date(a.dateObj).getTime() - new Date(b.dateObj).getTime()
          );
        }
      });
      
      setActiveSessionId(sessionId);
    } catch (err) {
      console.error(err);
      alert("Error parsing PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const createNewSession = () => {
    const id = `MAN-${Date.now()}`;
    const label = `New List ${new Date().toLocaleDateString('en-GB')}`;
    const newSession: ArrivalSession = { 
      id, 
      label, 
      dateObj: new Date().toISOString(), 
      guests: [],
      lastModified: Date.now()
    };
    setSessions(p => [...p, newSession]);
    setActiveSessionId(id);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (id === activeSessionId) {
        if (filtered.length > 0) setActiveSessionId(filtered[filtered.length - 1].id);
        else setActiveSessionId(""); 
      }
      return filtered;
    });
  };

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { 
        ...s, 
        guests: s.guests.map(g => g.id === id ? { ...g, ...updates } : g),
        lastModified: Date.now()
      };
    }));
  }, [activeSessionId]);

  const deleteGuest = useCallback((id: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { 
        ...s, 
        guests: s.guests.filter(g => g.id !== id),
        lastModified: Date.now()
      };
    }));
  }, [activeSessionId]);

  const addManual = () => {
    const id = "MAN-" + Date.now();
    const g: Guest = { 
        id, room: "TBD", name: "New Guest", car: "", ll: "No", 
        eta: "14:00", duration: "1", facilities: "", prefillNotes: "", 
        inRoomItems: "", preferences: "", rawHtml: "Manual", isManual: true 
    };

    if (!activeSessionId) {
        const sessionId = `MAN-${Date.now()}`;
        const newSession: ArrivalSession = {
            id: sessionId,
            label: "Manual List",
            dateObj: new Date().toISOString(),
            guests: [g],
            lastModified: Date.now()
        };
        setSessions([newSession]);
        setActiveSessionId(sessionId);
    } else {
        setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            return { ...s, guests: [g, ...s.guests], lastModified: Date.now() };
        }));
    }
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    setProgressMsg("REFINING INTEL...");
    
    const batch = guests; 
    const chunks = [];
    for (let i = 0; i < batch.length; i += BATCH_SIZE) chunks.push(batch.slice(i, i + BATCH_SIZE));

    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatch = chunks[i];
        setProgressMsg(`AUDITING: ${i + 1}/${chunks.length}...`);
        const refinements = await GeminiService.refineGuestBatch(currentBatch, ['notes', 'facilities', 'inRoomItems', 'preferences', 'packages', 'history']);
        
        if (refinements) {
          setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const updatedGuests = [...s.guests];
            currentBatch.forEach((original, idx) => {
               const ref = refinements[idx];
               if (ref) {
                 const gIndex = updatedGuests.findIndex(g => g.id === original.id);
                 if (gIndex !== -1) {
                   updatedGuests[gIndex] = { 
                     ...updatedGuests[gIndex], 
                     prefillNotes: ref.notes, 
                     facilities: ref.facilities,
                     inRoomItems: ref.inRoomItems,
                     preferences: ref.preferences,
                     packageName: ref.packages,
                     ll: ref.history
                   };
                 }
               }
            });
            return { ...s, guests: updatedGuests, lastModified: Date.now() };
          }));
        }
        await new Promise(r => setTimeout(r, 600));
      }
    } finally {
      setIsProcessing(false);
    }
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

  return {
    sessions, activeSessionId, switchSession: setActiveSessionId, deleteSession, createNewSession,
    guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
    isProcessing, progressMsg, handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual,
    onExcelExport: () => ExcelService.export(guests)
  };
};
