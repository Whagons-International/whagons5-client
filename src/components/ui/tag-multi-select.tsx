"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, Star, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Tag {
  id: number;
  name: string;
  color?: string | null;
}

export interface GroupedTagOptions {
  favorites: Tag[]
  recent: Tag[]
  all: Tag[]
}

interface TagMultiSelectProps {
  tags: Tag[]
  value?: number[]
  onValueChange?: (value: number[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  // Grouped options support
  groupedOptions?: GroupedTagOptions
  // Favorites support
  favoriteIds?: number[]
  onFavoriteToggle?: (id: number) => void
}

export function TagMultiSelect({
  tags,
  value = [],
  onValueChange,
  placeholder = "Select tags...",
  searchPlaceholder = "Search tags...",
  emptyText = "No tags found.",
  className,
  groupedOptions,
  favoriteIds = [],
  onFavoriteToggle,
}: TagMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Use grouped options if provided, otherwise fall back to flat tags
  const allTags = groupedOptions?.all ?? tags

  const selectedValues = Array.isArray(value) ? value : []
  const selectedTags = allTags.filter((tag) => selectedValues.includes(tag.id))

  const handleSelect = (tagId: number) => {
    const newValue = selectedValues.includes(tagId)
      ? selectedValues.filter((v) => v !== tagId)
      : [...selectedValues, tagId]
    onValueChange?.(newValue)
  }

  const handleRemove = (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = selectedValues.filter((v) => v !== tagId)
    onValueChange?.(newValue)
  }

  const handleFavoriteClick = (e: React.MouseEvent, tagId: number) => {
    e.preventDefault()
    e.stopPropagation()
    onFavoriteToggle?.(tagId)
  }

  const renderTag = (tag: Tag, showFavoriteIcon: boolean = true) => {
    const isSelected = selectedValues.includes(tag.id)
    const isFavorited = favoriteIds.includes(tag.id)
    const hasFavoriteSupport = onFavoriteToggle !== undefined

    return (
      <CommandItem
        key={tag.id}
        value={tag.name}
        onSelect={() => handleSelect(tag.id)}
        className="group"
      >
        <Check
          className={cn(
            "mr-2 h-4 w-4 flex-shrink-0",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className="flex items-center gap-2 px-2 py-1 rounded text-xs font-medium flex-1"
          style={{
            backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
            color: tag.color || '#374151',
          }}
        >
          {tag.name}
        </div>
        {hasFavoriteSupport && showFavoriteIcon && (
          <button
            type="button"
            onClick={(e) => handleFavoriteClick(e, tag.id)}
            className={cn(
              "ml-2 p-0.5 rounded transition-opacity flex-shrink-0",
              isFavorited 
                ? "opacity-100 text-amber-500" 
                : "opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground"
            )}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star 
              className={cn("h-3.5 w-3.5", isFavorited && "fill-current")} 
            />
          </button>
        )}
      </CommandItem>
    )
  }

  const renderGroupedContent = () => {
    if (!groupedOptions) {
      // No grouped options - render flat list
      return (
        <CommandGroup>
          {tags.map((tag) => renderTag(tag))}
        </CommandGroup>
      )
    }

    const { favorites, recent, all: rawAll } = groupedOptions
    const hasFavorites = favorites.length > 0
    const hasRecent = recent.length > 0
    const excludedIds = new Set([
      ...favorites.map((tag) => tag.id),
      ...recent.map((tag) => tag.id),
    ])
    const all = rawAll.filter((tag) => !excludedIds.has(tag.id))

    return (
      <>
        {/* Favorites section */}
        {hasFavorites && (
          <>
            <CommandGroup heading={
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <Star className="h-3 w-3 fill-current" />
                Favorites
              </span>
            }>
              {favorites.map((tag) => renderTag(tag))}
            </CommandGroup>
            {(hasRecent || all.length > 0) && <CommandSeparator />}
          </>
        )}

        {/* Recent section */}
        {hasRecent && (
          <>
            <CommandGroup heading={
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Recent
              </span>
            }>
              {recent.map((tag) => renderTag(tag))}
            </CommandGroup>
            {all.length > 0 && <CommandSeparator />}
          </>
        )}

        {/* All options */}
        {all.length > 0 && (
          <CommandGroup heading={
            (hasFavorites || hasRecent) ? (
              <span className="text-xs font-medium text-muted-foreground">All</span>
            ) : undefined
          }>
            {all.map((tag) => renderTag(tag))}
          </CommandGroup>
        )}
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full h-10 justify-between px-3 py-1.5", className)}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {selectedTags.length > 0 ? (
              <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                {selectedTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium transition-colors h-5 flex-shrink-0"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
                      color: tag.color || '#374151',
                      border: `1px solid ${tag.color ? `${tag.color}40` : '#E5E7EB'}`,
                    }}
                    onClick={(e) => handleRemove(tag.id, e)}
                  >
                    <span className="truncate max-w-[100px]">{tag.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded-full outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ring cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleRemove(tag.id, e as unknown as React.MouseEvent)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => handleRemove(tag.id, e)}
                    >
                      <X className="h-2.5 w-2.5 opacity-70 hover:opacity-100" />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground/70 text-sm font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {renderGroupedContent()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
