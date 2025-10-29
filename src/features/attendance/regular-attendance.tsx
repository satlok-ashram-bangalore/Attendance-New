'use client';

import React, { useEffect, useState } from 'react'
import { ChevronLeft, MapPin, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase/client';
import { SupabaseError } from '@/types/error';
import { useNotification } from '@/context/notification-context';
import { Button } from '@/components/ui/button';
import RegularAttendanceForm from './regular-attendance-form';

interface UserAccess {
  instance_id: string;
  user_id: string;
  access_id: number;
  access: AccessRecord;
}

interface AccessRecord {
  id: number;
  area: string;
  district: string;
  taluk: string;
  state: string;
}

function RegularAttendance() {
  const [accessId, setAccessId] = useState<number | -1>(-1);
  const [access, setAccess] = useState<AccessRecord[] | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const notification = useNotification();

  useEffect(() => {
    const fetchAccess = async () =>{
      try {
        setLoading(true);
        const { data:userAccess, error } = await supabase.from('user_access').select('*,access:access_id ( * )');

        if(error){
          throw error;
        }

        const accessData = userAccess.map((item:UserAccess) => item.access)
        
        setAccess(accessData);
      } catch (error) {
        if(error instanceof SupabaseError){
          notification.error(error.message);
        } else {
          notification.error('Failed to fetch access data');
        }
        setAccess([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAccess()
  }, []);

  const handleAccessSelect = (accessRecord: AccessRecord) => {
    setAccessId(accessRecord.id);
    setIsSubmitted(true);
  };

  const handleClick = () => {
    setAccessId(-1);
    setIsSubmitted(false);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading access locations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!access || access.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6">
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Access Locations</h3>
          <p className="text-muted-foreground">{`You don't have access to any locations yet.`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg py-6 px-2 md:px-6">
      {isSubmitted ? (
        <Button
          onClick={handleClick}
          variant="ghost"
          className="mb-6"
          size="sm"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Selection
        </Button>
      ) : null}
      
      {!isSubmitted ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Select Access Location</h2>
            <p className="text-muted-foreground">Choose a location to start taking attendance</p>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {access.map((item: AccessRecord) => (
              <div
                key={item.id}
                onClick={() => handleAccessSelect(item)}
                className="cursor-pointer p-4 rounded-lg border-2 border-border bg-background hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">{item.area}</h3>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Taluk:</span>
                    <span>{item.taluk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>District:</span>
                    <span>{item.district}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State:</span>
                    <span>{item.state}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <RegularAttendanceForm access_id={accessId} />
      )}
    </div>
  );
}

export default RegularAttendance