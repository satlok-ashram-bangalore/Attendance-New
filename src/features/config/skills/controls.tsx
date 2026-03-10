'use client';

import { useState, useEffect } from 'react';
import { Edit, Plus, X, Trash2, Minus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupabaseError } from '@/types/error';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';

interface Skill {
  id: number;
  name: string;
  level: number;
  platform_id: number;
  created_at: string;
  updated_at: string;
  platforms?: {
    id: number;
    name: string;
  };
}

interface Platform {
  id: number;
  name: string;
}

interface SkillFormData {
  name: string;
  level: string;
  platform_id: string;
}

export function SkillsControls() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Skill[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SkillFormData[]>([{
    name: '',
    level: '',
    platform_id: '',
  }]);
  const [formErrors, setFormErrors] = useState<Array<Partial<SkillFormData>>>([{}]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterPlatformId, setFilterPlatformId] = useState<string>('all');

  const itemsPerPage = 20;
  const notification = useNotification();

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;

      setPlatforms(data || []);
    } catch (error) {
      notification.error('Failed to load platforms');
      console.error('Platforms fetch error:', error);
    }
  };

  const fetchSkills = async (
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

      let query = supabase
        .from('skills')
        .select('*, platforms(id, name)', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply platform filter if selected
      if (filterPlatformId && filterPlatformId !== 'all') {
        query = query.eq('platform_id', parseInt(filterPlatformId));
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      setTotalCount(count || 0);

      const fetched = data || [];

      if (mode === 'sync' || mode === 'init') {
        setSkills(fetched);
      } else {
        setSkills((prev) => [...prev, ...fetched]);
      }

      setHasMore(fetched.length === itemsPerPage);
    } catch (error) {
      if (error instanceof SupabaseError) {
        notification.error(error.message);
      }
      if (mode !== 'more') {
        setSkills([]);
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

      let skillsQuery = supabase
        .from('skills')
        .select('*, platforms(id, name)')
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false });

      // Apply platform filter if selected
      if (filterPlatformId && filterPlatformId !== 'all') {
        skillsQuery = skillsQuery.eq('platform_id', parseInt(filterPlatformId));
      }

      const { data, error } = await skillsQuery;

      if (error) {
        throw error;
      }

      setSearchResults(data || []);

      if (!data || data.length === 0) {
        notification.info('No skills found');
      }
    } catch (error) {
      notification.error('Failed to search skills');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearFilter = () => {
    setFilterPlatformId('all');
  };

  const handleCreate = () => {
    setEditingSkill(null);
    setFormData([{
      name: '',
      level: '',
      platform_id: '',
    }]);
    setFormErrors([{}]);
    setDialogOpen(true);
  };

  const handleEdit = (_value: unknown, row: Skill) => {
    setEditingSkill(row);
    setFormData([{
      name: row.name,
      level: row.level.toString(),
      platform_id: row.platform_id.toString(),
    }]);
    setFormErrors([{}]);
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const allErrors: Array<Partial<SkillFormData>> = formData.map(skill => {
      const errors: Partial<SkillFormData> = {};

      if (!skill.name.trim()) {
        errors.name = 'Skill name is required';
      }
      if (!skill.level.trim()) {
        errors.level = 'Level is required';
      } else {
        const levelNum = parseInt(skill.level);
        if (isNaN(levelNum) || levelNum < 1) {
          errors.level = 'Level must be a positive number';
        }
      }
      if (!skill.platform_id) {
        errors.platform_id = 'Platform is required';
      }

      return errors;
    });

    setFormErrors(allErrors);
    return allErrors.every(errors => Object.keys(errors).length === 0);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingSkill) {
        // Update existing (single skill)
        const cleanedData = {
          name: formData[0].name.trim(),
          level: parseInt(formData[0].level),
          platform_id: parseInt(formData[0].platform_id),
        };

        const { error } = await supabase
          .from('skills')
          .update(cleanedData)
          .eq('id', editingSkill.id);

        if (error) throw error;

        notification.success('Skill updated successfully');
      } else {
        // Create new (possibly multiple skills)
        const cleanedDataArray = formData.map(skill => ({
          name: skill.name.trim(),
          level: parseInt(skill.level),
          platform_id: parseInt(skill.platform_id),
        }));

        const { error } = await supabase.from('skills').insert(cleanedDataArray);

        if (error) throw error;

        const count = cleanedDataArray.length;
        notification.success(`${count} skill${count > 1 ? 's' : ''} created successfully`);
      }

      setDialogOpen(false);
      setEditingSkill(null);

      // Refresh the list
      await fetchSkills(1, 'sync');

      // Clear search if active
      if (searchResults.length > 0) {
        handleClearSearch();
      }
    } catch (error) {
      const errorMessage =
        (error as { message?: string })?.message ||
        `Failed to ${editingSkill ? 'update' : 'create'} skill`;
      notification.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (index: number, field: keyof SkillFormData, value: string) => {
    setFormData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // If platform_id changed, propagate to all skills
      if (field === 'platform_id') {
        return updated.map(skill => ({ ...skill, platform_id: value }));
      }
      
      return updated;
    });
    
    // Clear error for this field when user starts typing
    if (formErrors[index]?.[field]) {
      setFormErrors((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: undefined };
        return updated;
      });
    }
  };

  const handleAddSkill = () => {
    setFormData((prev) => [
      ...prev,
      {
        name: '',
        level: '',
        platform_id: prev[0]?.platform_id || '', // Use the same platform as first skill
      },
    ]);
    setFormErrors((prev) => [...prev, {}]);
  };

  const handleRemoveSkill = (index: number) => {
    if (formData.length === 1) return; // Keep at least one
    setFormData((prev) => prev.filter((_, i) => i !== index));
    setFormErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteClick = (_value: unknown, row: Skill) => {
    setSkillToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!skillToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillToDelete.id);

      if (error) throw error;

      notification.success('Skill deleted successfully');
      
      // Refresh the list
      await fetchSkills(1, 'sync');
      
      // Clear search if active
      if (searchResults.length > 0) {
        handleClearSearch();
      }
    } catch (error) {
      const errorMessage =
        (error as { message?: string })?.message || 'Failed to delete skill';
      notification.error(errorMessage);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setSkillToDelete(null);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  useEffect(() => {
    fetchSkills(1, 'init');
  }, [filterPlatformId]);

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
  }, [searchQuery, filterPlatformId]);

  const columns = [
    {
      key: 'id',
      header: 'ID',
      widthClass: 'w-20',
      align: 'center' as const,
    },
    {
      key: 'name',
      header: 'Skill Name',
      widthClass: 'w-64',
      render: (value: string) => <span className="font-medium text-foreground">{value}</span>,
    },
    {
      key: 'level',
      header: 'Level',
      widthClass: 'w-24',
      align: 'center' as const,
      render: (value: number) => <span className="font-semibold">{value}</span>,
    },
    {
      key: 'platforms',
      header: 'Platform',
      widthClass: 'w-48',
      render: (_value: unknown, row: Skill) => (
        <span className="text-muted-foreground">{row.platforms?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      widthClass: 'w-32',
      align: 'center' as const,
      render: (_value: unknown, row: Skill) => (
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
    header: (row: Skill) => (
      <div className="font-semibold text-foreground">{row.name}</div>
    ),
    subheader: (row: Skill) => (
      <div className="text-sm text-muted-foreground flex flex-col gap-1">
        <div>Platform: {row.platforms?.name || 'N/A'}</div>
        <div>Level: {row.level}</div>
      </div>
    ),
    footerRight: (row: Skill) => (
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
            <h2 className="text-lg font-semibold text-foreground">Skills</h2>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Skill
            </Button>
          </div>

          {/* Search and Filter Section */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by skill name"
                className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <div className="flex items-center gap-2 sm:w-auto w-full">
                <Select value={filterPlatformId} onValueChange={setFilterPlatformId}>
                  <SelectTrigger className="sm:w-52 w-full">
                    <SelectValue placeholder="Filter by platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id.toString()}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterPlatformId !== 'all' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearFilter}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {filterPlatformId !== 'all' && (
              <div className="text-sm text-muted-foreground">
                Filtered by: <span className="font-medium text-foreground">{platforms.find(p => p.id.toString() === filterPlatformId)?.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          <SmartTable<Skill>
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
      <SmartTable<Skill>
        title="All Skills"
        data={skills}
        totalCount={totalCount}
        loading={loading}
        syncing={syncing}
        loadingMore={loadingMore}
        onSync={() => fetchSkills(1, 'sync')}
        onLoadMore={() =>
          fetchSkills(Math.floor(skills.length / itemsPerPage) + 1, 'more')
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
        <DialogContent className="max-w-2xl !max-h-[85vh] !grid-rows-[auto_1fr_auto] !p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>
              {editingSkill ? 'Edit Skill' : 'Create Skills'}
            </DialogTitle>
            <DialogDescription>
              {editingSkill
                ? 'Update the skill details'
                : 'Add one or more skills to the system. All skills will share the same platform.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-2 overflow-y-auto">
            {!editingSkill && formData.length > 1 && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                <strong>Tip:</strong> Select a platform once and it will apply to all skills.
              </div>
            )}

            {/* Platform Selection (shown once for all skills when creating) */}
            {!editingSkill && (
              <div className="pb-2 border-b border-border">
                <Label htmlFor="platform-select" className="text-sm font-medium">
                  Platform <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData[0]?.platform_id || ''}
                  onValueChange={(value) => handleFormChange(0, 'platform_id', value)}
                  disabled={saving}
                >
                  <SelectTrigger className="mt-1" id="platform-select">
                    <SelectValue placeholder="Select a platform for all skills" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id.toString()}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors[0]?.platform_id && (
                  <p className="text-xs text-destructive mt-1">{formErrors[0].platform_id}</p>
                )}
              </div>
            )}

            {/* Skills List */}
            {formData.map((skill, index) => (
              <div
                key={index}
                className="border border-border rounded-lg p-4 space-y-3 relative"
              >
                {/* Remove button for additional skills */}
                {!editingSkill && formData.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSkill(index)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Skill {index + 1}
                  </span>
                </div>

                <div>
                  <Label htmlFor={`name-${index}`} className="text-sm font-medium">
                    Skill Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`name-${index}`}
                    value={skill.name}
                    onChange={(e) => handleFormChange(index, 'name', e.target.value)}
                    placeholder="Enter skill name"
                    className="mt-1"
                    disabled={saving}
                  />
                  {formErrors[index]?.name && (
                    <p className="text-xs text-destructive mt-1">{formErrors[index].name}</p>
                  )}
                </div>

                {editingSkill && (
                  <div>
                    <Label htmlFor={`platform-${index}`} className="text-sm font-medium">
                      Platform <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={skill.platform_id}
                      onValueChange={(value) => handleFormChange(index, 'platform_id', value)}
                      disabled={saving}
                    >
                      <SelectTrigger className="mt-1" id={`platform-${index}`}>
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((platform) => (
                          <SelectItem key={platform.id} value={platform.id.toString()}>
                            {platform.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors[index]?.platform_id && (
                      <p className="text-xs text-destructive mt-1">
                        {formErrors[index].platform_id}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor={`level-${index}`} className="text-sm font-medium">
                    Level <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`level-${index}`}
                    type="number"
                    min="1"
                    value={skill.level}
                    onChange={(e) => handleFormChange(index, 'level', e.target.value)}
                    placeholder="Enter skill level (e.g., 1, 2, 3)"
                    className="mt-1"
                    disabled={saving}
                  />
                  {formErrors[index]?.level && (
                    <p className="text-xs text-destructive mt-1">{formErrors[index].level}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Add Another Skill Button */}
            {!editingSkill && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSkill}
                className="w-full"
                disabled={saving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Skill
              </Button>
            )}
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? 'Saving...'
                : editingSkill
                ? 'Update'
                : `Create ${formData.length} Skill${formData.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Skill"
        message={`Are you sure you want to delete the skill "${skillToDelete?.name}" (Level ${skillToDelete?.level})? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setSkillToDelete(null);
        }}
        variant="danger"
      />
    </>
  );
}
