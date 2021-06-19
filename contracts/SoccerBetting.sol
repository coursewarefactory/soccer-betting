// SPDX-License-Identifier: No License
pragma solidity 0.6.4;

import './IBEP20.sol';

contract SoccerBetting {
    // settings
    address public owner = msg.sender;
    uint8 public constant FEE_PERCENTAGE = 3;

    // games
    struct Game {
        string teamA;
        string teamB;
        string date;
        IBEP20 token;
        bool open;
        bool finished;
        uint8 result;// 0: teamA, 1: teamB, 2: tie
    }
    mapping(bytes32 => Game) private games;

    // bettors and bets
    mapping(bytes32 => address[][3]) public bettors;
    mapping(bytes32 => mapping(address => uint256)[3]) public bets;
    mapping(bytes32 => uint256[3]) public betsTotal;
    mapping(bytes32 => uint256) public betsTotalTotal;

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier exceptOwner {
        require(msg.sender != owner, "Owner can't call this function");
        _;
    }

    /**
     * @notice Generate a unique identifier for the game
     */
    function generateGameHash(
        string memory teamA,
        string memory teamB,
        string memory date,
        IBEP20 token
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(teamA, teamB, date, token));
    }

    /**
     * @notice Add a game to take bets
     * @dev It's necessary pass the game params to generate the hash and in the same time
     * save data about the match
     */
    function addGame(
        string calldata teamA,
        string calldata teamB,
        string calldata date,
        IBEP20 token
    ) external onlyOwner {
        bytes32 hash = generateGameHash(teamA, teamB, date, token);
        games[hash] = Game(teamA, teamB, date, token, true, false, 0);
    }

    /**
     * @notice Return the game data
     */
    function getGame(bytes32 hash) public view returns (string memory, string memory, string memory, IBEP20) {
        Game memory game = games[hash];
        return (game.teamA, game.teamB, game.date, game.token);
    }

    /**
     * @notice Verify if the game is open for bets
     */
    function isOpen(bytes32 hash) public view returns (bool) {
        return games[hash].open;
    }

    /**
     * @notice Verify if the game is finished
     */
    function isFinished(bytes32 hash) public view returns (bool) {
        return games[hash].finished;
    }

    /**
     * @notice Add a bet
     */
    function addBet(bytes32 hash, uint8 option, uint256 amount) external exceptOwner {
        require(option >= 0 && option <= 2, "Invalid bet option");
        require(isOpen(hash), "The contract isn't open to bets");
        IBEP20 token = games[hash].token;
        require(token.balanceOf(msg.sender) >= amount, "Balance isn't enough");
        if (bets[hash][option][msg.sender] == 0) {
            bettors[hash][option].push(msg.sender);
        }
        token.approve(msg.sender, amount);
        token.transferFrom(msg.sender, address(this), amount);
        bets[hash][option][msg.sender] = add(bets[hash][option][msg.sender], amount);
        betsTotal[hash][option] = add(betsTotal[hash][option], amount);
        betsTotalTotal[hash] += amount;
    }

    /**
     * @notice Close the bets
     */
    function closeBets(bytes32 hash) external onlyOwner {
        games[hash].open = false;
    }

    /**
     * @notice Save the result of the game and distributes the jackpot
     */
    function setResult(bytes32 hash, uint8 result) external onlyOwner {
        require(result >= 0 && result <= 2, "Invalid result");
        games[hash].finished = true;
        games[hash].result = result;
        IBEP20 token = games[hash].token;
        address[] memory winners = bettors[hash][result];
        uint256 jackpot = betsTotalTotal[hash];
        uint256 rest = jackpot;
        jackpot = (jackpot * (100 - FEE_PERCENTAGE)) / 100;
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 betAmount = bets[hash][result][winners[i]];
            uint256 betAmountPct = (100 * betAmount) / betsTotal[hash][result];
            uint256 individualPrize = (jackpot * betAmountPct) / 100;
            token.transfer(winners[i], individualPrize);
            rest -= individualPrize;
        }
        token.transfer(owner, rest);
    }

    /**
     * @return the result of the match
     */
    function getResult(bytes32 hash) external view returns (uint8) {
        require(isFinished(hash), "The contract isn't finished");
        return games[hash].result;
    }

    // SafeMath

    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }
}
