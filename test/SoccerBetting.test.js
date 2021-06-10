const SoccerBetting = artifacts.require("SoccerBetting");
const TestToken = artifacts.require("TestToken");
const tryCatchRevert = require("./exceptions.js").tryCatchRevert;

contract("SoccerBetting", accounts => {
  const tokenMultiplier = 1000000000000000000;
  const accountOwner = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];
  const account3 = accounts[3];
  const account4 = accounts[4];
  const account5 = accounts[5];
  const account6 = accounts[6];
  const parseTokenQuantity = quantity => (quantity * tokenMultiplier).toString();

  let contract;
  let token;
  let account1BalanceAfterBet;
  let account2BalanceAfterBet;
  let account3BalanceAfterBet;
  let account4BalanceAfterBet;
  let account5BalanceAfterBet;

  before(async () => {
    contract = await SoccerBetting.deployed();
    token = await TestToken.deployed();
    const accountsInitialTokenQuantity = 100;
    await contract.setToken(token.address);
    await token.transfer(account1, parseTokenQuantity(accountsInitialTokenQuantity), {from: accountOwner});
    await token.transfer(account2, parseTokenQuantity(accountsInitialTokenQuantity), {from: accountOwner});
    await token.transfer(account3, parseTokenQuantity(accountsInitialTokenQuantity), {from: accountOwner});
    await token.transfer(account4, parseTokenQuantity(accountsInitialTokenQuantity), {from: accountOwner});
    await token.transfer(account5, parseTokenQuantity(accountsInitialTokenQuantity), {from: accountOwner});
    assert.equal(await token.balanceOf(account1), parseTokenQuantity(accountsInitialTokenQuantity), 'amount wrong')
    assert.equal(await token.balanceOf(account2), parseTokenQuantity(accountsInitialTokenQuantity), 'amount wrong')
    assert.equal(await token.balanceOf(account3), parseTokenQuantity(accountsInitialTokenQuantity), 'amount wrong')
    assert.equal(await token.balanceOf(account4), parseTokenQuantity(accountsInitialTokenQuantity), 'amount wrong')
    assert.equal(await token.balanceOf(account5), parseTokenQuantity(accountsInitialTokenQuantity), 'amount wrong')
  });

  describe("Test the contract end to end", async () => {
    it("should start open", async () => {
      const returned = await contract.open();
      const expected = true;
      assert.equal(returned, expected, "The contract should start open");
    });

    it("should start with balance equals 0", async () => {
      const returned = await token.balanceOf(contract.address);
      const expected = 0;
      assert.equal(returned, expected, "The contract should start with balance equals 0");
    });

    it("can't receive bets from contract's owner", async () => {
      await tryCatchRevert(contract.addBet(0, parseTokenQuantity(1), {from: accountOwner}), "Owner can't call this function");
    });

    it("can receive bets from other accounts", async () => {
      await contract.addBet(0, parseTokenQuantity(1), {from: account1});
      await contract.addBet(0, parseTokenQuantity(2), {from: account1});
      await contract.addBet(1, parseTokenQuantity(2), {from: account2});
      await contract.addBet(2, parseTokenQuantity(9), {from: account3});
      await contract.addBet(0, parseTokenQuantity(6), {from: account4});
      await contract.addBet(0, parseTokenQuantity(1), {from: account5});

      account1BalanceAfterBet = await token.balanceOf(account1);
      account2BalanceAfterBet = await token.balanceOf(account2);
      account3BalanceAfterBet = await token.balanceOf(account3);
      account4BalanceAfterBet = await token.balanceOf(account4);
      account5BalanceAfterBet = await token.balanceOf(account5);

      assert.equal(account1BalanceAfterBet, parseTokenQuantity(97), "Account 1 balance is wrong");
      assert.equal(account2BalanceAfterBet, parseTokenQuantity(98), "Account 2 balance is wrong");
      assert.equal(account3BalanceAfterBet, parseTokenQuantity(91), "Account 3 balance is wrong");
      assert.equal(account4BalanceAfterBet, parseTokenQuantity(94), "Account 4 balance is wrong");
      assert.equal(account5BalanceAfterBet, parseTokenQuantity(99), "Account 5 balance is wrong");

      const returned = await token.balanceOf(contract.address);
      const expected = parseTokenQuantity(21);
      assert.equal(returned, expected, "Contract's balance is wrong");
    });

    it("should thrown an error when pass invalid bet option", async () => {
      await tryCatchRevert(contract.addBet(3, parseTokenQuantity(1), {from: account6}), "Invalid bet option");
    });

    it("should thrown an error when a normal account try to close bets", async () => {
      await tryCatchRevert(contract.closeBets({from: account6}), "Only owner can call this function");
    });

    it("the owner should close bets", async () => {
      await contract.closeBets({from: accountOwner});
      const returned = await contract.open();
      const expected = false;
      assert.equal(returned, expected, "The contract should be closed");
    });

    it("should thrown an error when an account try to bet when the contract is closed", async () => {
      await tryCatchRevert(contract.addBet(1, parseTokenQuantity(1), {from: account6}), "The contract isn't open to bets");
    });

    it("should thrown an error when a normal account try to finish the contract", async () => {
      await tryCatchRevert(contract.setResult(1, {from: account6}), "Only owner can call this function");
    });

    it("the result can be displayed only when the match is finished", async () => {
      await tryCatchRevert(contract.getResult({from: account6}), "The contract isn't finished");
    });

    it("the owner should finish bets", async () => {
      const result = 0;
      await contract.setResult(result, {from: accountOwner});
      const returned = await token.balanceOf(contract.address);
      const expected = 0;
      assert.equal(returned, expected, "The contract balance should finish with balance equals 0");
    });

    it("distributes the jackpot to the winners", async () => {
      // contract balance = 21
      // jackpot = 20.37 (97% of 21)
      const returned1 = await token.balanceOf(account1);
      const returned4 = await token.balanceOf(account4);
      const returned5 = await token.balanceOf(account5);
      const expected1 = parseInt(account1BalanceAfterBet) + parseInt(parseTokenQuantity(6.111));// 30% of 20.37
      const expected4 = parseInt(account4BalanceAfterBet) + parseInt(parseTokenQuantity(12.222));// 60% of 20.37
      const expected5 = parseInt(account5BalanceAfterBet) + parseInt(parseTokenQuantity(2.037));// 10% of 20.37
      assert.equal(returned1.toString(), expected1.toString(), "The account 1 balance is wrong");
      assert.equal(returned4.toString(), expected4.toString(), "The account 4 balance is wrong");
      assert.equal(returned5.toString(), expected5.toString(), "The account 5 balance is wrong");
    });

    it("not distributes the jackpot to the losers", async () => {
      const account2Balance = await token.balanceOf(account2);
      const account3Balance = await token.balanceOf(account3);
      assert.equal(parseInt(account2Balance), parseInt(account2BalanceAfterBet), "The account 2 balance is wrong");
      assert.equal(parseInt(account3Balance), parseInt(account3BalanceAfterBet), "The account 3 balance is wrong");
    });

    it("the result can be displayed when the match is finished", async () => {
      const expected = 0;
      const returned = await contract.getResult({from: account1});
      assert.equal(expected, returned, "The contract should display the result")
    });

    it("should thrown an error when an account try to bet when the contract is finished", async () => {
      await tryCatchRevert(contract.addBet(1, parseTokenQuantity(1), {from: account6}), "The contract isn't open to bets");
    });
  });
});
