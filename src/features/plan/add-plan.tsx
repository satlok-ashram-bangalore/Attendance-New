'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { SupabaseError } from '@/types/error';

interface AccessLocation {
  id: number;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

const PLAN_TAGS = ['Satsang', 'Social Media Meeting', 'Rally', 'Darshan'];

const formSchema = z.object({
  access_id: z.string().min(1, 'Access location is required'),
  plan_description: z.string().min(1, 'Plan description is required'),
  planned_from: z.date({
    required_error: 'Start date is required',
  }),
  planned_to: z.date({
    required_error: 'End date is required',
  }),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
}).refine((data) => data.planned_to >= data.planned_from, {
  message: 'End date must be on or after start date',
  path: ['planned_to'],
});

type FormValues = z.infer<typeof formSchema>;

export function AddPlanForm() {
  const [accessLocations, setAccessLocations] = useState<AccessLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const notification = useNotification();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      access_id: '',
      plan_description: '',
      tags: [],
    },
  });

  useEffect(() => {
    fetchAccessLocations();
  }, []);

  const fetchAccessLocations = async () => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('access')
        .select('*')
        .order('state', { ascending: true })
        .order('district', { ascending: true });

      if (error) throw error;
      setAccessLocations(data || []);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error?.message : 'Failed to load access locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      // Join tags with hyphen
      const tagString = values.tags.join('-');

      const { error } = await supabase.from('plans').insert({
        access_id: parseInt(values.access_id, 10),
        plan_description: values.plan_description,
        planned_from: format(values.planned_from, 'yyyy-MM-dd'),
        planned_to: format(values.planned_to, 'yyyy-MM-dd'),
        tag: tagString,
      });

      if (error) throw error;

      notification.success('Plan created successfully');
      form.reset();
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error?.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  const tagOptions: MultiSelectOption[] = PLAN_TAGS.map((tag) => ({
    value: tag,
    label: tag,
  }));

  return (
    <Card className="w-full max-w-2xl mx-auto border-0">
      <CardHeader>
        <CardTitle>Create New Plan</CardTitle>
        <CardDescription>Add a new plan with location, dates, and tags</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="access_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Location</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingLocations || loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingLocations ? 'Loading locations...' : 'Select a location'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accessLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {`${location.area}, ${location.taluk}, ${location.district}, ${location.state}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className='text-red-500'/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plan_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter plan description..."
                      className="resize-none"
                      rows={4}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planned_from"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DatePicker
                        label="Start Date"
                        value={field.value || null}
                        onChange={(date) => field.onChange(date)}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DatePicker
                        label="End Date"
                        value={field.value || null}
                        onChange={(date) => field.onChange(date)}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={tagOptions}
                      value={field.value.map((tag) => ({ value: tag, label: tag }))}
                      onChange={(selected) => field.onChange(selected.map((s) => s.value))}
                      placeholder="Select tags..."
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected tags will be joined with hyphens (e.g., Satsang-Rally)
                  </p>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading || loadingLocations}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Plan...
                </>
              ) : (
                'Create Plan'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
