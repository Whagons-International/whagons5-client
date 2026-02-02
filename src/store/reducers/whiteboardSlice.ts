import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WhiteboardCache, WhiteboardData, Page } from "../indexedDB/WhiteboardCache";

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
      
      // If no data exists, create default whiteboard
      if (!data) {
        const defaultData: WhiteboardData = {
          workspaceId,
          pages: [{ id: '1', name: 'Page 1', elements: [] }],
          currentPageIndex: 0,
          history: [],
        };
        return defaultData;
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
  async ({ workspaceId, payload }: { workspaceId: string; payload: { pages: Page[]; currentPageIndex: number; history: Page[][] } }, { rejectWithValue }) => {
    if (!workspaceId) {
      return rejectWithValue('Workspace ID is required');
    }

    try {
      const data: WhiteboardData = {
        workspaceId,
        pages: payload.pages,
        currentPageIndex: payload.currentPageIndex,
        history: payload.history,
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
    setPages: (state, action: PayloadAction<Page[]>) => {
      if (state.data) {
        state.data.pages = action.payload;
      }
    },
    setCurrentPageIndex: (state, action: PayloadAction<number>) => {
      if (state.data) {
        state.data.currentPageIndex = action.payload;
      }
    },
    setHistory: (state, action: PayloadAction<Page[][]>) => {
      if (state.data) {
        state.data.history = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load whiteboard
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

    // Save whiteboard
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

export const { setPages, setCurrentPageIndex, setHistory, clearError } = whiteboardSlice.actions;
export default whiteboardSlice.reducer;
