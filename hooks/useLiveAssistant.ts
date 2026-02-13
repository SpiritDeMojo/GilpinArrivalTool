import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Guest, RoomNote } from '../types';

// --- AUDIO PROTOCOLS ---
// Custom base64 decoding implementation as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// Custom base64 encoding implementation as per guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Custom PCM decoding implementation as per guidelines
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export interface Transcription {
  text: string;
  role: 'user' | 'model';
}

export interface UseLiveAssistantOptions {
  guests: Guest[];
  onAddRoomNote?: (guestId: string, note: Omit<RoomNote, 'id' | 'timestamp'>) => void;
  onUpdateGuest?: (guestId: string, updates: Partial<Guest>) => void;
}

export const useLiveAssistant = ({ guests, onAddRoomNote, onUpdateGuest }: UseLiveAssistantOptions) => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [interimInput, setInterimInput] = useState("");
  const [interimOutput, setInterimOutput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMic, setHasMic] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micEnabledRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    micEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  // Parse AI output for note actions (Room Notes — HK/Maintenance section)
  const parseNoteActions = useCallback((text: string) => {
    const actionRegex = /\[ACTION:ADD_NOTE\](\{[^}]+\})/g;
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const noteData = JSON.parse(match[1]);
        if (noteData.room && noteData.message && onAddRoomNote) {
          // Find guest by room number
          const guest = guests.find(g => {
            const roomNum = g.room.replace(/\D/g, '');
            const targetNum = String(noteData.room).replace(/\D/g, '');
            return roomNum === targetNum;
          });
          if (guest) {
            onAddRoomNote(guest.id, {
              author: 'AI Assistant',
              department: noteData.department || 'frontofhouse',
              priority: noteData.priority || 'medium',
              category: noteData.category || 'request',
              message: noteData.message,
            });
          }
        }
      } catch (e) {
        console.warn('Failed to parse AI note action:', e);
      }
    }
  }, [guests, onAddRoomNote]);

  // Parse AI output for arrivals-table note actions (appends to preferences / Intelligence column)
  const parseArrivalNoteActions = useCallback((text: string) => {
    const actionRegex = /\[ACTION:ADD_ARRIVAL_NOTE\](\{[^}]+\})/g;
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const noteData = JSON.parse(match[1]);
        if (noteData.room && noteData.message && onUpdateGuest) {
          const guest = guests.find(g => {
            const roomNum = g.room.replace(/\D/g, '');
            const targetNum = String(noteData.room).replace(/\D/g, '');
            return roomNum === targetNum;
          });
          if (guest) {
            // Route based on target field
            const field = noteData.field === 'notes' ? 'prefillNotes' : 'preferences';
            const existing = (field === 'prefillNotes' ? guest.prefillNotes : guest.preferences) || '';
            const separator = existing.trim() ? ' | ' : '';
            onUpdateGuest(guest.id, {
              [field]: existing + separator + noteData.message
            } as Partial<Guest>);
          }
        }
      } catch (e) {
        console.warn('Failed to parse AI arrival note action:', e);
      }
    }
  }, [guests, onUpdateGuest]);

  // Parse AI output for HK status actions
  const parseHKActions = useCallback((text: string) => {
    const actionRegex = /\[ACTION:UPDATE_HK\](\{[^}]+\})/g;
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data.room && data.status && onUpdateGuest) {
          const guest = guests.find(g => {
            const roomNum = g.room.replace(/\D/g, '');
            const targetNum = String(data.room).replace(/\D/g, '');
            return roomNum === targetNum;
          });
          if (guest) {
            // Map status words to valid HKStatus enum values
            const statusMap: Record<string, string> = {
              'cleaned': 'cleaned',
              'clean': 'cleaned',
              'inspected': 'inspected',
              'inspect': 'inspected',
              'complete': 'complete',
              'in_progress': 'in_progress',
              'pending': 'pending',
            };
            const hkStatus = statusMap[data.status.toLowerCase()] || data.status;
            onUpdateGuest(guest.id, { hkStatus: hkStatus as any });
          }
        }
      } catch (e) {
        console.warn('Failed to parse AI HK action:', e);
      }
    }
  }, [guests, onUpdateGuest]);

  // Parse AI output for guest update actions
  const parseGuestActions = useCallback((text: string) => {
    const actionRegex = /\[ACTION:UPDATE_GUEST\](\{[^}]+\})/g;
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data.room && data.field && data.value && onUpdateGuest) {
          const guest = guests.find(g => {
            const roomNum = g.room.replace(/\D/g, '');
            const targetNum = String(data.room).replace(/\D/g, '');
            return roomNum === targetNum;
          });
          if (guest) {
            onUpdateGuest(guest.id, { [data.field]: data.value } as Partial<Guest>);
          }
        }
      } catch (e) {
        console.warn('Failed to parse AI guest action:', e);
      }
    }
  }, [guests, onUpdateGuest]);

  const clearHistory = () => setTranscriptions([]);

  const disconnect = () => {
    // 1. Explicitly stop all microphone stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 2. Properly close the audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
      audioContextRef.current = null;
    }

    // 3. Close the Live Session
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    // 4. Stop all scheduled audio playback sources
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) { }
    });
    sourcesRef.current.clear();

    // 5. Reset UI State (Preserves transcriptions for persistence)
    setIsLiveActive(false);
    setIsMicEnabled(false);
    setInterimInput("");
    setInterimOutput("");
  };

  const startLiveAssistant = async () => {
    if (isLiveActive) {
      disconnect();
      return;
    }

    setErrorMessage(null);

    try {
      // Fetch API key from server at runtime (not baked into JS bundle)
      let apiKey: string;
      try {
        const tokenRes = await fetch('/api/live-token');
        if (!tokenRes.ok) {
          setErrorMessage('AI Assistant unavailable — API key not configured on server.');
          return;
        }
        const tokenData = await tokenRes.json();
        apiKey = tokenData.apiKey;
      } catch {
        setErrorMessage('AI Assistant unavailable locally. Deploy to Vercel to use Live AI.');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const guestsBrief = guests.map(g => {
        const rNum = parseInt(g.room.split(' ')[0]);
        const location = (rNum >= 51 && rNum <= 58) ? 'Lake House' : 'Main Hotel';
        return `--- GUEST START ---
[CLEAN DATA]
ROOM: ${g.room}
LOCATION: ${location}
NAME: ${g.name}
ETA: ${g.eta}
CAR: ${g.car || 'Not set'}
DURATION: ${g.duration} nights
ROOM_TYPE: ${g.roomType || 'Unknown'}
ADULTS: ${(g as any).adults || '?'} CHILDREN: ${(g as any).children || 0} INFANTS: ${(g as any).infants || 0}
NOTES: ${g.prefillNotes}
STRATEGY: ${g.preferences}
FACILITIES: ${g.facilities || 'None'}
PACKAGE: ${(g as any).package || 'None'}
IN_ROOM_ITEMS: ${(g as any).inRoomItems || 'None'}
HK_NOTES: ${(g as any).hkNotes || 'None'}
FLAGS: ${(g as any).flags?.map((f: any) => f.name).join(', ') || 'None'}
HK_STATUS: ${g.hkStatus || 'pending'}
GUEST_STATUS: ${g.guestStatus || 'pre_arrival'}
MAINT_STATUS: ${g.maintenanceStatus || 'not_started'}
TURNDOWN: ${(g as any).turndownStatus || 'pending'}
DINNER_TIME: ${(g as any).dinnerTime || 'Not set'}
DINNER_VENUE: ${(g as any).dinnerVenue || 'Not set'}
IN_ROOM_DELIVERED: ${g.inRoomDelivered ? 'Yes' : 'No'}

[RAW_STREAM_DATA]
${g.rawHtml}
--- GUEST END ---`;
      }).join('\n\n');

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await outputCtx.resume();
      audioContextRef.current = outputCtx;

      // Mic is optional — works over HTTPS/localhost only
      let stream: MediaStream | null = null;
      let inputCtx: AudioContext | null = null;
      const hasMicAccess = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      if (hasMicAccess) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
          mediaStreamRef.current = stream;
          inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          await inputCtx.resume();
          setHasMic(true);
        } catch (micErr: any) {
          console.warn('Mic access denied or unavailable, starting in text-only mode:', micErr);
          stream = null;
          inputCtx = null;
        }
      } else {
        console.info('Microphone API unavailable (non-HTTPS context). Starting in text-only mode.');
      }

      let currentInput = "";
      let currentOutput = "";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: async () => {
            // Clear any previous error — we're connected
            setErrorMessage(null);
            if (stream && inputCtx) {
              const source = inputCtx.createMediaStreamSource(stream);

              // Use AudioWorklet (modern) with ScriptProcessor fallback (legacy)
              try {
                await inputCtx.audioWorklet.addModule('/mic-processor.js');
                const workletNode = new AudioWorkletNode(inputCtx, 'mic-processor');
                workletNode.port.onmessage = (e) => {
                  if (!micEnabledRef.current) return;
                  sessionPromise.then(s => s.sendRealtimeInput({
                    media: {
                      data: encode(new Uint8Array(e.data)),
                      mimeType: 'audio/pcm;rate=16000'
                    }
                  }));
                };
                source.connect(workletNode);
                workletNode.connect(inputCtx.destination);
              } catch {
                // Fallback: ScriptProcessorNode (deprecated but widely supported)
                console.warn('AudioWorklet unavailable, falling back to ScriptProcessorNode');
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                  if (!micEnabledRef.current) return;
                  const inputData = e.inputBuffer.getChannelData(0);
                  const int16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;

                  sessionPromise.then(s => s.sendRealtimeInput({
                    media: {
                      data: encode(new Uint8Array(int16.buffer)),
                      mimeType: 'audio/pcm;rate=16000'
                    }
                  }));
                };
                source.connect(processor);
                processor.connect(inputCtx.destination);
              }
            }
            setIsLiveActive(true);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              if (outputCtx.state === 'suspended') await outputCtx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.inputTranscription) {
              currentInput += msg.serverContent.inputTranscription.text;
              setInterimInput(currentInput);
            }
            if (msg.serverContent?.outputTranscription) {
              currentOutput += msg.serverContent.outputTranscription.text;
              setInterimOutput(currentOutput);
            }
            if (msg.serverContent?.turnComplete) {
              if (currentInput) setTranscriptions(p => [...p, { text: currentInput, role: 'user' }]);
              if (currentOutput) {
                // Strip all action blocks from displayed text
                const displayText = currentOutput
                  .replace(/\[ACTION:ADD_NOTE\]\{[^}]+\}/g, '')
                  .replace(/\[ACTION:ADD_ARRIVAL_NOTE\]\{[^}]+\}/g, '')
                  .replace(/\[ACTION:UPDATE_HK\]\{[^}]+\}/g, '')
                  .replace(/\[ACTION:UPDATE_GUEST\]\{[^}]+\}/g, '')
                  .trim();
                if (displayText) setTranscriptions(p => [...p, { text: displayText, role: 'model' }]);
                // Parse and execute all actions
                parseNoteActions(currentOutput);
                parseArrivalNoteActions(currentOutput);
                parseHKActions(currentOutput);
                parseGuestActions(currentOutput);
              }
              currentInput = ""; currentOutput = ""; setInterimInput(""); setInterimOutput("");
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) { }
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: (e: any) => {
            console.warn('Live AI session closed:', e);
            if (isLiveActive) {
              setErrorMessage('Session ended unexpectedly.');
            }
            disconnect();
          },
          onerror: (e: any) => {
            console.error('Live AI session error:', e);
            setErrorMessage(`Connection error: ${e?.message || e?.toString?.() || 'Unknown error'}`);
            disconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `**ROLE:**
You are the "Gilpin Guest Experience Partner," a warm, intelligent, and highly capable assistant to the Arrival Team. You are not a robot; you are a helpful colleague.

**YOUR AUTHORITY PROTOCOL (DATA HIERARCHY):**
You operate on a strict hierarchy to ensure the team can trust the edited data:
1. **[CLEAN DATA - VERIFIED TRUTH]**: This is the data that has been audited and edited by the team. **THIS IS YOUR SINGLE SOURCE OF TRUTH.** You must trust it implicitly. If the Clean Data says "No Allergies," do not second-guess it.
2. **[RAW_STREAM_DATA]**: This is the original messy booking text. **Rule:** Access this *only* if the user specifically asks for a "Deep Dive," "Raw Read," or asks "What exactly did the booking say?" Do not use it to contradict the Clean Data in standard briefings.

**YOUR STYLE:**
- **Tone:** Friendly, welcoming, and professional. Use phrases like "I'd be happy to check that," "Here is the outlook," or "Good morning, team."
- **Detail:** Do not be afraid to give a full, comprehensive answer. If a topic requires explanation, take the space you need. Do not cut yourself short.

**CORE TASKS:**

**1. Morning Briefing Mode**
   When asked for a briefing (e.g., "Start the day," "Who is arriving?"), provide a friendly, structured narrative based **strictly** on [CLEAN DATA]:
   - **Warm Welcome:** (e.g., "Good morning! Here is the outlook for today...")
   - **The Breakdown:** Summarize arrivals by location (Main Hotel vs. Lake House).
   - **Safety First:** Gently but clearly highlight *every* allergy or alert listed in the [CLEAN DATA] 'NOTES'. Treat these as absolute facts.
   - **Logistics Check:** Point out empty fields in the Clean Data (e.g., "I noticed we are still missing an ETA for Room 5...").
   - **Stay Analysis:** Highlight guests staying >1 night using the DURATION field (e.g., "The Smiths in Room 4 are with us for 3 nights").

**2. The "Deep Dive" (On-Demand Investigation)**
   - **Trigger:** Only when a user asks, "Check the raw stream for Room X," or "Does the raw text mention a phone number?"
   - **Action:** You may now read the [RAW_STREAM_DATA] verbatim or scan it for specific details (email, phone, specific phrasing) that might have been left out of the Clean Data summary.
   - **Note:** Do NOT flag discrepancies unless asked. (e.g., Don't say "The clean data says X but raw says Y." Just answer the question asked).

**3. General/Live Operations**
   - **Duration:** Answer "How long is [Guest] staying?" using the DURATION field.
   - **Traffic Control:** If asked "Who is arriving next?", order guests chronologically by the ETA in [CLEAN DATA]. 

**4. Note-Taking Mode**
   When the user says things like "Note for Room X: ...", "Room X requested ...", "Add a note for Room X ...", or "Room X needs ...":
   - **FIRST, ask the user:** "Where would you like this note displayed? 1) Arrivals Intelligence, 2) Arrivals Notes, 3) Housekeeping notes, or 4) Maintenance notes?"
   - Wait for the user's answer before placing the note.
   - **If the user says "Intelligence" or "arrivals" or "1" (DEFAULT):**
     Confirm, then output: [ACTION:ADD_ARRIVAL_NOTE]{"room":"5","message":"Guest has nut allergy","field":"intelligence"}
     This adds the note to the Intelligence column on the arrivals table.
   - **If the user says "Notes" or "2":**
     Confirm, then output: [ACTION:ADD_ARRIVAL_NOTE]{"room":"5","message":"Guest has nut allergy","field":"notes"}
     This adds the note to the Notes column on the arrivals table.
   - **If the user says "Housekeeping" or "HK" or "3":**
     Confirm, then output: [ACTION:ADD_ARRIVAL_NOTE]{"room":"5","message":"[HK] Guest has nut allergy","field":"notes"}
   - **If the user says "Maintenance" or "4":**
     Confirm, then output: [ACTION:ADD_ARRIVAL_NOTE]{"room":"5","message":"[MAINT] Radiator needs checking","field":"notes"}
   - **If the user doesn't specify or says "just add it":**
     Default to Intelligence: [ACTION:ADD_ARRIVAL_NOTE]{"room":"5","message":"...","field":"intelligence"}
   - IMPORTANT: Always include the action block so the system can automatically create the note and sync it across all devices.


${guestsBrief}

**5. Room Operations Mode**
   When the user says things like "Mark Room 5 as cleaned", "Room 5 is clean", "Room 5 inspection complete":
   - Confirm conversationally (e.g., "Got it, I've marked Room 5 as cleaned.")
   - Then at the END of your response, output: [ACTION:UPDATE_HK]{"room":"5","status":"cleaned"}
   - Valid statuses: "pending", "in_progress", "cleaned", "inspected", "complete"

**6. Guest Operations Mode**
   When the user says things like "Guest in Room 3 has arrived", "Room 3 is on site", "Check in Room 7":
   - Confirm conversationally (e.g., "Noted, I've marked the guest in Room 3 as on site.")
   - Then at the END of your response, output: [ACTION:UPDATE_GUEST]{"room":"3","field":"guestStatus","value":"on_site"}
   - Valid guestStatus values: "pre_arrival", "on_site", "off_site", "awaiting_room", "room_ready_notified", "checked_in", "courtesy_call_due", "call_complete", "checked_out", "no_show", "cancelled"
   - You can also update these fields: "car" (vehicle registration), "facilities", "roomType", "inRoomItems" (gifts/amenities to place in room), "hkNotes" (housekeeping instructions), "preferences" (tactical strategy notes), "prefillNotes" (intelligence column notes).
   - Example: User says "Room 5 car registration is AB12 CDE" → output [ACTION:UPDATE_GUEST]{"room":"5","field":"car","value":"AB12 CDE"}

**7. Room Upgrade Awareness**
   The system has an AI-powered room upgrade feature accessible from the In House dashboard ("AI Upgrades" button).
   - If asked about upgrades, explain that the system analyses returning guests, celebrations, VIPs, and long stays to suggest complimentary room upgrades to available empty rooms.
   - You can discuss which guests might be good upgrade candidates based on their [CLEAN DATA] (e.g., returning guests, special occasions in notes).
   - IMPORTANT: Do NOT emit upgrade actions yourself. The upgrade function is handled by a separate system button. Your role is advisory only.
`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error("Live AI Session Error:", e);
      setErrorMessage(`Failed to start session: ${msg}`);
      setIsLiveActive(false);
    }
  };

  const sendTextMessage = (text: string) => {
    if (!text || !sessionRef.current) return;
    sessionRef.current.sendRealtimeInput({ text });
    setTranscriptions(p => [...p, { text, role: 'user' }]);
  };

  const toggleMic = () => setIsMicEnabled(prev => !prev);

  return {
    isLiveActive,
    isMicEnabled,
    transcriptions,
    interimInput,
    interimOutput,
    errorMessage,
    hasMic,
    startLiveAssistant,
    toggleMic,
    sendTextMessage,
    disconnect,
    clearHistory
  };
};