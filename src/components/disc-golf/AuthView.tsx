'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  AtSign,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  KeyRound,
  FileCode2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';

// Username validation: lowercase, 3-20 chars, only a-z, 0-9, underscore
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const USERNAME_CHAR_REGEX = /^[a-z0-9_]*$/;

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

function UsernameIndicator({ username }: { username: string }) {
  const [checkStatus, setCheckStatus] = useState<CheckStatus>(() => {
    return USERNAME_REGEX.test(username) ? 'checking' : 'idle';
  });

  useEffect(() => {
    // Only run async check for valid usernames
    if (!USERNAME_REGEX.test(username)) {
      return;
    }

    let cancelled = false;
    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(() => { if (!cancelled) setCheckStatus('checking'); });

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCheckStatus(data.available ? 'available' : 'taken');
        } else {
          if (!cancelled) setCheckStatus('error');
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setCheckStatus('error');
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  // Too short to check
  if (!username || username.length < 3) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        3–20 merkkiä, vain a-z, 0-9 ja alaviiva _
      </p>
    );
  }

  // Invalid characters
  if (!USERNAME_CHAR_REGEX.test(username)) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <XCircle className="size-3.5 text-destructive" />
        <p className="text-xs text-destructive">Vain pienet kirjaimet, numerot ja alaviiva sallittu</p>
      </div>
    );
  }

  // Valid chars but too long
  if (!USERNAME_REGEX.test(username)) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <XCircle className="size-3.5 text-destructive" />
        <p className="text-xs text-destructive">Käyttäjänimen tulee olla 3–20 merkkiä</p>
      </div>
    );
  }

  // Valid format — show async check status
  if (checkStatus === 'checking') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Tarkistetaan saatavuutta…</p>
      </div>
    );
  }

  if (checkStatus === 'available') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <CheckCircle2 className="size-3.5 text-emerald-500" />
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Käyttäjänimi on vapaa!</p>
      </div>
    );
  }

  if (checkStatus === 'taken') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <XCircle className="size-3.5 text-destructive" />
        <p className="text-xs text-destructive">Käyttäjänimi on jo varattu</p>
      </div>
    );
  }

  if (checkStatus === 'error') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <XCircle className="size-3.5 text-destructive" />
        <p className="text-xs text-destructive">Käyttäjänimi ei kelpaa</p>
      </div>
    );
  }

  return null;
}

function SupabaseSetupGuide() {
  return (
    <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Supabase ei ole määritetty</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Kirjautuminen vaatii Supabase-yhteyden
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ota kirjautuminen ja käyttäjätilit käyttöön määrittämällä Supabase-projekti.
          Se on ilmaista ja tarjoaa autentikoinnin sekä tietokannan.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Database className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">1. Luo Supabase-projekti</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Luo ilmainen projekti osoitteessa{' '}
                <span className="font-mono text-emerald-600 dark:text-emerald-400">supabase.com</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <KeyRound className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">2. Aseta ympäristömuuttujat</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lisää <span className="font-mono">.env.local</span> -tiedostoon:
              </p>
              <div className="mt-2 rounded-md bg-muted/80 p-2.5 font-mono text-xs space-y-0.5">
                <p className="text-emerald-600 dark:text-emerald-400">
                  NEXT_PUBLIC_SUPABASE_URL=<span className="text-muted-foreground">https://xxx.supabase.co</span>
                </p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<span className="text-muted-foreground">eyJ...</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <FileCode2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">3. Aja tietokannan migraatio</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kopioi SQL-migraatio Supabasen SQL Editoriin:
              </p>
              <div className="mt-2 rounded-md bg-muted/80 p-2.5 font-mono text-xs text-muted-foreground">
                supabase/migration.sql
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <ArrowRight className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">4. Käynnistä palvelin uudelleen</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Käynnistä dev-palvelin uudelleen jotta muutokset tulevat voimaan
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AuthView() {
  const { signIn, signUp, isLoading, supabaseConfigured } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [emailConfirmationNeeded, setEmailConfirmationNeeded] = useState(false);
  const [signupBroken, setSignupBroken] = useState(false);
  const [fixSql, setFixSql] = useState<string>('');
  const [fixSqlCopied, setFixSqlCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail.trim() || !loginPassword) {
      toast.error('Täytä kaikki kentät', {
        description: 'Syötä sähköpostiosoite ja salasana',
      });
      return;
    }

    setLoginLoading(true);
    try {
      const { error } = await signIn(loginEmail.trim(), loginPassword);
      if (error) {
        toast.error('Kirjautuminen epäonnistui', {
          description: error,
        });
      } else {
        toast.success('Kirjautuminen onnistui!', {
          description: 'Tervetuloa takaisin!',
        });
      }
    } catch {
      toast.error('Jotain meni pieleen', {
        description: 'Yritä myöhemmin uudelleen',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerEmail.trim() || !registerPassword || !username.trim()) {
      toast.error('Täytä pakolliset kentät', {
        description: 'Sähköposti, salasana ja käyttäjänimi vaaditaan',
      });
      return;
    }

    if (!USERNAME_REGEX.test(username)) {
      toast.error('Käyttäjänimi ei kelpaa', {
        description: 'Käytä 3–20 merkkiä, vain pieniä kirjaimia, numeroita ja alaviivaa',
      });
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('Salasana liian lyhyt', {
        description: 'Salasanan tulee olla vähintään 6 merkkiä',
      });
      return;
    }

    setRegisterLoading(true);
    setEmailConfirmationNeeded(false);
    try {
      const { error, needsEmailConfirmation } = await signUp(
        registerEmail.trim(),
        registerPassword,
        username.trim(),
        displayName.trim() || undefined
      );
      if (error) {
        // Detect database trigger error
        if (error.includes('Database error')) {
          setSignupBroken(true);
          // Fetch the fix SQL
          fetch('/api/setup/fix-signup')
            .then(r => r.json())
            .then(data => {
              if (data.fixSql) setFixSql(data.fixSql);
            })
            .catch(() => {});
        }
        toast.error('Rekisteröinti epäonnistui', {
          description: error.includes('Database error') 
            ? 'Tietokantavirhe — katso korjausohjeet alla' 
            : error,
        });
      } else if (needsEmailConfirmation) {
        setEmailConfirmationNeeded(true);
        toast.success('Tili luotu!', {
          description: 'Vahvista sähköpostiosoitteesi kirjautuaksesi sisään. Tarkista sähköpostisi.',
        });
      } else {
        toast.success('Rekisteröinti onnistui!', {
          description: 'Tervetuloa DiscGolf Companion -käyttäjäksi!',
        });
      }
    } catch {
      toast.error('Jotain meni pieleen', {
        description: 'Yritä myöhemmin uudelleen',
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!supabaseConfigured) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mx-auto text-white">
            <User className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Kirjaudu sisään</h1>
          <p className="text-sm text-muted-foreground">
            Luo tili tai kirjaudu sisään tallentaaksesi pelit ja suosikit
          </p>
        </div>
        <SupabaseSetupGuide />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mx-auto text-white">
          <User className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Kirjaudu sisään</h1>
        <p className="text-sm text-muted-foreground">
          Luo tili tai kirjaudu sisään tallentaaksesi pelit ja suosikit
        </p>
      </div>

      {/* Auth Tabs */}
      <Card className="border-0 shadow-lg">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-11 rounded-t-xl rounded-b-none border-b bg-muted/50 p-0">
            <TabsTrigger
              value="login"
              className="h-full rounded-none rounded-tl-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 text-sm"
            >
              <LogIn className="size-4" />
              Kirjaudu
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="h-full rounded-none rounded-tr-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 text-sm"
            >
              <UserPlus className="size-4" />
              Rekisteröidy
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleLogin}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">
                    Sähköposti
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nimi@esimerkki.fi"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-9 h-11"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">
                    Salasana
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-9 h-11"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Kirjaudutaan…
                    </>
                  ) : (
                    <>
                      <LogIn className="size-4" />
                      Kirjaudu sisään
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="mt-0">
            <form onSubmit={handleRegister}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium">
                    Sähköposti
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="nimi@esimerkki.fi"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-9 h-11"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium">
                    Salasana
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Vähintään 6 merkkiä"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-9 h-11"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {registerPassword.length > 0 && registerPassword.length < 6 && (
                    <p className="text-xs text-destructive">
                      Salasanan tulee olla vähintään 6 merkkiä
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-sm font-medium">
                    Käyttäjänimi
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="esim. discgolfer42"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase();
                        if (USERNAME_CHAR_REGEX.test(val) && val.length <= 20) {
                          setUsername(val);
                        }
                      }}
                      className="pl-9 h-11"
                      autoComplete="username"
                      maxLength={20}
                      required
                    />
                  </div>
                  <UsernameIndicator username={username} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-display-name" className="text-sm font-medium">
                    Näyttönimi <span className="text-muted-foreground font-normal">(valinnainen)</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="register-display-name"
                      type="text"
                      placeholder="Esim. Maija Meikäläinen"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-9 h-11"
                      autoComplete="name"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Näkyy muille pelaajille. Jos tyhjä, käytetään käyttäjänimeä.
                  </p>
                </div>

                {emailConfirmationNeeded && (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Vahvista sähköpostiosoite</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Olemme lähettäneet vahvistuslinkin osoitteeseen <strong>{registerEmail.trim()}</strong>. 
                      Tarkista sähköpostisi ja vahvista tili kirjautuaksesi sisään.
                    </p>
                  </div>
                )}

                {signupBroken && (
                  <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        ⚠️ Tietokantavirhe — Rekisteröityminen ei toimi
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                        Supabasen tietokantatriggeri on rikki. Korjaa se ajamalla alla oleva SQL Supabasen SQL Editorissa.
                      </p>
                    </div>
                    <ol className="text-xs text-red-700 dark:text-red-400 space-y-1.5 list-decimal pl-4">
                      <li>Avaa <a href="https://supabase.com/dashboard/project/hzfizsucmelyxrnmpxib/sql" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase SQL Editor</a></li>
                      <li>Kopioi alla oleva SQL ja liitä se editoriin</li>
                      <li>Paina <strong>Run</strong> (Ctrl+Enter)</li>
                      <li>Yritä rekisteröitymistä uudelleen</li>
                    </ol>
                    {fixSql && (
                      <div className="relative">
                        <pre className="bg-muted/80 p-3 rounded-md text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {fixSql}
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 h-7 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(fixSql);
                            setFixSqlCopied(true);
                            toast.success('SQL kopioitu!');
                            setTimeout(() => setFixSqlCopied(false), 2000);
                          }}
                        >
                          {fixSqlCopied ? 'Kopioitu ✓' : 'Kopioi SQL'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  disabled={registerLoading || !USERNAME_REGEX.test(username)}
                >
                  {registerLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Rekisteröidään…
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      Luo tili
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Info footer */}
      <p className="text-center text-xs text-muted-foreground leading-relaxed px-4">
        Tilin luomalla hyväksyt, että pelit ja suosikit tallennetaan palvelullemme.
      </p>
    </div>
  );
}
