// AudioWorklet processor for microphone capture
// Replaces deprecated ScriptProcessorNode
// This file runs in the AudioWorklet thread (separate from main thread)

class MicProcessor extends AudioWorkletProcessor {
    process(inputs, _outputs, _parameters) {
        const input = inputs[0];
        if (input && input[0]) {
            const float32 = input[0];
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                int16[i] = float32[i] * 32768;
            }
            // Send PCM data back to main thread
            this.port.postMessage(int16.buffer, [int16.buffer]);
        }
        return true; // Keep processor alive
    }
}

registerProcessor('mic-processor', MicProcessor);
