"use client";

import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  fen: string;
  onPieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
  boardOrientation: "white" | "black";
  allowDragging?: boolean;
}

export function ChessBoard({
  fen,
  onPieceDrop,
  boardOrientation,
  allowDragging = true,
}: ChessBoardProps) {
  const handlePieceDrop = (args: any) => {
    if (!args.targetSquare) return false;
    return onPieceDrop(args.sourceSquare, args.targetSquare);
  };

  return (
    <div className="w-full max-w-[600px] aspect-square">
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: handlePieceDrop,
          boardOrientation: boardOrientation,
          allowDragging: allowDragging,
          boardStyle: {
            borderRadius: "8px",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
          darkSquareStyle: {
            backgroundColor: "#b58863",
          },
          lightSquareStyle: {
            backgroundColor: "#f0d9b5",
          },
        }}
      />
    </div>
  );
}
