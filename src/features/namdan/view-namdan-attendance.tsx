'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import { AttendanceFilters } from './components/attendance-filters';
import { SummaryTable } from './components/summary-table';
import { DetailedTable } from './components/detailed-table';
import { AttendanceGraphs } from './components/attendance-graphs';

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
  const [allDates, setAllDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'graphs'>('summary');
  const [graphView, setGraphView] = useState<'present' | 'absent' | 'not_filled'>('present');

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
      // Create start and end timestamps in ISO format
      const startOfDayUTC = new Date(
        Date.UTC(
          fromDate.getFullYear(),
          fromDate.getMonth(),
          fromDate.getDate(),
          0,
          0,
          0,
          0
        )
      );
      const endOfDayUTC = new Date(
        Date.UTC(
          toDate.getFullYear(),
          toDate.getMonth(),
          toDate.getDate(),
          23,
          59,
          59,
          999
        )
      );

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
        .gte('created_at', startOfDayUTC.toISOString())
        .lte('created_at', endOfDayUTC.toISOString());

      if (attendanceError) throw attendanceError;

      // Create a map of member_id to list of attendance records
      const attendanceMap = new Map<number, AttendanceRecord[]>();
      attendanceRecords?.forEach((record) => {
        const existing = attendanceMap.get(record.member_id) || [];
        attendanceMap.set(record.member_id, [...existing, record]);
      });

      // Generate all dates in the range
      const dateRange: Date[] = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);
      while (currentDate <= endDate) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setAllDates(dateRange);
      const totalDays = dateRange.length;

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
        const dailyAttendance: DateAttendance[] = dateRange.map((date) => {
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
        const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

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
    setAllDates([]);
    setHasSearched(false);
    setActiveTab('summary');
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

      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary Report
      const summaryData = attendanceData.map((member) => ({
        'Name': member.name,
        'Mobile': member.mobile,
        'Village': member.village,
        'Taluk': member.taluk,
        'District': member.district,
        'State': member.state,
        'Present': member.present_days,
        'Absent': member.absent_days,
        'Not Filled': member.not_filled_days,
        'Attendance %': member.attendance_percentage,
      }));

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      
      // Auto-size columns for summary
      const maxWidth = 50;
      const summaryColumnWidths = Object.keys(summaryData[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...summaryData.map((row) => String(row[key as keyof typeof row] || '').length)
        );
        return { wch: Math.min(maxLength + 2, maxWidth) };
      });
      summaryWorksheet['!cols'] = summaryColumnWidths;

      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary Report');

      // Sheet 2: Final Report (Daily Attendance Matrix)
      const finalReportData: Record<string, string | number>[] = [];
      
      attendanceData.forEach((member) => {
        const row: Record<string, string | number> = {
          'Name': member.name,
          'Mobile': member.mobile,
          'Village': member.village,
          'District': member.district,
        };

        // Add each date as a column with P/A/NF
        member.daily_attendance.forEach((attendance) => {
          const status = attendance.status === 'Present' ? 'P' : 
                        attendance.status === 'Absent' ? 'A' : 'NF';
          row[attendance.date] = status;
        });
        
        finalReportData.push(row);
      });

      const finalReportWorksheet = XLSX.utils.json_to_sheet(finalReportData);

      // Auto-size columns for final report
      const finalReportColumnWidths = Object.keys(finalReportData[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...finalReportData.map((row) => String(row[key as keyof typeof row] || '').length)
        );
        return { wch: Math.min(maxLength + 2, maxWidth) };
      });
      finalReportWorksheet['!cols'] = finalReportColumnWidths;

      XLSX.utils.book_append_sheet(workbook, finalReportWorksheet, 'Final Report');

      // Generate filename
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <AttendanceFilters
        namdanCentres={namdanCentres}
        selectedCentre={selectedCentre}
        setSelectedCentre={setSelectedCentre}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        loading={loading}
        loadingCentres={loadingCentres}
        hasSearched={hasSearched}
        exporting={exporting}
        onGenerateReport={fetchAttendanceReport}
        onClear={handleClear}
        onExport={handleExportToExcel}
      />

      {/* Member Attendance Table */}
      {hasSearched && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'detailed' | 'graphs')} >
          <TabsList className="grid h-max px-2 py-1 w-full md:w-max md:gap-5 grid-cols-3 bg-card mb-4">
            <TabsTrigger value="summary" className="text-xs h-10 sm:text-sm">Summary</TabsTrigger>
            <TabsTrigger value="detailed" className="text-xs sm:text-sm">Final Report</TabsTrigger>
            <TabsTrigger value="graphs" className="text-xs sm:text-sm">Graphs</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0">
            <SummaryTable data={attendanceData} />
          </TabsContent>

          <TabsContent value="detailed" className="mt-0">
            <DetailedTable data={attendanceData} allDates={allDates} />
          </TabsContent>

          <TabsContent value="graphs" className="mt-0">
            <AttendanceGraphs 
              data={attendanceData} 
              graphView={graphView} 
              setGraphView={setGraphView} 
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}