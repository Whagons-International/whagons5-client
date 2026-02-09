import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRightIcon, FolderIcon } from "lucide-react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faFile,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileImage,
  faFileVideo,
  faFileAudio,
  faFileCode,
  faFileZipper,
  faFileCsv,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons"

export type FileTreeFile = {
  name: string
  id?: string | number
  size?: number
  url?: string
  data?: any
}

export type FileTreeFolder = {
  name: string
  items: FileTreeItem[]
  defaultOpen?: boolean
}

export type FileTreeItem = FileTreeFile | FileTreeFolder

function isFolder(item: FileTreeItem): item is FileTreeFolder {
  return "items" in item
}

// Map file extensions to Font Awesome icons
const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(ext)) return faFilePdf
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return faFileWord
  if (["xls", "xlsx", "ods"].includes(ext)) return faFileExcel
  if (["ppt", "pptx", "odp"].includes(ext)) return faFilePowerpoint
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return faFileImage
  if (["mp4", "avi", "mov", "mkv", "webm", "wmv"].includes(ext)) return faFileVideo
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return faFileAudio
  if (["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "h", "rb", "go", "rs", "php", "html", "css", "scss", "json", "xml", "yaml", "yml", "sh", "bash", "sql"].includes(ext)) return faFileCode
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) return faFileZipper
  if (["csv"].includes(ext)) return faFileCsv
  if (["txt", "log", "md"].includes(ext)) return faFileLines
  return faFile
}

const getFileIconColor = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(ext)) return "text-red-500"
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "text-blue-600"
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "text-green-600"
  if (["ppt", "pptx", "odp"].includes(ext)) return "text-orange-500"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return "text-purple-500"
  if (["mp4", "avi", "mov", "mkv", "webm", "wmv"].includes(ext)) return "text-pink-500"
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "text-yellow-600"
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) return "text-amber-600"
  return "text-gray-500"
}

interface FileTreeProps {
  items: FileTreeItem[]
  onFileClick?: (file: FileTreeFile) => void
  onFileAction?: (action: string, file: FileTreeFile) => void
  renderFileActions?: (file: FileTreeFile) => React.ReactNode
  className?: string
}

export function FileTree({ items, onFileClick, renderFileActions, className }: FileTreeProps) {
  const renderItem = (fileItem: FileTreeItem, depth: number = 0) => {
    if (isFolder(fileItem)) {
      return (
        <Collapsible key={fileItem.name} defaultOpen={fileItem.defaultOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="group hover:bg-accent hover:text-accent-foreground w-full justify-start gap-2 transition-none h-8 px-2"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              <ChevronRightIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
              <FolderIcon className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="truncate text-sm">{fileItem.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{fileItem.items.length}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col">
              {fileItem.items.map((child) => renderItem(child, depth + 1))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <div
        key={fileItem.name + (fileItem.id || "")}
        className="group flex items-center gap-2 w-full h-8 px-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
        style={{ paddingLeft: `${depth * 16 + 28}px` }}
        onClick={() => onFileClick?.(fileItem)}
      >
        <FontAwesomeIcon icon={getFileIcon(fileItem.name)} className={`w-4 h-4 shrink-0 ${getFileIconColor(fileItem.name)}`} />
        <span className="truncate flex-1">{fileItem.name}</span>
        {fileItem.size != null && (
          <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(fileItem.size)}</span>
        )}
        {renderFileActions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center">
            {renderFileActions(fileItem)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-col">
        {items.map((item) => renderItem(item, 0))}
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
