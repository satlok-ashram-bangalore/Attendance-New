import React, { useState, useEffect } from 'react';
import { Loader2, User, Phone, Search, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { SmartTable } from '@/components/ui/smart-table';
import { IMemberInfoDb } from '@/features/member/types';

interface NamdanAttendanceFormProps {
  centre_id: number;
}

interface MemberAttendanceStatus {
  member: IMemberInfoDb;
  attendanceId: string | null;
  isPresent: boolean;
  state: boolean | null; // true = present, false = absent, null = not marked (no record exists)
  isLoading: boolean;
}

function NamdanAttendanceForm({ centre_id }: NamdanAttendanceFormProps) {
  const [members, setMembers] = useState<MemberAttendanceStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const notification = useNotification();

  // Search members when query changes
  useEffect(() => {
    if (searchQuery.trim().length === 10 && /^\d{10}$/.test(searchQuery.trim()) && selectedDate) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [searchQuery, selectedDate]);

  const searchMembers = async () => {
    if (!selectedDate || !searchQuery.trim()) return;

    try {
      setIsLoading(true);

      // Search members by exact mobile number (10 digits)
      const { data: namdanMembers, error: membersError } = await supabase
        .from('member_info')
        .select('*')
        .eq('type', 'NAMDAN')
        .eq('mobile', searchQuery.trim())
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      if (!namdanMembers || namdanMembers.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Get date range for the selected day in UTC
      const targetDate = selectedDate;
      const startOfDayUTC = new Date(
        Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0)
      );
      const endOfDayUTC = new Date(
        Date.UTC(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          23,
          59,
          59,
          999
        )
      );

      // Fetch attendance records for the selected date
      const memberIds = namdanMembers.map((m) => m.id);
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('namdan_attendance')
        .select('id, member_id, state')
        .in('member_id', memberIds)
        .eq('namdan_id', centre_id)
        .gte('created_at', startOfDayUTC.toISOString())
        .lte('created_at', endOfDayUTC.toISOString());

      if (attendanceError) throw attendanceError;

      // Create attendance status map
      const attendanceMap = new Map(
        attendanceRecords?.map((record) => [record.member_id, { id: record.id, state: record.state }]) || []
      );

      // Combine members with their attendance status
      const membersWithStatus: MemberAttendanceStatus[] = namdanMembers.map((member) => {
        const attendance = attendanceMap.get(member.id);
        return {
          member,
          attendanceId: attendance?.id || null,
          isPresent: attendance?.state === true,
          state: attendance ? attendance.state : null,
          isLoading: false,
        };
      });

      setMembers(membersWithStatus);
    } catch (error) {
      notification.error('Failed to search members');
      console.error('Search error:', error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPresent = async (memberId: number) => {
    if (!selectedDate) {
      notification.error('Please select a date');
      return;
    }

    const memberStatus = members.find(m => m.member.id === memberId);
    if (!memberStatus) return;

    // Update loading state
    setMembers((prev) =>
      prev.map((m) => (m.member.id === memberId ? { ...m, isLoading: true } : m))
    );

    try {
      const targetDate = selectedDate;
      const utcTargetDate = new Date(
        Date.UTC(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          new Date().getHours(),
          new Date().getMinutes(),
          new Date().getSeconds()
        )
      );

      if (memberStatus.attendanceId) {
        // Update existing record
        const { error } = await supabase
          .from('namdan_attendance')
          .update({ state: true })
          .eq('id', memberStatus.attendanceId);

        if (error) throw error;

        // Update state to reflect present status
        setMembers((prev) =>
          prev.map((m) =>
            m.member.id === memberId
              ? { ...m, isPresent: true, state: true, isLoading: false }
              : m
          )
        );
      } else {
        // Create new record
        const attendanceRecord = {
          id: crypto.randomUUID(),
          member_id: memberStatus.member.id,
          namdan_id: centre_id,
          state: true,
          created_at: utcTargetDate.toISOString(),
        };

        const { error } = await supabase.from('namdan_attendance').insert([attendanceRecord]);

        if (error) throw error;

        // Update state to reflect present status
        setMembers((prev) =>
          prev.map((m) =>
            m.member.id === memberId
              ? { ...m, attendanceId: attendanceRecord.id, isPresent: true, state: true, isLoading: false }
              : m
          )
        );
      }

      notification.success(`Marked ${memberStatus.member.name} as present`);
    } catch (error) {
      notification.error('Failed to mark attendance');
      console.error('Mark present error:', error);
      setMembers((prev) =>
        prev.map((m) => (m.member.id === memberId ? { ...m, isLoading: false } : m))
      );
    }
  };

  const handleMarkAbsent = async (memberId: number) => {
    if (!selectedDate) {
      notification.error('Please select a date');
      return;
    }

    const memberStatus = members.find(m => m.member.id === memberId);
    if (!memberStatus) return;

    // Update loading state
    setMembers((prev) =>
      prev.map((m) => (m.member.id === memberId ? { ...m, isLoading: true } : m))
    );

    try {
      const targetDate = selectedDate;
      const utcTargetDate = new Date(
        Date.UTC(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          new Date().getHours(),
          new Date().getMinutes(),
          new Date().getSeconds()
        )
      );

      if (memberStatus.attendanceId) {
        // Update existing record
        const { error } = await supabase
          .from('namdan_attendance')
          .update({ state: false })
          .eq('id', memberStatus.attendanceId);

        if (error) throw error;

        // Update state to reflect absent status
        setMembers((prev) =>
          prev.map((m) =>
            m.member.id === memberId
              ? { ...m, isPresent: false, state: false, isLoading: false }
              : m
          )
        );
      } else {
        // Create new record with absent state
        const attendanceRecord = {
          id: crypto.randomUUID(),
          member_id: memberStatus.member.id,
          namdan_id: centre_id,
          state: false,
          created_at: utcTargetDate.toISOString(),
        };

        const { error } = await supabase.from('namdan_attendance').insert([attendanceRecord]);

        if (error) throw error;

        // Update state to reflect absent status
        setMembers((prev) =>
          prev.map((m) =>
            m.member.id === memberId
              ? { ...m, attendanceId: attendanceRecord.id, isPresent: false, state: false, isLoading: false }
              : m
          )
        );
      }

      notification.success(`Marked ${memberStatus.member.name} as absent`);
    } catch (error) {
      notification.error('Failed to mark absent');
      console.error('Mark absent error:', error);
      setMembers((prev) =>
        prev.map((m) => (m.member.id === memberId ? { ...m, isLoading: false } : m))
      );
    }
  };

  return (
    <div className="w-full mx-auto bg-card shadow-lg rounded-lg p-2 sm:p-4">
      {/* Header Section */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Namdan Attendance</h2>
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            {members.filter((m) => m.state === true).length} / {members.length} Present
          </Badge>
        </div>

        {/* Date Selector */}
        <div className="bg-background border border-border rounded-lg p-3 sm:p-4 mb-3">
          <DatePicker label="Attendance Date" value={selectedDate} onChange={setSelectedDate} required />
          {selectedDate && selectedDate.toDateString() !== new Date().toDateString() && (
            <Badge variant="secondary" className="text-xs mt-2">
              Past Date Selected
            </Badge>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-background border border-border rounded-lg p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter 10-digit mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              maxLength={10}
            />
          </div>
          {searchQuery.length === 10 && /^\d{10}$/.test(searchQuery) && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {members.length} members for mobile: {searchQuery}
            </p>
          )}
          {searchQuery.length > 0 && searchQuery.length < 10 && (
            <p className="text-xs text-muted-foreground mt-2">
              Enter {10 - searchQuery.length} more digits to search
            </p>
          )}
          {searchQuery.length > 0 && !/^\d+$/.test(searchQuery) && (
            <p className="text-xs text-red-500 mt-2">
              Please enter only numbers
            </p>
          )}
        </div>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        </div>
      ) : members.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Members Found</h3>
          <p className="text-muted-foreground">No NAMDAN members found matching your search criteria.</p>
        </div>
      ) : !searchQuery || searchQuery.length !== 10 || !/^\d{10}$/.test(searchQuery) ? (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Search Members</h3>
          <p className="text-muted-foreground">Enter a complete 10-digit mobile number to search for NAMDAN members.</p>
        </div>
      ) : (
        <SmartTable
          data={members}
          variant="static"
          loading={isLoading}
          idKey="member.id"
          columns={[
            {
              key: 'member.name',
              header: 'Name',
              align: 'left',
              render: (value, row: MemberAttendanceStatus) => (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">{row.member.name}</span>
                </div>
              ),
            },
            {
              key: 'member.mobile',
              header: 'Mobile',
              align: 'left',
              render: (value, row: MemberAttendanceStatus) => (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{row.member.mobile}</span>
                </div>
              ),
            },
            {
              key: 'member.state',
              header: 'State',
              align: 'left',
              hideOnMobile: true,
              render: (value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              ),
            },
            {
              key: 'member.district',
              header: 'District',
              align: 'left',
              hideOnMobile: true,
              render: (value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              ),
            },
            {
              key: 'state',
              header: 'Status',
              align: 'left',
              render: (value, row: MemberAttendanceStatus) => {
                if (row.state === null) {
                  return <Badge variant="outline">Not Marked</Badge>;
                } else if (row.state === true) {
                  return (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      Present
                    </Badge>
                  );
                } else {
                  return (
                    <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                      Absent
                    </Badge>
                  );
                }
              },
            },
            {
              key: 'action',
              header: 'Action',
              align: 'center',
              render: (value, row: MemberAttendanceStatus) => {
                return (
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {row.state === true ? (
                      // Currently present, show Mark Absent button
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkAbsent(row.member.id)}
                        disabled={row.isLoading}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 h-auto border-red-600"
                      >
                        {row.isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            <span className="sm:hidden">Absent</span>
                            <span className="hidden sm:inline">Mark Absent</span>
                          </>
                        )}
                      </Button>
                    ) : row.state === false ? (
                      // Currently absent, show Mark Present button
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkPresent(row.member.id)}
                        disabled={row.isLoading}
                        className="bg-green-500 hover:bg-green-600 text-xs px-2 py-1 h-auto text-white border-green-600"
                      >
                        {row.isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            <span className="sm:hidden">Present</span>
                            <span className="hidden sm:inline">Mark Present</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      // Not marked yet, show both buttons
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMarkPresent(row.member.id)}
                          disabled={row.isLoading}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 h-auto min-w-0 border-green-600"
                        >
                          {row.isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              <span>Present</span>
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAbsent(row.member.id)}
                          disabled={row.isLoading}
                          className="text-xs px-2 py-1 h-auto min-w-0 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          {row.isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              <span>Absent</span>
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                );
              },
            },
          ]}
          mobileCard={{
            header: (row: MemberAttendanceStatus) => (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold">{row.member.name}</span>
              </div>
            ),
            lines: [
              {
                label: 'Mobile',
                value: (row: MemberAttendanceStatus) => (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{row.member.mobile}</span>
                  </div>
                ),
              },
              {
                label: 'Location',
                value: (row: MemberAttendanceStatus) => `${row.member.district}, ${row.member.state}`
              }
            ],
            footerRight: (row: MemberAttendanceStatus) => {
              return (
                <div className="flex gap-1 flex-wrap">
                  {row.state === true ? (
                    // Currently present, show Mark Absent button
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleMarkAbsent(row.member.id)}
                      disabled={row.isLoading}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 h-auto min-w-0 border-red-600"
                    >
                      {row.isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Absent
                        </>
                      )}
                    </Button>
                  ) : row.state === false ? (
                    // Currently absent, show Mark Present button
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleMarkPresent(row.member.id)}
                      disabled={row.isLoading}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 h-auto min-w-0 border-green-600"
                    >
                      {row.isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Present
                        </>
                      )}
                    </Button>
                  ) : (
                    // Not marked yet, show both buttons
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkPresent(row.member.id)}
                        disabled={row.isLoading}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 h-auto min-w-0 flex-1 border-green-600"
                      >
                        {row.isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Present
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAbsent(row.member.id)}
                        disabled={row.isLoading}
                        className="text-xs px-2 py-1 h-auto min-w-0 flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        {row.isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            Absent
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              );
            },
            footerLeft: (row: MemberAttendanceStatus) => {
              if (row.state === null) {
                return <Badge variant="outline">Not Marked</Badge>;
              } else if (row.state === true) {
                return (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    Present
                  </Badge>
                );
              } else {
                return (
                  <Badge variant="secondary" className="bg-red-500 hover:bg-red-600 text-white">
                    Absent
                  </Badge>
                );
              }
            },
          }}
        />
      )}
    </div>
  );
}

export default NamdanAttendanceForm;
