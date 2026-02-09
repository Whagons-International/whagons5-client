"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, Star, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export interface MultiSelectOption {
  value: string
  label: string
}

export interface GroupedMultiSelectOptions {
  favorites: MultiSelectOption[]
  recent: MultiSelectOption[]
  all: MultiSelectOption[]
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[]
  value?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  // Grouped options support
  groupedOptions?: GroupedMultiSelectOptions
  // Favorites support
  favoriteValues?: string[]
  onFavoriteToggle?: (value: string) => void
}

export function MultiSelectCombobox({
  options,
  value = [],
  onValueChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  groupedOptions,
  favoriteValues = [],
  onFavoriteToggle,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Use grouped options if provided, otherwise fall back to flat options
  const allOptions = groupedOptions?.all ?? options

  const selectedValues = Array.isArray(value) ? value : []
  const selectedOptions = allOptions.filter((option) => selectedValues.includes(option.value))

  const handleSelect = (optionValue: string) => {
    const newValue = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue]
    onValueChange?.(newValue)
  }

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = selectedValues.filter((v) => v !== optionValue)
    onValueChange?.(newValue)
  }

  const handleFavoriteClick = (e: React.MouseEvent, optionValue: string) => {
    e.preventDefault()
    e.stopPropagation()
    onFavoriteToggle?.(optionValue)
  }

  const renderOption = (option: MultiSelectOption, showFavoriteIcon: boolean = true) => {
    const isSelected = selectedValues.includes(option.value)
    const isFavorited = favoriteValues.includes(option.value)
    const hasFavoriteSupport = onFavoriteToggle !== undefined
    // Use a unique search value that combines label and value to prevent duplicate highlights
    const searchValue = `${option.label} ${option.value}`

    return (
      <CommandItem
        key={option.value}
        value={searchValue}
        onSelect={() => handleSelect(option.value)}
        className="group"
      >
        <Check
          className={cn(
            "mr-2 h-4 w-4 flex-shrink-0",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
        <span className="flex-1 truncate">{option.label}</span>
        {hasFavoriteSupport && showFavoriteIcon && (
          <button
            type="button"
            onClick={(e) => handleFavoriteClick(e, option.value)}
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
          {options.map((option) => renderOption(option))}
        </CommandGroup>
      )
    }

    const { favorites, recent, all } = groupedOptions
    const hasFavorites = favorites.length > 0
    const hasRecent = recent.length > 0

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
              {favorites.map((option) => renderOption(option))}
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
              {recent.map((option) => renderOption(option))}
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
            {all.map((option) => renderOption(option))}
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
            {selectedOptions.length > 0 ? (
              <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                {selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="text-xs px-1.5 py-0.5 h-5 flex-shrink-0"
                  >
                    <span className="truncate max-w-[100px]">{option.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-0.5 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleRemove(option.value, e as unknown as React.MouseEvent)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => handleRemove(option.value, e)}
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
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
