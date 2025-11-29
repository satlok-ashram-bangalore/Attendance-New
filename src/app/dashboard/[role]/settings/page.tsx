'use client';

import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { api } from '@/lib/api-client';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useNotification } from '@/context/notification-context';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function UserSettingsPage() {
  // const router = useRouter();
  const notification = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password change state
  // const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');
  // const [passwordError, setPasswordError] = useState<string | null>(null);
  // const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user profile
  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.from('users').select().single();

      if (error) {
        throw new Error('Failed to fetch user details');
      }
      // Mock user profile data
      const profile: UserProfile = {
        id: data.user_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.location,
      };

      setProfile(profile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load your profile. Please try again.');
      notification.error('Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  // const handlePasswordChange = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   // Reset errors
  //   setPasswordError(null);

  //   // Validate password
  //   if (password.length < 6) {
  //     setPasswordError('Password must be at least 6 characters long');
  //     notification.error('Password must be at least 6 characters long');
  //     return;
  //   }

  //   // Validate password confirmation
  //   if (password !== confirmPassword) {
  //     setPasswordError('Passwords do not match');
  //     notification.error('Passwords do not match');
  //     return;
  //   }

  //   setIsSubmitting(true);

  //   try {
  //     const response = await api.update_password(password);

  //     if (response.status === 200) {
  //       notification.success('Password changed successfully! You will be logged out.');
        
  //       // Clear form
  //       setPassword('');
  //       setConfirmPassword('');
  //       setPasswordError(null);

  //       // Wait a moment for the user to see the success message
  //       setTimeout(async () => {
  //         // Sign out the user
  //         await supabase.auth.signOut();
          
  //         // Redirect to login page
  //         router.push('/');
  //       }, 2000);
  //     }
  //   } catch (err) {
  //     console.error('Error changing password:', err);
  //     setPasswordError('Failed to set password. Please try again.');
  //     notification.error('Failed to set password. Please try again.');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // Initial data fetch
  useEffect(() => {
    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-[var(--destructive)]" />
        <p className="text-[var(--destructive)]">{error || 'Failed to load profile'}</p>
        <Button onClick={fetchUserProfile}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>View your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={profile.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={profile.phone} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={profile.address} readOnly />
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-[var(--muted-foreground)]">
              Contact support if you need to update your personal information.
            </p>
          </CardFooter>
        </Card>

        {/* Password Change Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Set Password</CardTitle>
            <CardDescription>{'Set your password for the first time'}</CardDescription>
          </CardHeader>
          <div className="flex justify-center items-center h-full">
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Password must be at least 5 characters long.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                {passwordError && (
                  <div className="text-sm text-[var(--destructive)]">{passwordError}</div>
                )}
                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting Password...
                      </>
                    ) : (
                      'Set Password'
                    )}
                  </Button>
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  <strong>Note:</strong> You can only set your password once. Make sure to remember
                  it.
                </div>
              </form>
            </CardContent>
          </div>
        </Card> */}
      </div>
    </div>
  );
}
