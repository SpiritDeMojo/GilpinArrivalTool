import { useState, useMemo, useEffect, useCallback } from 'react';
import { Guest, Flag, FilterType, ArrivalSession, RefinementField } from '../types';
import { PDFService } from '../services/pdfService';
import { GeminiService } from '../services/geminiService';
import { ExcelService } from '../services/excelService';
import { BATCH_SIZE } from '../constants';

export const useGuestManager = (initialFlags: Flag[]) => {
  // 1. Initialize State from LocalStorage
  const [sessions, setSessions] = useState<ArrivalSession[]>(() => {
    try {
        const saved = localStorage.getItem('gilpin_sessions_v5');
        return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('gilpin_active_id_v5') || "";
  });

  // 2. Computed Current State
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
    today.setHours(0,0,0,0);
    return fileDate < today;
  }, [activeSession]);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  // 3. Persistence
  useEffect(() => {
    localStorage.setItem('gilpin_sessions_v5', JSON.stringify(sessions));
    if (activeSessionId) {
        localStorage.setItem('gilpin_active_id_v5', activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // 4. Actions
  
  // FIX: Robust Delete Logic with focus switching
  const deleteSession = (idToDelete: string) => {
    const sessionIndex = sessions.findIndex(s => s.id === idToDelete);
    if (sessionIndex === -1) return;

    const newSessions = sessions.filter(s => s.id !== idToDelete);
    
    // If we are deleting the currently active session, we must switch focus
    if (idToDelete === activeSessionId) {
        if (newSessions.length > 0) {
            // Try to go to the left, otherwise go to the first one
            const newIndex = sessionIndex > 0 ? sessionIndex - 1 : 0;
            setActiveSessionId(newSessions[newIndex].id);
        } else {
            // If deleting the last one, create a fresh manual session automatically
            const newId = `MAN-${Date.now()}`;
            newSessions.push({
                id: newId,
                label: `New List ${new Date().toLocaleDateString('en-GB')}`,
                dateObj: new Date().toISOString(),
                guests: [],
                lastModified: Date.now()
            });
            setActiveSessionId(newId);
        }
    }
    setSessions(newSessions);
  };

  const createNewSession = () => {
    const id = `MAN-${Date.now()}`;
    const newSession: ArrivalSession = {
        id,
        label: `New List ${new Date().toLocaleDateString('en-GB')}`,
        dateObj: new Date().toISOString(),
        guests: [],
        lastModified: Date.now()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(id);
  };

  // FIX: Robust Upload Logic (Prevent Duplicates and normalize IDs)
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgressMsg("ANALYSING ARRIVALS...");
    try {
      const result = await PDFService.parse(file, initialFlags);
      const sessionId = result.arrivalDateStr.trim(); // Normalize ID

      setSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === sessionId);
        
        const newSessionData: ArrivalSession = {
            id: sessionId,
            label: result.arrivalDateStr,
            dateObj: result.arrivalDateObj ? result.arrivalDateObj.toISOString() : new Date().toISOString(),
            guests: result.guests,
            lastModified: Date.now()
        };

        if (existingIdx >= 0) {
            // Update existing session
            const updated = [...prev];
            updated[existingIdx] = newSessionData;
            return updated;
        } else {
            // Add new and sort by date chronological order
            const newList = [...prev, newSessionData];
            return newList.sort((a, b) => new Date(a.dateObj).getTime() - new Date(b.dateObj).getTime());
        }
      });
      
      setActiveSessionId(sessionId); // Switch focus to the newly uploaded/updated session
    } catch (err) {
      console.error(err);
      alert("Error parsing PDF. Please ensure it is a valid Gilpin Arrival List.");
    } finally {
      setIsProcessing(false);
    }
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
        id, 
        room: "TBD", 
        name: "New Guest", 
        car: "", 
        ll: "No", 
        eta: "14:00", 
        duration: "1", 
        facilities: "", 
        prefillNotes: "", 
        inRoomItems: "", 
        preferences: "", 
        rawHtml: "Manual Entry", 
        isManual: true 
    };
    
    if (sessions.length === 0 || !activeSessionId) {
        const newId = `MAN-${Date.now()}`;
        const newSession: ArrivalSession = { 
            id: newId, 
            label: "Manual List", 
            dateObj: new Date().toISOString(), 
            guests: [g], 
            lastModified: Date.now() 
        };
        setSessions([newSession]);
        setActiveSessionId(newId);
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
    } finally { setIsProcessing(false); }
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