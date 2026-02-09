"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Star, Clock } from "lucide-react"
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

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  searchExtra?: string // Additional text for search matching (e.g., alias)
}

export interface GroupedComboboxOptions {
  favorites: ComboboxOption[]
  recent: ComboboxOption[]
  all: ComboboxOption[]
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  autoFocus?: boolean
  // Grouped options support
  groupedOptions?: GroupedComboboxOptions
  // Favorites support
  favoriteValues?: string[]
  onFavoriteToggle?: (value: string) => void
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  autoFocus = false,
  groupedOptions,
  favoriteValues = [],
  onFavoriteToggle,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const hasAutoFocusedRef = React.useRef(false)

  // Use grouped options if provided, otherwise fall back to flat options
  const allOptions = groupedOptions?.all ?? options
  const selectedOption = allOptions.find((option) => option.value === value)

  // Handle autoFocus: open popover and focus input immediately
  React.useEffect(() => {
    if (autoFocus && !hasAutoFocusedRef.current) {
      hasAutoFocusedRef.current = true
      // Open popover immediately
      setOpen(true)
      // Focus input after popover opens
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  // Focus input when popover opens (for non-autoFocus cases)
  React.useEffect(() => {
    if (open && !autoFocus) {
      // Delay to ensure popover content is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open, autoFocus])

  // Handle keyboard input on trigger button to open popover
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // If user starts typing a printable character, open popover
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Enter' && e.key !== ' ') {
      if (!open) {
        e.preventDefault()
        setOpen(true)
        // Focus will be handled by the useEffect when popover opens
      }
    }
  }

  const handleFavoriteClick = (e: React.MouseEvent, optionValue: string) => {
    e.preventDefault()
    e.stopPropagation()
    onFavoriteToggle?.(optionValue)
  }

  const renderOption = (option: ComboboxOption, showFavoriteIcon: boolean = true) => {
    const isSelected = value === option.value
    const isFavorited = favoriteValues.includes(option.value)
    const hasFavoriteSupport = onFavoriteToggle !== undefined

    return (
      <CommandItem
        key={option.value}
        value={option.searchExtra ? `${option.label} ${option.searchExtra}` : option.label}
        onSelect={() => {
          onValueChange?.(option.value)
          setOpen(false)
        }}
        className="group"
      >
        <Check
          className={cn(
            "mr-2 h-4 w-4 flex-shrink-0",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="truncate">{option.label}</span>
          {option.description && (
            <span className="text-xs text-muted-foreground truncate">{option.description}</span>
          )}
        </div>
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

    // Filter out items already shown in favorites/recent from the "All" list
    const shownValues = new Set([
      ...favorites.map((o) => o.value),
      ...recent.map((o) => o.value),
    ])
    const filteredAll = (hasFavorites || hasRecent) ? all.filter((o) => !shownValues.has(o.value)) : all

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
        {filteredAll.length > 0 && (
          <CommandGroup heading={
            (hasFavorites || hasRecent) ? (
              <span className="text-xs font-medium text-muted-foreground">All</span>
            ) : undefined
          }>
            {filteredAll.map((option) => renderOption(option))}
          </CommandGroup>
        )}
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full h-10 justify-between px-3 py-1.5", className)}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput ref={inputRef} placeholder={searchPlaceholder} />
          <CommandList
            onWheel={(e) => {
              // Prevent dialog/popover from swallowing scroll events
              e.stopPropagation()
            }}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            {renderGroupedContent()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
