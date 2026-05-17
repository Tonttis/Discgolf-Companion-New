'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sun,
  Moon,
  Monitor,
  Settings,
  Check,
} from 'lucide-react';

// Empty subscriptions for useSyncExternalStore — used only as a client-detection hook
const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

const themeOptions = [
  {
    value: 'light',
    label: 'Vaalea',
    description: 'Aina vaalea teema',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Tumma',
    description: 'Aina tumma teema',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Järjestelmä',
    description: 'Seuraa laitteen asetusta',
    icon: Monitor,
  },
] as const;

export function SettingsView() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useIsMounted();

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <Settings className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Asetukset</h1>
          <p className="text-sm text-muted-foreground">Mukauta sovellusta</p>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ulkonäkö</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = mounted && theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left touch-manipulation ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                <div
                  className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isActive ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {isActive && (
                  <Check className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}

          {/* Theme preview */}
          {mounted && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center gap-3 p-2">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-background border shadow-sm" />
                  <div className="size-6 rounded-full bg-foreground" />
                  <div className="size-6 rounded-full bg-primary" />
                  <div className="size-6 rounded-full bg-emerald-500" />
                  <div className="size-6 rounded-full bg-muted" />
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {resolvedTheme === 'dark' ? 'Tumma käytössä' : 'Vaalea käytössä'}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tietoa</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sovellus</span>
            <span className="font-medium">DiscGolf Companion</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tietolähde</span>
            <span className="font-medium">Frisbeegolfradat.fi</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tulospalvelu</span>
            <span className="font-medium">Supabase</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
