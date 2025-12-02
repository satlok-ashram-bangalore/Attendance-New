import React from 'react';
import { SmartTable } from '@/components/ui/smart-table';

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

interface SummaryTableProps {
  data: MemberAttendanceData[];
}

export function SummaryTable({ data }: SummaryTableProps) {
  const summaryColumns = [
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
    {
      key: 'attendance_percentage',
      header: 'Attendance %',
      widthClass: 'w-32',
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm text-center font-medium">{row.attendance_percentage}%</div>
      ),
    },
  ];

  return (
    <SmartTable
      data={data}
      columns={summaryColumns}
      defaultPageSize={20}
      mobileCard={{
        header: (row: MemberAttendanceData) => row.name,
        subheader: (row: MemberAttendanceData) => (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{row.mobile}</p>
            <p className="text-xs text-muted-foreground">{row.village}, {row.district}</p>
          </div>
        ),
        footerLeft: (row: MemberAttendanceData) => (
          <div className="flex gap-4 text-sm">
            <span>P: {row.present_days}</span>
            <span>A: {row.absent_days}</span>
            <span>NF: {row.not_filled_days}</span>
            <span className="font-semibold">{row.attendance_percentage}%</span>
          </div>
        ),
      }}
    />
  );
}
