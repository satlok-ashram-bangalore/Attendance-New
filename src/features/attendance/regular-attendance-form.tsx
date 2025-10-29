import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Loader2, MapPin, User, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IMemberInfoDb } from '@/features/member/types';

interface Plan {
  id: number;
  access_id: number;
  plan_description: string;
  planned_from: string;
  planned_to: string;
  tag: string;
  created_at: string;
  updated_at: string;
}

interface RegularAttendanceFormProps {
    access_id: number;
}

function RegularAttendanceForm({ access_id }: RegularAttendanceFormProps) {
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchMobile, setSearchMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IMemberInfoDb[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<IMemberInfoDb[]>([]);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const notification = useNotification();

  // Auto-search with debounce when mobile number is 10 digits
  useEffect(() => {
    if (searchMobile.length === 10 && activePlan) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 800);

      return () => clearTimeout(debounceTimer);
    } else {
      // Clear results if mobile number is not 10 digits
      setSearchResults([]);
      setSelectedMembers([]);
    }
  }, [searchMobile, activePlan]);

  useEffect(() => {
    const fetchActivePlan = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('access_id', access_id)
          .lte('planned_from', today)
          .gte('planned_to', today)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          setActivePlan(data[0]);
        } else {
          setActivePlan(null);
        }
      } catch (error) {
        notification.error('Failed to fetch active plan');
        console.error('Error fetching active plan:', error);
        setActivePlan(null);
      } finally {
        setLoading(false);
      }
    };

    if (access_id) {
      fetchActivePlan();
    }
  }, [access_id]);

  const handleMobileChange = (value: string) => {
    setSearchMobile(value);
    // Only clear if changing from 10 digits to something else
    if (value.length !== 10) {
      setSearchResults([]);
      setSelectedMembers([]);
    }
  };

  const handleSearch = async () => {
    if (searchMobile.length !== 10) {
      notification.error('Please enter a 10-digit mobile number');
      return;
    }

    if (!activePlan) {
      notification.error('No active plan available');
      return;
    }

    try {
      setIsSearching(true);
      setSearchResults([]);
      setSelectedMembers([]);

      const { data, error } = await supabase
        .from('member_info')
        .select('*')
        .eq('mobile', searchMobile.trim())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
        notification.info('No members found with this mobile number');
      }
    } catch (error) {
      notification.error('Search failed');
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMemberSelect = (member: IMemberInfoDb) => {
    setSelectedMembers(prev => {
      const isAlreadySelected = prev.some(m => m.id === member.id);
      if (isAlreadySelected) {
        // Remove from selection
        return prev.filter(m => m.id !== member.id);
      } else {
        // Add to selection
        return [...prev, member];
      }
    });
  };

  const handleSubmitAttendance = async () => {
    if (selectedMembers.length === 0 || !activePlan) {
      notification.error('Please select at least one member and ensure there is an active plan');
      return;
    }

    try {
      setSubmittingAttendance(true);
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];

      // Check for existing attendance for all selected members
      const memberIds = selectedMembers.map(m => m.id);
      const { data: existingAttendance, error: checkError } = await supabase
        .from('attendance')
        .select('member_id, id')
        .in('member_id', memberIds)
        .eq('plan_id', activePlan.id)
        .eq('access_id', access_id)

      if (checkError) {
        throw checkError;
      }

      // Filter out members who already have attendance marked
      const existingMemberIds = existingAttendance?.map(a => a.member_id) || [];
      const membersToSubmit = selectedMembers.filter(m => !existingMemberIds.includes(m.id));
      
      if (membersToSubmit.length === 0) {
        notification.warning('Attendance already marked for all selected members today');
        return;
      }

      if (existingMemberIds.length > 0) {
        const skippedNames = selectedMembers
          .filter(m => existingMemberIds.includes(m.id))
          .map(m => m.name)
          .join(', ');
        notification.info(`Skipped members with existing attendance: ${skippedNames}`);
      }

      // Prepare batch insert data
      const attendanceRecords = membersToSubmit.map(member => ({
        member_id: member.id,
        access_id: access_id,
        plan_id: activePlan.id,
        date: today,
        time: currentTime
      }));

      // Insert attendance records for all members
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (insertError) {
        throw insertError;
      }

      const successNames = membersToSubmit.map(m => m.name).join(', ');
      notification.success(`Attendance marked successfully for: ${successNames}`);
      
      // Reset form
      setSearchMobile('');
      setSearchResults([]);
      setSelectedMembers([]);
      
    } catch (error) {
      notification.error('Failed to submit attendance');
      console.error('Attendance submission error:', error);
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading active plan...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-2 sm:p-4">
      {/* Plan Status Section */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Regular Attendance</h2>
          <div className="flex items-center space-x-2">
            {activePlan ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  Active Plan
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <Badge variant="destructive">
                  No Active Plan
                </Badge>
              </>
            )}
          </div>
        </div>

        {activePlan ? (
          <div className="bg-background border border-border rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Plan Description</h3>
                <p className="text-foreground">{activePlan.plan_description}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-lg p-3 sm:p-4 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Active Plan</h3>
            <p className="text-muted-foreground">
              There is no active plan for this location. Please contact your administrator.
            </p>
          </div>
        )}
      </div>

      {/* Search Section */}
      {activePlan && (
        <div className="bg-background border border-border rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Search Member</h3>
              <p className="text-sm text-muted-foreground">Enter mobile number to mark attendance</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchMobile}
                  onChange={(e) => handleMobileChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  maxLength={10}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Search Results ({searchResults.length} found)
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMembers([...searchResults])}
                disabled={selectedMembers.length === searchResults.length}
                className="flex-1 sm:flex-none text-xs"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMembers([])}
                disabled={selectedMembers.length === 0}
                className="flex-1 sm:flex-none text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
          
          <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
            {searchResults.map((member) => (
              <div
                key={member.id}
                onClick={() => handleMemberSelect(member)}
                className={`cursor-pointer p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  selectedMembers.some(m => m.id === member.id)
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">{member.name}</h4>
                  </div>
                  {selectedMembers.some(m => m.id === member.id) && (
                    <Badge variant="default" className="text-xs">Selected</Badge>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{member.village}, {member.taluk}, {member.district}, {member.state}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {member.whatsapp && (
                      <Badge variant="secondary" className="text-xs">WhatsApp</Badge>
                    )}
                    {member.notification && (
                      <Badge variant="secondary" className="text-xs">Notification</Badge>
                    )}
                    {member.mantra && (
                      <Badge variant="secondary" className="text-xs">Mantra</Badge>
                    )}
                    {member.social_media && (
                      <Badge variant="secondary" className="text-xs">Social Media</Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Age: {member.age} | Language: {member.first_language}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Attendance Section */}
      {selectedMembers.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-3 sm:p-4">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-foreground text-sm sm:text-base">Ready to Submit Attendance</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {selectedMembers.length} member(s) selected
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleSubmitAttendance}
                disabled={submittingAttendance}
                size="sm"
                className="w-full sm:w-auto"
              >
                {submittingAttendance ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Submitting...</span>
                    <span className="sm:hidden">Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Submit Attendance ({selectedMembers.length})</span>
                    <span className="sm:hidden">Submit ({selectedMembers.length})</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Selected Members Summary */}
            <div className="border-t border-border pt-2 sm:pt-3">
              <h5 className="text-xs sm:text-sm font-medium text-foreground mb-2">Selected Members:</h5>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {selectedMembers.map((member) => (
                  <Badge 
                    key={member.id} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMemberSelect(member);
                    }}
                    title="Click to remove"
                  >
                    <span className="truncate max-w-[120px]">{member.name}</span> ✕
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegularAttendanceForm