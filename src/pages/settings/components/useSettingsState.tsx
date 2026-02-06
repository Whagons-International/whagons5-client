import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTable, getCollection } from "@/store/dexie";

export interface UseSettingsStateOptions<T> {
  entityName: string;
  searchFields?: (keyof T)[];
  onError?: (error: string) => void;
}

export interface UseSettingsStateReturn<T> {
  // Data
  items: T[];
  filteredItems: T[];
  loading: boolean;
  error: string | null;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (query: string) => void;
  
  // CRUD operations
  createItem: (data: Omit<T, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateItem: (id: number, updates: Partial<T>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  
  // Form state
  isSubmitting: boolean;
  formError: string | null;
  setFormError: (error: string | null) => void;
  
  // Dialog state
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  
  // Selected items
  editingItem: T | null;
  setEditingItem: (item: T | null) => void;
  deletingItem: T | null;
  setDeletingItem: (item: T | null) => void;
  
  // Handlers
  handleEdit: (item: T) => void;
  handleDelete: (item: T) => void;
  handleCloseDeleteDialog: () => void;
}

export function useSettingsState<T extends { id: number; [key: string]: any }>({
  entityName,
  searchFields = [],
  onError
}: UseSettingsStateOptions<T>): UseSettingsStateReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dexie state - useTable returns array or undefined while loading
  const rawItems = useTable<T>(entityName);
  const items = rawItems ?? [];
  const loading = rawItems === undefined;
  const error: string | null = null; // Dexie doesn't have built-in error state like Redux
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Selected items
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingItem, setDeletingItem] = useState<T | null>(null);
  
  // Compute filtered items directly with useMemo instead of useEffect + setState
  // This avoids the infinite loop caused by handleSearch being recreated when items changes
  const filteredItems = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) {
      return items;
    }
    
    return items.filter((item) => {
      // Search in specified fields
      if (searchFields.length > 0) {
        return searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(lowerCaseQuery);
        });
      }
      
      // Default: search in all string fields
      return Object.values(item).some(value => {
        return value && typeof value === 'string' && value.toLowerCase().includes(lowerCaseQuery);
      });
    });
  }, [items, searchQuery, searchFields]);
  
  // Keep handleSearch for external use (e.g., search input onChange)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // Get the collection for CRUD operations
  const collection = useMemo(() => getCollection(entityName), [entityName]);
  
  // CRUD operations
  const createItem = useCallback(async (data: Omit<T, 'id' | 'created_at' | 'updated_at'>) => {
    if (!collection) {
      const errorMessage = `Collection not found for entity: ${entityName}`;
      setFormError(errorMessage);
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      setFormError(null);
      setIsSubmitting(true);
      await collection.add(data);
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      const backendMessage = err?.response?.data?.message;
      const errorMessage = backendErrors
        ? Object.entries(backendErrors).map(([k, v]: any) => `${k}: ${(v?.[0] || v)}`).join(', ')
        : (backendMessage || err?.message || 'Failed to create item');
      setFormError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [collection, entityName, onError]);
  
  const updateItem = useCallback(async (id: number, updates: Partial<T>) => {
    if (!collection) {
      const errorMessage = `Collection not found for entity: ${entityName}`;
      setFormError(errorMessage);
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      setFormError(null);
      setIsSubmitting(true);
      await collection.update(id, updates);
      setIsEditDialogOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      const backendMessage = err?.response?.data?.message;
      const errorMessage = backendErrors
        ? Object.entries(backendErrors).map(([k, v]: any) => `${k}: ${(v?.[0] || v)}`).join(', ')
        : (backendMessage || err?.message || 'Failed to update item');
      setFormError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [collection, entityName, onError]);
  
  const deleteItem = useCallback(async (id: number) => {
    if (!collection) {
      const errorMessage = `Collection not found for entity: ${entityName}`;
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      setIsSubmitting(true);
      await collection.delete(id);
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      
      // If the deleted item was being edited, close the edit dialog and clear the editing item
      if (editingItem && editingItem.id === id) {
        setIsEditDialogOpen(false);
        setEditingItem(null);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to delete item';
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [collection, entityName, onError, editingItem]);
  
  // Handlers
  const handleEdit = useCallback((item: T) => {
    setEditingItem(item);
    setFormError(null);
    setIsEditDialogOpen(true);
  }, []);
  
  const handleDelete = useCallback((item: T) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  }, []);
  
  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingItem(null);
  }, []);

  // Auto-open edit dialog if edit parameter is in URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && items.length > 0 && !isEditDialogOpen) {
      const itemId = parseInt(editId, 10);
      const itemToEdit = items.find((item: T) => item.id === itemId);
      if (itemToEdit) {
        setEditingItem(itemToEdit);
        setIsEditDialogOpen(true);
        // Remove edit parameter from URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('edit');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [searchParams, items, isEditDialogOpen, setEditingItem, setIsEditDialogOpen, setSearchParams]);
  
  return {
    // Data
    items,
    filteredItems,
    loading,
    error,
    
    // Search
    searchQuery,
    setSearchQuery,
    handleSearch,
    
    // CRUD operations
    createItem,
    updateItem,
    deleteItem,
    
    // Form state
    isSubmitting,
    formError,
    setFormError,
    
    // Dialog state
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    
    // Selected items
    editingItem,
    setEditingItem,
    deletingItem,
    setDeletingItem,
    
    // Handlers
    handleEdit,
    handleDelete,
    handleCloseDeleteDialog
  };
}

export default useSettingsState;
