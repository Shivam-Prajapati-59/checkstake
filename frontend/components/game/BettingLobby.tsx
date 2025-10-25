"use client";

import { CreateBet } from "@/components/betting/CreateBet";
import { AvailableBets } from "@/components/betting/AvailableBets";

interface BettingLobbyProps {
  onBetCreated: (betId: number) => void;
  onJoinBet: (betId: number, amount: string) => void;
  currentAddress?: string;
}

export function BettingLobby({
  onBetCreated,
  onJoinBet,
  currentAddress,
}: BettingLobbyProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      <CreateBet onBetCreated={onBetCreated} />
      <AvailableBets onJoinBet={onJoinBet} currentAddress={currentAddress} />
    </div>
  );
}
