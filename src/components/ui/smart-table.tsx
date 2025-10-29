/* eslint-disable */

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Calendar,
  ChevronUp,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Align = 'left' | 'center' | 'right';

type ColumnConfig<T = any> = {
  key: keyof T | string;
  header?: string;
  align?: Align;
  widthClass?: string;
  render?: (value: any, row: T) => React.ReactNode;
  hideOnMobile?: boolean;
  order?: number;
};

type MobileLine<T = any> = {
  label?: string;
  value: (row: T) => React.ReactNode;
};

type MobileCardConfig<T = any> = {
  header: (row: T) => React.ReactNode;
  badge?: (row: T) => React.ReactNode;
  subheader?: (row: T) => React.ReactNode;
  lines?: MobileLine<T>[];
  footerLeft?: (row: T) => React.ReactNode;
  footerRight?: (row: T) => React.ReactNode;
};

type Variant = 'static' | 'client-paginated' | 'infinite';

type SmartTableProps<T = any> = {
  title?: string;
  data: T[];
  totalCount?: number;
  loading?: boolean;
  syncing?: boolean;
  loadingMore?: boolean;
  onSync?: () => void;
  onLoadMore?: () => Promise<void> | void;
  hasMore?: boolean;
  variant?: Variant;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  actionLabel?: string;
  onRowAction?: (row: T) => void;
  actionIcon?: React.ReactNode;
  idKey?: keyof T | string;
  columns?: ColumnConfig<T>[];
  deriveColumns?: boolean;
  mobileCard?: MobileCardConfig<T>;
  showGoToTop?: boolean;
  headerRight?: React.ReactNode;
};

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

function get(obj: any, path: string | number) {
  if (typeof path !== 'string') return obj?.[path as any];
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function toHeader(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function truncate(text: any, n = 50) {
  const s = String(text ?? '');
  return s.length > n ? s.slice(0, n) + '...' : s;
}

function fmtDate(d: any) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtRelative(d: any) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function SmartTable<T = any>({
  title,
  data,
  totalCount,
  loading,
  syncing,
  loadingMore,
  onSync,
  onLoadMore,
  hasMore,
  variant = 'static',
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 30, 50],
  actionLabel,
  onRowAction,
  actionIcon,
  idKey = 'id',
  columns,
  deriveColumns = true,
  mobileCard,
  showGoToTop = true,
  headerRight,
}: SmartTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [showTop, setShowTop] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Function to find the closest scrollable parent
  const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
    if (!element) return null;

    const overflowY = window.getComputedStyle(element).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return element;
    }

    return findScrollableParent(element.parentElement);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollableParent = findScrollableParent(tableRef.current);

      if (scrollableParent) {
        setShowTop(scrollableParent.scrollTop > 400);
      } else {
        setShowTop(window.scrollY > 400);
      }
    };

    if (typeof window !== 'undefined') {
      const scrollableParent = findScrollableParent(tableRef.current);

      if (scrollableParent) {
        scrollableParent.addEventListener('scroll', handleScroll);
        // Also call once to set initial state
        handleScroll();
        return () => scrollableParent.removeEventListener('scroll', handleScroll);
      } else {
        window.addEventListener('scroll', handleScroll);
        // Also call once to set initial state
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
      }
    }
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      const scrollableParent = findScrollableParent(tableRef.current);

      if (scrollableParent) {
        scrollableParent.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, JSON.stringify(columns)]);

  const baseColumns = useMemo<ColumnConfig<T>[]>(() => {
    if (columns && columns.length) {
      return [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (!deriveColumns || !data?.length) return [];
    const keys = Object.keys(data[0] as any);
    return keys.map((k, i) => ({ key: k, header: toHeader(k), order: i }));
  }, [columns, deriveColumns, data]);

  const total = totalCount ?? data.length;
  const totalPages =
    variant === 'client-paginated' ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const startIndex = variant === 'client-paginated' ? (currentPage - 1) * pageSize : 0;
  const pageData =
    variant === 'client-paginated'
      ? data.slice(startIndex, Math.min(startIndex + pageSize, data.length))
      : data;

  const defaultMobile: MobileCardConfig<T> = {
    header: (row: any) => row?.name ?? get(row, baseColumns[0]?.key as string) ?? '—',
    badge: (row: any) => {
      const pid = row?.prarthna_id ?? get(row, 'prarthna_id');
      return pid ? (
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          #{pid}
        </span>
      ) : null;
    },
    subheader: (row: any) => {
      const rel = row?.relation ?? get(row, 'relation');
      const relName = row?.relation_name ?? get(row, 'relation_name');
      return rel || relName ? (
        <span className="text-sm text-muted-foreground">
          {rel} {relName}
        </span>
      ) : null;
    },
    lines: [
      {
        label: 'Prarthna',
        value: (row: any) => <span className="text-sm">{get(row, 'prarthna') ?? '—'}</span>,
      },
    ],
    footerLeft: (row: any) => {
      const mantar = row?.mantar_taken ?? get(row, 'mantar_taken');
      return mantar != null ? (
        <span className="text-muted-foreground text-xs">
          Mantar: <span className="text-foreground font-medium">{mantar}</span>
        </span>
      ) : null;
    },
    footerRight: (row: any) => {
      const created = row?.created_at ?? get(row, 'created_at');
      return created ? (
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Calendar className="w-3 h-3" />
          <span title={fmtDate(created)}>{fmtRelative(created)}</span>
        </div>
      ) : null;
    },
  };

  const m = mobileCard ?? defaultMobile;

  return (
    <>
      <div ref={tableRef} className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : <div />}
              {typeof total === 'number' ? (
                <span className="text-sm text-muted-foreground">({total} {'Total'})</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {variant === 'client-paginated' && (
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} per page
                    </option>
                  ))}
                </select>
              )}
              {onSync && (
                <Button
                  onClick={onSync}
                  disabled={!!syncing}
                  variant="outline"
                  size="default"
                  icon={<RefreshCw className={cls(syncing ? 'animate-spin mr-2' : 'mr-2')} />}
                >
                  Sync
                </Button>
              )}
              {headerRight}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {baseColumns.map((c) => (
                    <th
                      key={String(c.key)}
                      className={cls(
                        'p-3 font-semibold text-foreground',
                        c.align === 'right'
                          ? 'text-right'
                          : c.align === 'center'
                            ? 'text-center'
                            : 'text-left',
                        c.widthClass
                      )}
                    >
                      {c.header ?? toHeader(String(c.key))}
                    </th>
                  ))}
                  {onRowAction ? (
                    <th className="text-left p-3 font-semibold text-foreground w-24">Action</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={baseColumns.length + (onRowAction ? 1 : 0)}
                      className="text-center p-8 text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={baseColumns.length + (onRowAction ? 1 : 0)}
                      className="text-center p-8 text-muted-foreground"
                    >
                      No records found
                    </td>
                  </tr>
                ) : (
                  pageData.map((row: any, idx: number) => (
                    <tr
                      key={String(get(row, idKey as string) ?? idx)}
                      className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                    >
                      {baseColumns.map((c) => {
                        const raw = get(row, c.key as string);
                        const val = c.render ? c.render(raw, row) : raw;
                        return (
                          <td
                            key={String(c.key)}
                            className={cls(
                              'p-3 text-foreground align-top',
                              c.align === 'right'
                                ? 'text-right'
                                : c.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                            )}
                          >
                            {val as any}
                          </td>
                        );
                      })}
                      {onRowAction ? (
                        <td className="p-3">
                          <Button
                            onClick={() => onRowAction(row)}
                            variant="default"
                            size="sm"
                            className="gap-1"
                          >
                            {actionIcon ?? <Eye className="w-4 h-4" />}
                            {actionLabel ?? 'View'}
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              </div>
            ) : pageData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No records found</div>
            ) : (
              pageData.map((row: any, idx: number) => (
                <div
                  key={String(get(row, idKey as string) ?? idx)}
                  className="bg-background border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{m.header(row)}</h3>
                        {m.badge?.(row)}
                      </div>
                      {m.subheader?.(row)}
                    </div>
                    {onRowAction ? (
                      <Button
                        onClick={() => onRowAction(row)}
                        variant="default"
                        size="sm"
                        className="ml-2 flex-shrink-0 gap-1"
                      >
                        {actionIcon ?? <Eye className="w-3 h-3" />}
                        {actionLabel ?? 'View'}
                      </Button>
                    ) : null}
                  </div>
                  {m.lines && m.lines.length > 0 && (
                    <div className="space-y-2">
                      {m.lines.map((ln, i) => (
                        <div key={i}>
                          {ln.label ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              {ln.label}:
                            </span>
                          ) : null}
                          <div className={cls('mt-1', ln.label ? 'text-sm text-foreground' : '')}>
                            {ln.value(row) as any}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(m.footerLeft || m.footerRight) && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">{m.footerLeft?.(row)}</span>
                      <span className="text-muted-foreground">{m.footerRight?.(row)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {variant === 'infinite' && (hasMore ?? false) && (
          <div className="p-4 border-t border-border text-center">
            <Button
              onClick={() => onLoadMore?.()}
              disabled={!!loadingMore}

              variant="outline"
              isLoading={!!loadingMore}
              loadingText="Loading More..."
              icon={!loadingMore ? <ChevronDown className="w-4 h-4" /> : undefined}
              className="w-full sm:w-auto gap-1"
            >
              Show More
            </Button>
          </div>
        )}

        {variant === 'client-paginated' && data.length > 0 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {'Showing'} {startIndex + 1} {'To'} {Math.min(startIndex + pageSize, data.length)} {'of'}{' '}
              {data.length} {'Results'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="icon"
                icon={<ChevronLeft className="w-4 h-4" />}
              />
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="px-3"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="icon"
                icon={<ChevronRight className="w-4 h-4" />}
              />
            </div>
          </div>
        )}

        {typeof total === 'number' && variant !== 'client-paginated' && (
          <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
            {'Showing'} {data.length} {'of'} {total} {'Results'}
          </div>
        )}
        {showGoToTop && showTop && (
          <Button
            onClick={scrollToTop}
            variant="default"
            size="icon"
            className="fixed bottom-20 items-center  md:bottom-6 right-6 rounded-full shadow-lg z-10"
            icon={<ChevronUp className="w-5 h-5" />}
            aria-label="Go to top"
          />
        )}
      </div>
    </>
  );
}

export const SmartTableHelpers = { truncate, fmtDate, fmtRelative, toHeader };
