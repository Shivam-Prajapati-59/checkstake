"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Swords } from "lucide-react";

export function GameHeader() {
  return (
    <header className="border-b border-gray-800 bg-[#111111] sticky top-0 z-50">
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Chess Battle Arena
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Blockchain Chess Betting
              </p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
