/**
 * Module-level state for spot-based visibility that can be read from
 * non-React contexts (e.g. CacheRegistry, real-time event handlers).
 *
 * The AuthProvider updates this when the user logs in or their spots change.
 */

interface SpotVisibilityState {
  userSpots: (string | number)[] | null | undefined;
  isAdmin: boolean;
}

let _state: SpotVisibilityState = {
  userSpots: null,
  isAdmin: false,
};

export function setSpotVisibilityState(state: SpotVisibilityState): void {
  _state = { ...state };
}

export function getSpotVisibilityState(): SpotVisibilityState {
  return _state;
}
