'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Track, Player, SubCompetition } from '@/lib/types';
import { getScoreLabel, getScoreColor, getHoleScoreBg } from '@/lib/metrix-api';

interface ScorecardTableProps {
  tracks: Track[];
  players: Player[];
  totalPar: number;
}

export function ScorecardTable({ tracks, players, totalPar }: ScorecardTableProps) {
  return (
    <ScrollArea className="w-full">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10 text-center sticky left-0 bg-muted/50 z-10">#</TableHead>
            <TableHead className="min-w-[140px] sticky left-10 bg-muted/50 z-10">Player</TableHead>
            <TableHead className="w-12 text-center">CC</TableHead>
            <TableHead className="w-16 text-center">Class</TableHead>
            {tracks.map((track) => (
              <TableHead key={track.number} className="w-10 text-center text-xs">
                {track.number}
              </TableHead>
            ))}
            <TableHead className="w-14 text-center font-bold">Total</TableHead>
            <TableHead className="w-14 text-center font-bold">+/-</TableHead>
          </TableRow>
          <TableRow className="bg-emerald-50 dark:bg-emerald-950/30">
            <TableHead className="text-center sticky left-0 bg-emerald-50 dark:bg-emerald-950/30 z-10" />
            <TableHead className="sticky left-10 bg-emerald-50 dark:bg-emerald-950/30 z-10 font-semibold text-emerald-700 dark:text-emerald-400">
              Par
            </TableHead>
            <TableHead />
            <TableHead />
            {tracks.map((track) => (
              <TableHead
                key={track.number}
                className="text-center text-emerald-700 dark:text-emerald-400 font-semibold"
              >
                {track.par}
              </TableHead>
            ))}
            <TableHead className="text-center font-bold text-emerald-700 dark:text-emerald-400">
              {totalPar}
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.scorecardId}>
              <TableCell className="text-center font-medium sticky left-0 bg-background z-10">
                {player.place}
              </TableCell>
              <TableCell className="font-medium sticky left-10 bg-background z-10">
                <span className="line-clamp-1">{player.name}</span>
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">
                {player.countryCode}
              </TableCell>
              <TableCell className="text-center text-xs">{player.className}</TableCell>
              {player.results.map((result, i) => (
                <TableCell key={i} className="text-center p-1">
                  <span
                    className={`inline-flex items-center justify-center min-w-[28px] h-6 rounded text-xs font-medium ${getHoleScoreBg(
                      result.diff
                    )}`}
                  >
                    {result.result}
                  </span>
                </TableCell>
              ))}
              <TableCell className="text-center font-bold">{player.totalStrokes}</TableCell>
              <TableCell
                className={`text-center font-bold ${getScoreColor(player.totalDiff)}`}
              >
                {getScoreLabel(player.totalDiff)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface SubCompetitionScorecardProps {
  subCompetition: SubCompetition;
}

export function SubCompetitionScorecard({ subCompetition }: SubCompetitionScorecardProps) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{subCompetition.name}</h4>
      <ScorecardTable
        tracks={subCompetition.tracks}
        players={subCompetition.players}
        totalPar={subCompetition.totalPar}
      />
    </div>
  );
}
