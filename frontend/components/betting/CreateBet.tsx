"use client";

import { useState } from "react";
import { useChessBetting } from "@/hooks/useChessBetting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Coins } from "lucide-react";
import { toast } from "sonner";

interface CreateBetProps {
  onBetCreated?: (betId: number) => void;
}

export function CreateBet({ onBetCreated }: CreateBetProps) {
  const {
    createBet,
    minBetAmount,
    maxBetAmount,
    platformFeePercent,
    isConnected,
    betCounter,
  } = useChessBetting();
  const [amount, setAmount] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBet = async () => {
    const betAmount = parseFloat(amount);

    if (!amount || betAmount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }

    if (betAmount < parseFloat(minBetAmount)) {
      toast.error(`Minimum bet amount is ${minBetAmount} MON`);
      return;
    }

    if (betAmount > parseFloat(maxBetAmount)) {
      toast.error(`Maximum bet amount is ${maxBetAmount} MON`);
      return;
    }

    setIsCreating(true);
    try {
      const hash = await createBet(amount);
      if (hash) {
        setAmount("");
        // The bet ID will be betCounter + 1
        onBetCreated?.(betCounter + 1);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const feeAmount = amount
    ? ((parseFloat(amount) * platformFeePercent) / 100).toFixed(4)
    : "0";
  const potentialPayout = amount
    ? (parseFloat(amount) * 2 * (1 - platformFeePercent / 100)).toFixed(4)
    : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Create New Bet
        </CardTitle>
        <CardDescription>
          Set your wager and challenge another player
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Bet Amount (MON)</Label>
          <Input
            id="amount"
            type="number"
            placeholder={`Min: ${minBetAmount} MON`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={minBetAmount}
            max={maxBetAmount}
            step="0.001"
            disabled={!isConnected}
          />
          <p className="text-sm text-muted-foreground">
            Range: {minBetAmount} - {maxBetAmount} MON
          </p>
        </div>

        {amount && (
          <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Bet:</span>
              <span className="font-medium">{amount} MON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Platform Fee ({platformFeePercent}%):
              </span>
              <span className="font-medium">{feeAmount} MON</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Win Payout:</span>
              <span className="font-semibold text-green-500">
                {potentialPayout} MON
              </span>
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateBet}
          disabled={!isConnected || isCreating || !amount}
          className="w-full"
        >
          {isCreating ? "Creating..." : "Create Bet"}
        </Button>

        {!isConnected && (
          <p className="text-sm text-center text-muted-foreground">
            Please connect your wallet to create a bet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
