'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { SmartTable } from '@/components/ui/smart-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { exportAttendanceToExcel } from '@/features/plan/export-attendance';
import { SupabaseError } from '@/types/error';

interface AccessLocation {
  id: number;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface PlanData {
  id: number;
  access_id: number;
  plan_description: string;
  planned_from: string;
  planned_to: string;
  tag: string;
  created_at: string;
  access?: AccessLocation;
}

const PLAN_TAGS = ['Satsang', 'Social Media Meeting', 'Rally', 'Darshan'];

export function ViewPlansTable() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [searchResults, setSearchResults] = useState<PlanData[]>([]);
  const [page, setPage] = useState(1);
  const [searchPage, setSearchPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTotal, setSearchTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [exportingPlanId, setExportingPlanId] = useState<number | null>(null);

  // Filter states
  const [selectedTags, setSelectedTags] = useState<MultiSelectOption[]>([]);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const perPage = 20;
  const notification = useNotification();

  useEffect(() => {
    fetchPlans(1, false);
  }, []);

  const fetchPlans = async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const from = (pageNum - 1) * perPage;
      const to = from + perPage - 1;

      const query = supabase
        .from('plans')
        .select('*, access(area, taluk, district, state)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (append) {
        setPlans((prev) => [...prev, ...(data || [])]);
      } else {
        setPlans(data || []);
      }

      setTotal(count || 0);
      setHasMore(to < (count || 0) - 1);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error?.message : 'Failed to load plans');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchFilteredPlans = async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const from = (pageNum - 1) * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('plans')
        .select('*, access(area, taluk, district, state)', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply tag filter if selected
      if (selectedTags.length > 0) {
        const tagFilters = selectedTags.map((tag) => tag.value);
        // Filter plans that contain any of the selected tags
        query = query.or(
          tagFilters.map((tag) => `tag.ilike.%${tag}%`).join(',')
        );
      }

      // Apply date range filters
      if (fromDate) {
        query = query.gte('planned_from', format(fromDate, 'yyyy-MM-dd'));
      }

      if (toDate) {
        query = query.lte('planned_to', format(toDate, 'yyyy-MM-dd'));
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (append) {
        setSearchResults((prev) => [...prev, ...(data || [])]);
      } else {
        setSearchResults(data || []);
      }

      setSearchTotal(count || 0);
      setSearchHasMore(to < (count || 0) - 1);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error?.message : 'Failed to filter plans');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    setIsSearching(true);
    setSearchPage(1);
    fetchFilteredPlans(1, false);
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setFromDate(null);
    setToDate(null);
    setIsSearching(false);
    setSearchResults([]);
    setSearchPage(1);
    setPage(1);
    fetchPlans(1, false);
  };

  const handleLoadMore = async () => {
    if (isSearching) {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      await fetchFilteredPlans(nextPage, true);
    } else {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchPlans(nextPage, true);
    }
  };

  const formatDateRange = (from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (from === to) {
      return fromDate.toLocaleDateString('en-GB');
    }
    
    return `${fromDate.toLocaleDateString('en-GB')} - ${toDate.toLocaleDateString('en-GB')}`;
  };

  const handleExportAttendance = async (plan: PlanData) => {
    if (!plan.access) {
      notification.error('Location information not available');
      return;
    }

    setExportingPlanId(plan.id);
    try {
      await exportAttendanceToExcel(plan.id, plan.access.area, plan.planned_from);
      notification.success('Attendance data exported successfully');
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error?.message : 'Failed to export attendance data');
    } finally {
      setExportingPlanId(null);
    }
  };

  const tagOptions: MultiSelectOption[] = PLAN_TAGS.map((tag) => ({
    value: tag,
    label: tag,
  }));

  const displayPlans = isSearching ? searchResults : plans;
  const displayTotal = isSearching ? searchTotal : total;
  const displayHasMore = isSearching ? searchHasMore : hasMore;

  const columns = [
    {
      key: 'access',
      header: 'Location',
      widthClass: 'w-64',
      render: (access:AccessLocation) => (
        <div className="font-medium text-foreground">
          {access ? `${access.area}, ${access.taluk}, ${access.district}` : '—'}
        </div>
      ),
    },
    {
      key: 'plan_description',
      header: 'Description',
      widthClass: 'w-96',
      render: (description: string) => (
        <div className="text-foreground line-clamp-2">{description}</div>
      ),
    },
    {
      key: 'planned_from',
      header: 'Date Range',
      widthClass: 'w-48',
      render: (_: string, row: PlanData) => (
        <div className="text-sm">{formatDateRange(row.planned_from, row.planned_to)}</div>
      ),
    },
    {
      key: 'tag',
      header: 'Tags',
      widthClass: 'w-64',
      render: (tag: string) => (
        <div className="flex flex-wrap gap-1">
          {tag.split('-').map((t, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      widthClass: 'w-40',
      render: (date: string) => new Date(date).toLocaleDateString('en-GB'),
    },
    {
      key: 'actions',
      header: 'Actions',
      widthClass: 'w-32',
      render: (_: string, row: PlanData) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExportAttendance(row)}
          disabled={exportingPlanId === row.id}
          className="flex items-center gap-2"
        >
          {exportingPlanId === row.id ? (
            <>
              <Download className="w-3 h-3 animate-pulse" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              Export
            </>
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-transparent border-0">
        <CardContent className="px-0 md:px-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
                <MultiSelect
                  options={tagOptions}
                  value={selectedTags}
                  onChange={setSelectedTags}
                  placeholder="Filter by tags..."
                />
              </div>

              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
              />

              <DatePicker
                label="To Date"
                value={toDate}
                onChange={setToDate}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {isSearching ? 'Update Filter' : 'Search'}
              </Button>

              {isSearching && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            {isSearching && (
              <div className="text-sm text-muted-foreground">
                Showing {displayTotal} filtered result{displayTotal !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <SmartTable
        title="Plans"
        data={displayPlans}
        totalCount={displayTotal}
        loading={loading}
        loadingMore={loadingMore}
        variant="infinite"
        hasMore={displayHasMore}
        onLoadMore={handleLoadMore}
        columns={columns}
        idKey="id"
        mobileCard={{
          header: (row: PlanData) => row.access ? `${row.access.area}, ${row.access.taluk}` : 'Unknown Location',
          badge: (row: PlanData) => (
            <Badge variant="outline">{formatDateRange(row.planned_from, row.planned_to)}</Badge>
          ),
          lines: [
            {
              label: 'Description',
              value: (row: PlanData) => (
                <span className="line-clamp-2">{row.plan_description}</span>
              ),
            },
            {
              label: 'Tags',
              value: (row: PlanData) => (
                <div className="flex flex-wrap gap-1">
                  {row.tag.split('-').map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              ),
            },
          ],
          footerLeft: (row: PlanData) => (
            <span className="text-xs">
              Created: {new Date(row.created_at).toLocaleDateString('en-GB')}
            </span>
          ),
          footerRight: (row: PlanData) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportAttendance(row)}
              disabled={exportingPlanId === row.id}
              className="flex items-center gap-1"
            >
              {exportingPlanId === row.id ? (
                <>
                  <Download className="w-3 h-3 animate-pulse" />
                  <span className="hidden sm:inline">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Export</span>
                </>
              )}
            </Button>
          ),
        }}
      />
    </div>
  );
}
