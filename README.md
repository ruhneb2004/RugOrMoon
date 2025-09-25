# Aptos Chart Prediction Game

A blockchain-based prediction game built on the Aptos network that combines strategic grid selection with real cryptocurrency stakes. Players predict where a "chart" will end by selecting squares on a grid, with dynamic risk/reward mechanics based on coverage strategy.

## Table of Contents

- [Overview](#overview)
- [Business Model](#business-model)
- [Technology Stack](#technology-stack)
- [Game Mechanics](#game-mechanics)
- [Architecture](#architecture)
- [Smart Contract Details](#smart-contract-details)
- [Frontend Implementation](#frontend-implementation)
- [Economics & Tokenomics](#economics--tokenomics)
- [Development Setup](#development-setup)
- [Deployment Guide](#deployment-guide)
- [Security Considerations](#security-considerations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Overview

The Aptos Chart Prediction Game is a decentralized gambling application that simulates financial chart prediction in a gamified format. Players stake APT tokens to predict where a simulated chart will end on a grid, with winnings determined by their selection strategy and the randomized outcome.

### Key Features

- **Real Stakes**: Players bet actual APT tokens stored in smart contracts
- **Strategic Depth**: Risk/reward scales with grid coverage percentage
- **Multiple Difficulty Levels**: 4 different grid sizes (6x3 to 12x6)
- **Transparent Randomness**: On-chain pseudo-random number generation
- **Instant Settlement**: Automated win/loss calculation and payout
- **Wallet Integration**: Seamless connection with popular Aptos wallets

## Business Model

### Revenue Streams

1. **House Edge**: Built into the payout calculations

   - Winners receive less than pure mathematical odds
   - House retains a percentage of all stakes
   - Sustainable long-term revenue model

2. **Transaction Volume**: Benefits from high-frequency, small-stake games

   - Low barrier to entry encourages frequent play
   - Multiple difficulty levels cater to different risk appetites

3. **Treasury Management**: Smart contract holds player funds
   - Generates potential yield from staked assets
   - Creates liquidity pool for instant payouts

### Target Market

- **Primary**: Crypto-native users familiar with DeFi and on-chain gaming
- **Secondary**: Traditional gaming audiences interested in blockchain integration
- **Demographics**: Ages 21-45, comfortable with cryptocurrency transactions

### Competitive Advantages

1. **Aptos Integration**: Fast, low-cost transactions compared to Ethereum
2. **Transparent Logic**: All game mechanics verifiable on-chain
3. **Strategic Gameplay**: Not pure luck - rewards thoughtful risk management
4. **Responsive Design**: Works seamlessly across desktop and mobile

## Technology Stack

### Blockchain Layer

- **Aptos Blockchain**: Layer 1 blockchain for smart contracts
- **Move Language**: Smart contract development
- **Aptos TS SDK**: TypeScript SDK for blockchain interaction

### Frontend Technology

```json
{
  "framework": "Next.js 14",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "ui_components": "Radix UI",
  "state_management": "React Hooks",
  "wallet_integration": "@aptos-labs/wallet-adapter-react",
  "queries": "@tanstack/react-query"
}
```

### Development Tools

- **Move Compiler**: Smart contract compilation
- **Aptos CLI**: Contract deployment and testing
- **ESLint/Prettier**: Code formatting and linting
- **TypeScript**: Type safety and development experience

### Dependencies Overview

```json
{
  "core_blockchain": [
    "@aptos-labs/ts-sdk@1.26.0",
    "@aptos-labs/wallet-adapter-react@^3.8.0",
    "@aptos-labs/aptos-faucet-client@^0.2.0"
  ],
  "frontend_framework": [
    "next@latest",
    "react@^18.2.0",
    "react-dom@^18.2.0",
    "typescript@^5.2.2"
  ],
  "ui_components": [
    "@radix-ui/react-*",
    "lucide-react@^0.383.0",
    "tailwindcss@^3.4.10"
  ],
  "utilities": ["class-variance-authority@^0.7.0", "clsx@^2.1.1", "zod@^3.23.8"]
}
```

## Game Mechanics

### Core Gameplay Loop

1. **Grid Selection**: Choose difficulty level (6x3 to 12x6 grid)
2. **Square Selection**: Pick squares where you predict the chart will end
3. **Validation**: Must select at least one square in every column
4. **Stake Placement**: Deposit APT tokens for the bet
5. **Game Resolution**: Smart contract generates random winning position
6. **Payout**: Automatic win/loss calculation and token distribution

### Risk/Reward Mathematics

**Winning Formula**: `bonus = stake × (1 - coverage_ratio)²`
**Losing Formula**: `loss = stake × (coverage_ratio)²`

Where `coverage_ratio = selected_squares / total_squares`

#### Example Scenarios (0.1 APT stake, 18-square grid):

| Squares Selected | Coverage | Win Probability | Potential Bonus | Potential Loss |
| ---------------- | -------- | --------------- | --------------- | -------------- |
| 2 squares        | 11%      | 11%             | +0.079 APT      | -0.0012 APT    |
| 9 squares        | 50%      | 50%             | +0.025 APT      | -0.025 APT     |
| 15 squares       | 83%      | 83%             | +0.003 APT      | -0.069 APT     |

### Validation Rules

1. **Coverage Limit**: Maximum 85% of grid can be selected
2. **Column Requirement**: At least one square per column must be selected
3. **Minimum Stake**: Prevents spam transactions
4. **Balance Check**: Sufficient funds in game contract

## Architecture

### Smart Contract Architecture

```
┌─────────────────────────────────────┐
│           Staking Game              │
├─────────────────────────────────────┤
│  Resources:                         │
│  • PlayerBalance (per user)         │
│  • Treasury (global)                │
│                                     │
│  Functions:                         │
│  • deposit() - Add funds            │
│  • withdraw() - Remove funds        │
│  • play_game() - Main game logic    │
│  • get_player_balance() - View      │
└─────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────┐
│         React Components            │
├─────────────────────────────────────┤
│  • ChartPredictionGame (main)       │
│  • SquareGrid (game board)          │
│  • WalletProvider (blockchain)      │
│  • APTInput (token input)           │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│        Aptos Integration            │
├─────────────────────────────────────┤
│  • Wallet Connection                │
│  • Transaction Signing              │
│  • Balance Queries                  │
│  • Event Listening                  │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│         Smart Contracts             │
├─────────────────────────────────────┤
│  • Game Logic                       │
│  • Fund Management                  │
│  • Random Number Generation         │
│  • Event Emission                   │
└─────────────────────────────────────┘
```

## Smart Contract Details

### Core Resources

```move
struct PlayerBalance has key {
    balance: Coin<AptosCoin>,
}

struct Treasury has key {
    balance: Coin<AptosCoin>,
}
```

### Key Functions

1. **deposit(player: &signer, amount: u64)**

   - Transfers APT from player wallet to game contract
   - Creates PlayerBalance resource if needed
   - Emits DepositEvent

2. **play_game(player: &signer, stake_amount: u64, guesses: vector<u64>, total_cube_number: u64)**

   - Main game execution function
   - Validates player balance and game parameters
   - Generates pseudo-random winning number
   - Calculates win/loss and updates balances
   - Emits GamePlayedEvent

3. **get_player_balance(player_addr: address): u64**
   - View function to check player's game balance
   - Returns balance in octas (1 APT = 100,000,000 octas)

### Events

```move
struct GamePlayedEvent has drop, store {
    player: address,
    stake: u64,
    won: bool,
    amount_changed: u64
}

struct DepositEvent has drop, store {
    player: address,
    amount: u64
}

struct WithdrawEvent has drop, store {
    player: address,
    amount: u64
}
```

## Frontend Implementation

### State Management

```typescript
// Game state
const [gameState, setGameState] = useState<"betting" | "playing" | "finished">(
  "betting"
);
const [squares, setSquares] = useState<boolean[]>([]);
const [playerBalance, setPlayerBalance] = useState<number>(0);

// Blockchain integration
const { account, signAndSubmitTransaction, connected } = useWallet();
const [aptos, setAptos] = useState<Aptos | null>(null);
```

### Key Integration Points

1. **Wallet Connection**: Automatic detection and connection handling
2. **Balance Sync**: Real-time balance updates after transactions
3. **Transaction Tracking**: Links to Aptos Explorer for transparency
4. **Error Handling**: User-friendly error messages and retry logic

### UI/UX Features

- **Responsive Grid**: Adapts to different screen sizes
- **Visual Feedback**: Hover effects, animations, and state indicators
- **Progressive Disclosure**: Advanced options hidden until needed
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Economics & Tokenomics

### Token Flow

```
Player Wallet → Game Contract → Treasury/Player
     ↓               ↓              ↓
 [Deposit]      [Game Play]    [Payout]
```

### Economic Parameters

- **House Edge**: Approximately 2-5% depending on strategy
- **Minimum Bet**: 0.001 APT
- **Maximum Bet**: Configurable based on treasury size
- **Gas Costs**: ~0.0001-0.001 APT per transaction

### Sustainability Model

1. **Risk Management**: House edge ensures long-term profitability
2. **Volume Incentives**: Lower minimum bets encourage frequent play
3. **Treasury Growth**: Losing bets fund future winning payouts
4. **Scalability**: Can handle high transaction volume on Aptos

## Development Setup

### Prerequisites

```bash
# Required software
- Node.js 18+
- pnpm/npm/yarn
- Aptos CLI
- Git

# Aptos CLI installation
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
```

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd aptos-chart-prediction-game

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Compile Move contracts
npm run move:compile

# Start development server
npm run dev
```

### Environment Configuration

```bash
# .env.local
PROJECT_NAME=aptos-next-template
NEXT_PUBLIC_APP_NETWORK=testnet
NEXT_PUBLIC_MODULE_ADDRESS=0xa56010bb2f41cda1d7949d85b9346c74009ab75422bce5eb5c603f40054849ca
```

## Deployment Guide

### Smart Contract Deployment

```bash
# Initialize Aptos account
aptos init --network testnet

# Fund account (testnet)
aptos account fund-with-faucet --account default

# Deploy contract
npm run move:publish --network testnet

# Verify deployment
aptos account list --account <deployed-address>
```

### Frontend Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to other platforms
# Update environment variables in deployment platform
```

### Post-Deployment Checklist

- [ ] Contract functions responding correctly
- [ ] Frontend connecting to deployed contract
- [ ] Wallet integration working
- [ ] Transaction links pointing to correct explorer
- [ ] Error handling working properly

## Security Considerations

### Smart Contract Security

1. **Randomness**: Currently uses pseudo-random based on timestamp

   - **Risk**: Potentially predictable
   - **Mitigation**: Upgrade to Aptos randomness API for production

2. **Treasury Management**: No admin controls in current version

   - **Risk**: Cannot handle edge cases
   - **Mitigation**: Add controlled admin functions for emergency situations

3. **Integer Overflow**: Fixed in recent updates
   - **Risk**: Mathematical operations could overflow
   - **Mitigation**: Use safe math operations and proper bounds checking

### Frontend Security

1. **Input Validation**: All user inputs validated client and contract side
2. **Transaction Security**: All transactions require explicit user approval
3. **Error Handling**: Graceful handling of network and contract errors

### Recommended Audits

- Smart contract security audit before mainnet deployment
- Frontend security review for wallet integration
- Economic model validation for long-term sustainability

## Roadmap

### Phase 1: MVP (Current)

- [x] Basic game mechanics
- [x] Aptos wallet integration
- [x] Smart contract deployment
- [x] Frontend UI/UX

### Phase 2: Enhancement

- [ ] Secure randomness implementation
- [ ] Advanced treasury management
- [ ] Game history and statistics
- [ ] Mobile app development

### Phase 3: Scaling

- [ ] Multi-token support
- [ ] Leaderboards and achievements
- [ ] Social features
- [ ] Advanced game modes

### Phase 4: Ecosystem

- [ ] API for third-party integration
- [ ] White-label solutions
- [ ] Cross-chain compatibility
- [ ] DAO governance

## Contributing

### Development Guidelines

1. **Code Style**: Follow existing TypeScript and Move conventions
2. **Testing**: Add tests for new features
3. **Documentation**: Update README and inline comments
4. **Security**: Consider security implications of all changes

### Contribution Process

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request with detailed description

### Areas for Contribution

- Smart contract optimization
- Frontend UI/UX improvements
- Security enhancements
- Documentation and tutorials
- Testing and quality assurance

## License

Apache-2.0 License - see LICENSE file for details.

## Contact & Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Additional guides and tutorials
- **Community**: Join discussions and get help

---

_Built with Aptos blockchain technology for a decentralized gaming future._
