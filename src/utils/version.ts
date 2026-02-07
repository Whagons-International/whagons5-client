/**
 * Application version information.
 * 
 * Values are injected at build time by Vite:
 * - __APP_VERSION__: from package.json (e.g., "5.1.0")
 * - __GIT_COMMIT__: short git commit hash (e.g., "f13166e")
 * - __BUILD_TIME__: ISO timestamp of build
 */

declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
export const GIT_COMMIT = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

/**
 * Get the display version for the sidebar (just the version number)
 */
export function getDisplayVersion(): string {
  return `${APP_VERSION}`;
}

/**
 * Get the full version string with commit hash (for details/about views)
 */
export function getFullVersion(): string {
  return `${APP_VERSION} (${GIT_COMMIT})`;
}

/**
 * Get all version info as an object (for debugging or detailed views)
 */
export function getVersionInfo() {
  return {
    version: APP_VERSION,
    commit: GIT_COMMIT,
    buildTime: BUILD_TIME,
    fullVersion: getFullVersion(),
  };
}
