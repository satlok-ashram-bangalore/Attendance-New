'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { Button } from '@/components/ui/button';
import { Search, X, Download, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { SmartTable } from '@/components/ui/smart-table';

interface NamdanCentre {
  centre_id: number;
  centre_name: string;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface MemberInfo {
  id: number;
  name: string;
  age: number;
  village: string;
  taluk: string;
  district: string;
  state: string;
  mobile: string;
  whatsapp: boolean;
  notification: boolean;
  mantra: boolean;
  social_media: boolean;
  first_language: string;
  second_language: string | null;
  type: string;
}

interface AttendanceRecord {
  member_id: number;
  state: boolean;
  created_at: string;
}

interface DateAttendance {
  date: string;
  status: 'Present' | 'Absent' | 'Not Filled';
}

interface MemberAttendanceData extends MemberInfo {
  total_days: number;
  present_days: number;
  absent_days: number;
  not_filled_days: number;
  attendance_percentage: number;
  daily_attendance: DateAttendance[];
}

export function ViewNamdanAttendance() {
  const [namdanCentres, setNamdanCentres] = useState<NamdanCentre[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [attendanceData, setAttendanceData] = useState<MemberAttendanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);

  const notification = useNotification();

  useEffect(() => {
    fetchNamdanCentres();
  }, []);

  const fetchNamdanCentres = async () => {
    setLoadingCentres(true);
    try {
      const { data, error } = await supabase
        .from('namdan')
        .select('*')
        .order('state', { ascending: true })
        .order('centre_name', { ascending: true });

      if (error) throw error;
      setNamdanCentres(data || []);
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Failed to load namdan centres');
    } finally {
      setLoadingCentres(false);
    }
  };

  const fetchAttendanceReport = async () => {
    if (!selectedCentre) {
      notification.error('Please select a namdan centre');
      return;
    }

    if (!fromDate || !toDate) {
      notification.error('Please select both from and to dates');
      return;
    }

    if (toDate < fromDate) {
      notification.error('To date must be after from date');
      return;
    }

    setLoading(true);
    try {
      const fromDateStr = format(fromDate, 'yyyy-MM-dd');
      const toDateStr = format(toDate, 'yyyy-MM-dd');

      // Fetch all members with type NAMDAN
      const { data: members, error: membersError } = await supabase
        .from('member_info')
        .select('*')
        .eq('type', 'NAMDAN')
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      // Fetch attendance records for the selected centre and date range
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('namdan_attendance')
        .select('member_id, state, created_at')
        .eq('namdan_id', parseInt(selectedCentre, 10))
        .gte('created_at', `${fromDateStr} 00:00:00`)
        .lte('created_at', `${toDateStr} 23:59:59`);

      if (attendanceError) throw attendanceError;

      // Create a map of member_id to list of attendance records
      const attendanceMap = new Map<number, AttendanceRecord[]>();
      attendanceRecords?.forEach((record) => {
        const existing = attendanceMap.get(record.member_id) || [];
        attendanceMap.set(record.member_id, [...existing, record]);
      });

      // Generate all dates in the range
      const allDates: Date[] = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);
      while (currentDate <= endDate) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDays = allDates.length;

      // Combine members with their attendance analytics
      const combinedData: MemberAttendanceData[] = (members || []).map((member) => {
        const records = attendanceMap.get(member.id) || [];
        
        // Create a map of date string to attendance record
        const recordsByDate = new Map<string, AttendanceRecord>();
        records.forEach((record) => {
          const dateStr = format(new Date(record.created_at), 'yyyy-MM-dd');
          recordsByDate.set(dateStr, record);
        });

        // Build daily attendance
        const dailyAttendance: DateAttendance[] = allDates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const record = recordsByDate.get(dateStr);
          
          if (!record) {
            return {
              date: format(date, 'dd/MM/yyyy'),
              status: 'Not Filled' as const,
            };
          }

          return {
            date: format(date, 'dd/MM/yyyy'),
            status: record.state ? 'Present' : 'Absent',
          };
        });

        const presentDays = dailyAttendance.filter((d) => d.status === 'Present').length;
        const absentDays = dailyAttendance.filter((d) => d.status === 'Absent').length;
        const notFilledDays = dailyAttendance.filter((d) => d.status === 'Not Filled').length;
        const filledDays = presentDays + absentDays;
        const attendancePercentage = filledDays > 0 ? Math.round((presentDays / filledDays) * 100) : 0;

        return {
          ...member,
          total_days: totalDays,
          present_days: presentDays,
          absent_days: absentDays,
          not_filled_days: notFilledDays,
          attendance_percentage: attendancePercentage,
          daily_attendance: dailyAttendance,
        };
      });

      setAttendanceData(combinedData);
      setHasSearched(true);
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Failed to fetch attendance report');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedCentre('');
    setFromDate(null);
    setToDate(null);
    setAttendanceData([]);
    setHasSearched(false);
  };

  const handleExportToExcel = () => {
    if (attendanceData.length === 0) {
      notification.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const selectedCentreData = namdanCentres.find(
        (c) => c.centre_id.toString() === selectedCentre
      );

      const excelData = attendanceData.map((member) => ({
        'Name': member.name,
        'Mobile': member.mobile,
        'Village': member.village,
        'Taluk': member.taluk,
        'District': member.district,
        'State': member.state,
        'Present': member.present_days,
        'Absent': member.absent_days,
        'Not Filled': member.not_filled_days,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

      // Auto-size columns
      const maxWidth = 50;
      const columnWidths = Object.keys(excelData[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...excelData.map((row) => String(row[key as keyof typeof row] || '').length)
        );
        return { wch: Math.min(maxLength + 2, maxWidth) };
      });
      worksheet['!cols'] = columnWidths;

      const fromDateStr = format(fromDate!, 'dd-MM-yyyy');
      const toDateStr = format(toDate!, 'dd-MM-yyyy');
      const centreName = selectedCentreData?.centre_name.replace(/[^a-zA-Z0-9]/g, '_') || 'Namdan';
      const filename = `Namdan_Attendance_${centreName}_${fromDateStr}_to_${toDateStr}.xlsx`;

      XLSX.writeFile(workbook, filename);
      notification.success('Attendance report exported successfully');
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      widthClass: 'w-48',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="font-medium text-foreground">{row.name}</div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      widthClass: 'w-32',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm">{row.mobile}</div>
      ),
    },
    {
      key: 'village',
      header: 'Village',
      widthClass: 'w-40',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm">{row.village}</div>
      ),
    },
    {
      key: 'district',
      header: 'District',
      widthClass: 'w-32',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm">{row.district}</div>
      ),
    },
    {
      key: 'present_days',
      header: 'Present',
      widthClass: 'w-24',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm text-center">{row.present_days}</div>
      ),
    },
    {
      key: 'absent_days',
      header: 'Absent',
      widthClass: 'w-24',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm text-center">{row.absent_days}</div>
      ),
    },
    {
      key: 'not_filled_days',
      header: 'Not Filled',
      widthClass: 'w-24',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm text-center">{row.not_filled_days}</div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0">
        <CardContent className="px-4 md:px-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Namdan Centre
                </label>
                <Select
                  value={selectedCentre}
                  onValueChange={setSelectedCentre}
                  disabled={loadingCentres || loading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingCentres ? 'Loading centres...' : 'Select centre'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {namdanCentres.map((centre) => (
                      <SelectItem key={centre.centre_id} value={centre.centre_id.toString()}>
                        {centre.centre_name} - {centre.area}, {centre.district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DatePicker label="From Date" value={fromDate} onChange={setFromDate} />

              <DatePicker label="To Date" value={toDate} onChange={setToDate} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={fetchAttendanceReport}
                disabled={loading || loadingCentres}
                className="flex items-center gap-2 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Loading...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Generate Report</span>
                    <span className="sm:hidden">Report</span>
                  </>
                )}
              </Button>

              {hasSearched && (
                <>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    disabled={loading}
                    className="flex items-center gap-2 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear</span>
                  </Button>

                  <Button
                    onClick={handleExportToExcel}
                    variant="secondary"
                    disabled={loading || exporting}
                    className="flex items-center gap-2 flex-shrink-0"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Exporting...</span>
                        <span className="sm:hidden">Export</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export Excel</span>
                        <span className="sm:hidden">Export</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Attendance Table */}
      {hasSearched && (
        <SmartTable
          data={attendanceData}
          columns={columns}
          defaultPageSize={20}
          mobileCard={{
            header: (row: MemberAttendanceData) => row.name,
            subheader: (row: MemberAttendanceData) => (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground"> {row.mobile}</p>
                <p className="text-xs text-muted-foreground"> {row.village}, {row.district}</p>
              </div>
            ),
            footerLeft: (row: MemberAttendanceData) => (
              <div className="flex gap-6 text-sm">
                <span>P : {row.present_days}</span>
                <span>A : {row.absent_days}</span>
                <span>NF : {row.not_filled_days}</span>
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}
