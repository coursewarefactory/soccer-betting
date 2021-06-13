// SPDX-License-Identifier: No License
pragma solidity 0.6.4;

import './IBEP20.sol';

contract SoccerBetting {
    // settings
    address public owner = msg.sender;
    IBEP20 public token;
    uint8 public constant FEE_PERCENTAGE = 3;
    bool public open = true;
    bool public finished = false;

    // match
    string public homeTeam;
    string public awayTeam;
    string public date;
    uint8 private result;

    // bettors and bets
    address[][3] public bettors;
    mapping(address => uint256)[3] public bets;
    uint256[3] public betsTotal;
    uint256 public betsTotalTotal;

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
        string memory _date,
        IBEP20 _token
    ) public {
        homeTeam = _homeTeam;
        awayTeam = _awayTeam;
        date = _date;
        token = _token;
    }

    /**
     * @notice Add a bet
     * @param _option 0 = home, 1 = away, 2 = tie
     */
    function addBet(uint8 _option, uint256 _amount) external exceptOwner onlyOpen {
        require(_option >= 0 && _option <= 2, "Invalid bet option");
        require(token.balanceOf(msg.sender) >= _amount, "Balance isn't enough");
        if (bets[_option][msg.sender] == 0) {
            bettors[_option].push(msg.sender);
        }
        token.approve(msg.sender, _amount);
        token.transferFrom(msg.sender, address(this), _amount);
        bets[_option][msg.sender] += _amount;
        betsTotal[_option] += _amount;
        betsTotalTotal += _amount;
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
    function setResult(uint8 _result) external onlyOwner onlyClosed {
        require(_result >= 0 && _result <= 2, "Invalid result");
        finished = true;
        result = _result;
        address[] memory winners = bettors[_result];
        uint256 jackpot = token.balanceOf(address(this));
        jackpot = (jackpot * (100 - FEE_PERCENTAGE)) / 100;
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 betAmount = bets[_result][winners[i]];
            uint256 betAmountPct = (100 * betAmount) / betsTotal[_result];
            uint256 individualPrize = (jackpot * betAmountPct) / 100;
            token.transfer(winners[i], individualPrize);
        }
        uint256 rest = token.balanceOf(address(this));
        token.transfer(owner, rest);
    }

    /**
     * @return the result of the match
     */
    function getResult() external view onlyFinished returns (uint8) {
        return result;
    }
}
