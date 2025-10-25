"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";

interface PlatformFeeCardProps {
  feePercent: number;
}

export function PlatformFeeCard({ feePercent }: PlatformFeeCardProps) {
  return (
    <Card className="bg-[#111111] border-gray-800">
      <CardContent className="pt-6 pb-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-400">Platform Fee</p>
          <p className="text-3xl font-bold text-purple-500">{feePercent}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
