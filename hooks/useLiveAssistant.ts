import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Guest } from '../types';

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

export const useLiveAssistant = (guests: Guest[]) => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [interimInput, setInterimInput] = useState("");
  const [interimOutput, setInterimOutput] = useState("");

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micEnabledRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    micEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

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
      try { s.stop(); } catch(e) {}
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

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const guestsBrief = guests.map(g => {
        const rNum = parseInt(g.room.split(' ')[0]);
        const location = (rNum >= 51 && rNum <= 60) ? 'Lake House' : 'Main Hotel';
        return `--- GUEST START ---
[CLEAN DATA]
ROOM: ${g.room}
LOCATION: ${location}
NAME: ${g.name}
ETA: ${g.eta}
CAR: ${g.car}
DURATION: ${g.duration} nights
NOTES: ${g.prefillNotes}
STRATEGY: ${g.preferences}

[RAW_STREAM_DATA]
${g.rawHtml}
--- GUEST END ---`;
      }).join('\n\n');

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputCtx.resume();
      await outputCtx.resume();
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      mediaStreamRef.current = stream;

      let currentInput = "";
      let currentOutput = "";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
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
              if (currentOutput) setTranscriptions(p => [...p, { text: currentOutput, role: 'model' }]);
              currentInput = ""; currentOutput = ""; setInterimInput(""); setInterimOutput("");
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => { disconnect(); },
          onerror: () => { disconnect(); },
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


${guestsBrief}`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error("Live AI Session Error:", e);
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
    startLiveAssistant,
    toggleMic,
    sendTextMessage,
    disconnect,
    clearHistory
  };
};