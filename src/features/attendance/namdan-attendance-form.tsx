import React, { useState, useEffect } from 'react';
import { Loader2, User, Phone, Search } from 'lucide-react';
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
  isLoading: boolean;
}

function NamdanAttendanceForm({ centre_id }: NamdanAttendanceFormProps) {
  const [members, setMembers] = useState<MemberAttendanceStatus[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberAttendanceStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const notification = useNotification();

  // Fetch namdan members and their attendance status
  useEffect(() => {
    if (selectedDate) {
      fetchNamdanMembers();
    }
  }, [selectedDate]);

  // Filter members based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter((m) => {
      const name = m.member.name?.toLowerCase() || '';
      const mobile = m.member.mobile?.toLowerCase() || '';
      return name.includes(query) || mobile.includes(query);
    });

    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  const fetchNamdanMembers = async () => {
    if (!selectedDate) return;

    try {
      setIsLoading(true);

      // Fetch all members with type = 'NAMDAN'
      const { data: namdanMembers, error: membersError } = await supabase
        .from('member_info')
        .select('*')
        .eq('type', 'NAMDAN')
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
        .select('id, member_id')
        .in('member_id', memberIds)
        .eq('namdan_id', centre_id)
        .gte('created_at', startOfDayUTC.toISOString())
        .lte('created_at', endOfDayUTC.toISOString());

      if (attendanceError) throw attendanceError;

      // Create attendance status map
      const attendanceMap = new Map(
        attendanceRecords?.map((record) => [record.member_id, record.id]) || []
      );

      // Combine members with their attendance status
      const membersWithStatus: MemberAttendanceStatus[] = namdanMembers.map((member) => ({
        member,
        attendanceId: attendanceMap.get(member.id) || null,
        isPresent: attendanceMap.has(member.id),
        isLoading: false,
      }));

      setMembers(membersWithStatus);
      setFilteredMembers(membersWithStatus);
    } catch (error) {
      notification.error('Failed to fetch namdan members');
      console.error('Fetch error:', error);
      setMembers([]);
      setFilteredMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPresent = async (index: number) => {
    if (!selectedDate) {
      notification.error('Please select a date');
      return;
    }

    const memberStatus = filteredMembers[index];
    if (memberStatus.isPresent) {
      notification.info('Member already marked present');
      return;
    }

    // Find the actual index in the main members array
    const actualIndex = members.findIndex(m => m.member.id === memberStatus.member.id);
    
    // Update loading state
    setMembers((prev) =>
      prev.map((m, i) => (i === actualIndex ? { ...m, isLoading: true } : m))
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

      const attendanceRecord = {
        id: crypto.randomUUID(),
        member_id: memberStatus.member.id,
        namdan_id: centre_id,
        created_at: utcTargetDate.toISOString(),
      };

      const { error } = await supabase.from('namdan_attendance').insert([attendanceRecord]);

      if (error) throw error;

      // Update state to reflect present status
      setMembers((prev) =>
        prev.map((m, i) =>
          i === actualIndex
            ? { ...m, attendanceId: attendanceRecord.id, isPresent: true, isLoading: false }
            : m
        )
      );

      notification.success(`Marked ${memberStatus.member.name} as present`);
    } catch (error) {
      notification.error('Failed to mark attendance');
      console.error('Mark present error:', error);
      setMembers((prev) =>
        prev.map((m, i) => (i === actualIndex ? { ...m, isLoading: false } : m))
      );
    }
  };

  const handleMarkAbsent = async (index: number) => {
    const memberStatus = filteredMembers[index];
    if (!memberStatus.isPresent || !memberStatus.attendanceId) {
      notification.info('Member is already marked absent');
      return;
    }

    // Find the actual index in the main members array
    const actualIndex = members.findIndex(m => m.member.id === memberStatus.member.id);

    // Update loading state
    setMembers((prev) =>
      prev.map((m, i) => (i === actualIndex ? { ...m, isLoading: true } : m))
    );

    try {
      const { error } = await supabase
        .from('namdan_attendance')
        .delete()
        .eq('id', memberStatus.attendanceId);

      if (error) throw error;

      // Update state to reflect absent status
      setMembers((prev) =>
        prev.map((m, i) =>
          i === actualIndex ? { ...m, attendanceId: null, isPresent: false, isLoading: false } : m
        )
      );

      notification.success(`Marked ${memberStatus.member.name} as absent`);
    } catch (error) {
      notification.error('Failed to mark absent');
      console.error('Mark absent error:', error);
      setMembers((prev) =>
        prev.map((m, i) => (i === actualIndex ? { ...m, isLoading: false } : m))
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
            {members.filter((m) => m.isPresent).length} / {members.length} Present
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
              placeholder="Search by name or mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredMembers.length} of {members.length} members
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
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Namdan Members Found</h3>
          <p className="text-muted-foreground">There are no members with type NAMDAN in the system.</p>
        </div>
      ) : (
        <SmartTable
          data={filteredMembers}
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
              key: 'isPresent',
              header: 'Status',
              align: 'left',
              render: (value, row: MemberAttendanceStatus) =>
                row.isPresent ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    Present
                  </Badge>
                ) : (
                  <Badge variant="secondary">Absent</Badge>
                ),
            },
            {
              key: 'action',
              header: 'Action',
              align: 'center',
              render: (value, row: MemberAttendanceStatus) => {
                const index = filteredMembers.findIndex(m => m.member.id === row.member.id);
                return (
                  <div className="flex items-center justify-center gap-2">
                    {!row.isPresent ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkPresent(index)}
                        disabled={row.isLoading}
                        className="bg-green-500 hover:bg-green-600 text-xs"
                      >
                        {row.isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            <span className="hidden sm:inline">Marking...</span>
                          </>
                        ) : (
                          <span>Mark Present</span>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkAbsent(index)}
                        disabled={row.isLoading}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white"
                      >
                        {row.isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            <span className="hidden sm:inline">Marking...</span>
                          </>
                        ) : (
                          <span>Mark Absent</span>
                        )}
                      </Button>
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
              const index = filteredMembers.findIndex(m => m.member.id === row.member.id);
              return (
                <div className="flex gap-2">
                  {!row.isPresent ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleMarkPresent(index)}
                      disabled={row.isLoading}
                      className="bg-green-500 hover:bg-green-600 text-xs"
                    >
                      {row.isLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Marking...
                        </>
                      ) : (
                        'Mark Present'
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleMarkAbsent(index)}
                      disabled={row.isLoading}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white"
                    >
                      {row.isLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Marking...
                        </>
                      ) : (
                        'Mark Absent'
                      )}
                    </Button>
                  )}
                </div>
              );
            },
            footerLeft: (row: MemberAttendanceStatus) => {
              return row.isPresent ? (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  Present
                </Badge>
              ) : (
                <Badge variant="secondary">Absent</Badge>
              );
            },
          }}
        />
      )}
    </div>
  );
}

export default NamdanAttendanceForm;
