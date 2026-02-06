import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Download, Folder } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useDispatch, useSelector } from "react-redux";
import { genericActions } from "@/store/genericSlices";
import {
  uploadWorkspaceResource,
  deleteWorkspaceResource,
  getWorkspaceResourceUrl,
  type WorkspaceResource,
} from "@/api/workspaceResourcesApi";
import { FileTree, type FileTreeItem, type FileTreeFile, type FileTreeFolder } from "@/components/ui/file-tree";

import { Logger } from '@/utils/logger';
export default function ResourcesTab({ workspaceId }: { workspaceId: string | undefined }) {
  const { t } = useLanguage();
  const dispatch = useDispatch<any>();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Read resources from Redux store (synced via DataManager/IndexedDB)
  const allResources = useSelector((state: RootState) => (state.workspaceResources as any)?.value) || [];

  // Filter to current workspace
  const resources: WorkspaceResource[] = useMemo(() => {
    if (!workspaceId || workspaceId === 'all' || isNaN(Number(workspaceId))) return [];
    return allResources.filter((r: any) => Number(r.workspace_id) === Number(workspaceId));
  }, [allResources, workspaceId]);

  const onFilesSelected = async (files: FileList) => {
    if (!workspaceId || workspaceId === 'all' || isNaN(Number(workspaceId))) {
      setError(t('workspace.collab.resources.validWorkspaceIdRequired', 'Valid workspace ID is required'));
      return;
    }

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        await uploadWorkspaceResource(workspaceId, file);
      } catch (error: any) {
        setError(`${t('workspace.collab.resources.failedToUpload', 'Failed to upload')} ${file.name}: ${error?.response?.data?.message || error.message}`);
        Logger.error('ui', "Upload failed:", error);
      }
    }
    // The upload API creates the resource in the DB, which triggers a real-time notification
    // that the DataManager/cache will pick up automatically. But we can also do a refresh:
    try {
      await dispatch(genericActions.workspaceResources.fetchFromAPI());
    } catch {}
    setUploading(false);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      onFilesSelected(e.target.files);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDelete = async (resourceId: string) => {
    if (!workspaceId || workspaceId === 'all' || isNaN(Number(workspaceId))) return;
    try {
      await deleteWorkspaceResource(workspaceId, resourceId);
      // Refresh from API to update cache
      await dispatch(genericActions.workspaceResources.fetchFromAPI());
      setError(null);
    } catch (error: any) {
      setError(error?.response?.data?.message || t('workspace.collab.resources.failedToDelete', 'Failed to delete resource'));
      Logger.error('ui', "Failed to delete resource:", error);
    }
  };

  const handleDownload = (resource: WorkspaceResource) => {
    const url = getWorkspaceResourceUrl(resource);
    window.open(url, "_blank");
  };

  const humanSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  const totalSize = useMemo(() => resources.reduce((s, r) => s + (r.file_size || 0), 0), [resources]);

  // Build file tree from flat resources list
  const fileTree: FileTreeItem[] = useMemo(() => {
    const chatFiles: FileTreeFile[] = [];
    const generalFiles: FileTreeFile[] = [];

    for (const r of resources) {
      const file: FileTreeFile = {
        name: r.file_name,
        id: r.id,
        size: r.file_size,
        url: getWorkspaceResourceUrl(r),
        data: r,
      };

      if ((r as any).folder === 'chat_files') {
        chatFiles.push(file);
      } else {
        generalFiles.push(file);
      }
    }

    const tree: FileTreeItem[] = [];

    if (chatFiles.length > 0) {
      tree.push({
        name: t('workspace.collab.resources.chatFiles', 'Chat Files'),
        items: chatFiles,
        defaultOpen: false,
      } as FileTreeFolder);
    }

    tree.push(...generalFiles);

    return tree;
  }, [resources, t]);

  const handleFileClick = (file: FileTreeFile) => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  const handleActualDownload = async (resource: WorkspaceResource) => {
    const url = getWorkspaceResourceUrl(resource);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resource.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const renderFileActions = (file: FileTreeFile) => {
    const resource = file.data as WorkspaceResource | undefined;
    if (!resource) return null;

    const isChatFile = (resource as any).folder === 'chat_files';

    return (
      <div className="flex items-center gap-0.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            handleActualDownload(resource);
          }}
          title={t('workspace.collab.resources.download', 'Download')}
        >
          <Download className="w-3 h-3" />
        </Button>
        {!isChatFile && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(resource.id.toString());
            }}
            title={t('workspace.collab.resources.delete', 'Delete')}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  };

  const isValidWorkspace = workspaceId && workspaceId !== 'all' && !isNaN(Number(workspaceId));

  if (!isValidWorkspace) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-muted-foreground text-sm text-center p-4">
          {t('workspace.collab.resources.selectWorkspace', 'Select a specific workspace to view resources.')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with stats */}
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Folder className="w-4 h-4" />
          <span>
            {resources.length} {resources.length === 1 ? t('workspace.collab.resources.item', 'item') : t('workspace.collab.resources.items', 'items')}
            {resources.length > 0 && ` · ${humanSize(totalSize)}`}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2.5 mx-3 mt-2 rounded-md">
          {error}
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-auto px-1 py-2">
        {resources.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-16">
            <Folder className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium mb-1">{t('workspace.collab.resources.noResources', 'No resources yet')}</p>
            <p className="text-xs">{t('workspace.collab.resources.getStarted', 'Upload files to get started')}</p>
          </div>
        ) : (
          <FileTree
            items={fileTree}
            onFileClick={handleFileClick}
            renderFileActions={renderFileActions}
          />
        )}
      </div>

      {/* Upload Section */}
      <div className="border-t bg-muted/30 px-3 py-2.5">
        <div
          className={`border border-dashed rounded-md p-2.5 transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          } ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <Input
            ref={inputRef as any}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
            disabled={uploading || !isValidWorkspace}
          />
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? t('workspace.collab.resources.uploading', 'Uploading...') : t('workspace.collab.resources.dragDrop', 'Drop files or click to upload')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
