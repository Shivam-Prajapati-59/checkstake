"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Coins } from "lucide-react";

interface GameStatusCardProps {
  roleDisplay: {
    text: string;
    icon: React.ReactNode;
    color: string;
  };
  isMyTurn: boolean;
  gameStatus: string;
  gameId?: string | null;
  betId?: number | null;
}

export function GameStatusCard({
  roleDisplay,
  isMyTurn,
  gameStatus,
  gameId,
  betId,
}: GameStatusCardProps) {
  return (
    <Card className="bg-[#111111] border-gray-800">
      <CardHeader className="pb-3 border-b border-gray-800">
        <CardTitle className="text-base flex items-center gap-2 text-white font-semibold">
          <Activity className="w-4 h-4 text-purple-500" />
          Game Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-sm text-gray-400">Your Role</span>
          <Badge className={roleDisplay.color}>
            {roleDisplay.icon}
            <span className="ml-1">{roleDisplay.text}</span>
          </Badge>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-sm text-gray-400">Status</span>
          <span className="text-sm font-medium text-white">{gameStatus}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-sm text-gray-400">Turn</span>
          <Badge
            className={
              isMyTurn
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300"
            }
          >
            {isMyTurn ? "Your Turn" : "Waiting..."}
          </Badge>
        </div>

        {gameId && (
          <div className="pt-3 mt-3 border-t border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Game ID
            </span>
            <p className="text-xs font-mono text-gray-400 mt-2 bg-[#1a1a1a] p-2 rounded">
              {gameId}
            </p>
          </div>
        )}

        {betId && (
          <div className="flex items-center gap-2 p-2.5 mt-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-400">
              Bet #{betId}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
