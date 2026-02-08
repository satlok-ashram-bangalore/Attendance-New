'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/context/notification-context';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';

interface MemberInfo {
  id: number;
  name: string;
  age: number;
  village: string;
  taluk: string;
  district: string;
  state: string;
  mobile: string;
  type: 'GENERAL' | 'NAMDAN';
  whatsapp: boolean;
  notification: boolean;
  mantra: boolean;
  social_media: boolean;
  first_language: string;
  second_language: string;
  remarks: string;
  created_at: string;
}

export const ToggleNamdanMember = () => {
  const notification = useNotification();

  const [mobile, setMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [member, setMember] = useState<MemberInfo | null>(null);

  // Auto-search when 10-digit mobile number is entered
  useEffect(() => {
    if (mobile.trim().length === 10 && /^\d{10}$/.test(mobile.trim())) {
      searchMember();
    } else {
      setMember(null);
    }
  }, [mobile]);

  const searchMember = async () => {
    setIsSearching(true);
    setMember(null);

    try {
      const { data: memberData, error } = await supabase
        .from('member_info')
        .select('*')
        .eq('mobile', mobile.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          notification.error('No member found with this phone number');
        } else {
          throw error;
        }
        return;
      }

      setMember(memberData as MemberInfo);
      notification.success('Member found!');
    } catch (error) {
      if (error instanceof Error) {
        notification.error(error.message || 'Failed to fetch member');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMemberType = async () => {
    if (!member) return;

    setIsConverting(true);
    const newType = member.type === 'GENERAL' ? 'NAMDAN' : 'GENERAL';

    try {
      const { error } = await supabase
        .from('member_info')
        .update({ type: newType })
        .eq('id', member.id);

      if (error) {
        throw error;
      }

      setMember({ ...member, type: newType });
      notification.success(`${member.name} successfully converted to ${newType} member!`);
    } catch (error) {
      if (error instanceof Error) {
        notification.error(error.message || 'Failed to convert member');
      }
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className='border-none'>
        <CardHeader>
          <CardTitle>Toggle Namdan Member</CardTitle>
          <CardDescription>
            Enter phone number to search and toggle member type between GENERAL and NAMDAN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={10}
            />
            {mobile.length > 0 && mobile.length < 10 && (
              <p className="text-xs text-muted-foreground">
                Enter {10 - mobile.length} more digits to search
              </p>
            )}
            {mobile.length > 0 && !/^\d+$/.test(mobile) && (
              <p className="text-xs text-red-500">Please enter only numbers</p>
            )}
          </div>
        </CardContent>
      </Card>

      {member && (
        <Card className='border-none'>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Member Details</CardTitle>
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3">
                <Badge variant={member.type === 'NAMDAN' ? 'default' : 'secondary'}>
                  {member.type}
                </Badge>
                <div className="flex items-center gap-2">
                  <Label htmlFor="member-type-toggle" className="text-xs cursor-pointer whitespace-nowrap">
                    {member.type === 'GENERAL' ? 'Convert to NAMDAN' : 'Convert to GENERAL'}
                  </Label>
                  <Switch
                    id="member-type-toggle"
                    checked={member.type === 'NAMDAN'}
                    onCheckedChange={toggleMemberType}
                    disabled={isConverting}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{member.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Age</p>
                <p className="text-sm font-medium">{member.age}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="text-sm font-medium">{member.mobile}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">First Language</p>
                <p className="text-sm font-medium">{member.first_language}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-medium">{member.whatsapp ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notification</p>
                <p className="text-sm font-medium">{member.notification ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mantra</p>
                <p className="text-sm font-medium">{member.mantra ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Social Media</p>
                <p className="text-sm font-medium">{member.social_media ? 'Yes' : 'No'}</p>
              </div>
              <div className="col-span-2 md:col-span-3 lg:col-span-4">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">{member.village}, {member.taluk}, {member.district}, {member.state}</p>
              </div>
              {member.second_language && (
                <div className="col-span-2 md:col-span-3 lg:col-span-4">
                  <p className="text-xs text-muted-foreground">Second Language(s)</p>
                  <p className="text-sm font-medium">{member.second_language}</p>
                </div>
              )}
              {member.remarks && (
                <div className="col-span-2 md:col-span-3 lg:col-span-4">
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm font-medium">{member.remarks}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
