import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { Message, ContentItem } from "../models";
import { createWSManager } from "../utils/ws";
import { getPreferredModel } from "../config";
import { processFrontendTool, isFrontendTool } from "../actions/frontend_tools";
import { handleFrontendToolPromptMessage } from "../actions/frontend_tool_prompts";
import { handleFrontendAction } from "../actions/handleFrontendAction";
import { StreamingTtsPlayer } from "../utils/StreamingTtsPlayer";
import { auth } from "@/firebase/firebaseConfig";
import {
  getConversations,
  createConversation,
} from "../utils/conversationStorage";
import type { PromptUserContext } from "./useUserContext";
import type { TtsPlaybackControls } from "./useTtsPlayback";
import { VOICE_WS_IDLE_CLOSE_MS } from "./useTtsPlayback";
import { getEnvVariables } from "@/lib/getEnvVariables";

const { VITE_API_URL, VITE_CHAT_URL, VITE_DEVELOPMENT, VITE_CLIENT_ID } = getEnvVariables();
const CHAT_HOST = VITE_CHAT_URL || VITE_API_URL || window.location.origin;
const IS_DEV = (import.meta as any).env?.DEV === true || VITE_DEVELOPMENT === "true";
const CLIENT_ID = VITE_CLIENT_ID || "";

// Module-level singleton
const wsManager = createWSManager(CHAT_HOST);

export { wsManager, CHAT_HOST };

export type SubmitOptions = { inputMode?: "text" | "voice" };

export interface UseWebSocketChatDeps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<any[]>>;
  gettingResponse: boolean;
  setGettingResponse: React.Dispatch<React.SetStateAction<boolean>>;
  abortControllerRef: React.MutableRefObject<boolean>;
  scrollToBottom: () => void;
  navigate: NavigateFunction;
  userContext: PromptUserContext | undefined;
  appLanguageCode: string;
  isListening: boolean;
  // Execution traces
  handleTrace: (data: any) => void;
  clearTraces: () => void;
  // TTS
  tts: TtsPlaybackControls;
  // Voice timing
  voiceTiming: {
    IS_DEV: boolean;
    refs: {
      voiceTurnSubmitPerfMsRef: React.MutableRefObject<number>;
      voiceTurnPlaybackRecordedRef: React.MutableRefObject<boolean>;
      voiceTurnSpeechEndPerfMsRef: React.MutableRefObject<number>;
      voiceTurnSttMsRef: React.MutableRefObject<number | null>;
      voiceTurnTranscriptPerfMsRef: React.MutableRefObject<number>;
      voiceTurnWsSendPerfMsRef: React.MutableRefObject<number>;
      voiceTurnFirstAssistantPerfMsRef: React.MutableRefObject<number>;
      voiceTurnFirstTtsChunkPerfMsRef: React.MutableRefObject<number>;
      voiceTurnIdRef: React.MutableRefObject<number>;
    };
    markSubmitBegin: () => void;
    markWsSend: () => void;
    markFirstAssistantChunk: (kind: string) => void;
    markFirstTtsChunk: () => void;
  };
}

export interface UseWebSocketChatReturn {
  handleSubmit: (content: string | ContentItem[], opts?: SubmitOptions) => Promise<void>;
  handleStopRequest: () => Promise<void>;
  handleSubmitRef: React.MutableRefObject<((content: string | ContentItem[], opts?: SubmitOptions) => Promise<void>) | undefined>;
  /** Ref to the WS unsubscribe function (needed by cleanup effects in the parent). */
  unsubscribeWSRef: React.MutableRefObject<(() => void) | null>;
  /** The stable WS event handler ref (set once, delegates to latest closure). */
  wsEventHandlerRef: React.MutableRefObject<(data: any) => void>;
  /** Ref for dedup of ws_closed notices. */
  lastWsClosedNoticeAtRef: React.MutableRefObject<number>;
  lastWsClosedNoticeKeyRef: React.MutableRefObject<string>;
}

export function useWebSocketChat(deps: UseWebSocketChatDeps): UseWebSocketChatReturn {
  const {
    messages,
    setMessages,
    conversationId,
    setConversations,
    gettingResponse,
    setGettingResponse,
    abortControllerRef,
    scrollToBottom,
    navigate,
    userContext,
    appLanguageCode,
    isListening,
    handleTrace,
    clearTraces,
    tts,
    voiceTiming,
  } = deps;

  const unsubscribeWSRef = useRef<(() => void) | null>(null);
  const wsEventHandlerRef = useRef<(data: any) => void>(() => {});
  const stableWsHandlerRef = useRef<(data: any) => void>();
  const lastWsClosedNoticeAtRef = useRef<number>(0);
  const lastWsClosedNoticeKeyRef = useRef<string>("");
  const handleSubmitRef = useRef<(content: string | ContentItem[], opts?: SubmitOptions) => Promise<void>>();

  if (!stableWsHandlerRef.current) {
    stableWsHandlerRef.current = (data: any) => {
      try {
        wsEventHandlerRef.current?.(data);
      } catch (e) {
        console.error("[WS] handler error:", e);
      }
    };
  }

  const handleSubmit = async (content: string | ContentItem[], opts?: SubmitOptions) => {
    if (gettingResponse) return;
    setGettingResponse(true);

    // Clear execution traces from previous interaction
    clearTraces();

    // Voice mode: keep the message WS warm between sends.
    const voiceSessionWasEnabled = tts.keepWsOpenForVoiceRef.current;
    if (opts?.inputMode) {
      tts.keepWsOpenForVoiceRef.current = opts.inputMode === "voice";
    }
    const effectiveInputMode: SubmitOptions["inputMode"] =
      opts?.inputMode ?? (voiceSessionWasEnabled ? "voice" : undefined);

    if (effectiveInputMode === "voice") {
      voiceTiming.markSubmitBegin();
    }

    // Create conversation if it doesn't exist
    if (messages.length === 0) {
      const title = typeof content === "string"
        ? content.slice(0, 50)
        : "New conversation";
      createConversation(conversationId, title);
      setConversations(getConversations());
    }

    const newMessage: Message = {
      role: "user",
      content: content,
    };
    const currentMessages = [...messages];
    const updatedMessages = [...currentMessages, newMessage];

    setMessages(updatedMessages);
    const assistantPlaceholder: Message = { role: "assistant", content: "", reasoning: "" };
    const withAssistantPlaceholder = [...updatedMessages, assistantPlaceholder];
    setMessages(withAssistantPlaceholder);
    queueMicrotask(scrollToBottom);

    const parts: Array<{ text?: string; inline_data?: any; image_data?: any; file_data?: any }> = [];

    if (typeof content === "string") {
      parts.push({ text: content });
    } else {
      for (const item of content) {
        if (typeof item.content === "string") {
          parts.push({ text: item.content });
        } else if (item.content.kind === "image-url" && item.content.serverUrl) {
          parts.push({
            image_data: {
              mimeType: item.content.media_type,
              fileUrl: item.content.serverUrl,
            }
          });
        } else if (item.content.kind === "pdf-file" && item.content.serverUrl) {
          parts.push({
            file_data: {
              mimeType: item.content.media_type,
              fileUrl: item.content.serverUrl,
            }
          });
        }
      }
    }

    if (parts.length === 0) {
      console.error("No valid content to send.");
      setGettingResponse(false);
      return;
    }

    const handleWebSocketEvent = (data: any) => {
      // ── Execution traces (UI-only, not stored in chat history) ──
      if (data.type === "execution_trace") {
        console.log('[AssistantWidget] Received trace:', data.status, data.label);
        handleTrace(data);
        return;
      }

      // ── Frontend tool prompts ──
      if (data.type === "frontend_tool_prompt") {
        handleFrontendToolPromptMessage(data, (payload) => {
          wsManager.send(conversationId, payload);
        }, navigate);
        return;
      }

      // ── Frontend actions (from Execute_TypeScript) ──
      if (data.type === "frontend_action") {
        handleFrontendAction(data, conversationId, (cid, payload) => wsManager.send(cid, payload), navigate);
        return;
      }

      // ── TTS audio stream (voice mode) ──
      if (data.type === "tts_audio_chunk") {
        const audioB64 = typeof data.audio === "string" ? data.audio : "";
        const ctxId = typeof data.context_id === "string" ? data.context_id : "";
        // Ignore chunks from old contexts
        if (ctxId && tts.activeTtsContextIdRef.current && ctxId !== tts.activeTtsContextIdRef.current) {
          return;
        }
        if (audioB64) {
          tts.lastTtsChunkAtRef.current = Date.now();
          // eslint-disable-next-line no-console
          console.debug("[TTS] audio chunk received:", audioB64.length);
          if (!tts.ttsPlayerRef.current) tts.ttsPlayerRef.current = new StreamingTtsPlayer();

          voiceTiming.markFirstTtsChunk();

          tts.ttsPlayerRef.current.enqueueBase64Mp3(audioB64, (playbackStartPerfMs) => {
            if (!IS_DEV) return;
            if (voiceTiming.refs.voiceTurnPlaybackRecordedRef.current) return;
            voiceTiming.refs.voiceTurnPlaybackRecordedRef.current = true;

            const speechEndMs = voiceTiming.refs.voiceTurnSpeechEndPerfMsRef.current || 0;
            const total = speechEndMs > 0 ? playbackStartPerfMs - speechEndMs : 0;
            const sttMs = typeof voiceTiming.refs.voiceTurnSttMsRef.current === "number" ? voiceTiming.refs.voiceTurnSttMsRef.current : null;
            const llmToPlaybackMs = sttMs != null ? Math.max(0, total - sttMs) : undefined;

            // Attach metric to the latest assistant message (best-effort).
            setMessages(prev => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i]?.role === "assistant") {
                  next[i] = {
                    ...next[i],
                    meta: {
                      ...(next[i].meta || {}),
                      voiceTotalMs: Math.max(0, total),
                      voiceSttMs: sttMs != null ? Math.max(0, sttMs) : undefined,
                      voiceLlmToPlaybackMs: llmToPlaybackMs,
                      ttsTimeToPlaybackMs:
                        voiceTiming.refs.voiceTurnSubmitPerfMsRef.current > 0
                          ? Math.max(0, playbackStartPerfMs - voiceTiming.refs.voiceTurnSubmitPerfMsRef.current)
                          : undefined,
                    },
                  };
                  break;
                }
              }
              return next;
            });
          });

          if (tts.keepWsOpenForVoiceRef.current) {
            tts.scheduleWsIdleClose(VOICE_WS_IDLE_CLOSE_MS);
          }
        }
        return;
      }

      if (data.type === "tts_context_final") {
        const ctxId = typeof (data as any)?.context_id === "string" ? String((data as any).context_id) : "";
        if (!ctxId || !tts.activeTtsContextIdRef.current || ctxId === tts.activeTtsContextIdRef.current) {
          tts.expectingTtsRef.current = false;
          tts.activeTtsContextIdRef.current = "";
        }
        try {
          if (tts.ttsCloseTimerRef.current) window.clearTimeout(tts.ttsCloseTimerRef.current);
          tts.ttsCloseTimerRef.current = null;
        } catch {}

        if (tts.keepWsOpenForVoiceRef.current) {
          tts.scheduleWsIdleClose(VOICE_WS_IDLE_CLOSE_MS);
        } else {
          if (unsubscribeWSRef.current) {
            try { unsubscribeWSRef.current(); } catch {}
            unsubscribeWSRef.current = null;
          }
        }
        return;
      }
      if (data.type === "tts_error") {
        console.error("[TTS] error:", data.error || data.message);
        return;
      }

      if (data.type === "tts_context_started") {
        const ctxId = typeof (data as any)?.context_id === "string" ? String((data as any).context_id) : "";
        if (ctxId) {
          tts.activeTtsContextIdRef.current = ctxId;
          try { tts.ttsPlayerRef.current?.stop(); } catch {}
          tts.expectingTtsRef.current = true;
          if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.debug("[TTS] context started:", ctxId);
          }
        }
        return;
      }

      // ── Done / stopped / error ──
      if (data.type === "done" || data.type === "stopped" || data.type === "error") {
        setGettingResponse(false);
        if (data.type === "error") {
          console.error("WebSocket error:", data.error || data.message);
        }
        if (tts.keepWsOpenForVoiceRef.current) {
          tts.scheduleWsIdleClose(VOICE_WS_IDLE_CLOSE_MS);
          return;
        }
        tts.stopTts();
        if (unsubscribeWSRef.current) {
          try { unsubscribeWSRef.current(); } catch {}
          unsubscribeWSRef.current = null;
        }
        return;
      }

      // ── WS closed mid-stream ──
      if (data.type === "ws_closed") {
        const key = `${String((data as any)?.at || "")}:${String((data as any)?.code || "")}:${String((data as any)?.reason || "")}`;
        const now = Date.now();
        if (key && key === lastWsClosedNoticeKeyRef.current) return;
        if (now - (lastWsClosedNoticeAtRef.current || 0) < 1000) return;
        lastWsClosedNoticeAtRef.current = now;
        lastWsClosedNoticeKeyRef.current = key;

        tts.expectingTtsRef.current = false;
        setGettingResponse(false);
        tts.stopTts();

        const LOST_MSG =
          "Connection lost while the assistant was responding. Please try again (voice or text).";

        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && typeof last.content === "string" && last.content.trim() === LOST_MSG) {
            return prev;
          }
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i]?.role === "assistant") {
              const cur = next[i];
              if (typeof cur.content === "string" && cur.content.trim() === "") {
                next[i] = { ...cur, content: LOST_MSG };
              } else {
                next.push({ role: "assistant", content: LOST_MSG } as any);
              }
              break;
            }
          }
          return next;
        });
        return;
      }

      // ── Structured tool_result ──
      if (data.type === "tool_result") {
        const toolName = data.function_name || '';
        const toolResult = data.result || data.result_json;

        if (toolName && isFrontendTool(toolName)) {
          const sendResponseMessage = (message: string) => {
            if (message && !gettingResponse) {
              const voiceMode = tts.keepWsOpenForVoiceRef.current || isListening;
              handleSubmit(message, voiceMode ? { inputMode: "voice" } : undefined);
            }
          };
          const navigateToRoute = (path: string) => { navigate(path); };
          processFrontendTool(toolName, toolResult, sendResponseMessage, navigateToRoute);
        }

        setMessages(prevMessages => {
          const currentMessageState = [...prevMessages];
          const toolCallIndex = currentMessageState.findIndex(
            msg => msg.role === "tool_call" &&
                   typeof msg.content === "object" &&
                   (msg.content as any).name === data.function_name &&
                   (msg.content as any).tool_call_id?.startsWith('temp_')
          );
          if (toolCallIndex !== -1) {
            const updatedToolCall = { ...currentMessageState[toolCallIndex] };
            (updatedToolCall.content as any).tool_call_id = data.function_id;
            currentMessageState[toolCallIndex] = updatedToolCall;
          }
          const newToolResultMessage: Message = {
            role: "tool_result",
            content: {
              tool_call_id: data.function_id,
              name: data.function_name,
              content: data.result || data.result_json,
            }
          };
          currentMessageState.push(newToolResultMessage);
          return currentMessageState;
        });
        return;
      }

      // ── Streaming parts (array format) ──
      if (data.parts && Array.isArray(data.parts)) {
        if (IS_DEV && (tts.keepWsOpenForVoiceRef.current || tts.expectingTtsRef.current)) {
          voiceTiming.markFirstAssistantChunk("parts");
        }
        setMessages(prevMessages => {
          let currentMessageState = [...prevMessages];
          let lastMessage = currentMessageState[currentMessageState.length - 1];

          if (!lastMessage || lastMessage.role !== "assistant") {
            const newAssistantMessage: Message = { role: "assistant", content: "", reasoning: "" };
            currentMessageState = [...currentMessageState, newAssistantMessage];
            lastMessage = newAssistantMessage;
          }

          for (const part of data.parts) {
            if (part.text && typeof lastMessage.content === "string") {
              const updated = { ...lastMessage } as Message;
              updated.content = (lastMessage.content as string) + part.text;
              currentMessageState[currentMessageState.length - 1] = updated;
              lastMessage = updated;
            }
            if (part.functionCall) {
              const hasId = part.functionCall.id && part.functionCall.id.length > 0;
              const toolCallId = hasId ? part.functionCall.id : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newToolCallMessage: Message = {
                role: "tool_call",
                content: {
                  tool_call_id: toolCallId,
                  name: part.functionCall.name,
                  args: part.functionCall.args,
                }
              };
              currentMessageState.push(newToolCallMessage);
            }
          }
          return currentMessageState;
        });
        return;
      }

      // ── Granular streaming events ──
      if (
        IS_DEV &&
        (tts.keepWsOpenForVoiceRef.current || tts.expectingTtsRef.current) &&
        (data.type === "part_start" || data.type === "part_delta" || data.type === "content_chunk")
      ) {
        voiceTiming.markFirstAssistantChunk(data.type);
      }

      setMessages(prevMessages => {
        let currentMessageState = [...prevMessages];
        let lastMessage = currentMessageState[currentMessageState.length - 1];
        const isAssistantMessage = lastMessage?.role === "assistant";

        if (!isAssistantMessage && (data.type === "part_start" || data.type === "part_delta" || data.type === "content_chunk")) {
          const newAssistantMessage: Message = { role: "assistant", content: "", reasoning: "" };
          currentMessageState = [...currentMessageState, newAssistantMessage];
          lastMessage = newAssistantMessage;
        }

        if (data.type === "part_start" || data.type === "part_delta") {
          const part = data.data?.part || data.data?.delta;
          if (part && lastMessage?.role === "assistant") {
            const updated = { ...lastMessage } as Message;
            if (part.part_kind === "text" && typeof lastMessage.content === "string") {
              updated.content = (lastMessage.content as string) + (part.content || "");
            }
            if (part.part_kind === "reasoning") {
              const deltaText = typeof (part as any).reasoning === 'string' && (part as any).reasoning !== ''
                ? (part as any).reasoning
                : (typeof (part as any).content === 'string' ? (part as any).content : '');
              if (deltaText) {
                const prevReasoning = typeof lastMessage.reasoning === "string" ? lastMessage.reasoning : "";
                updated.reasoning = prevReasoning + deltaText;
              }
            }
            currentMessageState[currentMessageState.length - 1] = updated;
          }
        } else if (data.type === "content_chunk" && data.data) {
          if (lastMessage?.role === "assistant" && typeof lastMessage.content === "string") {
            const updated = { ...lastMessage } as Message;
            updated.content = (lastMessage.content as string) + data.data;
            currentMessageState[currentMessageState.length - 1] = updated;
          }
        } else if (data.type === "tool_call" && data.data?.tool_call) {
          const newToolCallMessage: Message = { role: "tool_call", content: data.data.tool_call };
          currentMessageState.push(newToolCallMessage);
        } else if (data.type === "tool_result" && data.data?.tool_result) {
          const newToolResultMessage: Message = { role: "tool_result", content: data.data.tool_result };
          currentMessageState.push(newToolResultMessage);
        }

        return currentMessageState;
      });
    };

    // Ensure the stable subscription always uses the latest handler closure for this submit.
    wsEventHandlerRef.current = handleWebSocketEvent;

    const ensureSubscription = async () => {
      const state = wsManager.getState(conversationId);
      const socketAlive = state === WebSocket.OPEN || state === WebSocket.CONNECTING;
      if (unsubscribeWSRef.current && socketAlive) return;

      if (unsubscribeWSRef.current && !socketAlive) {
        try { unsubscribeWSRef.current(); } catch {}
        unsubscribeWSRef.current = null;
      }

      const selectedModel = getPreferredModel();

      let token: string | undefined;
      try {
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      } catch (error) {
        console.warn('[WS] Failed to get Firebase token:', error);
      }

      unsubscribeWSRef.current = wsManager.subscribe(conversationId, stableWsHandlerRef.current!, selectedModel, token);
    };

    try {
      abortControllerRef.current = false;
      tts.clearTimers();
      await ensureSubscription();

      const maxWaitTime = opts?.inputMode === "voice" ? 25000 : 15000;
      const checkInterval = 100;
      const maxAttempts = maxWaitTime / checkInterval;

      let connected = false;
      let reconnectBudget = 3;
      for (let i = 0; i < maxAttempts; i++) {
        const wsState = wsManager.getState(conversationId);
        if (wsState === WebSocket.OPEN) {
          connected = true;
          break;
        }
        if (wsState === WebSocket.CONNECTING && i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          continue;
        }
        if (wsState === WebSocket.CLOSED || wsState === WebSocket.CLOSING) {
          if (reconnectBudget > 0) {
            reconnectBudget--;
            try { await ensureSubscription(); } catch {}
            await new Promise(resolve => setTimeout(resolve, 250));
            continue;
          }
          break;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (!connected) {
        const wsState = wsManager.getState(conversationId);
        const wsDebug = (wsManager as any)?.getDebugInfo?.(conversationId);
        console.error('[WS] Connection failed.', { wsState, wsDebug, CHAT_HOST });
        const urlHint =
          wsDebug?.url ? ` url=${wsDebug.url}` : ` chatHost=${String(CHAT_HOST || "")}`;
        const closeHint =
          wsDebug?.lastClose
            ? ` close=${wsDebug.lastClose.code}${wsDebug.lastClose.reason ? `(${wsDebug.lastClose.reason})` : ""}`
            : "";
        throw new Error(`WebSocket connection failed (state=${wsState}).${urlHint}${closeHint}`);
      }

      const messagePayload: any = {
        message: {
          role: "user",
          content: {
            parts: parts
          }
        },
        language_code: appLanguageCode,
      };
      if (CLIENT_ID) {
        messagePayload.client_id = CLIENT_ID;
      }
      if (userContext) {
        messagePayload.user_context = userContext;
      }
      if (effectiveInputMode) {
        messagePayload.input_mode = effectiveInputMode;
      }
      tts.expectingTtsRef.current = effectiveInputMode === "voice";

      if (IS_DEV && effectiveInputMode === "voice") {
        voiceTiming.markWsSend();
      }
      const sent = wsManager.send(conversationId, messagePayload);

      if (!sent) {
        throw new Error("Failed to send message via WebSocket - connection not ready");
      }

    } catch (error) {
      console.error("Error sending message:", error);
      setGettingResponse(false);

      setMessages(prev => {
        if (
          prev.length >= 2 &&
          prev[prev.length - 2] === newMessage &&
          prev[prev.length - 1]?.role === "assistant" &&
          typeof prev[prev.length - 1]?.content === "string" &&
          (prev[prev.length - 1]?.content as string) === ""
        ) {
          return prev.slice(0, -2);
        }
        if (prev.length > 0 && prev[prev.length - 1] === newMessage) {
          return prev.slice(0, -1);
        }
        return prev;
      });

      if (!(error instanceof DOMException && error.name === 'AbortError') && !abortControllerRef.current) {
        alert(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleStopRequest = useCallback(async () => {
    abortControllerRef.current = true;
    setGettingResponse(false);
    try {
      tts.stopTts();
      if (unsubscribeWSRef.current) {
        try { unsubscribeWSRef.current(); } catch {}
        unsubscribeWSRef.current = null;
      }
      wsManager.close(conversationId);
      console.log('[WS] Stopped chat by closing WebSocket connection');
    } catch (e) {
      console.error("Failed to stop chat:", e);
    }
  }, [conversationId, setGettingResponse, abortControllerRef, tts]);

  // Keep the ref up to date
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  return {
    handleSubmit,
    handleStopRequest,
    handleSubmitRef,
    unsubscribeWSRef,
    wsEventHandlerRef,
    lastWsClosedNoticeAtRef,
    lastWsClosedNoticeKeyRef,
  };
}
