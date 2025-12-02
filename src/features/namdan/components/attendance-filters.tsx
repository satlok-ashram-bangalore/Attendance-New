import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, X, Download, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NamdanCentre {
  centre_id: number;
  centre_name: string;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface AttendanceFiltersProps {
  namdanCentres: NamdanCentre[];
  selectedCentre: string;
  setSelectedCentre: (value: string) => void;
  fromDate: Date | null;
  setFromDate: (date: Date | null) => void;
  toDate: Date | null;
  setToDate: (date: Date | null) => void;
  loading: boolean;
  loadingCentres: boolean;
  hasSearched: boolean;
  exporting: boolean;
  onGenerateReport: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function AttendanceFilters({
  namdanCentres,
  selectedCentre,
  setSelectedCentre,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  loading,
  loadingCentres,
  hasSearched,
  exporting,
  onGenerateReport,
  onClear,
  onExport,
}: AttendanceFiltersProps) {
  return (
    <Card className="border-0">
      <CardContent className="px-4 md:px-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Namdan Centre
              </label>
              <Select
                value={selectedCentre}
                onValueChange={setSelectedCentre}
                disabled={loadingCentres || loading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingCentres ? 'Loading centres...' : 'Select centre'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {namdanCentres.map((centre) => (
                    <SelectItem key={centre.centre_id} value={centre.centre_id.toString()}>
                      {centre.centre_name} - {centre.area}, {centre.district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DatePicker label="From Date" value={fromDate} onChange={setFromDate} />

            <DatePicker label="To Date" value={toDate} onChange={setToDate} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onGenerateReport}
              disabled={loading || loadingCentres}
              className="flex items-center gap-2 flex-shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Loading...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Generate Report</span>
                  <span className="sm:hidden">Report</span>
                </>
              )}
            </Button>

            {hasSearched && (
              <>
                <Button
                  onClick={onClear}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>Clear</span>
                </Button>

                <Button
                  onClick={onExport}
                  variant="secondary"
                  disabled={loading || exporting}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Exporting...</span>
                      <span className="sm:hidden">Export</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export Excel</span>
                      <span className="sm:hidden">Export</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
