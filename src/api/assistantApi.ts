import { auth } from '@/firebase/firebaseConfig';
import { getEnvVariables } from '@/lib/getEnvVariables';
import { Logger } from '@/utils/logger';

const { VITE_CHAT_URL, VITE_API_URL, VITE_DEVELOPMENT } = getEnvVariables();
const CHAT_HOST = VITE_CHAT_URL || VITE_API_URL || window.location.origin;

function getBaseUrl(): string {
  const isDev = VITE_DEVELOPMENT === 'true' || VITE_DEVELOPMENT === true;
  const protocol = isDev ? 'http' : 'https';
  return `${protocol}://${CHAT_HOST}/api/v1`;
}

/** Minimum character length to trigger a rewrite suggestion. */
export const REWRITE_MIN_LENGTH = 15;

/** Idle debounce (ms) before requesting a suggestion while still focused. */
export const REWRITE_DEBOUNCE_MS = 1500;

/** Read the user's preferred language from localStorage (same key as LanguageProvider). */
function getLanguage(): string {
  return localStorage.getItem('whagons-preferred-language') || 'en';
}

/**
 * Calls the whagons_assistant /llm/rewrite endpoint to fix spelling
 * and improve wording of the given text.
 *
 * Returns the rewritten text, or null if nothing changed / something failed.
 */
export async function rewriteText(
  text: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    let token: string | undefined;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }

    const res = await fetch(`${getBaseUrl()}/llm/rewrite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, language: getLanguage() }),
      signal,
    });

    if (!res.ok) {
      Logger.warn('assistant', `[rewriteText] Groq rewrite failed with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const rewritten = data.rewritten_text;
    // Only return if meaningfully different
    if (rewritten && rewritten.trim() !== text.trim()) {
      return rewritten;
    }
    return null;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    Logger.error('assistant', '[rewriteText] Error calling rewrite endpoint:', err);
    return null;
  }
}
