import * as React from "react"

import { cn } from "@/lib/utils"
import { useSpellSuggestion } from "@/hooks/useSpellSuggestion"
import { SpellSuggestionTooltip, SpellLoadingIndicator } from "./spell-suggestion"

/** Input types that contain free-form prose worth spell-checking. */
const SPELL_CHECK_TYPES = new Set<string | undefined>([undefined, "text", "search"]);

interface InputProps extends React.ComponentProps<"input"> {
  /** Set to false to disable spell-correction suggestions for this field. */
  spellSuggest?: boolean;
}

const Input = React.forwardRef<React.ElementRef<"input">, InputProps>(
  ({ className, type, spellSuggest, onChange, onFocus, onBlur, value, defaultValue, ...props }, ref) => {

    const shouldSuggest = spellSuggest !== false && SPELL_CHECK_TYPES.has(type);

    // We need an internal ref for the anchor; merge with the forwarded ref.
    const innerRef = React.useRef<HTMLInputElement>(null);
    const mergedRef = useMergedRef(ref, innerRef);

    // Track controlled value for the hook
    const controlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      () => (typeof defaultValue === "string" ? defaultValue : "") as string,
    );
    const currentValue = controlled ? String(value ?? "") : internalValue;

    // Setter that fires the consumer's onChange via a synthetic-ish event
    const setValue = React.useCallback(
      (v: string) => {
        const el = innerRef.current;
        if (!el) return;
        // Use native setter so React picks up the change
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        nativeSetter?.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      [],
    );

    const spell = useSpellSuggestion(currentValue, setValue);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!controlled) setInternalValue(e.target.value);
        if (shouldSuggest) spell.onValueChange(e.target.value);
        onChange?.(e);
      },
      [controlled, shouldSuggest, spell, onChange],
    );

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (shouldSuggest) spell.onFocus();
        onFocus?.(e);
      },
      [shouldSuggest, spell, onFocus],
    );

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (shouldSuggest) spell.onBlur();
        onBlur?.(e);
      },
      [shouldSuggest, spell, onBlur],
    );

    return (
      <>
        <input
          type={type}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
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

Input.displayName = "Input";

export { Input };

// ── helpers ──────────────────────────────────────────────────────────────────

/** Merge a forwarded ref and a local ref into one callback ref. */
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
