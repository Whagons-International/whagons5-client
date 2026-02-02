import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WhiteboardCache, WhiteboardData } from "../indexedDB/WhiteboardCache";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type { AppState } from "@excalidraw/excalidraw/types/types";

export interface WhiteboardState {
  data: WhiteboardData | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

const initialState: WhiteboardState = {
  data: null,
  loading: false,
  error: null,
  saving: false,
};

/**
 * Load whiteboard data for a workspace from IndexedDB
 */
export const loadWhiteboard = createAsyncThunk(
  'whiteboard/loadWhiteboard',
  async (workspaceId: string, { rejectWithValue }) => {
    if (!workspaceId) {
      return rejectWithValue('Workspace ID is required');
    }

    try {
      const data = await WhiteboardCache.getWhiteboard(workspaceId);
      
      if (!data) {
        const defaultData: WhiteboardData = {
          workspaceId,
          elements: [],
          appState: {},
        };
        return defaultData;
      }

      // Migration: if old format detected (has pages but no elements at root)
      if (data.pages && !data.elements) {
        return {
          workspaceId,
          elements: [],
          appState: {},
        } as WhiteboardData;
      }

      return data;
    } catch (error: any) {
      console.error('[whiteboardSlice] Failed to load whiteboard:', error);
      return rejectWithValue(error?.message || 'Failed to load whiteboard');
    }
  }
);

/**
 * Save whiteboard data for a workspace to IndexedDB
 */
export const saveWhiteboard = createAsyncThunk(
  'whiteboard/saveWhiteboard',
  async ({ workspaceId, elements, appState }: { workspaceId: string; elements: readonly ExcalidrawElement[]; appState?: Partial<AppState> }, { rejectWithValue }) => {
    if (!workspaceId) {
      return rejectWithValue('Workspace ID is required');
    }

    try {
      const data: WhiteboardData = {
        workspaceId,
        elements,
        appState,
      };

      await WhiteboardCache.saveWhiteboard(data);
      return data;
    } catch (error: any) {
      console.error('[whiteboardSlice] Failed to save whiteboard:', error);
      return rejectWithValue(error?.message || 'Failed to save whiteboard');
    }
  }
);

const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    setElements: (state, action: PayloadAction<readonly ExcalidrawElement[]>) => {
      if (state.data) {
        state.data.elements = action.payload;
      }
    },
    setAppState: (state, action: PayloadAction<Partial<AppState>>) => {
      if (state.data) {
        state.data.appState = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWhiteboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadWhiteboard.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(loadWhiteboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(saveWhiteboard.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveWhiteboard.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(saveWhiteboard.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { setElements, setAppState, clearError } = whiteboardSlice.actions;
export default whiteboardSlice.reducer;
