# AI Chat Widget Sync Tracking

This file tracks synchronization between `whagons5-client/src/features/ai-chat` and `whagons_ai_client/src/aichat`.

We store the exact commit hash so we can run real git diffs to see exactly what changed since last sync, making updates easier.

## Last Sync

**whagons_ai_client commit**: `2e2fada7cf475b1a82948e7beb43449ab8c29d64`

**Date**: 2026-02-05

## Files Synced

### Copied/Adapted from whagons_ai_client

| whagons_ai_client | whagons5-client | Notes |
|-------------------|-----------------|-------|
| `src/aichat/models/traces.ts` | `src/features/ai-chat/models/traces.ts` | Direct copy |
| `src/aichat/hooks/useExecutionTraces.ts` | `src/features/ai-chat/hooks/useExecutionTraces.ts` | Adapted imports |
| `src/aichat/components/ExecutionTraceTimeline.tsx` | `src/features/ai-chat/components/ExecutionTraceTimeline.tsx` | Adapted theme provider import |
| `src/components/ui/loading-widget.tsx` | `src/features/ai-chat/components/LoadingWidget.tsx` | Rewritten to use CSS animations instead of gsap |
| `src/aichat/components/ToolMessageRenderer.tsx` | `src/features/ai-chat/components/ToolMessageRenderer.tsx` | Has extra image extraction logic in whagons5 |

### Key Differences

1. **LoadingWidget**: whagons5-client uses pure CSS/requestAnimationFrame instead of gsap (gsap not installed)
2. **Theme Provider**: Different import path (`@/providers/ThemeProvider` vs `@/lib/theme-provider`)
3. **ToolMessageRenderer**: whagons5-client has additional `extractImageUrlFromToolResult` logic for auto-rendering generated images
4. **AssistantWidget vs ChatWindow**: whagons5-client uses a Sheet-based widget, whagons_ai_client uses a full page

## Tools Available (whagons5 config)

The following tools are available and will generate execution traces:

| Tool | Category | Start Label | End Label |
|------|----------|-------------|-----------|
| Search | search | Searching: "query" | Searched: "query" |
| Execute_TypeScript | code | Executing code (+ internal traces) | Executed code |
| Generate_Image | image | Generating image | Generated image |
| List_Skill_Files | skills | Listing skills | Listed skills |
| Read_Skill_File | skills | Reading skill: name | Read skill: name |
| Edit_Skill_File | skills | Editing skill: name | Edited skill: name |
| Browser_Navigate | browser | Navigating to path | Navigated to path |
| Browser_Alert | browser | Showing alert | Showed alert |
| Browser_Prompt | browser | Prompting user | User responded |
| Sandbox_Run | browser | Running in sandbox | Sandbox completed |

**Note:** Execute_TypeScript also emits internal traces for operations like `web.get()`, `tavily.search()`, `math.evaluate()` etc. These are persisted to the database and loaded when viewing conversation history.

## How to Compare Changes

To see exactly what's changed in whagons_ai_client since last sync:

```bash
cd /path/to/whagons_ai_client
git diff 2e2fada7cf475b1a82948e7beb43449ab8c29d64..HEAD -- src/aichat/
```

This gives you a real diff of all changes, making it easy to identify what needs to be ported.

## How to Update

1. Check for changes using the diff command above
2. Review each changed file and determine if it should be ported
3. Port changes, adapting imports as needed
4. Update the commit hash in this file
5. Test the widget functionality

## Feature Parity Checklist

- [x] Execution trace handling in WebSocket
- [x] ExecutionTraceTimeline component
- [x] LoadingWidget component
- [x] useExecutionTraces hook
- [x] Trace synthesis for loaded conversations
- [x] Legacy tool viz toggle (`localStorage.setItem('use_legacy_tool_viz', '1')`)
- [x] Wave-text shimmer animation
- [x] Auto-generated image rendering (whagons5 extra feature)
- [ ] ConfirmationDialog component (not yet ported)
- [ ] HistoryWarningBanner component (not yet ported)
- [ ] Message queue system (not yet ported)
