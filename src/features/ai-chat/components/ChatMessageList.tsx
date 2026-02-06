import React from "react";
import { Message } from "../models";
import type { ToolCallMap } from "./ToolMessageRenderer";
import ChatMessageItem from "./ChatMessageItem";
import ToolMessageRenderer from "./ToolMessageRenderer";
import ExecutionTraceTimeline from "./ExecutionTraceTimeline";
import { LoadingWidget } from "./LoadingWidget";
import NewChat from "./NewChat";
import { extractGeneratedImageUrl } from "../utils/extractGeneratedImageUrl";
import { useLanguage } from "@/providers/LanguageProvider";
import { SPACER_OFFSET, ASSISTANT_MIN_HEIGHT_OFFSET } from "../hooks/useChatMessages";

interface ChatMessageListProps {
  messages: Message[];
  memoizedMessages: Message[];
  gettingResponse: boolean;
  lastUserIndex: number;
  toolCallMap: ToolCallMap;
  traces: Map<string, any>;
  hasActiveTraces: () => boolean;
  useLegacyToolViz: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  inputContainerRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  scrollBtnLeft: number | undefined;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onPromptClick: (prompt: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  memoizedMessages,
  gettingResponse,
  lastUserIndex,
  toolCallMap,
  traces,
  hasActiveTraces,
  useLegacyToolViz,
  chatContainerRef,
  inputContainerRef,
  showScrollToBottom,
  scrollBtnLeft,
  onScroll,
  onScrollToBottom,
  onPromptClick,
}) => {
  const { t } = useLanguage();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col w-full md:max-w-[900px] mx-auto justify-center">
        <NewChat onPromptClick={onPromptClick} />
      </div>
    );
  }

  const renderMessage = (message: Message, index: number) => {
    if (message.role === "user" || message.role === "assistant") {
      return (
        <ChatMessageItem
          key={index}
          message={message}
          messages={memoizedMessages}
          isLast={index === memoizedMessages.length - 1}
          gettingResponse={gettingResponse && index === memoizedMessages.length - 1}
          isLastUser={index === lastUserIndex}
        />
      );
    }
    if (useLegacyToolViz) {
      return (
        <ToolMessageRenderer
          key={index}
          message={message}
          messages={memoizedMessages}
          index={index}
          toolCallMap={toolCallMap}
        />
      );
    }
    if (message.role === "tool_result") {
      const content = message.content as any;
      const toolCallId = content?.tool_call_id;
      const toolCallMsg = toolCallId ? toolCallMap.get(toolCallId) : null;
      const toolName = (toolCallMsg?.content as any)?.name;
      if (toolName === "Generate_Image") {
        const imageUrl = extractGeneratedImageUrl(content);
        if (imageUrl) {
          return (
            <div key={index} className="px-4 py-2">
              <img src={imageUrl} alt="Generated image" className="max-w-full md:max-w-md rounded-lg shadow-lg" loading="lazy" />
            </div>
          );
        }
      }
      return null;
    }
    if (message.role === "tool_call" && typeof message.content === "object" && message.content !== null) {
      const prevMessage = index > 0 ? memoizedMessages[index - 1] : null;
      if (prevMessage?.role === "tool_call" || prevMessage?.role === "tool_result") return null;
      const groupToolCallIds = new Set<string>();
      for (let j = index; j < memoizedMessages.length; j++) {
        const m = memoizedMessages[j];
        if (m.role === "tool_call" && typeof m.content === "object" && m.content !== null) {
          const c = m.content as any;
          if (c.tool_call_id) groupToolCallIds.add(c.tool_call_id);
        } else if (m.role === "tool_result") {
          continue;
        } else {
          break;
        }
      }
      const groupTraces = new Map<string, typeof traces extends Map<string, infer V> ? V : never>();
      for (const toolCallId of groupToolCallIds) {
        if (traces.has(toolCallId)) groupTraces.set(toolCallId, traces.get(toolCallId)!);
      }
      if (groupTraces.size > 0) {
        return (
          <div key={index} className="pt-3 pl-3 pr-3">
            <ExecutionTraceTimeline traces={groupTraces} isExpanded={hasActiveTraces()} />
          </div>
        );
      }
      return null;
    }
    return null;
  };

  // Messages before last user (no min-height)
  const beforeContent = lastUserIndex > 0
    ? memoizedMessages.slice(0, lastUserIndex).map((msg, idx) => renderMessage(msg, idx))
    : null;

  // Last user message + all AI response (with min-height)
  const lastTurnContent = lastUserIndex >= 0 ? (
    <div key="last-turn" style={{ minHeight: `calc(100vh - ${ASSISTANT_MIN_HEIGHT_OFFSET}px)` }}>
      {memoizedMessages.slice(lastUserIndex).map((msg, idx) => renderMessage(msg, lastUserIndex + idx))}
      {gettingResponse &&
        memoizedMessages.length > 0 &&
        memoizedMessages[memoizedMessages.length - 1].role === "user" && (
        <div className="pl-5 pt-2">
          <LoadingWidget size={40} strokeWidthRatio={8} color="currentColor" cycleDuration={0.9} />
        </div>
      )}
      {gettingResponse && hasActiveTraces() && (
        <div className="pt-3 pl-3 pr-3">
          <ExecutionTraceTimeline traces={traces} isExpanded={true} />
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="w-full h-full flex flex-col flex-1">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain Chat-Container scrollbar rounded-t-lg w-full"
        onScroll={onScroll}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-10 pt-4">
          {beforeContent}
          {lastTurnContent}
          <div id="last-message" className="h-1"></div>
          {/* Spacer to allow scrolling user message to top when waiting for AI response */}
          {gettingResponse && <div style={{ height: `calc(100vh - ${SPACER_OFFSET}px)` }} />}
        </div>
      </div>
      {showScrollToBottom && (
        <div
          className="fixed z-[1050]"
          style={{ bottom: `${((inputContainerRef.current?.offsetHeight ?? 84) + 12)}px`, left: `${scrollBtnLeft ?? window.innerWidth / 2}px`, transform: 'translateX(-50%)' }}
        >
          <button
            type="button"
            className="px-3 py-1.5 rounded-full bg-card/70 backdrop-blur border border-border/60 shadow-sm text-xs text-foreground hover:bg-card/90 transition-colors flex items-center gap-1.5"
            onClick={onScrollToBottom}
          >
            <span>{t("assistant.scrollToBottom", "Scroll to bottom")}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
              <path d="M12 16a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 13.586l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 16z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
