"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Crown, Swords } from "lucide-react";

interface PlayersCardProps {
  playerRole: string | null;
  walletAddress: string | null | undefined;
}

export function PlayersCard({ playerRole, walletAddress }: PlayersCardProps) {
  return (
    <Card className="bg-[#111111] border-gray-800">
      <CardHeader className="pb-3 border-b border-gray-800">
        <CardTitle className="text-base flex items-center gap-2 text-white font-semibold">
          <User className="w-4 h-4 text-green-500" />
          Players
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* White Player */}
        <div className="p-3 rounded-lg bg-[#1a1a1a] border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-gray-300" />
            <span className="font-semibold text-white text-sm">White</span>
            {playerRole === "w" && (
              <Badge className="ml-auto bg-green-600 text-white text-xs">
                You
              </Badge>
            )}
          </div>
          {walletAddress && playerRole === "w" && (
            <p className="text-xs font-mono text-gray-400 bg-[#0a0a0a] px-2 py-1.5 rounded">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
          {(!walletAddress || playerRole !== "w") && (
            <p className="text-xs text-gray-600 italic">Waiting...</p>
          )}
        </div>

        <div className="flex items-center justify-center py-1">
          <Swords className="w-4 h-4 text-purple-500" />
        </div>

        {/* Black Player */}
        <div className="p-3 rounded-lg bg-[#1a1a1a] border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-white text-sm">Black</span>
            {playerRole === "b" && (
              <Badge className="ml-auto bg-green-600 text-white text-xs">
                You
              </Badge>
            )}
          </div>
          {walletAddress && playerRole === "b" && (
            <p className="text-xs font-mono text-gray-400 bg-[#0a0a0a] px-2 py-1.5 rounded">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
          {(!walletAddress || playerRole !== "b") && (
            <p className="text-xs text-gray-600 italic">Waiting...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
