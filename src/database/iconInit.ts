import { iconService } from './iconService';

import { Logger } from '@/utils/logger';
/**
 * Initialize icon service
 * This should be called when the app starts
 */
export async function initializeIcons(): Promise<void> {
  try {
    // Only clear outdated icons on startup, don't preload
    await iconService.clearOutdatedIcons();
    
    // Log cache statistics for debugging
    const stats = await iconService.getCacheStats();
    // Logger.info('icons', 'Icon cache initialized:', stats);
  } catch (error) {
    Logger.error('icons', 'Error initializing icon cache:', error);
  }
}

/**
 * Preload common icons (call this only when needed)
 */
export async function preloadCommonIcons(): Promise<void> {
  try {
    await iconService.preloadCommonIcons();
    Logger.info('icons', 'Common icons preloaded');
  } catch (error) {
    Logger.error('icons', 'Error preloading common icons:', error);
  }
}

// Auto-initialize when this module is imported (lightweight)
initializeIcons(); 