'use client';

import { useSyncExternalStore, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon, Monitor, Info, ChevronRight, Database, AlertTriangle, CheckCircle2, Loader2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const themeOptions = [
  {
    value: 'system',
    label: 'Järjestelmä',
    description: 'Seuraa laitteen asetusta',
    icon: Monitor,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  },
  {
    value: 'light',
    label: 'Vaalea',
    description: 'Vaalea teema',
    icon: Sun,
    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'dark',
    label: 'Tumma',
    description: 'Tumma teema',
    icon: Moon,
    color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  },
] as const;

interface MigrationStatus {
  needsMigration: boolean;
  missingColumns: string[];
  avatarsBucketExists: boolean;
  migrationSql: string;
  instructions: string;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  // Detect client-side rendering to avoid hydration mismatch with next-themes
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const currentTheme = theme ?? 'system';

  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [checkingMigration, setCheckingMigration] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);
  const [showMigrationSql, setShowMigrationSql] = useState(false);

  const checkMigration = useCallback(async () => {
    setCheckingMigration(true);
    try {
      const response = await fetch('/api/setup/migrate');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch {
      toast.error('Migraation tarkistus epäonnistui');
    } finally {
      setCheckingMigration(false);
    }
  }, []);

  const runMigration = useCallback(async () => {
    setRunningMigration(true);
    try {
      const response = await fetch('/api/setup/migrate', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Migraatio suoritettu onnistuneesti!');
          setMigrationStatus(null);
          await checkMigration();
        } else {
          // Auto-migration not available, show SQL for manual execution
          toast.info('Suorita migraatio SQL-editorissa');
          setShowMigrationSql(true);
        }
      }
    } catch {
      toast.error('Migraatio epäonnistui');
    } finally {
      setRunningMigration(false);
    }
  }, [checkMigration]);

  const copyMigrationSql = useCallback(() => {
    if (migrationStatus?.migrationSql) {
      navigator.clipboard.writeText(migrationStatus.migrationSql);
      toast.success('SQL kopioitu leikepöydälle');
    }
  }, [migrationStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-md mx-auto space-y-6"
    >
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
          <Sun className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Asetukset</h1>
          <p className="text-sm text-muted-foreground">Mukauta sovellusta</p>
        </div>
      </div>

      {/* Teema (Theme) Section */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sun className="size-3.5" />
            Teema
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1">
          {mounted ? (
            themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = currentTheme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-200 dark:ring-emerald-800'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${option.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {isActive && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5"
                    >
                      Aktiivinen
                    </Badge>
                  )}
                  {!isActive && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })
          ) : (
            // Skeleton placeholder to avoid hydration mismatch
            themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className="w-full flex items-center gap-3 p-3 rounded-lg opacity-50"
                >
                  <div
                    className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${option.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Database Section */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Database className="size-3.5" />
            Tietokanta
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {!migrationStatus && (
            <Button
              variant="outline"
              className="w-full"
              onClick={checkMigration}
              disabled={checkingMigration}
            >
              {checkingMigration ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Database className="size-4 mr-2" />
              )}
              Tarkista tietokannan tila
            </Button>
          )}

          {migrationStatus && (
            <>
              {migrationStatus.needsMigration ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                        Migraatio tarvitaan
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Tietokannasta puuttuu sarakkeita: {migrationStatus.missingColumns.join(', ')}
                        {!migrationStatus.avatarsBucketExists && ', avatars-varasto'}
                      </p>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={runMigration}
                    disabled={runningMigration}
                  >
                    {runningMigration ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="size-4 mr-2" />
                    )}
                    Suorita migraatio
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowMigrationSql(!showMigrationSql)}
                  >
                    {showMigrationSql ? 'Piilota SQL' : 'Näytä migraatio SQL'}
                  </Button>

                  {showMigrationSql && (
                    <div className="space-y-2">
                      <div className="relative">
                        <pre className="text-[10px] bg-muted p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                          {migrationStatus.migrationSql}
                        </pre>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 size-7"
                          onClick={copyMigrationSql}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Kopioi SQL ja suorita Supabase SQL-editorissa
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-emerald-800 dark:text-emerald-200">
                      Tietokanta ajan tasalla
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      Kaikki sarakkeet ja varastot ovat kunnossa.
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={checkMigration}
                disabled={checkingMigration}
              >
                {checkingMigration ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : null}
                Tarkista uudelleen
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tietoja (About) Section */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Info className="size-3.5" />
            Tietoja
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <span className="text-lg">🥏</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">DiscGolf Companion</p>
              <p className="text-xs text-muted-foreground">Versio 1.0</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              v1.0
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tiedot</span>
              <span className="font-medium text-xs">Frisbeegolfradat.fi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kiekkotiedot</span>
              <span className="font-medium text-xs">DiscIt API</span>
            </div>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground text-center pt-1">
            Rakennettu Suomen frisbeegolfyhteisölle 🇫🇮
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
