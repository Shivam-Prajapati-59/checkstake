"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface MatchInfoCardProps {
  moveCount: number;
  isGameStarted: boolean;
}

export function MatchInfoCard({
  moveCount,
  isGameStarted,
}: MatchInfoCardProps) {
  return (
    <Card className="bg-[#111111] border-gray-800">
      <CardHeader className="pb-3 border-b border-gray-800">
        <CardTitle className="text-base flex items-center gap-2 text-white font-semibold">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Match Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-sm text-gray-400">Total Moves</span>
          <span className="font-bold text-xl text-purple-500">{moveCount}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-sm text-gray-400">Game Mode</span>
          <Badge className="bg-purple-600/20 text-purple-400 border border-purple-500/30">
            Betting
          </Badge>
        </div>

        {isGameStarted && (
          <div className="pt-3 mt-3 border-t border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Connection
            </p>
            <div className="flex items-center gap-2 p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-400">Live</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
