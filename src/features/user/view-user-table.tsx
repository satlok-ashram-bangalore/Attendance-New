'use client';

import { useNotification } from '@/context/notification-context';
import { api } from '@/lib/api-client';
import { supabase } from '@/lib/supabase/client';
import React, { useEffect, useState } from 'react';
import { SmartTable } from '@/components/ui/smart-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { VALID_ROLES } from '@/lib/auth-config';
import { SupabaseError } from '@/types/error';

interface AccessLocation {
  id: number;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface NamdanCentre {
  centre_id: number;
  centre_name: string;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface UserData {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export function ViewUserTable() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [selectedAccessIds, setSelectedAccessIds] = useState<MultiSelectOption[]>([]);
  const [selectedCentreIds, setSelectedCentreIds] = useState<MultiSelectOption[]>([]);
  const [allAccessLocations, setAllAccessLocations] = useState<AccessLocation[]>([]);
  const [allNamdanCentres, setAllNamdanCentres] = useState<NamdanCentre[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);

  const perPage = 20;
  const notification = useNotification();

  const fetchUsers = async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await api.list_users(pageNum, perPage);
      const data = response.data;

      if (append) {
        setUsers((prev) => [...prev, ...data.users]);
      } else {
        setUsers(data.users || []);
      }

      setTotal(data.total || 0);
      setHasMore(pageNum < data.lastPage);
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Failed to load users.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchUsers(nextPage, true);
  };

  const handleEditUser = async (user: UserData) => {
    setEditingUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);

    // Fetch user's current access based on role
    if (user.role === 'authenticated') {
      await fetchUserAccess(user.id);
    } else if (user.role === 'namdan_user') {
      await fetchUserNamdanAccess(user.id);
    } else {
      // For admin or archived, clear selections
      setSelectedAccessIds([]);
      setSelectedCentreIds([]);
    }
  };

  const fetchUserAccess = async (userId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('user_access')
        .select('access_id, access:access_id(id, area, taluk, district, state)')
        .eq('user_id', userId);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessLocations = data?.map((ua: any) => ua.access).filter(Boolean) || [];
      setSelectedAccessIds(
        accessLocations.map((loc: AccessLocation) => ({
          value: loc.id.toString(),
          label: `${loc.area}, ${loc.taluk}, ${loc.district}, ${loc.state}`,
        }))
      );
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error.message : 'Failed to load user access');
      setSelectedAccessIds([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchUserNamdanAccess = async (userId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('namdan_access')
        .select('centre_id, namdan:centre_id(centre_id, centre_name, area, taluk, district, state)')
        .eq('user_id', userId);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const namdanCentres = data?.map((na: any) => na.namdan).filter(Boolean) || [];
      setSelectedCentreIds(
        namdanCentres.map((centre: NamdanCentre) => ({
          value: centre.centre_id.toString(),
          label: `${centre.centre_name}, ${centre.area}, ${centre.taluk}, ${centre.district}, ${centre.state}`,
        }))
      );
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error.message : 'Failed to load namdan access');
      setSelectedCentreIds([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchAllAccessLocations = async () => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('access')
        .select('*')
        .order('state', { ascending: true })
        .order('district', { ascending: true });

      if (error) throw error;
      setAllAccessLocations(data || []);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error.message : 'Failed to load access locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchAllNamdanCentres = async () => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('namdan')
        .select('*')
        .order('state', { ascending: true })
        .order('district', { ascending: true });

      if (error) throw error;
      setAllNamdanCentres(data || []);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error.message : 'Failed to load namdan centres');
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      // Update role if changed
      if (newRole !== editingUser.role) {
        await api.update_user_role(editingUser.id, newRole);
      }

      // Update access locations for authenticated users
      if (newRole === 'authenticated') {
        const accessIds = selectedAccessIds.map((loc) => parseInt(loc.value, 10));

        // Delete existing access
        const { error: deleteError } = await supabase
          .from('user_access')
          .delete()
          .eq('user_id', editingUser.id);

        if (deleteError) throw deleteError;

        // Insert new access if any selected
        if (accessIds.length > 0) {
          const { error: insertError } = await supabase
            .from('user_access')
            .insert(accessIds.map((id) => ({ user_id: editingUser.id, access_id: id })));

          if (insertError) throw insertError;
        }
      }

      // Update namdan centres for namdan users
      if (newRole === 'namdan_user') {
        const centreIds = selectedCentreIds.map((centre) => parseInt(centre.value, 10));

        // Delete existing access
        const { error: deleteError } = await supabase
          .from('namdan_access')
          .delete()
          .eq('user_id', editingUser.id);

        if (deleteError) throw deleteError;

        // Insert new access if any selected
        if (centreIds.length > 0) {
          const { error: insertError } = await supabase
            .from('namdan_access')
            .insert(centreIds.map((id) => ({ user_id: editingUser.id, centre_id: id })));

          if (insertError) throw insertError;
        }
      }

      notification.success('User updated successfully');
      setEditDialogOpen(false);
      setEditingUser(null);

      // Refresh user list
      setPage(1);
      fetchUsers(1, false);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error?.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, false);
  }, []);

  useEffect(() => {
    if (editDialogOpen && newRole !== editingUser?.role) {
      // Role changed - fetch new access data or clear selections
      if (newRole === 'authenticated') {
        if (allAccessLocations.length === 0) {
          fetchAllAccessLocations();
        }
        // Fetch current user's access for this role
        if (editingUser) {
          fetchUserAccess(editingUser.id);
        }
      } else if (newRole === 'namdan_user') {
        if (allNamdanCentres.length === 0) {
          fetchAllNamdanCentres();
        }
        // Fetch current user's namdan access for this role
        if (editingUser) {
          fetchUserNamdanAccess(editingUser.id);
        }
      } else {
        // For admin or archived, clear selections but don't update DB
        setSelectedAccessIds([]);
        setSelectedCentreIds([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newRole]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'authenticated':
        return 'default';
      case 'namdan_user':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'authenticated':
        return 'Authenticated';
      case 'namdan_user':
        return 'Namdan User';
      case 'archived':
        return 'Archived';
      default:
        return role;
    }
  };

  const availableRoles = VALID_ROLES.filter((role) => role !== 'anon');

  const columns = [
    {
      key: 'email',
      header: 'Email',
      widthClass: 'w-64',
      render: (email: string) => (
        <div className="font-medium text-foreground truncate">{email}</div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      widthClass: 'w-32',
      render: (role: string) => (
        <Badge variant={getRoleBadgeVariant(role)}>{getRoleLabel(role)}</Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      widthClass: 'w-40',
      render: (date: string) => new Date(date).toLocaleDateString('en-GB'),
    },
  ];

  return (
    <>
      <SmartTable
        title="User Management"
        data={users}
        totalCount={total}
        loading={loading}
        loadingMore={loadingMore}
        variant="infinite"
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        columns={columns}
        idKey="id"
        actionLabel="Edit"
        actionIcon={<Edit className="w-4 h-4" />}
        onRowAction={handleEditUser}
        mobileCard={{
          header: (row: UserData) => row.email,
          lines: [
            {
              label: 'Role',
              value: (row: UserData) => (
                <Badge variant={getRoleBadgeVariant(row.role)}>{getRoleLabel(row.role)}</Badge>
              ),
            },
          ],
          footerLeft: (row: UserData) => (
            <span className="text-xs">
              Created: {new Date(row.created_at).toLocaleDateString('en-GB')}
            </span>
          ),
        }}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user role and access permissions</DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <div className="mt-1 p-2 bg-muted rounded-md text-sm">{editingUser.email}</div>
              </div>

              <div>
                <Label className="text-sm font-medium">Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(value) => {
                    setNewRole(value);
                    // Don't clear selections here - let useEffect handle it
                  }}
                  disabled={saving || loadingLocations}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingLocations && (
                  <p className="text-xs text-muted-foreground mt-1">Loading access data...</p>
                )}
              </div>

              {newRole === 'authenticated' && (
                <div>
                  <Label className="text-sm font-medium">Access Locations</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select locations this user can access
                  </p>
                  <MultiSelect
                    options={allAccessLocations.map((loc) => ({
                      value: loc.id.toString(),
                      label: `${loc.area}, ${loc.taluk}, ${loc.district}, ${loc.state}`,
                    }))}
                    value={selectedAccessIds}
                    onChange={setSelectedAccessIds}
                    placeholder={loadingLocations ? 'Loading...' : 'Select access locations'}
                    disabled={saving || loadingLocations}
                  />
                </div>
              )}

              {newRole === 'namdan_user' && (
                <div>
                  <Label className="text-sm font-medium">Namdan Centres</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select centres this user can access
                  </p>
                  <MultiSelect
                    options={allNamdanCentres.map((centre) => ({
                      value: centre.centre_id.toString(),
                      label: `${centre.centre_name}, ${centre.area}, ${centre.taluk}, ${centre.district}, ${centre.state}`,
                    }))}
                    value={selectedCentreIds}
                    onChange={setSelectedCentreIds}
                    placeholder={loadingLocations ? 'Loading...' : 'Select namdan centres'}
                    disabled={saving || loadingLocations}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
