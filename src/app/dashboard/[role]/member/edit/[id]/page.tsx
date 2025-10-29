'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { Loader, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IMemberInfoDb } from '@/features/member';
import { useNotification } from '@/context/notification-context';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { SupabaseError } from '@/types/error';

interface EditFormData {
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
  holiday: MultiSelectOption[];
  first_language: string;
  second_language?: MultiSelectOption[];
  remarks: string;
}

function MemberEdit() {
  const params = useParams();
  const router = useRouter();
  const notification = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<IMemberInfoDb | null>(null);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<EditFormData>();

  const firstLanguage = watch('first_language');

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
      return [...weekdayOptions];
    } else if (!hasSelectAll && hadSelectAll) {
      return selectedOptions.filter((opt) => opt.value === 'Rotational');
    } else if (hasSelectAll) {
      const withoutSelectAll = selectedOptions.filter((opt) => opt.value !== 'SELECT_ALL');
      const allWeekdaysSelected = weekdayOptions.every((day) =>
        withoutSelectAll.some((opt) => opt.value === day.value)
      );

      if (!allWeekdaysSelected) {
        return withoutSelectAll;
      }
      return selectedOptions;
    }

    return selectedOptions;
  };

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);
        const id = parseInt(params.id as string);

        const { data, error } = await supabase
          .from('member_info')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          notification.error('Member not found');
          router.push(`/dashboard/${user?.role}/member/view`);
          return;
        }

        setMember(data);

        // Convert stored data to form format
        const holidayArray = Array.isArray(data.holiday)
          ? data.holiday.map((h: string) =>
              typeof h === 'string' ? { value: h, label: h } : h
            )
          : [];

        // Split comma-separated second_language string into array
        const secondLanguageArray = data.second_language
          ? typeof data.second_language === 'string'
            ? data.second_language.split(',').filter(Boolean).map((lang: string) => ({
                value: lang.trim(),
                label: lang.trim(),
              }))
            : Array.isArray(data.second_language)
            ? data.second_language.map((lang: string) =>
                typeof lang === 'string' ? { value: lang, label: lang } : lang
              )
            : []
          : [];

        reset({
          name: data.name,
          age: data.age,
          village: data.village,
          taluk: data.taluk,
          district: data.district,
          state: data.state,
          mobile: data.mobile,
          whatsapp: data.whatsapp,
          notification: data.notification,
          mantra: data.mantra,
          social_media: data.social_media,
          holiday: holidayArray,
          first_language: data.first_language,
          second_language: secondLanguageArray,
          remarks: data.remarks || '',
        });
      } catch (error) {
        notification.error('Failed to load member data');
        console.error('Error fetching member:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMember();
    }
  }, [params.id, reset, router]);

  const onSubmit: SubmitHandler<EditFormData> = async (data) => {
    if (!member) return;

    setIsSubmitting(true);

    const holidays = data.holiday.map((ele: MultiSelectOption) => ele.value);
    const secondLanguages = data.second_language?.map((ele: MultiSelectOption) => ele.value).join(',') || '';

    const payload = {
      ...data,
      age: parseInt(String(data.age), 10),
      name: data.name.trim().replace(/\s+/g, ' ').toUpperCase(),
      village: data.village.trim().replace(/\s+/g, ' ').toUpperCase(),
      taluk: data.taluk.trim().replace(/\s+/g, ' ').toUpperCase(),
      district: data.district.trim().replace(/\s+/g, ' ').toUpperCase(),
      state: data.state.trim().replace(/\s+/g, ' ').toUpperCase(),
      holiday: holidays,
      second_language: secondLanguages,
    };

    try {
      const { data: updatedMember, error } = await supabase.from('member_info').update(payload).eq('id', member.id).select('id');

      if (error) {
        throw error;
      }

      notification.success('Member updated successfully with ID ' + updatedMember[0].id);
      router.push(`/dashboard/${user?.role}/member/view`);
    } catch (error) {
      if (error instanceof SupabaseError) {
        notification.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading member data...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Member not found</p>
          <Button onClick={() => router.push('/dashboard/admin/member/view')}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/${user?.role}/member/view`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Members
        </Button>
        <h1 className="text-2xl font-bold">Edit Member: {member.name}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name & Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1 text-foreground">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              {...register('name', { required: 'Name is required' })}
              type="text"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium mb-1 text-foreground">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              id="age"
              {...register('age', {
                required: 'Age is required',
                min: { value: 1, message: 'Age must be positive' },
                max: { value: 150, message: "Age can't be greater than 150." },
              })}
              type="number"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
          </div>
        </div>

        {/* Village & Taluk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="village" className="block text-sm font-medium mb-1 text-foreground">
              Village <span className="text-red-500">*</span>
            </label>
            <input
              id="village"
              {...register('village', { required: 'Village is required' })}
              type="text"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.village && (
              <p className="text-red-500 text-xs mt-1">{errors.village.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="taluk" className="block text-sm font-medium mb-1 text-foreground">
              Taluk <span className="text-red-500">*</span>
            </label>
            <input
              id="taluk"
              {...register('taluk', { required: 'Taluk is required' })}
              type="text"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.taluk && <p className="text-red-500 text-xs mt-1">{errors.taluk.message}</p>}
          </div>
        </div>

        {/* District & State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="district" className="block text-sm font-medium mb-1 text-foreground">
              District <span className="text-red-500">*</span>
            </label>
            <input
              id="district"
              {...register('district', { required: 'District is required' })}
              type="text"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.district && (
              <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium mb-1 text-foreground">
              State <span className="text-red-500">*</span>
            </label>
            <input
              id="state"
              {...register('state', { required: 'State is required' })}
              type="text"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
          </div>
        </div>

        {/* Mobile & Holidays */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium mb-1 text-foreground">
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              id="mobile"
              {...register('mobile', {
                required: 'Mobile number is required',
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: 'Invalid mobile number',
                },
              })}
              type="text"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>}
          </div>

          <div>
            <label htmlFor="holiday" className="block text-sm font-medium mb-1 text-foreground">
              Holidays <span className="text-red-500">*</span>
            </label>
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
              <p className="text-red-500 text-xs mt-1">Holiday is required.</p>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_language" className="block text-sm font-medium mb-1 text-foreground">
              First Language <span className="text-red-500">*</span>
            </label>
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
              <p className="text-red-500 text-xs mt-1">{errors.first_language.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="second_language" className="block text-sm font-medium mb-1 text-foreground">
              Second Language(s) (Optional)
            </label>
            <Controller
              name="second_language"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  options={indianLanguages
                    .filter((lang) => lang !== firstLanguage)
                    .map((lang) => ({ value: lang, label: lang }))}
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select Second Language(s)"
                />
              )}
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label htmlFor="remarks" className="block text-sm font-medium mb-1 text-foreground">
            Remarks (Occupation)
          </label>
          <input
            id="remarks"
            {...register('remarks')}
            type="text"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Options</label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Controller
                name="whatsapp"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <Checkbox id="whatsapp" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <label htmlFor="whatsapp" className="text-sm cursor-pointer text-foreground">
                WhatsApp
              </label>
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
              <label htmlFor="notification" className="text-sm cursor-pointer text-foreground">
                Notification
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="mantra"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <Checkbox id="mantra" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <label htmlFor="mantra" className="text-sm cursor-pointer text-foreground">
                Mantra
              </label>
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
              <label htmlFor="social_media" className="text-sm cursor-pointer text-foreground">
                Social Media
              </label>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 py-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/${user?.role}/member/view`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Member'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default MemberEdit;