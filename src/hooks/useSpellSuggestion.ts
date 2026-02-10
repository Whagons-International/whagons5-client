import { useRef, useCallback, useState, useEffect } from 'react';
import { rewriteText, REWRITE_MIN_LENGTH, REWRITE_DEBOUNCE_MS } from '@/api/assistantApi';

export function useSpellSuggestion(
  value: string,
  setValue: (v: string) => void,
) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const valueRef = useRef(value);
  const lastRequestedRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const focusedRef = useRef(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
  }, []);

  const cancelDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
  }, []);

  const requestSuggestion = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < REWRITE_MIN_LENGTH || trimmed === lastRequestedRef.current) {
      return;
    }
    lastRequestedRef.current = trimmed;
    cancelRequest();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    console.log('[useSpellSuggestion] requesting suggestion for:', trimmed.slice(0, 40) + '...');

    const result = await rewriteText(trimmed, controller.signal);

    if (!controller.signal.aborted) {
      if (result) {
        console.log('[useSpellSuggestion] got suggestion:', result.slice(0, 40) + '...');
        setSuggestion(result);
      } else {
        console.log('[useSpellSuggestion] no change from LLM');
      }
      setIsLoading(false);
    }
  }, [cancelRequest]);

  const onValueChange = useCallback((_v: string) => {
    console.log('[useSpellSuggestion] onValueChange — clearing suggestion');
    setSuggestion(null);
    cancelDebounce();
    cancelRequest();
    setIsLoading(false);

    if (!focusedRef.current) return;

    debounceRef.current = setTimeout(() => {
      const current = valueRef.current.trim();
      if (current.length >= REWRITE_MIN_LENGTH && current !== lastRequestedRef.current) {
        requestSuggestion(current);
      }
    }, REWRITE_DEBOUNCE_MS);
  }, [cancelDebounce, cancelRequest, requestSuggestion]);

  const onFocus = useCallback(() => {
    console.log('[useSpellSuggestion] onFocus');
    focusedRef.current = true;
  }, []);

  const onBlur = useCallback(() => {
    console.log('[useSpellSuggestion] onBlur — suggestion is:', suggestion ? 'present' : 'null');
    focusedRef.current = false;
    cancelDebounce();
    const current = valueRef.current.trim();
    if (current.length >= REWRITE_MIN_LENGTH && current !== lastRequestedRef.current && !suggestion) {
      requestSuggestion(current);
    }
  }, [cancelDebounce, requestSuggestion, suggestion]);

  const accept = useCallback(() => {
    console.log('[useSpellSuggestion] accept() called, suggestion:', suggestion ? suggestion.slice(0, 40) + '...' : 'null');
    if (suggestion) {
      setValue(suggestion);
      lastRequestedRef.current = suggestion.trim();
      setSuggestion(null);
    }
  }, [suggestion, setValue]);

  const dismiss = useCallback(() => {
    console.log('[useSpellSuggestion] dismiss() called');
    setSuggestion(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelDebounce();
      cancelRequest();
    };
  }, [cancelDebounce, cancelRequest]);

  return {
    suggestion,
    isLoading,
    accept,
    dismiss,
    onValueChange,
    onFocus,
    onBlur,
  };
}
