import { DB } from "../database";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type { AppState } from "@excalidraw/excalidraw/types/types";

// Legacy types kept for reference / migration
export interface Page {
  id: string;
  name: string;
  elements: DrawingElement[];
}

export interface DrawingElement {
  id: string;
  type: 'select' | 'draw' | 'erase' | 'text' | 'rectangle' | 'circle' | 'line';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  lineWidth: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardData {
  workspaceId: string;
  elements: readonly ExcalidrawElement[];
  appState?: Partial<AppState>;
  // Legacy fields (kept for backwards compat during migration)
  pages?: Page[];
  currentPageIndex?: number;
  history?: Page[][];
}

/**
 * Cache for whiteboard data stored per workspace in IndexedDB
 */
export class WhiteboardCache {
  private static readonly STORE_NAME = 'whiteboards';

  /**
   * Get whiteboard data for a workspace
   */
  static async getWhiteboard(workspaceId: string): Promise<WhiteboardData | null> {
    if (!DB.inited) await DB.init();
    if (!workspaceId) return null;

    try {
      const data = await DB.get(WhiteboardCache.STORE_NAME, workspaceId);
      return data || null;
    } catch (error) {
      console.error('[WhiteboardCache] Failed to get whiteboard:', error);
      return null;
    }
  }

  /**
   * Save whiteboard data for a workspace
   */
  static async saveWhiteboard(data: WhiteboardData): Promise<void> {
    if (!DB.inited) await DB.init();
    if (!data.workspaceId) {
      console.error('[WhiteboardCache] Cannot save whiteboard without workspaceId');
      return;
    }

    try {
      await DB.put(WhiteboardCache.STORE_NAME, {
        workspaceId: data.workspaceId,
        elements: data.elements,
        appState: data.appState,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('[WhiteboardCache] Failed to save whiteboard:', error);
      throw error;
    }
  }

  /**
   * Delete whiteboard data for a workspace
   */
  static async deleteWhiteboard(workspaceId: string): Promise<void> {
    if (!DB.inited) await DB.init();
    if (!workspaceId) return;

    try {
      await DB.delete(WhiteboardCache.STORE_NAME, workspaceId);
    } catch (error) {
      console.error('[WhiteboardCache] Failed to delete whiteboard:', error);
    }
  }
}
