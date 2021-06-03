// SPDX-License-Identifier: No License
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SoccerBetting {
    // settings
    address payable public owner = payable(msg.sender);
    uint8 public constant FEE_PERCENTAGE = 3;
    bool public open = true;
    bool public finished = false;

    // match
    string public homeTeam;
    string public awayTeam;
    string public date;
    uint8 private result;

    // bettors and bets
    address payable[][3] public bettors;
    mapping(address => uint256)[3] public bets;
    uint256[3] public betsTotal;

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier exceptOwner {
        require(msg.sender != owner, "Owner can't call this function");
        _;
    }

    modifier onlyOpen {
        require(open, "The contract isn't open to bets");
        _;
    }

    modifier onlyClosed {
        require(!open, "The contract isn't open");
        _;
    }

    modifier onlyFinished {
        require(finished, "The contract isn't finished");
        _;
    }

    constructor(
        string memory _homeTeam,
        string memory _awayTeam,
        string memory _date
    ) {
        homeTeam = _homeTeam;
        awayTeam = _awayTeam;
        date = _date;
    }

    /**
     * @notice Add a bet
     * @param _option 0 = home, 1 = away, 2 = tie
     */
    function addBet(uint8 _option) external payable exceptOwner onlyOpen {
        require(_option >= 0 && _option <= 2, "Invalid bet option");
        if (bets[_option][msg.sender] == 0) {
            bettors[_option].push(payable(msg.sender));
        }
        bets[_option][msg.sender] += msg.value;
        betsTotal[_option] += msg.value;
    }

    /**
     * @notice Close the bets
     */
    function closeBets() external onlyOwner onlyOpen {
        open = false;
    }

    /**
     * @notice Save the result of the match and distributes the jackpot
     * @param _result the result of the match
     */
    function setResult(uint8 _result) external payable onlyOwner onlyClosed {
        require(_result >= 0 && _result <= 2, "Invalid result");
        finished = true;
        result = _result;
        address payable[] memory winners = bettors[_result];
        uint256 jackpot = address(this).balance;
        jackpot = (jackpot * (100 - FEE_PERCENTAGE)) / 100;
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 betAmount = bets[_result][winners[i]];
            uint256 betAmountPct = (100 * betAmount) / betsTotal[_result];
            uint256 individualPrize = (jackpot * betAmountPct) / 100;
            winners[i].transfer(individualPrize);
        }
        owner.transfer(address(this).balance);
    }

    /**
     * @return the result of the match
     */
    function getResult() external view onlyFinished returns (uint8) {
        return result;
    }
}
