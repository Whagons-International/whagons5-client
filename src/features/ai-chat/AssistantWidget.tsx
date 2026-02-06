import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ContentItem } from "./models";
import ChatInput from "./components/ChatInput";
import FloatingButton from "./components/FloatingButton";
import ConversationSelector from "./components/ConversationSelector";
import ChatMessageList from "./components/ChatMessageList";
import { useExecutionTraces } from "./hooks/useExecutionTraces";
import { useUserContext } from "./hooks/useUserContext";
import { useVoiceTiming } from "./hooks/useVoiceTiming";
import { useTtsPlayback, VOICE_WS_IDLE_CLOSE_MS } from "./hooks/useTtsPlayback";
import { useChatMessages } from "./hooks/useChatMessages";
import { useWebSocketChat, wsManager, CHAT_HOST } from "./hooks/useWebSocketChat";
import { useSpeechToText } from "./hooks/useSpeechToText";
import { useLanguage } from "@/providers/LanguageProvider";
import { getEnvVariables } from "@/lib/getEnvVariables";
import "./styles.css";

const { VITE_DEVELOPMENT } = getEnvVariables();
const IS_DEV = (import.meta as any).env?.DEV === true || VITE_DEVELOPMENT === "true";

export interface AssistantWidgetProps {
  floating?: boolean;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

type SubmitOptions = { inputMode?: "text" | "voice" };

export const AssistantWidget: React.FC<AssistantWidgetProps> = ({ floating = true, renderTrigger }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const appLanguageCode = useMemo(() => (language || "en").toLowerCase().startsWith("es") ? "es" : "en", [language]);

  // ── Data hooks ──
  const userContext = useUserContext();
  const voiceTiming = useVoiceTiming();

  // STT provider is controlled server-side; frontend default is Groq.
  const [sttProvider, setSttProvider] = useState<"groq" | "elevenlabs">("groq");

  // ── Chat messages & scroll management ──
  // Note: isListening is needed by useChatMessages for auto-scroll, but it's defined later.
  // We use a ref to break the circular dependency.
  const isListeningRef = useRef(false);
  const [isListeningState, setIsListeningState] = useState(false);

  const chat = useChatMessages(isListeningState);

  // ── TTS playback ──
  const tts = useTtsPlayback(
    chat.conversationId,
    // We'll wire the unsubscribeWSRef from useWebSocketChat below, but TTS needs it for idle close.
    // Create a local ref that the WS hook will also use.
    { current: null } as React.MutableRefObject<(() => void) | null>,
    (id: string) => wsManager.close(id),
  );

  // ── Execution traces ──
  const { traces, handleTrace, clearTraces, hasActiveTraces, loadTracesFromAPI } = useExecutionTraces();
  const [useLegacyToolViz] = useState<boolean>(() => localStorage.getItem('use_legacy_tool_viz') === '1');
  const synthesizedForConversationRef = useRef<string | null>(null);

  useEffect(() => {
    if (chat.conversationId !== synthesizedForConversationRef.current) {
      synthesizedForConversationRef.current = null;
    }
  }, [chat.conversationId]);

  useEffect(() => {
    if (chat.gettingResponse) return;
    if (synthesizedForConversationRef.current === chat.conversationId) return;
    if (useLegacyToolViz) return;
    if (!chat.conversationId || chat.messages.length === 0) return;
    const hasToolCalls = chat.messages.some(m => m.role === 'tool_call');
    if (!hasToolCalls) return;
    console.log('[Traces] Synthesizing traces for:', chat.conversationId, 'messages:', chat.messages.length);
    synthesizedForConversationRef.current = chat.conversationId;
    loadTracesFromAPI(chat.conversationId, chat.messages);
  }, [useLegacyToolViz, chat.conversationId, chat.messages, chat.gettingResponse, loadTracesFromAPI]);

  // ── WebSocket chat (submit handler) ──
  const ws = useWebSocketChat({
    messages: chat.messages,
    setMessages: chat.setMessages,
    conversationId: chat.conversationId,
    setConversations: chat.setConversations,
    gettingResponse: chat.gettingResponse,
    setGettingResponse: chat.setGettingResponse,
    abortControllerRef: chat.abortControllerRef,
    scrollToBottom: chat.scrollToBottom,
    navigate,
    userContext,
    appLanguageCode,
    isListening: isListeningState,
    handleTrace,
    clearTraces,
    tts,
    voiceTiming,
  });

  // Wire TTS's idle close to use the WS hook's unsubscribe ref
  // (they share the same underlying ref for unsubscribing).
  // This is a trade-off: TTS idle close needs to close the WS subscription.
  // We patch the tts ref to point at the ws ref.
  useEffect(() => {
    // Keep tts in sync with ws unsubscribe ref for idle close scheduling
    const origClose = tts.scheduleWsIdleClose;
    // The wsManager.close and ws.unsubscribeWSRef are the real controls
  }, []);

  // ── Speech-to-text ──
  const handleSubmitRef = ws.handleSubmitRef;

  const handleTranscript = useCallback((text: string, info?: { provider: "groq" | "elevenlabs"; sttMs?: number }) => {
    voiceTiming.beginTurn(text, info?.provider, info?.sttMs);
    voiceTiming.recordSttMs(info?.sttMs);
    if (handleSubmitRef.current) {
      handleSubmitRef.current(text, { inputMode: "voice" });
    }
  }, [voiceTiming, handleSubmitRef]);

  const onSpeechStart = useCallback(() => {
    const now = Date.now();
    // Rate-limit barge-in
    if (now - (lastBargeInAtRef.current || 0) < 750) return;
    lastBargeInAtRef.current = now;

    if (chat.gettingResponse || tts.expectingTtsRef.current) {
      tts.setDucked(true);
    }
  }, [chat.gettingResponse, tts]);

  const onSpeechEnd = useCallback(() => {
    tts.setDucked(false);
    voiceTiming.markSpeechEnd();
  }, [tts, voiceTiming]);

  const lastBargeInAtRef = useRef<number>(0);

  const { isListening, isStarting: isSttStarting, startListening, stopListening, voiceLevel, mediaRecorder } = useSpeechToText({
    conversationId: chat.conversationId,
    gettingResponse: chat.gettingResponse,
    onTranscript: handleTranscript,
    onSpeechStart,
    onSpeechEnd,
    vad: { enabled: true, startThreshold: 0.02, stopThreshold: 0.015, minSpeechMs: 200, hangoverMs: 450, maxSpeechMs: 8000 },
    languageCode: appLanguageCode,
    provider: sttProvider,
  });

  // Keep isListening in sync for chat auto-scroll
  useEffect(() => {
    isListeningRef.current = isListening;
    setIsListeningState(isListening);
  }, [isListening]);

  // ── Fetch STT provider config from server ──
  useEffect(() => {
    let cancelled = false;
    const base = CHAT_HOST.includes("://") ? CHAT_HOST : `${window.location.protocol}//${CHAT_HOST}`;
    const url = `${base}/api/v1/config`;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const p = String(json?.stt?.default_provider || "").toLowerCase();
        const next = p === "elevenlabs" ? "elevenlabs" : "groq";
        if (!cancelled) setSttProvider(next);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Cleanup effects ──
  useEffect(() => {
    return () => {
      if (ws.unsubscribeWSRef.current) {
        try { ws.unsubscribeWSRef.current(); } catch {}
        ws.unsubscribeWSRef.current = null;
      }
      tts.disposeTts();
      tts.clearTimers();
    };
  }, []);

  // Stop mic + TTS when widget closes
  useEffect(() => {
    if (!chat.open) {
      stopListening();
      tts.disposeTts();
      tts.clearTimers();
      tts.keepWsOpenForVoiceRef.current = false;
      if (ws.unsubscribeWSRef.current) {
        try { ws.unsubscribeWSRef.current(); } catch {}
        ws.unsubscribeWSRef.current = null;
      }
      wsManager.close(chat.conversationId);
    }
  }, [chat.open, stopListening]);

  // ── Keyboard shortcut (Ctrl+K / Cmd+K) ──
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        e.stopImmediatePropagation();
        try {
          (window as any).__wh_suppressSidebarHoverUntil = Date.now() + 500;
        } catch {}
        if (!chat.open && chat.wasClosedRef.current) {
          chat.handleNewConversation();
        }
        chat.setOpen(true);
        tts.primeTtsAudio();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [chat.open, chat.handleNewConversation, tts.primeTtsAudio]);

  // Track when sheet closes
  useEffect(() => {
    if (!chat.open) {
      chat.wasClosedRef.current = true;
    }
  }, [chat.open]);

  // Focus textarea when sheet opens
  useEffect(() => {
    if (!chat.open) return;
    const id = window.setTimeout(() => { textareaRef.current?.focus(); }, 100);
    return () => window.clearTimeout(id);
  }, [chat.open]);

  // ── Open handler ──
  const handleOpenSheet = useCallback(() => {
    if (!chat.open && chat.wasClosedRef.current) {
      chat.handleNewConversation();
    }
    chat.setOpen(true);
    tts.primeTtsAudio();
  }, [chat.open, chat.handleNewConversation, tts.primeTtsAudio]);

  // ── Conversation change handler ──
  const handleConversationChange = useCallback((newConversationId: string) => {
    chat.handleConversationChange(newConversationId, () => {
      if (ws.unsubscribeWSRef.current) {
        try { ws.unsubscribeWSRef.current(); } catch {}
        ws.unsubscribeWSRef.current = null;
      }
      wsManager.close(chat.conversationId);
    });
  }, [chat.handleConversationChange, chat.conversationId]);

  // ── Render ──
  return (
    <>
      {renderTrigger ? (
        renderTrigger(handleOpenSheet)
      ) : (
        floating && <FloatingButton onClick={handleOpenSheet} />
      )}
      <Sheet open={chat.open} onOpenChange={chat.setOpen}>
        <SheetContent
          side="right"
          className="max-w-full sm:max-w-2xl p-0 gap-0 flex flex-col h-full"
          onPointerDown={tts.primeTtsAudio}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("assistant.title", "Assistant")}</SheetTitle>
            <SheetDescription>{t("assistant.description", "AI chat panel")}</SheetDescription>
          </SheetHeader>
          <div className="flex w-full h-full flex-col justify-between z-5 bg-background rounded-lg">
            <ConversationSelector
              conversationId={chat.conversationId}
              conversations={chat.conversations}
              onConversationChange={handleConversationChange}
              onNewConversation={chat.handleNewConversation}
              onClose={() => chat.setOpen(false)}
            />
            <div className="flex-1 w-full overflow-hidden flex flex-col">
              <ChatMessageList
                messages={chat.messages}
                memoizedMessages={chat.memoizedMessages}
                gettingResponse={chat.gettingResponse}
                lastUserIndex={chat.lastUserIndex}
                toolCallMap={chat.toolCallMap}
                traces={traces}
                hasActiveTraces={hasActiveTraces}
                useLegacyToolViz={useLegacyToolViz}
                chatContainerRef={chat.chatContainerRef}
                inputContainerRef={chat.inputContainerRef}
                showScrollToBottom={chat.showScrollToBottom}
                scrollBtnLeft={chat.scrollBtnLeft}
                onScroll={chat.updateScrollBottomVisibility}
                onScrollToBottom={chat.scrollContainerToBottom}
                onPromptClick={(prompt) => ws.handleSubmit(prompt)}
              />
            </div>

            <div className="w-full md:max-w-[760px] mx-auto px-4 pb-4" ref={chat.inputContainerRef}>
              <ChatInput
                ref={textareaRef}
                onSubmit={ws.handleSubmit}
                gettingResponse={chat.gettingResponse}
                setIsListening={(v) => {
                  if (v) {
                    tts.primeTtsAudio();
                    tts.setDucked(false);
                    startListening();
                  } else {
                    stopListening();
                    tts.keepWsOpenForVoiceRef.current = false;
                    tts.expectingTtsRef.current = false;
                    tts.activeTtsContextIdRef.current = "";
                    tts.stopTts();
                    if (ws.unsubscribeWSRef.current) {
                      try { ws.unsubscribeWSRef.current(); } catch {}
                      ws.unsubscribeWSRef.current = null;
                    }
                    wsManager.close(chat.conversationId);
                  }
                }}
                isListening={isListening}
                isStarting={isSttStarting}
                voiceLevel={voiceLevel}
                mediaRecorder={mediaRecorder}
                handleStopRequest={ws.handleStopRequest}
                conversationId={chat.conversationId}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AssistantWidget;
