'use client';

import { useState, useEffect } from 'react';
import { Edit, Plus, Search, Loader2, X, Trash2 } from 'lucide-react';
import { SmartTable } from '@/components/ui/smart-table';
import { useNotification } from '@/context/notification-context';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SupabaseError } from '@/types/error';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';

interface Platform {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface PlatformFormData {
  name: string;
}

export function PlatformsControls() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Platform[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PlatformFormData>({
    name: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<PlatformFormData>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null);
  const [deleting, setDeleting] = useState(false);

  const itemsPerPage = 20;
  const notification = useNotification();

  const fetchPlatforms = async (
    page: number = 1,
    mode: 'init' | 'sync' | 'more' = 'init'
  ) => {
    try {
      if (mode === 'sync') {
        setSyncing(true);
      } else if (mode === 'more') {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from('platforms')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setTotalCount(count || 0);

      const fetched = data || [];

      if (mode === 'sync' || mode === 'init') {
        setPlatforms(fetched);
      } else {
        setPlatforms((prev) => [...prev, ...fetched]);
      }

      setHasMore(fetched.length === itemsPerPage);
    } catch (error) {
      if (error instanceof SupabaseError) {
        notification.error(error.message);
      }
      if (mode !== 'more') {
        setPlatforms([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSyncing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      notification.error('Please enter a search term');
      return;
    }

    try {
      setIsSearching(true);

      const query = searchQuery.trim().toLowerCase();

      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setSearchResults(data || []);

      if (!data || data.length === 0) {
        notification.info('No platforms found');
      }
    } catch (error) {
      notification.error('Failed to search platforms');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreate = () => {
    setEditingPlatform(null);
    setFormData({
      name: '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (_value: unknown, row: Platform) => {
    setEditingPlatform(row);
    setFormData({
      name: row.name,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<PlatformFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Platform name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const cleanedData = {
        name: formData.name.trim(),
      };

      if (editingPlatform) {
        // Update existing
        const { error } = await supabase
          .from('platforms')
          .update(cleanedData)
          .eq('id', editingPlatform.id);

        if (error) throw error;

        notification.success('Platform updated successfully');
      } else {
        // Create new
        const { error } = await supabase.from('platforms').insert([cleanedData]);

        if (error) throw error;

        notification.success('Platform created successfully');
      }

      setDialogOpen(false);
      setEditingPlatform(null);

      // Refresh the list
      await fetchPlatforms(1, 'sync');

      // Clear search if active
      if (searchResults.length > 0) {
        handleClearSearch();
      }
    } catch (error) {
      const errorMessage =
        (error as { message?: string })?.message ||
        `Failed to ${editingPlatform ? 'update' : 'create'} platform`;
      notification.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: keyof PlatformFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDeleteClick = (_value: unknown, row: Platform) => {
    setPlatformToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!platformToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', platformToDelete.id);

      if (error) {
        // Check if error is due to foreign key constraint
        if (error.message.includes('foreign key') || error.code === '23503') {
          notification.error('Cannot delete platform: It has associated skills');
        } else {
          throw error;
        }
      } else {
        notification.success('Platform deleted successfully');
        // Refresh the list
        await fetchPlatforms(1, 'sync');
        // Clear search if active
        if (searchResults.length > 0) {
          handleClearSearch();
        }
      }
    } catch (error) {
      const errorMessage =
        (error as { message?: string })?.message || 'Failed to delete platform';
      notification.error(errorMessage);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setPlatformToDelete(null);
    }
  };

  useEffect(() => {
    fetchPlatforms(1, 'init');
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const columns = [
    {
      key: 'id',
      header: 'ID',
      widthClass: 'w-20',
      align: 'center' as const,
    },
    {
      key: 'name',
      header: 'Platform Name',
      widthClass: 'w-96',
      render: (value: string) => <span className="font-medium text-foreground">{value}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      widthClass: 'w-32',
      align: 'center' as const,
      render: (_value: unknown, row: Platform) => (
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(_value, row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteClick(_value, row)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCard = {
    header: (row: Platform) => (
      <div className="font-semibold text-foreground">{row.name}</div>
    ),
    subheader: (row: Platform) => (
      <div className="text-sm text-muted-foreground">ID: {row.id}</div>
    ),
    footerRight: (row: Platform) => (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEdit(undefined, row)}
          className="h-8"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDeleteClick(undefined, row)}
          className="h-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    ),
  };

  return (
    <>
      {/* Header Actions */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Platforms</h2>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Platform
            </Button>
          </div>

          {/* Search Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by platform name"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          <SmartTable<Platform>
            title={`Search Results (${searchResults.length} found)`}
            data={searchResults}
            loading={false}
            variant="static"
            columns={columns}
            mobileCard={mobileCard}
            idKey="id"
          />
        </div>
      )}

      {/* Main Table */}
      <SmartTable<Platform>
        title="All Platforms"
        data={platforms}
        totalCount={totalCount}
        loading={loading}
        syncing={syncing}
        loadingMore={loadingMore}
        onSync={() => fetchPlatforms(1, 'sync')}
        onLoadMore={() =>
          fetchPlatforms(Math.floor(platforms.length / itemsPerPage) + 1, 'more')
        }
        hasMore={hasMore}
        variant="infinite"
        defaultPageSize={itemsPerPage}
        columns={columns}
        mobileCard={mobileCard}
        idKey="id"
        showGoToTop
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md !max-h-[85vh] !grid-rows-[auto_1fr_auto] !p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>
              {editingPlatform ? 'Edit Platform' : 'Create Platform'}
            </DialogTitle>
            <DialogDescription>
              {editingPlatform
                ? 'Update the platform details'
                : 'Add a new platform to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-2 overflow-y-auto">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Platform Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Enter platform name"
                className="mt-1"
                disabled={saving}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive mt-1">{formErrors.name}</p>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingPlatform ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Platform"
        message={`Are you sure you want to delete "${platformToDelete?.name}"? This action cannot be undone. Note: Platforms with associated skills cannot be deleted.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setPlatformToDelete(null);
        }}
        variant="danger"
      />
    </>
  );
}
