'use client';

import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  centre_name: z.string().min(1, 'Centre name is required'),
  area: z.string().min(1, 'Area is required'),
  taluk: z.string().min(1, 'Taluk is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddNamdanForm() {
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      centre_name: '',
      area: '',
      taluk: '',
      district: '',
      state: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('namdan').insert({
        centre_name: values.centre_name,
        area: values.area,
        taluk: values.taluk,
        district: values.district,
        state: values.state,
      });

      if (error) throw error;

      notification.success('Namdan centre created successfully');
      form.reset();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Failed to create namdan centre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-0">
      <CardHeader>
        <CardTitle>Add Namdan Centre</CardTitle>
        <CardDescription>Create a new namdan centre with location details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="centre_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centre Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter centre name..."
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter area..."
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
                name="taluk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taluk</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter taluk..."
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter district..."
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter state..."
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Centre...
                </>
              ) : (
                'Create Namdan Centre'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
