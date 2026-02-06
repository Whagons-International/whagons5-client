import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import { useTable } from "@/store/dexie";

// Lazy load AgGridReact component
const AgGridReact = lazy(() => import('ag-grid-react').then(module => ({ default: module.AgGridReact })));

interface UsersTabProps {
  modulesLoaded: boolean;
  selectedTeamFilter: string | null;
  onClearTeamFilter: () => void;
  workspaceTeamIds: number[];
}

function UsersTab({ 
  modulesLoaded, 
  selectedTeamFilter, 
  onClearTeamFilter,
  workspaceTeamIds
}: UsersTabProps) {
  const gridRef = useRef<any>(null);
  const rowCache = useRef(new Map<string, { rows: any[]; rowCount: number }>());

  // Get users, teams, and userTeams from Dexie
  const allUsers = useTable('users') ?? [];
  const allTeams = useTable('teams') ?? [];
  const userTeams = useTable('user_teams') ?? [];

  // Filter users that belong to teams with access to this workspace
  const workspaceUsers = useMemo(() => {
    if (!workspaceTeamIds || workspaceTeamIds.length === 0) return [];
    if (!allUsers || !userTeams) return [];

    // Get user IDs that belong to any of the workspace teams
    const userIdsInWorkspaceTeams = new Set(
      userTeams
        .filter((ut: any) => workspaceTeamIds.includes(ut.team_id))
        .map((ut: any) => ut.user_id)
    );

    // Get team lookup for display
    const teamLookup = new Map(allTeams.map((t: any) => [t.id, t]));

    // Filter users and add team info
    return allUsers
      .filter((user: any) => userIdsInWorkspaceTeams.has(user.id))
      .map((user: any) => {
        // Find the user's teams that are in the workspace
        const userTeamIds = userTeams
          .filter((ut: any) => ut.user_id === user.id && workspaceTeamIds.includes(ut.team_id))
          .map((ut: any) => ut.team_id);
        
        const userTeamNames = userTeamIds
          .map((teamId: number) => teamLookup.get(teamId)?.name)
          .filter(Boolean);

        return {
          ...user,
          team_name: userTeamNames.join(', ') || 'No team',
          team_ids: userTeamIds
        };
      });
  }, [allUsers, allTeams, userTeams, workspaceTeamIds]);

  // Generate cache key based on request parameters
  const getCacheKey = useCallback((params: any) => {
    return `${params.startRow}-${params.endRow}-${JSON.stringify(
      params.filterModel || {}
    )}-${JSON.stringify(params.sortModel || [])}-${selectedTeamFilter || 'all'}`;
  }, [selectedTeamFilter]);

  // Column definitions for users table
  const [userColumnDefs] = useState([
    {
      field: 'id',
      headerName: 'ID',
      maxWidth: 80,
      cellRenderer: (params: any) => {
        if (params.value !== undefined) {
          return params.value;
        } else {
          return <i className="fas fa-spinner fa-pulse"></i>;
        }
      },
    },
    {
      field: 'name',
      headerName: 'Name',
      minWidth: 150,
      cellRenderer: (params: any) => {
        if (params.data?.name) {
          const avatarColor = params.data.color || '#6366f1';
          return (
            <div className="flex items-center space-x-2">
              {params.data.url_picture ? (
                <img 
                  src={params.data.url_picture} 
                  alt={params.data.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {params.data.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span>{params.data.name}</span>
            </div>
          );
        }
        return <i className="fas fa-spinner fa-pulse"></i>;
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      minWidth: 200,
    },
    {
      field: 'team_name',
      headerName: 'Teams',
      minWidth: 150,
      cellRenderer: (params: any) => {
        if (params.value) {
          const teams = params.value.split(', ');
          if (teams.length === 1) {
            return <Badge variant="secondary">{params.value}</Badge>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {teams.slice(0, 2).map((team: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{team}</Badge>
              ))}
              {teams.length > 2 && (
                <Badge variant="outline" className="text-xs">+{teams.length - 2}</Badge>
              )}
            </div>
          );
        }
        return null;
      },
    },
    {
      field: 'is_active',
      headerName: 'Status',
      maxWidth: 120,
      cellRenderer: (params: any) => {
        if (params.value === true) {
          return <Badge variant="default" className="bg-green-500">Active</Badge>;
        } else if (params.value === false) {
          return <Badge variant="destructive">Inactive</Badge>;
        }
        return null;
      },
    },
    {
      field: 'created_at',
      headerName: 'Joined',
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return null;
      },
    },
  ] as any);

  const defaultColDef = useMemo(() => {
    return {
      minWidth: 100,
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
    };
  }, []);

  // Get rows function for AG Grid
  const getRows = useCallback(
    async (params: any) => {
      const cacheKey = getCacheKey(params);

      // Check if data is already cached
      if (rowCache.current.has(cacheKey)) {
        console.log(`Cache hit for users range ${params.startRow} to ${params.endRow}`);
        const cachedData = rowCache.current.get(cacheKey)!;
        params.successCallback(cachedData.rows, cachedData.rowCount);
        return;
      }

      console.log('Fetching users for range', params.startRow, 'to', params.endRow, 'with team filter:', selectedTeamFilter);

      try {
        let filteredUsers = [...workspaceUsers];

        // Apply team filter if selected
        if (selectedTeamFilter) {
          filteredUsers = filteredUsers.filter(user => 
            user.team_name.includes(selectedTeamFilter)
          );
        }

        const start = params.startRow || 0;
        const end = params.endRow || filteredUsers.length;
        const rowsThisPage = filteredUsers.slice(start, end);

        // Cache the result
        rowCache.current.set(cacheKey, {
          rows: rowsThisPage,
          rowCount: filteredUsers.length,
        });

        params.successCallback(rowsThisPage, filteredUsers.length);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        params.failCallback();
      }
    },
    [getCacheKey, selectedTeamFilter, workspaceUsers]
  );

  const onGridReady = useCallback(
    (params: any) => {
      const dataSource = {
        rowCount: undefined,
        getRows,
      };
      params.api.setGridOption('datasource', dataSource);
    },
    [getRows]
  );

  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);

  // Clear cache when team filter or workspace users change
  useEffect(() => {
    rowCache.current.clear();
  }, [selectedTeamFilter, workspaceUsers]);

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          {selectedTeamFilter && (
            <div className="flex items-center space-x-2 mt-2 p-2 bg-muted/50 rounded-md border">
              <span className="text-sm font-medium text-muted-foreground">Filtered by team:</span>
              <Badge variant="secondary" className="text-sm">
                {selectedTeamFilter}
              </Badge>
              <button
                onClick={onClearTeamFilter}
                className="text-muted-foreground hover:text-foreground text-sm underline ml-2"
              >
                Clear filter
              </button>
            </div>
          )}
          <CardDescription>
            {selectedTeamFilter 
              ? `Showing users from ${selectedTeamFilter}` 
              : "All users from teams that have access to this workspace"
            }
          </CardDescription>
        </CardHeader>
      </Card>

       <div className="flex-1 mt-4 h-full">
        {!modulesLoaded ? (
          <div className="flex items-center justify-center h-64">
            <i className="fas fa-spinner fa-pulse fa-2x"></i>
          </div>
        ) : (
          <div style={containerStyle} className="ag-theme-quartz h-full w-full">
            <div style={gridStyle}>
              <Suspense fallback={<div>Loading Users Table...</div>}>
                <AgGridReact
                  ref={gridRef}
                  columnDefs={userColumnDefs}
                  defaultColDef={defaultColDef}
                  rowBuffer={50}
                  rowModelType={'infinite'}
                  cacheBlockSize={100}
                  cacheOverflowSize={2}
                  maxConcurrentDatasourceRequests={1}
                  infiniteInitialRowCount={50}
                  maxBlocksInCache={10}
                  onGridReady={onGridReady}
                  animateRows={true}
                  getRowId={(params: any) => String(params.data.id)}
                  suppressColumnVirtualisation={true}
                  key={selectedTeamFilter || 'all'} // Force re-render when filter changes
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersTab; 