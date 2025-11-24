import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase/client';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: number;
  member_id: number;
  access_id: number;
  plan_id: number;
  date: string;
  time: string;
  created_at: string;
  member_info: {
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
    holiday: string[];
    extras: object;
    remarks: string | null;
    type: string;
  };
  access: {
    area: string;
    taluk: string;
    district: string;
    state: string;
  };
}

export const exportAttendanceToExcel = async (
  planId: number,
  areaName: string,
  fromDate: string
): Promise<void> => {
  try {
    // Fetch attendance data with member info and access info
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        member_info:member_id (*)
      `)
      .eq('plan_id', planId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('No attendance records found for this plan');
    }

    // Transform data for Excel
    const excelData = data.map((record: AttendanceRecord) => ({
      'Date': format(new Date(record.date), 'dd/MM/yyyy'),
      'Time': record.time,
      'Member Name': record.member_info.name,
      'Age': record.member_info.age,
      'Mobile': record.member_info.mobile,
      'Village': record.member_info.village,
      'Taluk': record.member_info.taluk,
      'District': record.member_info.district,
      'State': record.member_info.state,
      'Type': record.member_info.type || 'GENERAL',
      'WhatsApp': record.member_info.whatsapp ? 'Yes' : 'No',
      'Notification': record.member_info.notification ? 'Yes' : 'No',
      'Mantra': record.member_info.mantra ? 'Yes' : 'No',
      'Social Media': record.member_info.social_media ? 'Yes' : 'No',
      'First Language': record.member_info.first_language,
      'Second Language': record.member_info.second_language || '',
      'Holiday': record.member_info.holiday.join(', '),
      'Extras': record.member_info.extras ? JSON.stringify(record.member_info.extras) : '',
      'Remarks': record.member_info.remarks || '',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

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

    // Generate filename: Attendance_AreaName_FromDate.xlsx
    const formattedDate = format(new Date(fromDate), 'dd-MM-yyyy');
    const sanitizedAreaName = areaName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Attendance_${sanitizedAreaName}_${formattedDate}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};
