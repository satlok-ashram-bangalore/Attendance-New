'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '@/context/notification-context';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { VALID_ROLES } from '@/lib/auth-config';
import { supabase } from '@/lib/supabase/client';
import { api } from '@/lib/api-client';
import { AxiosError } from 'axios';
import { SupabaseError } from '@/types/error';

export interface User {
  email: string;
  password: string;
  role: string;
  accessIds: number[] | undefined;
  centreIds: number[] | undefined;
}

const formSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: 'Username must be at least 3 characters' })
      .regex(/^[a-zA-Z0-9._-]+$/, {
        message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
      }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string().min(8, { message: 'Confirm password is required' }),
    role: z.string().min(1, { message: 'Please select a role' }),
    accessLocations: z.array(z.any()).optional(),
    namdanCentres: z.array(z.any()).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'authenticated') {
        return data.accessLocations && data.accessLocations.length > 0;
      }
      return true;
    },
    {
      message: 'Please select at least one access location for authenticated users',
      path: ['accessLocations'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'namdan_user') {
        return data.namdanCentres && data.namdanCentres.length > 0;
      }
      return true;
    },
    {
      message: 'Please select at least one namdan centre for namdan users',
      path: ['namdanCentres'],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface AccessLocation {
  id: number;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

interface NamdanCentre {
  centre_id: number;
  centre_name: string;
  area: string;
  taluk: string;
  district: string;
  state: string;
}

export function AddUserForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessLocations, setAccessLocations] = useState<AccessLocation[]>([]);
  const [namdanCentres, setNamdanCentres] = useState<NamdanCentre[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const notification = useNotification();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      role: '',
      accessLocations: [],
      namdanCentres: [],
    },
  });

  const selectedRole = form.watch('role');

  // Fetch access locations when authenticated role is selected
  useEffect(() => {
    if (selectedRole === 'authenticated') {
      fetchAccessLocations();
    }
  }, [selectedRole]);

  // Fetch namdan centres when namdan_user role is selected
  useEffect(() => {
    if (selectedRole === 'namdan_user') {
      fetchNamdanCentres();
    }
  }, [selectedRole]);

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
      notification.error(error instanceof SupabaseError ? error.message : 'Failed to load access locations');
      setAccessLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchNamdanCentres = async () => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('namdan')
        .select('*')
        .order('state', { ascending: true })
        .order('district', { ascending: true });

      if (error) throw error;
      setNamdanCentres(data || []);
    } catch (error) {
      notification.error(error instanceof SupabaseError ? error.message : 'Failed to load namdan centres');
      setNamdanCentres([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Construct full email with domain
      const email = `${data.username}@attendance.in`;

      // Prepare access data based on role
      const accessIds =
        data.role === 'authenticated'
          ? data.accessLocations?.map((loc) => parseInt(loc.value, 10))
          : undefined;

      const centreIds =
        data.role === 'namdan_user'
          ? data.namdanCentres?.map((centre) => parseInt(centre.value, 10))
          : undefined;

      // Call API to create user
      const response = await api.create_user({
        email,
        password: data.password,
        role: data.role,
        accessIds,
        centreIds,
      });

      if (response.status == 201) {
        notification.success(`User created successfully with email: ${email}`);
        form.reset();
        setAccessLocations([]);
        setNamdanCentres([]);
      }
    } catch (error) {
      console.log(error);
      notification.error(
        error instanceof AxiosError
          ? error.response?.data.message
          : 'Failed to create user. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out 'anon' role as it's not a valid user role
  const availableRoles = VALID_ROLES.filter((role) => role !== 'anon');

  return (
    <div className="max-w-2xl mx-auto bg-card rounded-xl">
      <div className="relative">
        <div className="relative px-4 py-4 shadow-lg sm:rounded-3xl sm:px-10">
          <div className="max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground">Create New User</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Add a new user to the system with specific access level
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Email/Username Field */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Input
                            placeholder="username"
                            {...field}
                            className="pr-32"
                            autoComplete="off"
                            disabled={isSubmitting}
                          />
                          <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none select-none">
                            @attendance.in
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter password"
                            {...field}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff size={20} className="text-muted-foreground" />
                            ) : (
                              <Eye size={20} className="text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password Field */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Re-enter password"
                            {...field}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={20} className="text-muted-foreground" />
                            ) : (
                              <Eye size={20} className="text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role Selection Field */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Level</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset location selections when role changes
                          form.setValue('accessLocations', []);
                          form.setValue('namdanCentres', []);
                        }}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select access level for user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role === 'admin'
                                ? 'Admin'
                                : role === 'authenticated'
                                  ? 'Authenticated User'
                                  : role === 'namdan_user'
                                    ? 'Namdan User'
                                    : role === 'archived'
                                      ? 'Archived (Read-Only)'
                                      : role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Access Locations for Authenticated Users */}
                {selectedRole === 'authenticated' && (
                  <FormField
                    control={form.control}
                    name="accessLocations"
                    render={() => (
                      <FormItem>
                        <FormLabel>Access Locations</FormLabel>
                        <FormDescription>
                          Select one or more locations this user can access
                        </FormDescription>
                        <FormControl>
                          <Controller
                            name="accessLocations"
                            control={form.control}
                            render={({ field }) => (
                              <MultiSelect
                                options={accessLocations.map((loc) => ({
                                  value: loc.id.toString(),
                                  label: `${loc.area}, ${loc.taluk}, ${loc.district}, ${loc.state}`,
                                }))}
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder={
                                  loadingLocations
                                    ? 'Loading locations...'
                                    : 'Select access locations'
                                }
                                disabled={isSubmitting || loadingLocations}
                              />
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Namdan Centres for Namdan Users */}
                {selectedRole === 'namdan_user' && (
                  <FormField
                    control={form.control}
                    name="namdanCentres"
                    render={() => (
                      <FormItem>
                        <FormLabel>Namdan Centres</FormLabel>
                        <FormDescription>
                          Select one or more namdan centres this user can access
                        </FormDescription>
                        <FormControl>
                          <Controller
                            name="namdanCentres"
                            control={form.control}
                            render={({ field }) => (
                              <MultiSelect
                                options={namdanCentres.map((centre) => ({
                                  value: centre.centre_id.toString(),
                                  label: `${centre.centre_name}, ${centre.area}, ${centre.taluk}, ${centre.district}, ${centre.state}`,
                                }))}
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder={
                                  loadingLocations ? 'Loading centres...' : 'Select namdan centres'
                                }
                                disabled={isSubmitting || loadingLocations}
                              />
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Creating User...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
