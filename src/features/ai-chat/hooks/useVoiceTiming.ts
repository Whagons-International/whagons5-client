import { useRef } from "react";

const IS_DEV = (import.meta as any).env?.DEV === true;

/**
 * Dev-only voice turn timing instrumentation.
 * All timing probes are no-ops in production (they still use refs, but never log).
 */
export function useVoiceTiming() {
  const voiceTurnIdRef = useRef<number>(0);
  const voiceTurnSubmitPerfMsRef = useRef<number>(0);
  const voiceTurnPlaybackRecordedRef = useRef<boolean>(false);
  const voiceTurnSpeechEndPerfMsRef = useRef<number>(0);
  const voiceTurnSttMsRef = useRef<number | null>(null);
  const voiceTurnTranscriptPerfMsRef = useRef<number>(0);
  const voiceTurnWsSendPerfMsRef = useRef<number>(0);
  const voiceTurnFirstAssistantPerfMsRef = useRef<number>(0);
  const voiceTurnFirstTtsChunkPerfMsRef = useRef<number>(0);

  /** Mark the start of a new voice turn (when transcript is committed). */
  const beginTurn = (text: string, provider?: string, sttMs?: number) => {
    if (!IS_DEV) return;
    voiceTurnIdRef.current = (voiceTurnIdRef.current || 0) + 1;
    voiceTurnTranscriptPerfMsRef.current = performance.now();
    voiceTurnWsSendPerfMsRef.current = 0;
    voiceTurnFirstAssistantPerfMsRef.current = 0;
    voiceTurnFirstTtsChunkPerfMsRef.current = 0;
    // eslint-disable-next-line no-console
    console.debug("[VOICE]", {
      turn: voiceTurnIdRef.current,
      event: "transcript_committed",
      chars: String(text || "").length,
      provider,
      sttMs,
    });
  };

  /** Record the moment handleSubmit begins for a voice turn. */
  const markSubmitBegin = () => {
    if (!IS_DEV) return;
    voiceTurnSubmitPerfMsRef.current = performance.now();
    voiceTurnPlaybackRecordedRef.current = false;
    // eslint-disable-next-line no-console
    console.debug("[VOICE]", {
      turn: voiceTurnIdRef.current,
      event: "submit_begin",
      transcriptToSubmitMs:
        voiceTurnTranscriptPerfMsRef.current > 0
          ? Math.max(0, voiceTurnSubmitPerfMsRef.current - voiceTurnTranscriptPerfMsRef.current)
          : undefined,
    });
  };

  /** Record when the WebSocket message is actually sent. */
  const markWsSend = () => {
    if (!IS_DEV) return;
    voiceTurnWsSendPerfMsRef.current = performance.now();
    // eslint-disable-next-line no-console
    console.debug("[VOICE]", { turn: voiceTurnIdRef.current, event: "ws_send" });
  };

  /** Record when the first assistant text chunk arrives (any streaming format). */
  const markFirstAssistantChunk = (kind: string) => {
    if (!IS_DEV) return;
    if (voiceTurnFirstAssistantPerfMsRef.current > 0) return; // already recorded
    voiceTurnFirstAssistantPerfMsRef.current = performance.now();
    const t0 = voiceTurnTranscriptPerfMsRef.current || 0;
    const tSend = voiceTurnWsSendPerfMsRef.current || 0;
    // eslint-disable-next-line no-console
    console.debug("[VOICE]", {
      turn: voiceTurnIdRef.current,
      event: "first_assistant_chunk",
      transcriptToFirstTokenMs: t0 > 0 ? Math.max(0, voiceTurnFirstAssistantPerfMsRef.current - t0) : undefined,
      sendToFirstTokenMs: tSend > 0 ? Math.max(0, voiceTurnFirstAssistantPerfMsRef.current - tSend) : undefined,
      kind,
    });
  };

  /** Record the first TTS audio chunk for this turn. */
  const markFirstTtsChunk = () => {
    if (!IS_DEV) return;
    if (voiceTurnFirstTtsChunkPerfMsRef.current > 0) return; // already recorded
    voiceTurnFirstTtsChunkPerfMsRef.current = performance.now();
    const t0 = voiceTurnTranscriptPerfMsRef.current || 0;
    const tSend = voiceTurnWsSendPerfMsRef.current || 0;
    const tFirstTok = voiceTurnFirstAssistantPerfMsRef.current || 0;
    const tFirstTts = voiceTurnFirstTtsChunkPerfMsRef.current || 0;
    // eslint-disable-next-line no-console
    console.debug("[VOICE]", {
      turn: voiceTurnIdRef.current,
      event: "first_tts_chunk",
      transcriptToFirstTtsMs: t0 > 0 ? Math.max(0, tFirstTts - t0) : undefined,
      sendToFirstTtsMs: tSend > 0 ? Math.max(0, tFirstTts - tSend) : undefined,
      sendToFirstTokenMs: tSend > 0 && tFirstTok > 0 ? Math.max(0, tFirstTok - tSend) : undefined,
      transcriptToFirstTokenMs: t0 > 0 && tFirstTok > 0 ? Math.max(0, tFirstTok - t0) : undefined,
    });
  };

  /** Record speech-end timing (for barge-in diagnostics). */
  const markSpeechEnd = () => {
    if (!IS_DEV) return;
    voiceTurnSpeechEndPerfMsRef.current = performance.now();
    voiceTurnSttMsRef.current = null;
    voiceTurnPlaybackRecordedRef.current = false;
  };

  /** Record the STT duration from the provider info. */
  const recordSttMs = (ms: number | undefined) => {
    if (typeof ms === "number") {
      voiceTurnSttMsRef.current = Math.max(0, ms);
    } else {
      voiceTurnSttMsRef.current = null;
    }
  };

  return {
    IS_DEV,
    refs: {
      voiceTurnIdRef,
      voiceTurnSubmitPerfMsRef,
      voiceTurnPlaybackRecordedRef,
      voiceTurnSpeechEndPerfMsRef,
      voiceTurnSttMsRef,
      voiceTurnTranscriptPerfMsRef,
      voiceTurnWsSendPerfMsRef,
      voiceTurnFirstAssistantPerfMsRef,
      voiceTurnFirstTtsChunkPerfMsRef,
    },
    beginTurn,
    markSubmitBegin,
    markWsSend,
    markFirstAssistantChunk,
    markFirstTtsChunk,
    markSpeechEnd,
    recordSttMs,
  };
}
