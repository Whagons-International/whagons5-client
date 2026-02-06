import { useRef, useCallback } from "react";
import { StreamingTtsPlayer } from "../utils/StreamingTtsPlayer";

const IS_DEV = (import.meta as any).env?.DEV === true;

/** How long to keep WS alive between voice turns before auto-closing. */
export const VOICE_WS_IDLE_CLOSE_MS = 5 * 60 * 1000; // 5 minutes

export interface TtsPlaybackControls {
  /** Ref to the streaming TTS player instance. */
  ttsPlayerRef: React.MutableRefObject<StreamingTtsPlayer | null>;
  /** Whether we expect TTS audio for the current response. */
  expectingTtsRef: React.MutableRefObject<boolean>;
  /** The active ElevenLabs TTS context id (prevents old audio bleeding). */
  activeTtsContextIdRef: React.MutableRefObject<string>;
  /** Timestamp of last TTS chunk (for debugging). */
  lastTtsChunkAtRef: React.MutableRefObject<number>;
  /** Timer for auto-closing WS after TTS ends (non-voice mode). */
  ttsCloseTimerRef: React.MutableRefObject<number | null>;

  /** Prime AudioContext on a real user gesture (avoids autoplay restrictions). */
  primeTtsAudio: () => void;
  /** Schedule an idle-close for the WS after `ms` milliseconds. */
  scheduleWsIdleClose: (ms: number) => void;

  /** Stop TTS audio playback immediately. */
  stopTts: () => void;
  /** Duck / un-duck TTS audio (for barge-in). */
  setDucked: (ducked: boolean) => void;
  /** Fully dispose the TTS player and reset all state. */
  disposeTts: () => void;
  /** Clear all TTS timers (idle close + TTS close). */
  clearTimers: () => void;

  /** Ref that controls whether the WS stays open between voice turns. */
  keepWsOpenForVoiceRef: React.MutableRefObject<boolean>;
  /** Timer for WS idle close in voice mode. */
  wsIdleCloseTimerRef: React.MutableRefObject<number | null>;
}

export function useTtsPlayback(
  conversationId: string,
  unsubscribeWSRef: React.MutableRefObject<(() => void) | null>,
  wsManagerClose: (id: string) => void,
): TtsPlaybackControls {
  const ttsPlayerRef = useRef<StreamingTtsPlayer | null>(null);
  const expectingTtsRef = useRef<boolean>(false);
  const activeTtsContextIdRef = useRef<string>("");
  const ttsCloseTimerRef = useRef<number | null>(null);
  const lastTtsChunkAtRef = useRef<number>(0);
  const keepWsOpenForVoiceRef = useRef<boolean>(false);
  const wsIdleCloseTimerRef = useRef<number | null>(null);

  const scheduleWsIdleClose = useCallback((ms: number) => {
    try {
      if (wsIdleCloseTimerRef.current) window.clearTimeout(wsIdleCloseTimerRef.current);
      wsIdleCloseTimerRef.current = window.setTimeout(() => {
        // Only auto-close if we're still in voice-keepalive mode.
        if (!keepWsOpenForVoiceRef.current) return;
        if (unsubscribeWSRef.current) {
          try { unsubscribeWSRef.current(); } catch {}
          unsubscribeWSRef.current = null;
        }
        wsManagerClose(conversationId);
        wsIdleCloseTimerRef.current = null;
      }, ms);
    } catch {}
  }, [conversationId, unsubscribeWSRef, wsManagerClose]);

  const primeTtsAudio = useCallback(() => {
    try {
      if (!ttsPlayerRef.current) ttsPlayerRef.current = new StreamingTtsPlayer();
      void ttsPlayerRef.current.ensureStarted();
    } catch {}
  }, []);

  const stopTts = useCallback(() => {
    try { ttsPlayerRef.current?.stop(); } catch {}
  }, []);

  const setDucked = useCallback((ducked: boolean) => {
    try { ttsPlayerRef.current?.setDucked(ducked); } catch {}
  }, []);

  const disposeTts = useCallback(() => {
    try { ttsPlayerRef.current?.dispose(); } catch {}
    ttsPlayerRef.current = null;
    expectingTtsRef.current = false;
    activeTtsContextIdRef.current = "";
  }, []);

  const clearTimers = useCallback(() => {
    try {
      if (ttsCloseTimerRef.current) window.clearTimeout(ttsCloseTimerRef.current);
      ttsCloseTimerRef.current = null;
    } catch {}
    try {
      if (wsIdleCloseTimerRef.current) window.clearTimeout(wsIdleCloseTimerRef.current);
      wsIdleCloseTimerRef.current = null;
    } catch {}
  }, []);

  return {
    ttsPlayerRef,
    expectingTtsRef,
    activeTtsContextIdRef,
    lastTtsChunkAtRef,
    ttsCloseTimerRef,
    keepWsOpenForVoiceRef,
    wsIdleCloseTimerRef,
    primeTtsAudio,
    scheduleWsIdleClose,
    stopTts,
    setDucked,
    disposeTts,
    clearTimers,
  };
}
