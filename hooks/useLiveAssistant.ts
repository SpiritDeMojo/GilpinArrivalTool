import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Guest } from '../types';

// --- AUDIO PROTOCOLS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

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

    // 5. Reset UI State
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

      // VITAL FIX: Remove forced sample rate of 16k and detect browser's actual rate
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const actualSampleRate = inputCtx.sampleRate;
      
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
              
              // Dynamic MIME Type: Inform Gemini of the actual rate we are sending
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { 
                  data: encode(new Uint8Array(int16.buffer)), 
                  mimeType: `audio/pcm;rate=${actualSampleRate}` 
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

**YOUR STYLE:**
- **Tone:** Friendly, welcoming, and professional. Use phrases like "I'd be happy to check that," "Here is what I found," or "Good morning, team."
- **Detail:** Do not be afraid to give a full, comprehensive answer. If a topic requires explanation, take the space you need to explain it clearly. Do not cut yourself short.

**YOUR DATA SOURCE (Two Layers):**
1. **[CLEAN DATA]**: The verified table data (Room, Name, Notes, Duration, etc.).
2. **[RAW_STREAM_DATA]**: The messy booking text where hidden details (like phone numbers or specific requests) often hide.

**CORE TASKS:**

1. **Morning Briefing Mode:**
   When asked for a briefing, provide a friendly but structured narrative:
   - Start with a warm welcome (e.g., "Good morning! Here is the outlook for today...").
   - Give the breakdown of Main Hotel vs. Lake House arrivals.
   - **Safety First:** Gently but clearly highlight *every* allergy found in the notes or raw stream.
   - **Investigation:** Point out any missing logistics (e.g., "I noticed we are still missing car details for Room 5...").
   - **Stay Analysis:** Highlight guests staying >1 night using the DURATION field.

2. **The "Cross-Check" & Investigation:**
   - If a user asks, "Check the stream for Room X," look deep into the [RAW_STREAM_DATA].
   - **Find the Hidden Truth:** If the [CLEAN DATA] notes say "No Allergies" but the [RAW_STREAM_DATA] mentions "Gluten Free," you MUST say: "I wanted to flag a discrepancy: The notes are clear, but the raw booking stream actually mentions 'Gluten Free'. We should double-check this." This is a "⚠️ MISSED ALERT."
   - **Identity Verification:** If a user provides a phone number or email, scan the [RAW_STREAM_DATA] to see if it belongs to a guest.

3. **General/Live Operations:**
   - **Duration:** Answer "How long is [Guest] staying?" using the DURATION field.
   - **Updates:** If asked "Who is arriving next?", order guests by ETA (chronologically).

**PROTOCOL:**
- Always prioritize guest safety (allergies) above all else.
- If you are unsure, simply say, "I can't see that in the data, but I'd recommend checking the physical file."
- Maintain the luxury hospitality tone at all times.

**CURRENT GUEST DATASET:**
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
    disconnect
  };
};
