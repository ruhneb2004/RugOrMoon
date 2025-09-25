"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

interface Level {
  cols: number;
  rows: number;
}

const levels: Level[] = [
  { cols: 6, rows: 3 },
  { cols: 8, rows: 4 },
  { cols: 10, rows: 5 },
  { cols: 12, rows: 6 },
];

interface SquareGridProps {
  squares: boolean[];
  onSquareClick: (index: number) => void;
  cols: number;
  squareSize: number;
  winningSquare: number | null;
  gameState: "betting" | "playing" | "finished";
}

const SquareGrid: React.FC<SquareGridProps> = ({
  squares,
  onSquareClick,
  cols,
  squareSize,
  winningSquare,
  gameState,
}) => {
  return (
    <div className="flex justify-center items-center">
      <div
        className="grid gap-1 p-4 bg-white rounded-lg shadow-lg border border-gray-200"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          width: "fit-content",
          height: "fit-content",
        }}
      >
        {squares.map((isFilled, index) => {
          const isWinning = winningSquare === index;
          const isWinningSelected = isWinning && isFilled;

          return (
            <div
              key={index}
              className={`
                border-2 cursor-pointer transition-all duration-300 ease-in-out transform
                hover:scale-105 hover:shadow-md rounded-sm relative
                ${
                  gameState === "betting"
                    ? "cursor-pointer"
                    : "cursor-not-allowed"
                }
                ${
                  isFilled
                    ? gameState === "finished" && isWinningSelected
                      ? "bg-gradient-to-br from-green-400 to-green-600 border-green-300 shadow-lg animate-pulse"
                      : "bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300 shadow-sm"
                    : isWinning && gameState === "finished"
                      ? "bg-gradient-to-br from-red-400 to-red-600 border-red-300 shadow-lg animate-pulse"
                      : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 hover:from-gray-100 hover:to-gray-200"
                }
              `}
              style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
              onClick={() => gameState === "betting" && onSquareClick(index)}
            >
              {/* Chart position indicator */}
              {isWinning && gameState === "finished" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full shadow-lg animate-bounce"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom APT Input component
const APTInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  return (
    <div
      className={`flex items-center bg-white rounded-lg border px-3 py-2 shadow-sm relative ${
        disabled ? "opacity-50" : "border-gray-300"
      }`}
    >
      <input
        type="number"
        step="0.001"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.000"
        disabled={disabled}
        className="flex-1 outline-none text-gray-700 disabled:cursor-not-allowed"
      />
      <span className="ml-2 text-sm text-gray-500 font-medium absolute right-5">
        APT
      </span>
    </div>
  );
};

const ChartPredictionGame: React.FC = () => {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [aptos, setAptos] = useState<Aptos | null>(null);

  // Game state
  const [currentLevel, setCurrentLevel] = useState(0);
  const [squares, setSquares] = useState<boolean[]>([]);
  const [cols, setCols] = useState(0);
  const [squareSize, setSquareSize] = useState(0);
  const [aptValue, setAptValue] = useState("0.01");
  const [gameState, setGameState] = useState<
    "betting" | "playing" | "finished"
  >("betting");
  const [winningSquare, setWinningSquare] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    amount: number;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Blockchain state
  const [playerBalance, setPlayerBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Contract configuration - make sure this matches your deployed address exactly
  const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || "0x1"; // Replace with your actual deployed address
  const MODULE_NAME = "staking_game";

  // Utility function to ensure proper address formatting
  const formatAddress = (address: string): string => {
    if (!address.startsWith("0x")) {
      return `0x${address}`;
    }
    return address;
  };

  // Initialize Aptos client
  useEffect(() => {
    const config = new AptosConfig({
      network: Network.TESTNET, // or MAINNET for production
    });
    setAptos(new Aptos(config));
  }, []);

  // Fetch player balance
  const fetchPlayerBalance = async () => {
    if (!aptos || !account) return;

    try {
      const formattedAddress = formatAddress(MODULE_ADDRESS);
      console.log(
        "Fetching balance for:",
        account.address,
        "from contract:",
        formattedAddress
      );

      const balance = await aptos.view({
        payload: {
          function: `${formattedAddress}::${MODULE_NAME}::get_player_balance`,
          functionArguments: [account.address],
        },
      });
      setPlayerBalance(Number(balance[0]) / 100000000); // Convert from octas to APT
    } catch (error) {
      console.error("Error fetching balance:", error);
      // Set balance to 0 if player hasn't deposited yet
      setPlayerBalance(0);
    }
  };

  useEffect(() => {
    if (connected && aptos && account) {
      fetchPlayerBalance();
    }
  }, [connected, aptos, account]);

  const currentLevelData = levels[currentLevel];
  const totalSquares = currentLevelData.cols * currentLevelData.rows;
  const selectedCount = squares.filter(Boolean).length;
  const stakeAmount = parseFloat(aptValue || "0");
  const maxAllowedSquares = Math.floor(totalSquares * 0.85); // 85% limit

  // Validation functions
  const hasSquareInEveryColumn = () => {
    for (let col = 0; col < currentLevelData.cols; col++) {
      let hasSquareInCol = false;
      for (let row = 0; row < currentLevelData.rows; row++) {
        const index = row * currentLevelData.cols + col;
        if (squares[index]) {
          hasSquareInCol = true;
          break;
        }
      }
      if (!hasSquareInCol) return false;
    }
    return true;
  };

  const isValidSelection = () => {
    return (
      selectedCount > 0 &&
      selectedCount <= maxAllowedSquares &&
      hasSquareInEveryColumn()
    );
  };

  // Calculate potential winnings and losses
  const winningAmount =
    selectedCount > 0
      ? Math.pow(1 - selectedCount / totalSquares, 2) * stakeAmount
      : 0;
  const losingAmount =
    selectedCount > 0
      ? Math.pow(selectedCount / totalSquares, 2) * stakeAmount
      : 0;

  useEffect(() => {
    const calculateGrid = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        const { cols: numCols, rows: numRows } = currentLevelData;
        const gap = 4;
        const padding = 32;

        if (containerWidth > 0 && numCols > 0 && numRows > 0) {
          const gridContainerWidth = Math.min(containerWidth - padding, 600);
          const gridContainerHeight = Math.min(containerHeight - padding, 400);

          const maxSizeByWidth =
            (gridContainerWidth - (numCols - 1) * gap) / numCols;
          const maxSizeByHeight =
            (gridContainerHeight - (numRows - 1) * gap) / numRows;

          const finalSize = Math.floor(
            Math.min(maxSizeByWidth, maxSizeByHeight)
          );

          setSquareSize(finalSize);
          setCols(numCols);
          setSquares(Array(numCols * numRows).fill(false));
        }
      }
    };

    calculateGrid();
    window.addEventListener("resize", calculateGrid);
    return () => window.removeEventListener("resize", calculateGrid);
  }, [currentLevelData]);

  // Reset game when level changes
  useEffect(() => {
    setGameState("betting");
    setWinningSquare(null);
    setGameResult(null);
    setCountdown(null);
    setTxHash("");
  }, [currentLevel]);

  const handleSquareClick = (index: number) => {
    if (gameState !== "betting") return;

    const newSquares = [...squares];
    const isCurrentlySelected = newSquares[index];

    // If trying to select and already at max limit, prevent selection
    if (!isCurrentlySelected && selectedCount >= maxAllowedSquares) {
      return;
    }

    newSquares[index] = !newSquares[index];
    setSquares(newSquares);
  };

  // Deposit APT to player balance
  const handleDeposit = async () => {
    if (!account || !signAndSubmitTransaction) return;

    const depositAmount = parseFloat(aptValue);
    if (depositAmount <= 0) {
      alert("Please enter a valid deposit amount");
      return;
    }

    setIsLoading(true);
    try {
      const formattedAddress = formatAddress(MODULE_ADDRESS);
      const amountInOctas = Math.floor(depositAmount * 100000000); // Convert APT to octas (1 APT = 10^8 octas)

      console.log("Deposit params:", {
        address: formattedAddress,
        amount: amountInOctas,
        function: `${formattedAddress}::${MODULE_NAME}::deposit`,
      });

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${formattedAddress}::${MODULE_NAME}::deposit`,
          functionArguments: [amountInOctas.toString()], // Ensure it's a string
        },
      });

      setTxHash(response.hash);
      console.log("Deposit transaction:", response.hash);

      // Wait for transaction and refresh balance
      setTimeout(() => {
        fetchPlayerBalance();
      }, 3000);
    } catch (error) {
      console.error("Deposit failed:", error);
      alert(
        `Deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
    setIsLoading(false);
  };

  // Start game by calling smart contract
  const startGame = async () => {
    if (
      !isValidSelection() ||
      stakeAmount <= 0 ||
      !account ||
      !signAndSubmitTransaction
    )
      return;

    if (playerBalance < stakeAmount) {
      alert("Insufficient balance. Please deposit more APT first.");
      return;
    }

    setIsLoading(true);
    setGameState("playing");
    setCountdown(5); // 5 second countdown

    try {
      const formattedAddress = formatAddress(MODULE_ADDRESS);
      const amountInOctas = Math.floor(stakeAmount * 100000000);

      // Convert selected squares to indices array
      const guesses: number[] = [];
      squares.forEach((selected, index) => {
        if (selected) {
          guesses.push(index);
        }
      });

      console.log("Game params:", {
        address: formattedAddress,
        stake: amountInOctas,
        guesses: guesses,
        totalSquares: totalSquares,
      });

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${formattedAddress}::${MODULE_NAME}::play_game`,
          functionArguments: [
            amountInOctas.toString(), // stake_amount in octas
            guesses.map((g) => g.toString()), // guesses array as strings
            totalSquares.toString(), // total_cube_number
          ],
        },
      });

      setTxHash(response.hash);
      console.log("Game transaction:", response.hash);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            resolveGame(response.hash);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Game transaction failed:", error);
      alert(
        `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setGameState("betting");
      setCountdown(null);
    }
    setIsLoading(false);
  };

  const resolveGame = async (transactionHash: string) => {
    if (!aptos) return;

    try {
      console.log("Waiting for transaction:", transactionHash);
      await aptos.waitForTransaction({ transactionHash });

      console.log("Transaction finalized. Fetching details...");
      const transaction = await aptos.getTransactionByHash({ transactionHash });

      let won = false;
      let amountChanged = 0;
      // 1. Variable to store the true winning number from the chain
      let winningNumberFromChain: number | null = null;
      let eventFound = false;

      if ("events" in transaction && transaction.events) {
        for (const event of transaction.events) {
          if (event.type.includes("GamePlayedEvent")) {
            const eventData = event.data as any;
            won = eventData.won;
            amountChanged = Number(eventData.amount_changed) / 100000000;
            // 2. Parse the winning_number from the event data
            winningNumberFromChain = Number(eventData.winning_number);
            eventFound = true;
            console.log("GamePlayedEvent found:", {
              won,
              amountChanged,
              winningNumberFromChain,
            });
            break;
          }
        }
      }

      if (!eventFound) {
        throw new Error("Could not find GamePlayedEvent in the transaction.");
      }

      // 3. Set the winningSquare state with the number from the blockchain
      setWinningSquare(winningNumberFromChain);

      // 4. Update the rest of the UI with the confirmed result
      setGameResult({
        won,
        amount: won ? amountChanged : -amountChanged,
      });
    } catch (error) {
      console.error("Error resolving game:", error);
      alert(
        `Failed to get game result from the blockchain: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      resetGame();
    } finally {
      setGameState("finished");
      setIsLoading(false);
      setTimeout(() => {
        fetchPlayerBalance();
      }, 1000);
    }
  };

  const resetGame = () => {
    setSquares(Array(totalSquares).fill(false));
    setGameState("betting");
    setWinningSquare(null);
    setGameResult(null);
    setCountdown(null);
    setTxHash("");
  };

  const getGameStatusText = () => {
    if (!connected) return "Connect Wallet to Play";
    if (gameState === "betting") return "Place Your Bet";
    if (gameState === "playing") return `Chart Moving... ${countdown}s`;
    if (gameState === "finished") {
      return gameResult?.won ? "🎉 You Won!" : "😞 You Lost!";
    }
  };

  const getGameStatusColor = () => {
    if (!connected) return "text-red-600";
    if (gameState === "betting") return "text-blue-600";
    if (gameState === "playing") return "text-orange-600";
    if (gameState === "finished") {
      return gameResult?.won ? "text-green-600" : "text-red-600";
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Chart Prediction Game
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to start playing
          </p>
          <div className="text-sm text-gray-500">
            Please connect your Aptos wallet to continue
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Chart Prediction Game
            </h1>
            <p className="text-gray-600 mt-1">
              <span className={`font-semibold ${getGameStatusColor()}`}>
                {getGameStatusText()}
              </span>
              {gameState === "betting" && connected && (
                <span>
                  {" "}
                  • {selectedCount}/{maxAllowedSquares} squares • Must have 1
                  per column
                </span>
              )}
            </p>
          </div>

          {/* Balance and Transaction Info */}
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Game Balance:{" "}
              <span className="font-mono">{playerBalance.toFixed(4)} APT</span>
            </div>
            {txHash && (
              <div className="text-xs text-blue-600 mt-1">
                <a
                  href={`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View Transaction ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main grid container */}
      <div
        ref={containerRef}
        className="w-full flex-grow flex justify-center items-center p-6 relative overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(156, 163, 175, 0.3) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "10px 10px",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%), 
                             linear-gradient(-45deg, rgba(0,0,0,0.1) 25%, transparent 25%), 
                             linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.1) 75%), 
                             linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.1) 75%)`,
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
          }}
        />

        {squareSize > 0 && (
          <SquareGrid
            squares={squares}
            onSquareClick={handleSquareClick}
            cols={cols}
            squareSize={squareSize}
            winningSquare={winningSquare}
            gameState={gameState}
          />
        )}
      </div>

      {/* Validation Messages */}
      {gameState === "betting" && selectedCount > 0 && (
        <div className="mx-6 mb-4 absolute top-20">
          <div className="bg-blue-50 border text-black border-blue-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Selection limit (85%):</span>
                <span
                  className={
                    selectedCount <= maxAllowedSquares
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {selectedCount}/{maxAllowedSquares} ✓
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Square in every column:</span>
                <span
                  className={
                    hasSquareInEveryColumn() ? "text-green-600" : "text-red-600"
                  }
                >
                  {hasSquareInEveryColumn() ? "Yes ✓" : "No ✗"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Results Display */}
      {gameResult && (
        <div
          className={`mx-6 mb-4 p-3 rounded-lg shadow-lg ${
            gameResult.won
              ? "bg-green-100 border-green-300"
              : "bg-red-100 border-red-300"
          } border-2 absolute top-20 right-5`}
        >
          <div className="text-center">
            <h3
              className={`text-md font-bold ${
                gameResult.won ? "text-green-800" : "text-red-800"
              }`}
            >
              {gameResult.won ? "Congratulations!" : "Better luck next time!"}
            </h3>
            <p
              className={`text-sm ${
                gameResult.won ? "text-green-700" : "text-red-700"
              }`}
            >
              {gameResult.won
                ? `You won ${gameResult.amount.toFixed(6)} APT`
                : `You lost ${Math.abs(gameResult.amount).toFixed(6)} APT`}
            </p>
          </div>
        </div>
      )}

      {/* Control panel */}
      <div className="bg-white shadow-lg border-t border-gray-200 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            {/* Level Control */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Difficulty: Level {currentLevel + 1}
              </label>
              <input
                type="range"
                min="0"
                max={levels.length - 1}
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value))}
                disabled={gameState !== "betting"}
                className="w-full h-3 bg-gradient-to-r from-blue-200 to-blue-400 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <div className="text-xs text-gray-600 text-center">
                {totalSquares} squares total
              </div>
            </div>

            {/* Stake Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Stake Amount
              </label>
              <APTInput
                value={aptValue}
                onChange={setAptValue}
                disabled={gameState !== "betting"}
              />
            </div>

            {/* Risk/Reward Display */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Risk / Reward
              </label>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Win:</span>
                  <span className="font-mono text-green-600">
                    +{winningAmount.toFixed(4)} APT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Lose:</span>
                  <span className="font-mono text-red-600">
                    -{losingAmount.toFixed(4)} APT
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Coverage:{" "}
                  {totalSquares > 0
                    ? ((selectedCount / totalSquares) * 100).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
            </div>

            {/* Balance Management */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Balance Management
              </label>
              <button
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg shadow hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50"
                onClick={handleDeposit}
                disabled={
                  isLoading || gameState !== "betting" || stakeAmount <= 0
                }
              >
                {isLoading
                  ? "Processing..."
                  : `Deposit ${stakeAmount.toFixed(3)} APT`}
              </button>
              <div className="text-xs text-gray-500 text-center">
                Balance: {playerBalance.toFixed(4)} APT
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {gameState === "betting" && (
                <button
                  className={`
                    w-full px-6 py-3 font-bold rounded-xl shadow-lg transition-all duration-300 ease-in-out transform
                    ${
                      isValidSelection() &&
                      stakeAmount > 0 &&
                      playerBalance >= stakeAmount &&
                      !isLoading
                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 hover:shadow-xl"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }
                    focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-opacity-50
                  `}
                  onClick={startGame}
                  disabled={
                    !isValidSelection() ||
                    stakeAmount <= 0 ||
                    playerBalance < stakeAmount ||
                    isLoading
                  }
                  title={
                    !isValidSelection()
                      ? selectedCount > maxAllowedSquares
                        ? "Too many squares selected (max 85%)"
                        : !hasSquareInEveryColumn()
                          ? "Must select at least one square in each column"
                          : "Select squares to start"
                      : playerBalance < stakeAmount
                        ? "Insufficient balance - deposit more APT"
                        : "Start the game!"
                  }
                >
                  {isLoading
                    ? "Processing..."
                    : !isValidSelection()
                      ? selectedCount > maxAllowedSquares
                        ? "Too Many Squares"
                        : !hasSquareInEveryColumn()
                          ? "Need Square Per Column"
                          : "Select Squares"
                      : playerBalance < stakeAmount
                        ? "Insufficient Balance"
                        : "Start Game"}
                </button>
              )}

              {gameState === "finished" && (
                <button
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
                  onClick={resetGame}
                >
                  Play Again
                </button>
              )}

              {gameState === "betting" && selectedCount > 0 && (
                <button
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  onClick={() => setSquares(Array(totalSquares).fill(false))}
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartPredictionGame;
