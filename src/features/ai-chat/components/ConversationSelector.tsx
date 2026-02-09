import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Conversation } from "../utils/conversationStorage";

interface ConversationSelectorProps {
  conversationId: string;
  conversations: Conversation[];
  onConversationChange: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

const ConversationSelector: React.FC<ConversationSelectorProps> = ({
  conversationId,
  conversations,
  onConversationChange,
  onNewConversation,
  onClose,
}) => {
  const { t } = useLanguage();

  const currentConv = conversations.find(c => c.id === conversationId);
  const displayTitle = currentConv ? currentConv.title : t("assistant.newConversation", "New conversation");

  // Deduplicate conversations by ID, keeping most recent
  const uniqueConversations = Array.from(
    new Map(conversations.map(c => [c.id, c])).values()
  );

  // Filter to conversations with messages, or include current conversation
  const conversationsWithMessages = uniqueConversations.filter(
    conv => conv.messageCount > 0 || conv.id === conversationId
  );

  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/50">
      <Select value={conversationId} onValueChange={onConversationChange}>
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue>{displayTitle}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {conversationsWithMessages.length === 0 ? (
            <SelectItem value={conversationId} disabled>
              <span className="text-sm text-muted-foreground">
                {t("assistant.noPreviousConversations", "No previous conversations")}
              </span>
            </SelectItem>
          ) : (
            conversationsWithMessages.map((conv) => (
              <SelectItem key={conv.id} value={conv.id}>
                <div className="flex flex-col items-start gap-0.5 min-w-0 w-full">
                  <span className="text-sm truncate w-full">{conv.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString()} • {conv.messageCount} {t("assistant.messages", "messages")}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={onNewConversation}
        className="h-8 px-3 shrink-0"
        title={t("assistant.newConversation", "New conversation")}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 shrink-0"
        title={t("assistant.close", "Close")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ConversationSelector;
