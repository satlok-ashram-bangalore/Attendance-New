'use client';

import { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { Loader } from 'lucide-react';
import { useNotification } from '@/context/notification-context';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase/client';
import { SupabaseError } from '@/types/error';
import { IMemberInfo } from './types';

export const Registration = () => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<IMemberInfo>();

  const notification = useNotification();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState<
    Array<{ name: string; village: string; id: number }>
  >([]);

  const first_language = watch('first_language');

  const fetchUserByMobile = async (mobileNumber: string) => {
    try {
      const { data: Users, error } = await supabase
        .from('member_info')
        .select('id,name,village')
        .eq('mobile', mobileNumber);

      if (error) {
        throw error;
      }

      setFetchedUsers(Users);
      notification.info('Users with same mobile were found');
    } catch (error) {
      if (error instanceof SupabaseError) {
        notification.error(error.message);
        setFetchedUsers([]);
      }
    }
  };

  const handleMobileChange = async (mobile: string) => {
    if (mobile.length === 10) {
      await fetchUserByMobile(mobile);
    } else {
      setFetchedUsers([]);
    }
  };

  const onSubmit: SubmitHandler<IMemberInfo> = async (data) => {
    setIsSubmitting(true);

    data.age = parseInt(String(data.age), 10);

    const holidays = data.holiday.map((ele: MultiSelectOption) => ele.value);
    const secondLanguages = data.second_language?.map((ele: MultiSelectOption) => ele.value).join(',') || '';

    data.name = data.name.trim().replace(/\s+/g, ' ').toUpperCase();
    data.village = data.village.trim().replace(/\s+/g, ' ').toUpperCase();
    data.taluk = data.taluk.trim().replace(/\s+/g, ' ').toUpperCase();
    data.district = data.district.trim().replace(/\s+/g, ' ').toUpperCase();
    data.state = data.state.trim().replace(/\s+/g, ' ').toUpperCase();

    try {
      const { data: insertedMember, error } = await supabase
        .from('member_info')
        .insert({
          ...data,
          holiday: holidays,
          second_language: secondLanguages,
        })
        .select('id');

      if (error) {
        throw error;
      }

      notification.success('Member successfully registered with id ' + insertedMember[0].id);
      reset();
      setFetchedUsers([]);
      reset({ holiday: [], second_language: [] });
    } catch (error) {
      if (error instanceof SupabaseError) {
        notification.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const indianLanguages = [
    'Hindi',
    'Bengali',
    'Telugu',
    'Marathi',
    'Tamil',
    'Urdu',
    'Gujarati',
    'Kannada',
    'Odia',
    'Malayalam',
    'Punjabi',
    'English',
  ];

  const weekdayOptions: MultiSelectOption[] = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' },
  ];

  const holidayOptions: MultiSelectOption[] = [
    { value: 'SELECT_ALL', label: '✓ Select All Days' },
    ...weekdayOptions,
    { value: 'Rotational', label: 'Rotational' },
  ];

  const handleHolidayChange = (selectedOptions: MultiSelectOption[]) => {
    const hasSelectAll = selectedOptions.some((opt) => opt.value === 'SELECT_ALL');
    const currentValues = watch('holiday') || [];
    const hadSelectAll = currentValues.some((opt) => opt.value === 'SELECT_ALL');

    if (hasSelectAll && !hadSelectAll) {
      // Select All was just clicked - select all weekdays
      return [...weekdayOptions];
    } else if (!hasSelectAll && hadSelectAll) {
      // Select All was just unchecked - keep only non-weekday options
      return selectedOptions.filter((opt) => opt.value === 'Rotational');
    } else if (hasSelectAll) {
      // Select All is already selected
      const withoutSelectAll = selectedOptions.filter((opt) => opt.value !== 'SELECT_ALL');
      const allWeekdaysSelected = weekdayOptions.every((day) =>
        withoutSelectAll.some((opt) => opt.value === day.value)
      );

      if (!allWeekdaysSelected) {
        // Some weekday was deselected, remove Select All
        return withoutSelectAll;
      }
      return selectedOptions;
    }

    return selectedOptions;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative sm:max-w-4xl">
        <div className="relative px-4 py-4 shadow-lg sm:rounded-3xl sm:px-10">
          {fetchedUsers.length > 0 && (
            <div className="w-full my-4">
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Users with the same mobile number:
              </h3>
              <div className="rounded-md flex flex-col sm:flex-row sm:flex-wrap gap-2">
                {fetchedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="mb-2 py-2 px-4 sm:max-w-max bg-card border border-border rounded-md"
                  >
                    <p className="text-card-foreground">Name: {user.name}</p>
                    <p className="text-card-foreground">Village: {user.village}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="max-w-4xl">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Member Registration</h1>
            </div>
            <div className=" ">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="py-8 text-base leading-6 space-y-4 text-foreground sm:text-lg"
              >
                {/* Name , Age */}
                <div className="flex flex-wrap -mx-3 mb-6">
                  <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                    <div className="relative">
                      <input
                        id="name"
                        {...register('name', { required: 'Name is required' })}
                        type="text"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="Name"
                      />
                      <label
                        htmlFor="name"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        Name
                      </label>
                      {errors.name && (
                        <p className="text-red-500 text-xs italic">{errors.name.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 px-3">
                    <div className="relative">
                      <input
                        id="age"
                        {...register('age', {
                          required: 'Age is required',
                          min: { value: 1, message: 'Age must be positive' },
                          max: { value: 150, message: "Age can't be greater than 150." },
                        })}
                        type="number"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="Age"
                      />
                      <label
                        htmlFor="age"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        Age
                      </label>
                      {errors.age && (
                        <p className="text-red-500 text-xs italic">{errors.age.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Village , Taluk */}
                <div className="flex flex-wrap -mx-3 mb-6">
                  <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                    <div className="relative">
                      <input
                        id="village"
                        {...register('village', {
                          required: 'Village is required',
                        })}
                        type="text"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="Village"
                      />
                      <label
                        htmlFor="village"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        Village
                      </label>
                      {errors.village && (
                        <p className="text-red-500 text-xs italic">{errors.village.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 px-3">
                    <div className="relative">
                      <input
                        id="taluk"
                        {...register('taluk', {
                          required: 'Taluk is required',
                        })}
                        type="text"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="Taluk"
                      />
                      <label
                        htmlFor="taluk"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        Taluk
                      </label>
                      {errors.taluk && (
                        <p className="text-red-500 text-xs italic">{errors.taluk.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* District , State */}
                <div className="flex flex-wrap -mx-3 mb-6">
                  <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                    <div className="relative">
                      <input
                        id="district"
                        {...register('district', {
                          required: 'District is required',
                        })}
                        type="text"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="District"
                      />
                      <label
                        htmlFor="district"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        District
                      </label>
                      {errors.district && (
                        <p className="text-red-500 text-xs italic">{errors.district.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 px-3">
                    <div className="relative">
                      <input
                        id="state"
                        {...register('state', {
                          required: 'State is required',
                        })}
                        type="text"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="State"
                      />
                      <label
                        htmlFor="state"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        State
                      </label>
                      {errors.state && (
                        <p className="text-red-500 text-xs italic">{errors.state.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile , Holiday */}
                <div className="flex flex-wrap gap-10 -mx-3 md:gap-0">
                  <div className="w-full md:w-1/2 px-3">
                    <div className="relative">
                      <input
                        id="mobile"
                        {...register('mobile', {
                          required: 'Mobile number is required',
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message: 'Invalid mobile number',
                          },
                        })}
                        onChange={(event) => handleMobileChange(event.target.value)}
                        type="number"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="Mobile"
                      />
                      <label
                        htmlFor="mobile"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        Mobile
                      </label>
                      {errors.mobile && (
                        <p className="text-red-500 text-xs italic">{errors.mobile.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 px-3">
                    <div className="relative">
                      <span className="block text-muted-foreground text-sm mb-2">
                        Holidays
                      </span>
                      <Controller
                        name="holiday"
                        control={control}
                        rules={{ required: 'Holiday is required' }}
                        render={({ field }) => (
                          <MultiSelect
                            options={holidayOptions}
                            value={field.value || []}
                            onChange={(value) => field.onChange(handleHolidayChange(value))}
                            placeholder="Select Holidays"
                          />
                        )}
                      />
                      {errors.holiday && (
                        <p className="text-red-500 text-xs italic mt-1">Holiday is required.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="flex flex-wrap -mx-3">
                  <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                    <div className="relative">
                      <span
                        className="block text-muted-foreground text-sm mb-2"
                      >
                        First Language
                      </span>
                      <Controller
                        name="first_language"
                        control={control}
                        rules={{ required: 'First Language is required' }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select First Language" />
                            </SelectTrigger>
                            <SelectContent>
                              {indianLanguages.map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.first_language && (
                        <p className="text-red-500 text-xs italic mt-1">
                          {errors.first_language.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 px-3">
                    <div className="relative">
                      <span
                        className="block text-muted-foreground text-sm mb-2"
                      >
                        Second Language(s) (Optional)
                      </span>
                      <Controller
                        name="second_language"
                        control={control}
                        render={({ field }) => (
                          <MultiSelect
                            options={indianLanguages
                              .filter((lang) => lang !== first_language)
                              .map((lang) => ({ value: lang, label: lang }))}
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select Second Language(s)"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Reviews */}
                <div className="flex flex-wrap -mx-3">
                  <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                    <div className="relative">
                      <input
                        id="remarks"
                        {...register('remarks', { required: false })}
                        type="text"
                        className="peer placeholder-transparent h-10 w-full border-b-2 border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
                        placeholder="Remarks"
                      />
                      <label
                        htmlFor="remarks"
                        className="absolute left-0 -top-3.5 text-muted-foreground text-sm peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-2 transition-all peer-focus:-top-3.5 peer-focus:text-primary peer-focus:text-sm"
                      >
                        {`Remarks (Occupation)`}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Whatapp , Notification , SocialMediam Mantra */}
                <div className="flex -mx-3">
                  <div className="w-full px-3 py-3">
                    <div className="flex flex-col gap-4 md:flex-row md:space-x-6">
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="whatsapp"
                          control={control}
                          defaultValue={false}
                          render={({ field }) => (
                            <Checkbox
                              id="whatsapp"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <span
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          WhatsApp
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="notification"
                          control={control}
                          defaultValue={false}
                          render={({ field }) => (
                            <Checkbox
                              id="notification"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <span
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Notification
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="mantra"
                          control={control}
                          defaultValue={false}
                          render={({ field }) => (
                            <Checkbox
                              id="mantra"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <span
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Mantra
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="social_media"
                          control={control}
                          defaultValue={false}
                          render={({ field }) => (
                            <Checkbox
                              id="social_media"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <span
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Social Media
                        </span> 
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader size={30} /> : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
