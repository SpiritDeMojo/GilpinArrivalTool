import { useState, useMemo, useEffect } from 'react';
import { Guest, Flag, FilterType, ArrivalSession } from '../types';
import { PDFService } from '../services/pdfService';
import { GeminiService } from '../services/geminiService';
import { ExcelService } from '../services/excelService';
import { BATCH_SIZE } from '../constants';

export const useGuestManager = (initialFlags: Flag[]) => {
  // 1. Initialize
  const [sessions, setSessions] = useState<ArrivalSession[]>(() => {
    try {
        const saved = localStorage.getItem('gilpin_sessions_v5');
        return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('gilpin_active_id_v5') || "";
  });

  // Ensure initial session
  useEffect(() => {
    if (sessions.length === 0) {
        const id = `MAN-${Date.now()}`;
        setSessions([{ 
            id, label: "New List", dateObj: new Date().toISOString(), 
            guests: [], lastModified: Date.now() 
        }]);
        setActiveSessionId(id);
    }
  }, []);

  // 2. Computed
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const guests = activeSession ? activeSession.guests : [];
  const arrivalDateStr = activeSession ? (activeSession.label || activeSession.id) : "No Selection";
  
  const isOldFile = useMemo(() => {
    if (!activeSession?.dateObj) return false;
    const fileDate = new Date(activeSession.dateObj);
    const today = new Date(); today.setHours(0,0,0,0);
    return fileDate < today;
  }, [activeSession]);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  // 3. Persist
  useEffect(() => {
    if (sessions.length > 0) {
        localStorage.setItem('gilpin_sessions_v5', JSON.stringify(sessions));
        localStorage.setItem('gilpin_active_id_v5', activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // 4. Actions
  
  // FIX: Synchronous Delete Calculation
  const deleteSession = (idToDelete: string) => {
    // Calculate NEXT state immediately
    let nextSessions = sessions.filter(s => s.id !== idToDelete);
    let nextActiveId = activeSessionId;

    if (nextSessions.length === 0) {
        // If empty, reset to fresh manual
        const newId = `MAN-${Date.now()}`;
        nextSessions = [{ 
            id: newId, label: "New List", dateObj: new Date().toISOString(), 
            guests: [], lastModified: Date.now() 
        }];
        nextActiveId = newId;
    } else if (idToDelete === activeSessionId) {
        // If we deleted the active one, find neighbor
        const deletedIndex = sessions.findIndex(s => s.id === idToDelete);
        const newIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
        nextActiveId = nextSessions[newIndex].id;
    }

    // Apply updates
    setSessions(nextSessions);
    setActiveSessionId(nextActiveId);
  };

  const createNewSession = () => {
    const id = `MAN-${Date.now()}`;
    setSessions(prev => [...prev, {
        id, label: `New List ${new Date().toLocaleDateString('en-GB')}`,
        dateObj: new Date().toISOString(), guests: []
    }]);
    setActiveSessionId(id);
  };

  // FIX: Smart Upload (Overwrite empty tabs)
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgressMsg("ANALYSING FILE...");
    try {
      const result = await PDFService.parse(file, initialFlags);
      const sessionId = result.arrivalDateStr.trim();

      setSessions(prev => {
        // Check 1: Do we already have this date?
        const existingIdx = prev.findIndex(s => s.id === sessionId);
        
        const newSessionData: ArrivalSession = {
            id: sessionId,
            label: result.arrivalDateStr,
            dateObj: result.arrivalDateObj ? result.arrivalDateObj.toISOString() : new Date().toISOString(),
            guests: result.guests,
            lastModified: Date.now()
        };

        if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = newSessionData;
            return updated;
        }

        // Check 2: Is the ONLY existing tab an empty "New List"?
        if (prev.length === 1 && prev[0].guests.length === 0 && prev[0].id.startsWith("MAN-")) {
            return [newSessionData]; // REPLACE IT
        }

        // Check 3: Add new tab
        const newList = [...prev, newSessionData];
        return newList.sort((a, b) => new Date(a.dateObj).getTime() - new Date(b.dateObj).getTime());
      });
      
      setActiveSessionId(sessionId);
    } catch (err) {
      console.error(err);
      alert("Error parsing PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to update guests in active session
  const updateActiveSessionGuests = (newGuests: Guest[]) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, guests: newGuests } : s));
  };

  const updateGuest = (id: string, updates: Partial<Guest>) => {
    updateActiveSessionGuests(guests.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const deleteGuest = (id: string) => {
    updateActiveSessionGuests(guests.filter(g => g.id !== id));
  };

  const addManual = () => {
    const id = "MAN-" + Date.now();
    const g: Guest = { id, room: "TBD", name: "New Guest", car: "", ll: "No", eta: "14:00", duration: "1", facilities: "", prefillNotes: "", inRoomItems: "", preferences: "", rawHtml: "Manual", isManual: true };
    updateActiveSessionGuests([g, ...guests]);
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    setProgressMsg("REFINING DATA...");
    const batch = guests;
    const chunks = [];
    for (let i = 0; i < batch.length; i += BATCH_SIZE) chunks.push(batch.slice(i, i + BATCH_SIZE));

    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatch = chunks[i];
        setProgressMsg(`AUDITING: ${i + 1}/${chunks.length}...`);
        const refinements = await GeminiService.refineGuestBatch(currentBatch, ['notes', 'facilities']);
        if (refinements) {
            setSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                const updatedGuests = [...s.guests];
                currentBatch.forEach((original, idx) => {
                    const ref = refinements[idx];
                    if (ref) {
                        const gIndex = updatedGuests.findIndex(g => g.id === original.id);
                        if (gIndex !== -1) {
                            updatedGuests[gIndex] = { ...updatedGuests[gIndex], prefillNotes: ref.notes, facilities: ref.facilities, inRoomItems: ref.inRoomItems, preferences: ref.preferences, packageName: ref.packages, ll: ref.history };
                        }
                    }
                });
                return { ...s, guests: updatedGuests };
            }));
        }
        await new Promise(r => setTimeout(r, 500));
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