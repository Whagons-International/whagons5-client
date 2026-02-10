import { generateUUID } from "@/utils/uuid";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Prism from "prismjs";
import { Message } from "../models";
import type { ToolCallMap } from "../components/ToolMessageRenderer";
import {
  getConversations,
  saveMessages,
  loadMessages,
  createConversation,
  type Conversation,
} from "../utils/conversationStorage";

// Height offsets for scroll spacer and assistant message min-height
export const SPACER_OFFSET = 850;
export const ASSISTANT_MIN_HEIGHT_OFFSET = 280;

export interface UseChatMessagesReturn {
  // Core message state
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  gettingResponse: boolean;
  setGettingResponse: React.Dispatch<React.SetStateAction<boolean>>;

  // Conversation management
  conversationId: string;
  setConversationId: React.Dispatch<React.SetStateAction<string>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  handleNewConversation: () => void;
  handleConversationChange: (newConversationId: string, wsCleanup: () => void) => void;

  // Derived memos
  memoizedMessages: Message[];
  lastUserIndex: number;
  toolCallMap: ToolCallMap;

  // Scroll
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  inputContainerRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  scrollBtnLeft: number | undefined;
  scrollToBottom: () => void;
  scrollContainerToBottom: () => void;
  updateScrollBottomVisibility: () => void;

  // Abort ref
  abortControllerRef: React.MutableRefObject<boolean>;

  // Sheet open state
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  wasClosedRef: React.MutableRefObject<boolean>;
}

export function useChatMessages(
  isListening: boolean,
): UseChatMessagesReturn {
  const [open, setOpen] = useState(false);
  const [gettingResponse, setGettingResponse] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>(() => {
    const conversations = getConversations();
    return conversations.length > 0 ? conversations[0].id : generateUUID().toString();
  });
  const [conversations, setConversations] = useState<Conversation[]>(() => getConversations());
  const abortControllerRef = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);
  const [scrollBtnLeft, setScrollBtnLeft] = useState<number | undefined>(undefined);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string>(conversationId);
  const wasClosedRef = useRef<boolean>(true);

  // ── Derived memos ──

  const memoizedMessages = useMemo(() => messages, [messages]);

  const lastUserIndex = useMemo(() => {
    const arr = memoizedMessages;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]?.role === "user") return i;
    }
    return -1;
  }, [memoizedMessages]);

  const toolCallMap = useMemo<ToolCallMap>(() => {
    const map: ToolCallMap = new Map();
    for (const msg of memoizedMessages) {
      if (msg.role === 'tool_call' && typeof msg.content === 'object' && msg.content !== null) {
        const contentObj = msg.content as any;
        if (contentObj.tool_call_id) {
          const toolCallId = String(contentObj.tool_call_id);
          if (toolCallId && toolCallId.length > 0) {
            map.set(toolCallId, msg);
          }
        }
      }
    }
    return map;
  }, [memoizedMessages]);

  // ── Scroll helpers ──

  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const lastUser = document.getElementById("last-user-message");
    const target = lastUser || document.getElementById("last-message");
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const topOffset = -20;
    const targetRelativeTop = targetRect.top - containerRect.top;
    const scrollAmount = targetRelativeTop - topOffset;

    container.scrollTo({
      top: container.scrollTop + scrollAmount,
      behavior: "smooth",
    });
  }, []);

  const scrollContainerToBottom = useCallback(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    setShowScrollToBottom(false);
  }, []);

  const updateScrollButtonPosition = useCallback(() => {
    try {
      const rect = inputContainerRef.current?.getBoundingClientRect();
      if (rect) {
        setScrollBtnLeft(rect.left + rect.width / 2);
      }
    } catch {}
  }, []);

  const updateScrollBottomVisibility = useCallback(() => {
    if (!chatContainerRef.current) return;
    const distanceFromBottom =
      chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop - chatContainerRef.current.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 120);
    updateScrollButtonPosition();
  }, [updateScrollButtonPosition]);

  // ── Conversation management ──

  const handleNewConversation = useCallback(() => {
    if (messages.length > 0) {
      saveMessages(conversationId, messages);
    }
    const newId = generateUUID().toString();
    createConversation(newId, "New conversation");
    setConversationId(newId);
    setMessages([]);
    setGettingResponse(false);
    previousConversationIdRef.current = newId;
    setConversations(getConversations());
    wasClosedRef.current = false;
  }, [messages, conversationId]);

  const handleConversationChange = useCallback((newConversationId: string, wsCleanup: () => void) => {
    if (newConversationId === conversationId) return;
    if (messages.length > 0) {
      saveMessages(conversationId, messages);
    }
    setConversationId(newConversationId);
    setGettingResponse(false);
    wsCleanup();
  }, [messages, conversationId]);

  // ── Effects: persistence ──

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      saveMessages(conversationId, messages);
    }
  }, [messages, conversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId !== previousConversationIdRef.current) {
      const loadedMessages = loadMessages(conversationId);
      setMessages(loadedMessages);
      previousConversationIdRef.current = conversationId;
      setConversations(getConversations());
      setTimeout(() => scrollContainerToBottom(), 50);
    }
  }, [conversationId, scrollContainerToBottom]);

  // Load conversations when sheet opens
  useEffect(() => {
    if (open) {
      setConversations(getConversations());
      const loadedMessages = loadMessages(conversationId);
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
        setTimeout(() => scrollContainerToBottom(), 50);
      }
    }
  }, [open, conversationId, scrollContainerToBottom]);

  // Prism highlighting + scroll visibility after message changes
  useEffect(() => {
    if (messages.length > 0) {
      Prism.highlightAll();
    }
    queueMicrotask(() => updateScrollBottomVisibility());
  }, [messages, updateScrollBottomVisibility]);

  // ── Effects: voice auto-scroll ──

  useEffect(() => {
    if (isListening) {
      queueMicrotask(() => { scrollContainerToBottom(); });
    }
  }, [isListening, scrollContainerToBottom]);

  useEffect(() => {
    if (isListening && messages.length > 0) {
      const timeoutId = setTimeout(() => { scrollContainerToBottom(); }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isListening, scrollContainerToBottom]);

  useEffect(() => {
    if (isListening && gettingResponse) {
      queueMicrotask(() => { scrollContainerToBottom(); });
    }
  }, [gettingResponse, isListening, scrollContainerToBottom]);

  // Scroll to bottom when sheet opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => scrollToBottom());
    }
  }, [open, scrollToBottom]);

  return {
    messages,
    setMessages,
    gettingResponse,
    setGettingResponse,
    conversationId,
    setConversationId,
    conversations,
    setConversations,
    handleNewConversation,
    handleConversationChange,
    memoizedMessages,
    lastUserIndex,
    toolCallMap,
    chatContainerRef,
    inputContainerRef,
    showScrollToBottom,
    scrollBtnLeft,
    scrollToBottom,
    scrollContainerToBottom,
    updateScrollBottomVisibility,
    abortControllerRef,
    open,
    setOpen,
    wasClosedRef,
  };
}
