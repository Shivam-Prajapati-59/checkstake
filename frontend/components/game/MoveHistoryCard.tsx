"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";

interface Move {
  san: string;
  from: string;
  to: string;
  captured?: string;
}

interface MoveHistoryCardProps {
  moveHistory: Move[];
}

export function MoveHistoryCard({ moveHistory }: MoveHistoryCardProps) {
  return (
    <Card className="bg-[#111111] border-gray-800 flex-1">
      <CardHeader className="pb-3 border-b border-gray-800">
        <CardTitle className="text-base flex items-center justify-between text-white font-semibold">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-500" />
            Move History
          </div>
          <Badge
            variant="outline"
            className="text-xs border-gray-700 text-gray-400"
          >
            {moveHistory.length} moves
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
          {moveHistory.length === 0 ? (
            <div className="text-center py-8">
              <Timer className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No moves yet</p>
            </div>
          ) : (
            moveHistory.map((move, index) => {
              const moveNumber = Math.floor(index / 2) + 1;
              const isWhiteMove = index % 2 === 0;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded bg-[#1a1a1a] hover:bg-[#222222] transition-colors"
                >
                  {isWhiteMove && (
                    <span className="text-xs font-semibold text-gray-500 w-6">
                      {moveNumber}.
                    </span>
                  )}
                  {!isWhiteMove && <div className="w-6" />}
                  <div
                    className={`w-14 px-2 py-0.5 rounded text-center text-xs font-semibold ${
                      isWhiteMove
                        ? "bg-gray-700 text-white"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {move.san}
                  </div>
                  <span className="text-xs text-gray-600 flex-1">
                    {move.from} → {move.to}
                  </span>
                  {move.captured && (
                    <span className="text-xs text-red-500">✕</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
