// SPDX-License-Identifier: No License
pragma solidity 0.6.4;

import './IBEP20.sol';

contract TestToken is IBEP20 {
    uint256 private _totalSupply;
    uint8 _decimals;
    string private _symbol;
    string private _name;
    address private _owner;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor() public {
        _name = 'TestToken';
        _symbol = 'TEST';
        _totalSupply = 1000000 * 10 ** 18;
        _decimals = 18;
        _owner = msg.sender;
        _balances[_owner] = _totalSupply;
    }

    function totalSupply() external override view returns (uint256) {
        return _totalSupply;
    }

    function decimals() external override view returns (uint8) {
        return _decimals;
    }

    function symbol() external override view returns (string memory) {
        return _symbol;
    }

    function name() external override view returns (string memory) {
        return _name;
    }

    function getOwner() external override view returns (address) {
        return _owner;
    }

    function balanceOf(address account) external override view returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _balances[msg.sender] = _balances[msg.sender] - amount;
        _balances[recipient] = _balances[recipient] + amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external override view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        _balances[sender] = _balances[sender] - amount;
        _allowances[sender][msg.sender] = _allowances[sender][msg.sender] - amount;
        _balances[recipient] = _balances[recipient] + amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}
