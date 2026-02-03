import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Users, Settings, HelpCircle, FileText } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

interface PromptButton {
  labelKey: string;
  labelDefault: string;
  promptKey: string;
  promptDefault: string;
}

const topicButtons = [
  { labelKey: "assistant.topics.tasks", labelDefault: "Tasks", id: "tasks", icon: FileText },
  { labelKey: "assistant.topics.settings", labelDefault: "Settings", id: "settings", icon: Settings },
  { labelKey: "assistant.topics.teams", labelDefault: "Teams", id: "teams", icon: Users },
  { labelKey: "assistant.topics.help", labelDefault: "Help", id: "help", icon: HelpCircle },
];

const promptSuggestionsByTopic: Record<string, PromptButton[]> = {
  tasks: [
    {
      labelKey: "assistant.prompts.tasks.createTask",
      labelDefault: "How do I create a new task?",
      promptKey: "assistant.prompts.tasks.createTask",
      promptDefault: "How do I create a new task?",
    },
    {
      labelKey: "assistant.prompts.tasks.filterByStatus",
      labelDefault: "How can I filter tasks by status?",
      promptKey: "assistant.prompts.tasks.filterByStatus",
      promptDefault: "How can I filter tasks by status?",
    },
    {
      labelKey: "assistant.prompts.tasks.slasExplained",
      labelDefault: "What are SLAs and how do they work?",
      promptKey: "assistant.prompts.tasks.slasExplained",
      promptDefault: "What are SLAs and how do they work?",
    },
    {
      labelKey: "assistant.prompts.tasks.assignTasks",
      labelDefault: "How do I assign tasks to team members?",
      promptKey: "assistant.prompts.tasks.assignTasks",
      promptDefault: "How do I assign tasks to team members?",
    },
  ],
  settings: [
    {
      labelKey: "assistant.prompts.settings.configureStatuses",
      labelDefault: "How do I configure statuses?",
      promptKey: "assistant.prompts.settings.configureStatuses",
      promptDefault: "How do I configure statuses?",
    },
    {
      labelKey: "assistant.prompts.settings.templatesBestPractices",
      labelDefault: "Show me templates best practices",
      promptKey: "assistant.prompts.settings.templatesBestPractices",
      promptDefault: "Show me templates best practices",
    },
    {
      labelKey: "assistant.prompts.settings.manageTeams",
      labelDefault: "Where can I manage teams?",
      promptKey: "assistant.prompts.settings.manageTeams",
      promptDefault: "Where can I manage teams?",
    },
    {
      labelKey: "assistant.prompts.settings.customizeWorkspace",
      labelDefault: "How do I customize my workspace?",
      promptKey: "assistant.prompts.settings.customizeWorkspace",
      promptDefault: "How do I customize my workspace?",
    },
  ],
  teams: [
    {
      labelKey: "assistant.prompts.teams.addMembers",
      labelDefault: "How do I add team members?",
      promptKey: "assistant.prompts.teams.addMembers",
      promptDefault: "How do I add team members?",
    },
    {
      labelKey: "assistant.prompts.teams.managePermissions",
      labelDefault: "How do I manage team permissions?",
      promptKey: "assistant.prompts.teams.managePermissions",
      promptDefault: "How do I manage team permissions?",
    },
    {
      labelKey: "assistant.prompts.teams.teamRoles",
      labelDefault: "What are team roles?",
      promptKey: "assistant.prompts.teams.teamRoles",
      promptDefault: "What are team roles?",
    },
  ],
  help: [
    {
      labelKey: "assistant.prompts.help.whatCanYouDo",
      labelDefault: "What can you do?",
      promptKey: "assistant.prompts.help.whatCanYouDo",
      promptDefault: "What can you do?",
    },
    {
      labelKey: "assistant.prompts.help.keyboardShortcuts",
      labelDefault: "Keyboard shortcuts",
      promptKey: "assistant.prompts.help.keyboardShortcuts",
      promptDefault: "Keyboard shortcuts",
    },
    {
      labelKey: "assistant.prompts.help.getStarted",
      labelDefault: "How do I get started?",
      promptKey: "assistant.prompts.help.getStarted",
      promptDefault: "How do I get started?",
    },
  ],
};

interface NewChatProps {
  onPromptClick: (prompt: string) => void;
}

const NewChat: React.FC<NewChatProps> = ({ onPromptClick }) => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState(0);

  const currentPrompts = useMemo(() => {
    const selectedTopicId = topicButtons[selectedTab].id;
    return promptSuggestionsByTopic[selectedTopicId] || [];
  }, [selectedTab]);

  return (
    <div className="flex flex-col w-full px-4 sm:px-0 max-w-[600px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-semibold mb-8 text-left bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
        {t("assistant.greeting", "How can I help you today?")}
      </h1>

      <div className="w-full mb-8">
        <div className="flex flex-wrap gap-3 justify-start">
          {topicButtons.map((topic, index) => {
            const IconComponent = topic.icon;
            return (
              <Button
                key={topic.id}
                variant="outline"
                className={`h-auto min-h-[40px] px-4 py-2 text-center justify-center whitespace-nowrap flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedTab === index
                    ? 'bg-card border border-border/40 shadow-sm'
                    : 'bg-transparent hover:bg-card/30'
                }`}
                onClick={() => setSelectedTab(index)}
              >
                <IconComponent size={16} />
                {t(topic.labelKey, topic.labelDefault)}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="w-full">
        <div className="space-y-0">
          {currentPrompts.map((promptItem, index) => (
            <div key={index}>
              <button
                className="w-full text-left p-4 bg-transparent hover:bg-card/20 transition-colors duration-200 text-base font-medium rounded-xl"
                onClick={() => onPromptClick(t(promptItem.promptKey, promptItem.promptDefault))}
              >
                {t(promptItem.labelKey, promptItem.labelDefault)}
              </button>
              {index < currentPrompts.length - 1 && (
                <div className="border-b border-border/10 mx-2 my-1"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChat;
