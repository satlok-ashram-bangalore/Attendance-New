'use client';

import { useState, useEffect } from 'react';
import { Edit, Plus, Search, Loader2, X } from 'lucide-react';
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

interface AccessLocation {
  id: number;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface AccessFormData {
  area: string;
  taluk: string;
  district: string;
  state: string;
}

export function AccessControls() {
  const [accessLocations, setAccessLocations] = useState<AccessLocation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AccessLocation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<AccessLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AccessFormData>({
    area: '',
    taluk: '',
    district: '',
    state: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<AccessFormData>>({});

  const itemsPerPage = 20;
  const notification = useNotification();

  const fetchAccessLocations = async (
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
        .from('access')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('state', { ascending: true })
        .order('district', { ascending: true })
        .order('taluk', { ascending: true });

      if (error) {
        throw error;
      }

      setTotalCount(count || 0);

      const fetched = data || [];

      if (mode === 'sync' || mode === 'init') {
        setAccessLocations(fetched);
      } else {
        setAccessLocations((prev) => [...prev, ...fetched]);
      }

      setHasMore(fetched.length === itemsPerPage);
    } catch (error) {
      if (error instanceof SupabaseError) {
        notification.error(error.message);
      }
      if (mode !== 'more') {
        setAccessLocations([]);
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
        .from('access')
        .select('*')
        .or(
          `area.ilike.%${query}%,taluk.ilike.%${query}%,district.ilike.%${query}%,state.ilike.%${query}%`
        )
        .order('state', { ascending: true })
        .order('district', { ascending: true });

      if (error) {
        throw error;
      }

      setSearchResults(data || []);

      if (!data || data.length === 0) {
        notification.info('No access locations found');
      }
    } catch (error) {
      notification.error('Failed to search access locations');
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
    setEditingAccess(null);
    setFormData({
      area: '',
      taluk: '',
      district: '',
      state: '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (_value: unknown, row: AccessLocation) => {
    setEditingAccess(row);
    setFormData({
      area: row.area,
      taluk: row.taluk,
      district: row.district,
      state: row.state,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<AccessFormData> = {};

    if (!formData.area.trim()) {
      errors.area = 'Area is required';
    }
    if (!formData.taluk.trim()) {
      errors.taluk = 'Taluk is required';
    }
    if (!formData.district.trim()) {
      errors.district = 'District is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required';
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
        area: formData.area.trim().toUpperCase(),
        taluk: formData.taluk.trim().toUpperCase(),
        district: formData.district.trim().toUpperCase(),
        state: formData.state.trim().toUpperCase(),
      };

      if (editingAccess) {
        // Update existing
        const { error } = await supabase
          .from('access')
          .update(cleanedData)
          .eq('id', editingAccess.id);

        if (error) throw error;

        notification.success('Access location updated successfully');
      } else {
        // Create new
        const { error } = await supabase.from('access').insert([cleanedData]);

        if (error) throw error;

        notification.success('Access location created successfully');
      }

      setDialogOpen(false);
      setEditingAccess(null);

      // Refresh the list
      await fetchAccessLocations(1, 'sync');

      // Clear search if active
      if (searchResults.length > 0) {
        handleClearSearch();
      }
    } catch (error) {
      const errorMessage =
        (error as { message?: string })?.message ||
        `Failed to ${editingAccess ? 'update' : 'create'} access location`;
      notification.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: keyof AccessFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value.toUpperCase() }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  useEffect(() => {
    fetchAccessLocations(1, 'init');
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
      key: 'area',
      header: 'Area',
      widthClass: 'w-48',
      render: (value: string) => <span className="font-medium text-foreground">{value}</span>,
    },
    {
      key: 'taluk',
      header: 'Taluk',
      widthClass: 'w-40',
    },
    {
      key: 'district',
      header: 'District',
      widthClass: 'w-40',
    },
    {
      key: 'state',
      header: 'State',
      widthClass: 'w-40',
    },
    {
      key: 'actions',
      header: 'Actions',
      widthClass: 'w-24',
      align: 'center' as const,
      render: (_value: unknown, row: AccessLocation) => (
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(_value, row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCard = {
    header: (row: AccessLocation) => (
      <div className="font-semibold text-foreground">{row.area}</div>
    ),
    subheader: (row: AccessLocation) => (
      <div className="text-sm text-muted-foreground flex flex-col gap-1">
        <div>Taluk : {row.taluk}</div>
        <div>District : {row.district}</div>
        <div>State : {row.state}</div>
      </div>
    ),
    footerRight: (row: AccessLocation) => (
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
      </div>
    ),
  };

  return (
    <>
      {/* Header Actions */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Access Locations</h2>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Location
            </Button>
          </div>

          {/* Search Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by area, taluk, district, or state"
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
          <SmartTable<AccessLocation>
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
      <SmartTable<AccessLocation>
        title="All Access Locations"
        data={accessLocations}
        totalCount={totalCount}
        loading={loading}
        syncing={syncing}
        loadingMore={loadingMore}
        onSync={() => fetchAccessLocations(1, 'sync')}
        onLoadMore={() =>
          fetchAccessLocations(Math.floor(accessLocations.length / itemsPerPage) + 1, 'more')
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
              {editingAccess ? 'Edit Access Location' : 'Create Access Location'}
            </DialogTitle>
            <DialogDescription>
              {editingAccess
                ? 'Update the access location details'
                : 'Add a new access location to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-2 overflow-y-auto">
            <div>
              <Label htmlFor="area" className="text-sm font-medium">
                Area <span className="text-destructive">*</span>
              </Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => handleFormChange('area', e.target.value)}
                placeholder="Enter area name"
                className="mt-1"
                disabled={saving}
              />
              {formErrors.area && (
                <p className="text-xs text-destructive mt-1">{formErrors.area}</p>
              )}
            </div>

            <div>
              <Label htmlFor="taluk" className="text-sm font-medium">
                Taluk <span className="text-destructive">*</span>
              </Label>
              <Input
                id="taluk"
                value={formData.taluk}
                onChange={(e) => handleFormChange('taluk', e.target.value)}
                placeholder="Enter taluk name"
                className="mt-1"
                disabled={saving}
              />
              {formErrors.taluk && (
                <p className="text-xs text-destructive mt-1">{formErrors.taluk}</p>
              )}
            </div>

            <div>
              <Label htmlFor="district" className="text-sm font-medium">
                District <span className="text-destructive">*</span>
              </Label>
              <Input
                id="district"
                value={formData.district}
                onChange={(e) => handleFormChange('district', e.target.value)}
                placeholder="Enter district name"
                className="mt-1"
                disabled={saving}
              />
              {formErrors.district && (
                <p className="text-xs text-destructive mt-1">{formErrors.district}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state" className="text-sm font-medium">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleFormChange('state', e.target.value)}
                placeholder="Enter state name"
                className="mt-1"
                disabled={saving}
              />
              {formErrors.state && (
                <p className="text-xs text-destructive mt-1">{formErrors.state}</p>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingAccess ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
