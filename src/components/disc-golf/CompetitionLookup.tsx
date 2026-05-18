'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

interface CompetitionLookupProps {
  variant?: 'default' | 'compact';
}

export function CompetitionLookup({ variant = 'default' }: CompetitionLookupProps) {
  const [inputValue, setInputValue] = useState('');
  const navigateToCompetition = useAppStore((s) => s.navigateToCompetition);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(inputValue, 10);
    if (!isNaN(id) && id > 0) {
      navigateToCompetition(id);
      setInputValue('');
    }
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="number"
          placeholder="Competition ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1"
          min={1}
        />
        <Button type="submit" size="sm" disabled={!inputValue.trim()}>
          <Search className="size-4" />
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="number"
        placeholder="Enter competition ID (e.g., 1234567)"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="h-12 text-base"
        min={1}
      />
      <Button
        type="submit"
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={!inputValue.trim()}
      >
        <Search className="size-4 mr-2" />
        View Results
      </Button>
    </form>
  );
}
