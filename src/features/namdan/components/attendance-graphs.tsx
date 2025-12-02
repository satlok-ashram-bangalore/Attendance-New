import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Monitor } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

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

interface AttendanceGraphsProps {
  data: MemberAttendanceData[];
  graphView: 'present' | 'absent' | 'not_filled';
  setGraphView: (view: 'present' | 'absent' | 'not_filled') => void;
}

export function AttendanceGraphs({ data, graphView, setGraphView }: AttendanceGraphsProps) {
  return (
    <>
      {/* Mobile Message */}
      <div className="md:hidden">
        <Card className="border-none">
          <CardContent className="p-8 text-center">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Graphs Available on Larger Screens</h3>
            <p className="text-sm text-muted-foreground">
              Please switch to a tablet or desktop device to view the interactive attendance graphs.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Graphs */}
      <div className="hidden md:block">
        <Card className="border-none">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Graph View Selector */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-lg border border-border p-1 bg-muted">
                  <Button
                    variant={graphView === 'present' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGraphView('present')}
                    className="rounded-md"
                  >
                    Present
                  </Button>
                  <Button
                    variant={graphView === 'absent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGraphView('absent')}
                    className="rounded-md"
                  >
                    Absent
                  </Button>
                  <Button
                    variant={graphView === 'not_filled' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGraphView('not_filled')}
                    className="rounded-md"
                  >
                    Not Filled
                  </Button>
                </div>
              </div>

              {/* Graph Title */}
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {graphView === 'present' && 'Present Days by Member'}
                  {graphView === 'absent' && 'Absent Days by Member'}
                  {graphView === 'not_filled' && 'Not Filled Days by Member'}
                </h3>
              </div>

              {/* Bar Chart */}
              <div className="w-full" style={{ height: `${Math.max(400, data.length * 30)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data
                      .slice()
                      .sort((a, b) => {
                        const aValue = graphView === 'present' ? a.present_days :
                                      graphView === 'absent' ? a.absent_days : a.not_filled_days;
                        const bValue = graphView === 'present' ? b.present_days :
                                      graphView === 'absent' ? b.absent_days : b.not_filled_days;
                        return bValue - aValue;
                      })
                      .map((member) => ({
                        name: member.name,
                        value: graphView === 'present' ? member.present_days :
                               graphView === 'absent' ? member.absent_days : member.not_filled_days,
                        present: member.present_days,
                        absent: member.absent_days,
                        notFilled: member.not_filled_days,
                      }))}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      className="text-xs"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      interval={0}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const chartData = payload[0].payload;
                          return (
                            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold text-foreground mb-2">{chartData.name}</p>
                              <div className="space-y-1 text-sm">
                                <p className="text-green-600 dark:text-green-400">
                                  Present: <span className="font-semibold">{chartData.present} days</span>
                                </p>
                                <p className="text-red-600 dark:text-red-400">
                                  Absent: <span className="font-semibold">{chartData.absent} days</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Not Filled: <span className="font-semibold">{chartData.notFilled} days</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      label={{
                        position: 'right',
                        fill: 'hsl(var(--foreground))',
                        fontSize: 12,
                      }}
                    >
                      {data.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            graphView === 'present'
                              ? 'hsl(142, 76%, 36%)'
                              : graphView === 'absent'
                              ? 'hsl(0, 84%, 60%)'
                              : 'hsl(215, 16%, 47%)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
