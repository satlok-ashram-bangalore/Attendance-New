import React from 'react';
import { SmartTable } from '@/components/ui/smart-table';
import { format } from 'date-fns';

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

interface DetailedTableProps {
  data: MemberAttendanceData[];
  allDates: Date[];
}

export function DetailedTable({ data, allDates }: DetailedTableProps) {
  const detailedColumns = [
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
      hideOnMobile: true,
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm">{row.mobile}</div>
      ),
    },
    {
      key: 'village',
      header: 'Village',
      widthClass: 'w-32',
      hideOnMobile: true,
      render: (_: string, row: MemberAttendanceData) => (
        <div className="text-sm">{row.village}</div>
      ),
    },
    ...allDates.map((date, index) => ({
      key: `date_${index}`,
      header: format(date, 'dd/MM'),
      widthClass: 'w-16',
      hideOnMobile: true,
      render: (_: string, row: MemberAttendanceData) => {
        const attendance = row.daily_attendance[index];
        const status = attendance.status === 'Present' ? 'P' : 
                      attendance.status === 'Absent' ? 'A' : 'NF';
        const colorClass = attendance.status === 'Present' ? 'text-green-600 font-semibold' : 
                          attendance.status === 'Absent' ? 'text-red-600 font-semibold' : 'text-gray-400';
        return (
          <div className={`text-xs text-center ${colorClass}`}>{status}</div>
        );
      },
    })),
  ];

  return (
    <div className="overflow-x-auto">
      <SmartTable
        data={data}
        columns={detailedColumns}
        defaultPageSize={20}
        mobileCard={{
          header: (row: MemberAttendanceData) => row.name,
          subheader: (row: MemberAttendanceData) => (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{row.mobile}</p>
              <p className="text-xs text-muted-foreground">{row.village}</p>
            </div>
          ),
          lines: [
            {
              label: 'Dates',
              value: (row: MemberAttendanceData) => (
                <div className="flex flex-wrap gap-2 text-xs">
                  {row.daily_attendance.slice(0, 7).map((attendance, idx) => {
                    const status = attendance.status === 'Present' ? 'P' : 
                                  attendance.status === 'Absent' ? 'A' : 'NF';
                    const colorClass = attendance.status === 'Present' ? 'text-green-600 font-semibold' : 
                                      attendance.status === 'Absent' ? 'text-red-600 font-semibold' : 'text-gray-400';
                    return (
                      <span key={idx} className={colorClass}>
                        {attendance.date}: {status}
                      </span>
                    );
                  })}
                </div>
              ),
            },
          ],
          footerLeft: (row: MemberAttendanceData) => (
            <div className="text-xs text-muted-foreground">
              {row.daily_attendance.length > 7 && `+${row.daily_attendance.length - 7} more dates`}
            </div>
          ),
        }}
      />
    </div>
  );
}
