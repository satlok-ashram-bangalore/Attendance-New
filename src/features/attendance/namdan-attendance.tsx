'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SupabaseError } from '@/types/error';
import { useNotification } from '@/context/notification-context';
import { Button } from '@/components/ui/button';
import NamdanAttendanceForm from './namdan-attendance-form';

interface NamdanAccess {
  centre_id: number;
  user_id: string;
  instance_id: string;
  namdan: NamdanRecord;
}

interface NamdanRecord {
  centre_id: number;
  centre_name: string;
  village: string;
  district: string;
  taluk: string;
  state: string;
}

function NamdanAttendance() {
  const [centreId, setCentreId] = useState<number | -1>(-1);
  const [centres, setCentres] = useState<NamdanRecord[] | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const notification = useNotification();

  useEffect(() => {
    const fetchAccess = async () => {
      try {
        setLoading(true);
        const { data: namdanAccess, error } = await supabase
          .from('namdan_access')
          .select('*, namdan:centre_id (*)');

        if (error) {
          throw error;
        }

        const centreData = namdanAccess.map((item: NamdanAccess) => item.namdan);
        setCentres(centreData);
      } catch (error) {
        if (error instanceof SupabaseError) {
          notification.error(error.message);
        } else {
          notification.error('Failed to fetch namdan centres');
        }
        setCentres([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAccess();
  }, []);

  const handleCentreSelect = (centreRecord: NamdanRecord) => {
    setCentreId(centreRecord.centre_id);
    setIsSubmitted(true);
  };

  const handleClick = () => {
    setCentreId(-1);
    setIsSubmitted(false);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading namdan centres...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!centres || centres.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6">
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Namdan Centres</h3>
          <p className="text-muted-foreground">{`You don't have access to any namdan centres yet.`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-card shadow-lg rounded-lg py-6 px-2 md:px-6">
      {isSubmitted ? (
        <Button onClick={handleClick} variant="ghost" className="mb-6" size="sm">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Selection
        </Button>
      ) : null}

      {!isSubmitted ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Select Namdan Centre</h2>
            <p className="text-muted-foreground">Choose a centre to start taking attendance</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {centres.map((item: NamdanRecord) => (
              <div
                key={item.centre_id}
                onClick={() => handleCentreSelect(item)}
                className="cursor-pointer p-4 rounded-lg border-2 border-border bg-background hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">{item.centre_name}</h3>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Village:</span>
                    <span>{item.village}</span>
                  </div>
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
        <NamdanAttendanceForm centre_id={centreId} />
      )}
    </div>
  );
}

export default NamdanAttendance;