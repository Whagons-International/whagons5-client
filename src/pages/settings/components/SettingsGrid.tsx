import { useRef, useCallback, useEffect, useMemo } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { RowGroupingModule, TreeDataModule, SetFilterModule, LicenseManager } from 'ag-grid-enterprise';

export const AG_GRID_LICENSE = import.meta.env.VITE_AG_GRID_LICENSE_KEY as string | undefined;

// Register AG Grid modules (community + enterprise needed for grouping/tree/set filter)
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, TreeDataModule, SetFilterModule]);

// Set license if available
if (AG_GRID_LICENSE) {
  LicenseManager.setLicenseKey(AG_GRID_LICENSE);
} else {
  console.warn('AG Grid Enterprise license key (VITE_AG_GRID_LICENSE_KEY) is missing.');
}

// Default column definition - defined outside component to prevent recreating on each render
const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: true,
  resizable: true
};

export interface SettingsGridProps<T = any> {
  rowData: T[];
  columnDefs: ColDef[];
  onGridReady?: (params: GridReadyEvent) => void;
  onRowDragEnd?: (event: any) => void;
  getRowId?: (params: any) => string;
  height?: string;
  className?: string;
  noRowsMessage?: string;
  defaultColDef?: ColDef;
  rowSelection?: 'single' | 'multiple' | any; // allow object config per example
  onSelectionChanged?: (selectedRows: T[]) => void;
  onRowClicked?: (row: T) => void;
  onRowDoubleClicked?: (row: T) => void;
  onCellValueChanged?: (event: any) => void;
  autoGroupColumnDef?: ColDef;
  gridOptions?: any;
  quickFilterText?: string;
  style?: React.CSSProperties;
  rowHeight?: number;
  zebraRows?: boolean;
}

export function SettingsGrid<T = any>({
  rowData,
  columnDefs,
  onGridReady,
  onRowDragEnd,
  getRowId,
  height,
  className,
  noRowsMessage = "No data found",
  defaultColDef = DEFAULT_COL_DEF,
  rowSelection,
  onSelectionChanged,
  onRowClicked,
  onRowDoubleClicked,
  onCellValueChanged,
  autoGroupColumnDef,
  gridOptions,
  quickFilterText,
  style,
  rowHeight,
  zebraRows
}: SettingsGridProps<T>) {
  const gridRef = useRef<AgGridReact>(null);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    if (gridRef.current?.api) {
      gridRef.current.api.sizeColumnsToFit();
    }
    onGridReady?.(params);
  }, [onGridReady]);


  // Handle window resize
  useEffect(() => {
    const handleWindowResize = () => {
      if (gridRef.current?.api) {
        gridRef.current.api.sizeColumnsToFit();
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Memoize defaultColDef to prevent AG Grid from re-rendering on every parent render
  const mergedDefaultColDef = useMemo(() => ({
    ...defaultColDef,
    resizable: true
  }), [defaultColDef]);

  // Memoize getRowStyle to prevent infinite re-renders
  const getRowStyle = useMemo(() => {
    if (!zebraRows) return undefined;
    return (params: any) => {
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      if (params.node.rowIndex % 2 === 0) {
        return { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' };
      }
      return undefined as any;
    };
  }, [zebraRows]);

  // Memoize noRowsOverlayComponent to prevent infinite re-renders
  const NoRowsOverlay = useMemo(() => {
    return () => (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{noRowsMessage}</p>
      </div>
    );
  }, [noRowsMessage]);

  // Memoize event handlers
  const handleSelectionChanged = useCallback(() => {
    if (gridRef.current?.api && onSelectionChanged) {
      const selected = gridRef.current.api.getSelectedRows() as T[];
      onSelectionChanged(selected);
    }
  }, [onSelectionChanged]);

  const handleRowClicked = useCallback((event: any) => {
    // Allow inner interactive elements to opt out of row click handling
    // (e.g. buttons inside cells that should not trigger edit/open).
    const target = event?.event?.target as HTMLElement | null | undefined;
    if (target?.closest?.('[data-grid-stop-row-click="true"]')) {
      return;
    }
    if (onRowClicked && event?.data) {
      onRowClicked(event.data as T);
    } else if (onRowDoubleClicked && event?.data) {
      // If onRowDoubleClicked is provided but onRowClicked is not, trigger edit on single click
      onRowDoubleClicked(event.data as T);
    }
  }, [onRowClicked, onRowDoubleClicked]);

  const handleRowDoubleClicked = useCallback((event: any) => {
    if (onRowDoubleClicked && event?.data) {
      onRowDoubleClicked(event.data as T);
    }
  }, [onRowDoubleClicked]);

  return (
    <div
      className={`ag-theme-quartz wh-settings-grid wh-modern-grid wh-density-comfortable w-full ${className ?? ""}`}
      style={{ height: height ?? "100%", ...(style ?? {}) }}
    >
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        onGridReady={handleGridReady}
        rowSelection={rowSelection}
        suppressColumnVirtualisation={true}
        animateRows={true}
        rowHeight={rowHeight ?? 50}
        headerHeight={44}
        defaultColDef={mergedDefaultColDef}
        onCellValueChanged={onCellValueChanged}
        onRowDragEnd={onRowDragEnd}
        getRowId={getRowId}
        autoGroupColumnDef={autoGroupColumnDef}
        {...(gridOptions || {})}
        quickFilterText={quickFilterText}
        getRowStyle={getRowStyle}
        onSelectionChanged={handleSelectionChanged}
        onRowClicked={handleRowClicked}
        onRowDoubleClicked={handleRowDoubleClicked}
        noRowsOverlayComponent={NoRowsOverlay}
      />
    </div>
  );
}

export default SettingsGrid;
