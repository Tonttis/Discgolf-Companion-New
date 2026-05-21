'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Search,
  Users,
  Loader2,
  AtSign,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useUserSearch } from '@/hooks/use-disc-golf';
import { useAuth } from '@/lib/auth/auth-context';

export function PlayerSearchView() {
  const goBack = useAppStore((s) => s.goBack);
  const navigateToPlayerProfile = useAppStore((s) => s.navigateToPlayerProfile);
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data, isLoading } = useUserSearch(debouncedQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  }, []);

  const users = data?.users ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Pelaajahaku
          </h1>
          <p className="text-sm text-muted-foreground">
            Etsi pelaajia käyttäjänimen perusteella
          </p>
        </div>
        <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hae käyttäjänimellä..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-11"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="space-y-2">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 1 && users.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center space-y-3"
          >
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="size-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Ei tuloksia</h3>
              <p className="text-sm text-muted-foreground">
                Käyttäjää nimellä &quot;{debouncedQuery}&quot; ei löytynyt
              </p>
            </div>
          </motion.div>
        )}

        {!isLoading && debouncedQuery.length < 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center space-y-3"
          >
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Search className="size-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Hae pelaajia</h3>
              <p className="text-sm text-muted-foreground">
                Syötä käyttäjänimi yllä olevaan kenttään
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {users.map((u, index) => {
            const isSelf = u.id === user?.id;
            const initials = (u.displayName || u.username)
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
              >
                <Card
                  className={`cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 ${
                    isSelf ? 'opacity-60' : ''
                  }`}
                  onClick={() => {
                    if (!isSelf) navigateToPlayerProfile(u.id);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        {u.avatarUrl ? (
                          <AvatarImage src={u.avatarUrl} alt={u.displayName || u.username} />
                        ) : null}
                        <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {u.displayName || u.username}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">(sinä)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <AtSign className="size-3" />
                          <span>{u.username}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
