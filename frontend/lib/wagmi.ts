import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { Chain } from "viem";

// Define Monad Testnet
export const monadTestnet: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz/"],
    },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://explorer.monad.xyz" },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: "Chess Betting DApp",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [monadTestnet],
  ssr: true,
});
