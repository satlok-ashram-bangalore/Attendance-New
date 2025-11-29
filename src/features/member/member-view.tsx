'use client';

import { useState, useEffect } from 'react';
import { Edit, Search, Loader2, X } from 'lucide-react';
import { SmartTable, SmartTableHelpers } from '@/components/ui/smart-table';
import { IMemberInfoDb } from './types';
import { useNotification } from '@/context/notification-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function MemberView() {
  const [members, setMembers] = useState<IMemberInfoDb[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchMobile, setSearchMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IMemberInfoDb[]>([]);
  const itemsPerPage = 20;

  const { user } = useAuth();
  const notification = useNotification();
  const router = useRouter();

  const fetchMembers = async (page: number = 1, mode: 'init' | 'sync' | 'more' = 'init') => {
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
      
      // Fetch data with pagination
      const { data, error, count } = await supabase
        .from('member_info')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTotalCount(count || 0);

      const fetched = data || [];

      if (mode === 'sync' || mode === 'init') {
        setMembers(fetched);
      } else {
        setMembers((prev) => [...prev, ...fetched]);
      }
      
      setHasMore(fetched.length === itemsPerPage);
    } catch (error) {
      if (error instanceof Error) {
        notification.error(error.message);
      }
      if (mode !== 'more') {
        setMembers([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSyncing(false);
    }
  };

  const handleEdit = (member: IMemberInfoDb) => {
    router.push(`/dashboard/${user?.role}/member/edit/${member.id}`);
  };

  const handleSearch = async () => {
    if (!searchMobile.trim()) {
      notification.error('Please enter a mobile number');
      return;
    }

    try {
      setIsSearching(true);
      
      const { data, error } = await supabase
        .from('member_info')
        .select('*')
        .eq('mobile', searchMobile.trim())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setSearchResults(data || []);

      if (!data || data.length === 0) {
        notification.info('No members found with this mobile number');
      }
    } catch (error) {
      notification.error('Failed to search members');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchMobile('');
    setSearchResults([]);
  };

  useEffect(() => {
    fetchMembers(1, 'init');
  }, []);

  const columns = [
    {
      key: 'id',
      header: 'ID',
      widthClass: 'w-16',
      align: 'center' as const,
    },
    {
      key: 'name',
      header: 'Name',
      widthClass: 'w-48',
      render: (value: string) => <span className="font-medium text-foreground">{value}</span>,
    },
    {
      key: 'age',
      header: 'Age',
      widthClass: 'w-16',
      align: 'center' as const,
    },
    {
      key: 'district',
      header: 'District',
      widthClass: 'w-32',
      hideOnMobile: true,
    },
    {
      key: 'state',
      header: 'State',
      widthClass: 'w-32',
      hideOnMobile: true,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      widthClass: 'w-32',
    },
    {
        key: 'created_at',
        header: 'Created At',
        widthClass: 'w-32',
        render: (value: string) => <span className="font-medium text-foreground">{SmartTableHelpers.fmtDate(value)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      widthClass: 'w-32',
      align: 'center' as const,
      render: (_value: unknown, row: IMemberInfoDb) => (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCard = {
    header: (row: IMemberInfoDb) => <div className="font-semibold text-foreground">{row.name}</div>,
    badge: (row: IMemberInfoDb) => (
      <Badge variant="secondary" className="text-xs">
        Age {row.age}
      </Badge>
    ),
    subheader: (row: IMemberInfoDb) => (
      <div className="text-sm text-muted-foreground">
        {row.district}, {row.state}
      </div>
    ),
    lines: [
      {
        label: 'Mobile',
        value: (row: IMemberInfoDb) => row.mobile,
      },
      {
        label: 'First Language',
        value: (row: IMemberInfoDb) => row.first_language,
      },
    ],
    footerLeft: (row: IMemberInfoDb) => (
      <div className="flex gap-2">
        <div>{SmartTableHelpers.fmtDate(row.created_at)}</div>
      </div>
    ),
    footerRight: (row: IMemberInfoDb) => (
      <div className="flex gap-2 justify-between">
        <Button size="sm" variant="outline" onClick={() => handleEdit(row)} className="h-8">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    ),
  };

  return (
    <>
      {/* Search Section */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Search Member</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <input
              type="text"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter mobile number"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={!searchMobile.trim() || isSearching}
                variant="default"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:mr-1 animate-spin" />
                    <span className="hidden sm:inline">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Search</span>
                  </>
                )}
              </Button>
              {searchMobile && (
                <Button
                  onClick={handleClearSearch}
                  variant="outline"
                  size="sm"
                  title="Clear search"
                  className="px-3"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          <SmartTable<IMemberInfoDb>
            title={`Search Results - ${searchMobile} (${searchResults.length} found)`}
            data={searchResults}
            loading={false}
            variant="static"
            columns={columns}
            mobileCard={mobileCard}
            idKey="id"
          />
        </div>
      )}

      <SmartTable<IMemberInfoDb>
        title="Members"
        data={members}
        totalCount={totalCount}
        loading={loading}
        syncing={syncing}
        loadingMore={loadingMore}
        onSync={() => fetchMembers(1, 'sync')}
        onLoadMore={() => fetchMembers(Math.floor(members.length / itemsPerPage) + 1, 'more')}
        hasMore={hasMore}
        variant="infinite"
        defaultPageSize={itemsPerPage}
        columns={columns}
        mobileCard={mobileCard}
        idKey="id"
        showGoToTop
      />
    </>
  );
}
