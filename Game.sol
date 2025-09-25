// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract StakingGame {
    // --- State Variables ---
    uint256 private constant PRECISION = 1e18;
    mapping(address => uint256) private playerBalances;

    // --- Events ---
    // Event now logs the net amount won or lost
    event GamePlayed(address indexed player, uint256 stake, bool won, uint256 amountChanged);
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);

    // --- Errors ---
    error StakingGame__InsufficientBalanceForStake();
    error StakingGame__NoBalanceToWithdraw();
    error StakingGame__TransferFailed();
    error StakingGame__NoGuessesProvided();

    // --- Constructor ---
    constructor() {}

    // --- Core Game Logic (Backend-Controlled) ---

    function playGame(address _player, uint256 _stakeAmount, uint64[] memory _guesses, uint256 _totalCubeNumber)
        external
    {
        if (playerBalances[_player] < _stakeAmount) {
            revert StakingGame__InsufficientBalanceForStake();
        }
        if (_guesses.length == 0) {
            revert StakingGame__NoGuessesProvided();
        }

        // --- IMPORTANT: This randomness is INSECURE and for demonstration ONLY. ---
        uint256 winnerNumber = _getInsecurePseudoRandomNumber(_player) % _totalCubeNumber;

        bool playerWon = false;
        for (uint256 i = 0; i < _guesses.length; i++) {
            if (_guesses[i] == winnerNumber) {
                playerWon = true;
                break;
            }
        }

        if (playerWon) {
            // 1. On a WIN, calculate the bonus and ADD it to the player's balance.
            uint256 bonus = getWinningBonus(_stakeAmount, _guesses.length, _totalCubeNumber);
            playerBalances[_player] += bonus;
            emit GamePlayed(_player, _stakeAmount, true, bonus);
        } else {
            // 2. On a LOSS, calculate the loss amount and SUBTRACT it from the player's balance.
            uint256 lossAmount = getLosingAmount(_stakeAmount, _guesses.length, _totalCubeNumber);
            playerBalances[_player] -= lossAmount;
            emit GamePlayed(_player, _stakeAmount, false, lossAmount);
        }
    }

    // --- Balance Management ---

    function deposit() public payable {
        playerBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 balance = playerBalances[msg.sender];
        if (balance == 0) {
            revert StakingGame__NoBalanceToWithdraw();
        }

        playerBalances[msg.sender] = 0;

        (bool success,) = msg.sender.call{value: balance}("");
        if (!success) {
            revert StakingGame__TransferFailed();
        }
        emit Withdrawn(msg.sender, balance);
    }

    receive() external payable {
        deposit();
    }

    // --- Getters and Helpers ---

    function getPlayerBalance(address _player) external view returns (uint256) {
        return playerBalances[_player];
    }

    function _getInsecurePseudoRandomNumber(address _player) private view returns (uint256) {
        bytes32 randomHash = keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _player));
        return uint256(randomHash);
    }

    function getWinningBonus(uint256 _stakedAmount, uint256 _selectedNoOfCubes, uint256 _totalNumberOfCubes)
        public
        pure
        returns (uint256)
    {
        require(_totalNumberOfCubes > 0, "Cubes cannot be zero");
        require(_selectedNoOfCubes <= _totalNumberOfCubes, "Selected exceeds total");
        uint256 ratio = (_selectedNoOfCubes * PRECISION) / _totalNumberOfCubes;
        uint256 oneMinusRatio = PRECISION - ratio;
        uint256 bonus = (oneMinusRatio * oneMinusRatio * _stakedAmount) / (PRECISION * PRECISION);
        return bonus;
    }

    function getLosingAmount(uint256 _stakedAmount, uint256 _selectedNoOfCubes, uint256 _totalNumberOfCubes)
        public
        pure
        returns (uint256)
    {
        require(_totalNumberOfCubes > 0, "Cubes cannot be zero");
        uint256 numerator = _selectedNoOfCubes * _selectedNoOfCubes * _stakedAmount;
        uint256 denominator = _totalNumberOfCubes * _totalNumberOfCubes;
        return numerator / denominator;
    }
}
