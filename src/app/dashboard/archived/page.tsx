'use client';

import React from 'react';
import { Archive, AlertCircle, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

function ArchivedPage() {
  const { logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Archive className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Archived Account</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account has been archived
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-2 md:px-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Limited Access
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You are currently logged in with an archived account. This means you have
                  read-only access and cannot perform any tasks or modifications through the
                  system.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-foreground">Account Status:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Cannot create or modify member records</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Cannot record attendance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Cannot access administrative functions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Cannot perform any data entry operations</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error or need access restored, please contact your system
              administrator.
            </p>
            
            <Button 
              onClick={logout} 
              variant="outline" 
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ArchivedPage;
