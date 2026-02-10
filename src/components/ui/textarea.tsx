import * as React from "react"

import { cn } from "@/lib/utils"
import { useSpellSuggestion } from "@/hooks/useSpellSuggestion"
import { SpellSuggestionTooltip, SpellLoadingIndicator } from "./spell-suggestion"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  /** Set to false to disable spell-correction suggestions for this field. */
  spellSuggest?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, spellSuggest, onChange, onFocus, onBlur, value, defaultValue, ...props }, ref) => {

    const shouldSuggest = spellSuggest !== false;

    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    const mergedRef = useMergedRef(ref, innerRef);

    const controlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      () => (typeof defaultValue === "string" ? defaultValue : "") as string,
    );
    const currentValue = controlled ? String(value ?? "") : internalValue;

    const setValue = React.useCallback(
      (v: string) => {
        const el = innerRef.current;
        if (!el) return;
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        nativeSetter?.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      [],
    );

    const spell = useSpellSuggestion(currentValue, setValue);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!controlled) setInternalValue(e.target.value);
        if (shouldSuggest) spell.onValueChange(e.target.value);
        onChange?.(e);
      },
      [controlled, shouldSuggest, spell, onChange],
    );

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (shouldSuggest) spell.onFocus();
        onFocus?.(e);
      },
      [shouldSuggest, spell, onFocus],
    );

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (shouldSuggest) spell.onBlur();
        onBlur?.(e);
      },
      [shouldSuggest, spell, onBlur],
    );

    return (
      <>
        <textarea
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={mergedRef}
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {shouldSuggest && (
          <>
            <SpellLoadingIndicator isLoading={spell.isLoading} anchorRef={innerRef} />
            <SpellSuggestionTooltip
              suggestion={spell.suggestion}
              isLoading={spell.isLoading}
              onAccept={spell.accept}
              onDismiss={spell.dismiss}
              anchorRef={innerRef}
            />
          </>
        )}
      </>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };

// ── helpers ──────────────────────────────────────────────────────────────────

function useMergedRef<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return React.useCallback(
    (node: T | null) => {
      for (const r of refs) {
        if (typeof r === "function") r(node);
        else if (r && typeof r === "object") {
          (r as React.MutableRefObject<T | null>).current = node;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  );
}
