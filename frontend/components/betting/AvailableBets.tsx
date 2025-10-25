"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Coins, Clock } from "lucide-react";
import { formatEther } from "viem";

interface BetInfo {
  betId: number;
  player1: string;
  amount: string;
  createdAt: number;
}

interface AvailableBetsProps {
  onJoinBet: (betId: number, amount: string) => void;
  currentAddress?: string;
}

export function AvailableBets({
  onJoinBet,
  currentAddress,
}: AvailableBetsProps) {
  const [bets, setBets] = useState<BetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableBets();
    const interval = setInterval(fetchAvailableBets, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAvailableBets = async () => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
        }/api/bets/available`
      );
      if (response.ok) {
        const data = await response.json();
        setBets(data.bets || []);
      }
    } catch (error) {
      console.error("Error fetching bets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Bets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Available Bets
        </CardTitle>
        <CardDescription>Join an existing bet to start playing</CardDescription>
      </CardHeader>
      <CardContent>
        {bets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No available bets</p>
            <p className="text-sm">Create a new bet to get started!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {bets.map((bet) => {
                const isOwnBet =
                  bet.player1.toLowerCase() === currentAddress?.toLowerCase();

                return (
                  <div
                    key={bet.betId}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Bet #{bet.betId}</Badge>
                        {isOwnBet && <Badge variant="outline">Your Bet</Badge>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(bet.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Creator</p>
                        <p className="font-mono text-sm">
                          {formatAddress(bet.player1)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Bet Amount
                        </p>
                        <p className="font-semibold flex items-center gap-1">
                          <Coins className="w-4 h-4" />
                          {bet.amount} MON
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-3"
                      size="sm"
                      onClick={() => onJoinBet(bet.betId, bet.amount)}
                      disabled={isOwnBet || !currentAddress}
                    >
                      {isOwnBet ? "Your Bet" : "Join Bet"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
