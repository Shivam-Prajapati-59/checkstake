// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title ChessBetting
 * @dev P2P chess betting platform with dispute resolution and enhanced security
 * @author Your Team
 */
contract ChessBetting {
    address public owner;
    uint256 public platformFeePercent; // Fee in basis points (e.g., 250 = 2.5%)
    uint256 public accumulatedFees; // Track platform fees separately
    uint256 public minBetAmount; // Minimum bet amount
    uint256 public maxBetAmount; // Maximum bet amount
    uint256 public betExpiryTime; // Time before unclaimed bets expire
    uint256 public disputeWindow; // Time window for disputes after result
    bool public paused; // Emergency pause switch
    
    enum BetStatus { Created, Active, Completed, Cancelled, Disputed, Draw }
    enum GameResult { Pending, Player1Wins, Player2Wins, Draw }
    
    struct Bet {
        uint256 betId;
        address player1;
        address player2;
        uint256 amount;
        address winner;
        BetStatus status;
        GameResult result;
        uint256 createdAt;
        uint256 completedAt;
        bytes32 gameHash; // Link to off-chain game data
        bool player1Disputed;
        bool player2Disputed;
    }
    
    mapping(uint256 => Bet) public bets;
    uint256 public betCounter;
    uint256 private locked; // Reentrancy guard
    
    // Player statistics
    mapping(address => uint256) public playerWins;
    mapping(address => uint256) public playerLosses;
    mapping(address => uint256) public playerDraws;
    
    // Custom Errors (Gas efficient)
    error NotOwner();
    error ContractPaused();
    error BetNotAvailable();
    error CannotBetAgainstYourself();
    error IncorrectBetAmount();
    error InvalidWinner();
    error BetNotActive();
    error OnlyCreatorCanCancel();
    error CanOnlyCancelPendingBets();
    error NoFeesToWithdraw();
    error InsufficientContractBalance();
    error BetExpired();
    error BetNotExpired();
    error DisputeWindowClosed();
    error AlreadyDisputed();
    error ReentrancyDetected();
    error BetAmountOutOfRange();
    error InvalidFeePercent();
    error ZeroBetAmount();
    
    // Events
    event BetCreated(uint256 indexed betId, address indexed creator, uint256 amount, bytes32 gameHash);
    event BetJoined(uint256 indexed betId, address indexed joiner, uint256 totalPool);
    event BetCompleted(uint256 indexed betId, address indexed winner, uint256 payout, GameResult result);
    event BetCancelled(uint256 indexed betId, address indexed canceller, uint256 refundAmount);
    event BetDisputed(uint256 indexed betId, address indexed disputer);
    event DisputeResolved(uint256 indexed betId, address indexed winner, GameResult finalResult);
    event DrawDeclared(uint256 indexed betId, uint256 refundAmount);
    event FeeWithdrawn(address indexed owner, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event BetLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    event EmergencyPause(bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier nonReentrant() {
        if (locked == 2) revert ReentrancyDetected();
        locked = 2;
        _;
        locked = 1;
    }
    
    constructor(uint256 _feePercent, uint256 _minBet, uint256 _maxBet) {
        if (_feePercent > 1000) revert InvalidFeePercent(); // Max 10%
        owner = msg.sender;
        platformFeePercent = _feePercent;
        minBetAmount = _minBet;
        maxBetAmount = _maxBet;
        betExpiryTime = 7 days; // Default 7 days
        disputeWindow = 1 days; // Default 1 day dispute window
        locked = 1;
        paused = false;
    }
    
    // Player 1 creates a bet and deposits the amount
    function createBet(bytes32 _gameHash) external payable whenNotPaused returns (uint256) {
        if (msg.value == 0) revert ZeroBetAmount();
        if (msg.value < minBetAmount || msg.value > maxBetAmount) revert BetAmountOutOfRange();
        
        betCounter++;
        bets[betCounter] = Bet({
            betId: betCounter,
            player1: msg.sender,
            player2: address(0),
            amount: msg.value,
            winner: address(0),
            status: BetStatus.Created,
            result: GameResult.Pending,
            createdAt: block.timestamp,
            completedAt: 0,
            gameHash: _gameHash,
            player1Disputed: false,
            player2Disputed: false
        });
        
        emit BetCreated(betCounter, msg.sender, msg.value, _gameHash);
        return betCounter;
    }
    
    // Player 2 joins the bet by depositing the same amount
    function joinBet(uint256 _betId) external payable whenNotPaused nonReentrant {
        Bet storage bet = bets[_betId];
        
        if (bet.status != BetStatus.Created) revert BetNotAvailable();
        if (msg.sender == bet.player1) revert CannotBetAgainstYourself();
        if (msg.value != bet.amount) revert IncorrectBetAmount();
        if (block.timestamp > bet.createdAt + betExpiryTime) revert BetExpired();
        
        bet.player2 = msg.sender;
        bet.status = BetStatus.Active;
        
        uint256 totalPool = bet.amount * 2;
        emit BetJoined(_betId, msg.sender, totalPool);
    }
    
    // Owner declares the winner and distributes funds
    function declareWinner(uint256 _betId, address _winner) external onlyOwner nonReentrant {
        Bet storage bet = bets[_betId];
        
        if (bet.status != BetStatus.Active) revert BetNotActive();
        if (_winner != bet.player1 && _winner != bet.player2) revert InvalidWinner();
        
        bet.winner = _winner;
        bet.status = BetStatus.Completed;
        bet.completedAt = block.timestamp;
        
        // Set result
        if (_winner == bet.player1) {
            bet.result = GameResult.Player1Wins;
            playerWins[bet.player1]++;
            playerLosses[bet.player2]++;
        } else {
            bet.result = GameResult.Player2Wins;
            playerWins[bet.player2]++;
            playerLosses[bet.player1]++;
        }
        
        uint256 totalPool = bet.amount * 2;
        uint256 platformFee = (totalPool * platformFeePercent) / 10000;
        uint256 winnerPayout = totalPool - platformFee;
        
        // Track fees separately (fees stay in contract)
        accumulatedFees += platformFee;
        
        // Transfer winnings to the winner immediately (NOT including fees)
        (bool success, ) = payable(_winner).call{value: winnerPayout}("");
        if (!success) revert InsufficientContractBalance();
        
        emit BetCompleted(_betId, _winner, winnerPayout, bet.result);
    }
    
    // Declare a draw - refund both players
    function declareDraw(uint256 _betId) external onlyOwner nonReentrant {
        Bet storage bet = bets[_betId];
        
        if (bet.status != BetStatus.Active) revert BetNotActive();
        
        bet.status = BetStatus.Draw;
        bet.result = GameResult.Draw;
        bet.completedAt = block.timestamp;
        
        // Update statistics
        playerDraws[bet.player1]++;
        playerDraws[bet.player2]++;
        
        // Refund both players (no platform fee on draws)
        uint256 refundAmount = bet.amount;
        
        (bool success1, ) = payable(bet.player1).call{value: refundAmount}("");
        (bool success2, ) = payable(bet.player2).call{value: refundAmount}("");
        
        if (!success1 || !success2) revert InsufficientContractBalance();
        
        emit DrawDeclared(_betId, refundAmount);
    }
    
    // Player 1 can cancel the bet if no one has joined yet
    function cancelBet(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        
        if (msg.sender != bet.player1) revert OnlyCreatorCanCancel();
        if (bet.status != BetStatus.Created) revert CanOnlyCancelPendingBets();
        
        bet.status = BetStatus.Cancelled;
        uint256 refundAmount = bet.amount;
        
        // Refund the creator
        (bool success, ) = payable(bet.player1).call{value: refundAmount}("");
        if (!success) revert InsufficientContractBalance();
        
        emit BetCancelled(_betId, bet.player1, refundAmount);
    }
    
    // Claim refund for expired bet (anyone can trigger)
    function claimExpiredBet(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        
        if (bet.status != BetStatus.Created) revert CanOnlyCancelPendingBets();
        if (block.timestamp <= bet.createdAt + betExpiryTime) revert BetNotExpired();
        
        bet.status = BetStatus.Cancelled;
        uint256 refundAmount = bet.amount;
        
        // Refund the creator
        (bool success, ) = payable(bet.player1).call{value: refundAmount}("");
        if (!success) revert InsufficientContractBalance();
        
        emit BetCancelled(_betId, bet.player1, refundAmount);
    }
    
    // Players can dispute results within dispute window
    function disputeResult(uint256 _betId) external {
        Bet storage bet = bets[_betId];
        
        if (bet.status != BetStatus.Completed && bet.status != BetStatus.Draw) revert BetNotActive();
        if (msg.sender != bet.player1 && msg.sender != bet.player2) revert InvalidWinner();
        if (block.timestamp > bet.completedAt + disputeWindow) revert DisputeWindowClosed();
        
        if (msg.sender == bet.player1) {
            if (bet.player1Disputed) revert AlreadyDisputed();
            bet.player1Disputed = true;
        } else {
            if (bet.player2Disputed) revert AlreadyDisputed();
            bet.player2Disputed = true;
        }
        
        bet.status = BetStatus.Disputed;
        emit BetDisputed(_betId, msg.sender);
    }
    
    // Owner resolves disputes
    function resolveDispute(uint256 _betId, GameResult _finalResult) external onlyOwner nonReentrant {
        Bet storage bet = bets[_betId];
        
        if (bet.status != BetStatus.Disputed) revert BetNotActive();
        
        bet.result = _finalResult;
        bet.status = BetStatus.Completed;
        
        if (_finalResult == GameResult.Draw) {
            // Refund both players
            playerDraws[bet.player1]++;
            playerDraws[bet.player2]++;
            
            // Reverse previous stats if there was a winner declared
            if (bet.winner != address(0)) {
                if (bet.winner == bet.player1) {
                    playerWins[bet.player1]--;
                    playerLosses[bet.player2]--;
                } else {
                    playerWins[bet.player2]--;
                    playerLosses[bet.player1]--;
                }
            }
            
            uint256 refundAmount = bet.amount;
            (bool success1, ) = payable(bet.player1).call{value: refundAmount}("");
            (bool success2, ) = payable(bet.player2).call{value: refundAmount}("");
            
            if (!success1 || !success2) revert InsufficientContractBalance();
            
            bet.winner = address(0);
        } else {
            // Determine new winner
            address newWinner = _finalResult == GameResult.Player1Wins ? bet.player1 : bet.player2;
            
            // Update stats if winner changed
            if (bet.winner != newWinner && bet.winner != address(0)) {
                // Reverse old result
                if (bet.winner == bet.player1) {
                    playerWins[bet.player1]--;
                    playerLosses[bet.player2]--;
                } else {
                    playerWins[bet.player2]--;
                    playerLosses[bet.player1]--;
                }
                
                // Apply new result
                if (newWinner == bet.player1) {
                    playerWins[bet.player1]++;
                    playerLosses[bet.player2]++;
                } else {
                    playerWins[bet.player2]++;
                    playerLosses[bet.player1]++;
                }
                
                bet.winner = newWinner;
            }
        }
        
        emit DisputeResolved(_betId, bet.winner, _finalResult);
    }
    
    // Owner withdraws accumulated platform fees (only fees, not active bets)
    function withdrawFees() external onlyOwner nonReentrant {
        if (accumulatedFees == 0) revert NoFeesToWithdraw();
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        
        (bool success, ) = payable(owner).call{value: amount}("");
        if (!success) revert InsufficientContractBalance();
        
        emit FeeWithdrawn(owner, amount);
    }
    
    // Update platform fee (only owner)
    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        if (_newFeePercent > 1000) revert InvalidFeePercent();
        
        uint256 oldFee = platformFeePercent;
        platformFeePercent = _newFeePercent;
        
        emit PlatformFeeUpdated(oldFee, _newFeePercent);
    }
    
    // Update bet amount limits
    function updateBetLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount < _maxAmount, "Min must be less than max");
        minBetAmount = _minAmount;
        maxBetAmount = _maxAmount;
        
        emit BetLimitsUpdated(_minAmount, _maxAmount);
    }
    
    // Update expiry and dispute windows
    function updateTimeWindows(uint256 _betExpiryTime, uint256 _disputeWindow) external onlyOwner {
        betExpiryTime = _betExpiryTime;
        disputeWindow = _disputeWindow;
    }
    
    // Emergency pause/unpause
    function togglePause() external onlyOwner {
        paused = !paused;
        emit EmergencyPause(paused);
    }
    
    // Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
    // Get bet details
    function getBet(uint256 _betId) external view returns (
        address player1,
        address player2,
        uint256 amount,
        address winner,
        BetStatus status,
        GameResult result,
        uint256 createdAt,
        uint256 completedAt,
        bytes32 gameHash
    ) {
        Bet memory bet = bets[_betId];
        return (
            bet.player1,
            bet.player2,
            bet.amount,
            bet.winner,
            bet.status,
            bet.result,
            bet.createdAt,
            bet.completedAt,
            bet.gameHash
        );
    }
    
    // Get player statistics
    function getPlayerStats(address _player) external view returns (
        uint256 wins,
        uint256 losses,
        uint256 draws,
        uint256 totalGames
    ) {
        wins = playerWins[_player];
        losses = playerLosses[_player];
        draws = playerDraws[_player];
        totalGames = wins + losses + draws;
        return (wins, losses, draws, totalGames);
    }
    
    // Get dispute status
    function getDisputeStatus(uint256 _betId) external view returns (
        bool player1Disputed,
        bool player2Disputed,
        bool canDispute
    ) {
        Bet memory bet = bets[_betId];
        player1Disputed = bet.player1Disputed;
        player2Disputed = bet.player2Disputed;
        canDispute = (bet.status == BetStatus.Completed || bet.status == BetStatus.Draw) 
                     && block.timestamp <= bet.completedAt + disputeWindow;
        return (player1Disputed, player2Disputed, canDispute);
    }
    
    // Get multiple bets at once (for frontend)
    function getBets(uint256[] calldata _betIds) external view returns (Bet[] memory) {
        Bet[] memory result = new Bet[](_betIds.length);
        for (uint256 i = 0; i < _betIds.length; i++) {
            result[i] = bets[_betIds[i]];
        }
        return result;
    }
    
    // Get active bets count
    function getActiveBetsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= betCounter; i++) {
            if (bets[i].status == BetStatus.Active) {
                count++;
            }
        }
        return count;
    }
    
    // Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Get available balance (total - accumulated fees)
    function getAvailableBalance() external view returns (uint256) {
        return address(this).balance - accumulatedFees;
    }
    
    // Check if bet is expired
    function isBetExpired(uint256 _betId) external view returns (bool) {
        Bet memory bet = bets[_betId];
        return bet.status == BetStatus.Created 
               && block.timestamp > bet.createdAt + betExpiryTime;
    }
    
    // Emergency withdrawal (only for stuck funds in extreme cases)
    function emergencyWithdraw() external onlyOwner {
        require(paused, "Must be paused");
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
}