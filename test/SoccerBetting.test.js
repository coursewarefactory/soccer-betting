const SoccerBetting = artifacts.require("SoccerBetting");
const TestToken = artifacts.require("TestToken");

contract("SoccerBetting", accounts => {

  // helpers
  const tryCatchRevert = require("./exceptions.js").tryCatchRevert;
  const parseTokenQuantityToInt = quantity => quantity * 10 ** 18;
  const parseTokenQuantity = quantity => parseTokenQuantityToInt(quantity).toString();
  const balanceOf = async address => web3.utils.BN(await token.balanceOf.call(address)).toString();
  const assertBalance = async (address, balance, error) => assert.equal(await balanceOf(address), parseTokenQuantityToInt(balance), error);

  // accounts for test
  const accountOwner = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];
  const account3 = accounts[3];
  const account4 = accounts[4];
  const account5 = accounts[5];
  const account6 = accounts[6];

  // game data
  const teamA = "FLA";
  const teamB = "FLU";
  const date = "2021-01-30";

  // ...
  let contract;
  let token;
  let gameHash;
  let account1BalanceAfterBet;
  let account2BalanceAfterBet;
  let account3BalanceAfterBet;
  let account4BalanceAfterBet;
  let account5BalanceAfterBet;

  before(async () => {
    // create a token for tests
    token = await TestToken.new();
    assert.equal(await token.getOwner(), accountOwner, "Token owner is wrong");
    assertBalance(accountOwner, 1000000, "Token owner balance is wrong");

    // deploy the contract
    contract = await SoccerBetting.new();
    assert.equal(await contract.owner(), accountOwner, "Contract owner is wrong");
    assertBalance(contract.address, 0, "Contract balance should be 0 on create");

    // transfers tokens to accounts test contract
    const accountInitialBalanceForTests = 100;
    await token.transfer(account1, parseTokenQuantity(accountInitialBalanceForTests), {from: accountOwner});
    await token.transfer(account2, parseTokenQuantity(accountInitialBalanceForTests), {from: accountOwner});
    await token.transfer(account3, parseTokenQuantity(accountInitialBalanceForTests), {from: accountOwner});
    await token.transfer(account4, parseTokenQuantity(accountInitialBalanceForTests), {from: accountOwner});
    await token.transfer(account5, parseTokenQuantity(accountInitialBalanceForTests), {from: accountOwner});
    assertBalance(accountOwner, 1000000 - 500, "Owner balance after transfers is wrong");
    assertBalance(account1, accountInitialBalanceForTests, "Account1 initial balance is wrong");
    assertBalance(account2, accountInitialBalanceForTests, "Account2 initial balance is wrong");
    assertBalance(account3, accountInitialBalanceForTests, "Account3 initial balance is wrong");
    assertBalance(account4, accountInitialBalanceForTests, "Account4 initial balance is wrong");
    assertBalance(account5, accountInitialBalanceForTests, "Account5 initial balance is wrong");
  });

  describe("Test the contract end to end", async () => {
    it("Anyone can generate a game hash", async () => {
      assert.isOk(
        await contract.generateGameHash.call("FLA", "FLU", "2021-01-30", token.address, {from: accountOwner}),
        "The owner can generate a game hash"
      );
      assert.isOk(
        await contract.generateGameHash.call("FLA", "FLU", "2021-01-30", token.address, {from: account1}),
        "An account can generate a game hash"
      );
    });

    it("Only the owner can add a game", async () => {
      gameHash = await contract.generateGameHash.call(teamA, teamB, date, token.address, {from: accountOwner});
      await contract.addGame(teamA, teamB, date, token.address, {from: accountOwner});
    });

    it("Should start open for bets", async () => {
      assert.isOk(await contract.isOpen.call(gameHash, {from: accountOwner}), "The contract should start open");
      assert.isOk(await contract.isOpen.call(gameHash, {from: account1}), "The contract should start open");
    });

    it("Should start with balance equals 0", async () => {
      await assertBalance(contract.address, 0, "The contract should start with balance equals 0");
    });

    it("Can't receive bets from contract owner", async () => {
      await tryCatchRevert(contract.addBet(gameHash, 0, parseTokenQuantity(1), {from: accountOwner}), "Owner can't call this function");
    });

    it("Can receive bets from other accounts", async () => {
      await contract.addBet(gameHash, 0, parseTokenQuantity(1), {from: account1});
      await contract.addBet(gameHash, 0, parseTokenQuantity(2), {from: account1});
      await contract.addBet(gameHash, 1, parseTokenQuantity(2), {from: account2});
      await contract.addBet(gameHash, 2, parseTokenQuantity(9), {from: account3});
      await contract.addBet(gameHash, 0, parseTokenQuantity(6), {from: account4});
      await contract.addBet(gameHash, 0, parseTokenQuantity(1), {from: account5});

      await assertBalance(account1, 97, "Account 1 balance is wrong");
      await assertBalance(account2, 98, "Account 2 balance is wrong");
      await assertBalance(account3, 91, "Account 3 balance is wrong");
      await assertBalance(account4, 94, "Account 4 balance is wrong");
      await assertBalance(account5, 99, "Account 5 balance is wrong");
      await assertBalance(contract.address, 21, "Contract's balance is wrong");

      account1BalanceAfterBet = await balanceOf(account1);
      account2BalanceAfterBet = await balanceOf(account2);
      account3BalanceAfterBet = await balanceOf(account3);
      account4BalanceAfterBet = await balanceOf(account4);
      account5BalanceAfterBet = await balanceOf(account5);
    });

    it("Should thrown an error when pass invalid bet option", async () => {
      await tryCatchRevert(contract.addBet(gameHash, 3, parseTokenQuantity(1), {from: account6}), "Invalid bet option");
    });

    it("Should thrown an error when a normal account try to close bets", async () => {
      await tryCatchRevert(contract.closeBets(gameHash, {from: account6}), "Only owner can call this function");
    });

    it("Anyone can detail a game", async () => {
      assert.deepEqual(
        await contract.getGame.call(gameHash, {from: accountOwner}),
        await contract.getGame.call(gameHash, {from: account1})
      );
      const game = await contract.getGame.call(gameHash);
      assert.equal(game[0], teamA);
      assert.equal(game[1], teamB);
      assert.equal(game[2], date);
      assert.equal(game[3], token.address);
    });

    it("The owner should close bets", async () => {
      await contract.closeBets(gameHash, {from: accountOwner});
      assert.isNotOk(await contract.isOpen.call(gameHash, {from: accountOwner}), "The contract should be closed");
    });

    it("Should thrown an error when an account try to bet when the contract is closed", async () => {
      await tryCatchRevert(contract.addBet(gameHash, 1, parseTokenQuantity(1), {from: account6}), "The contract isn't open to bets");
    });

    it("Should thrown an error when a normal account try to finish the contract", async () => {
      await tryCatchRevert(contract.setResult(gameHash, 1, {from: account6}), "Only owner can call this function");
    });

    it("The result can be displayed only when the match is finished", async () => {
      await tryCatchRevert(contract.getResult(gameHash, {from: account6}), "The contract isn't finished");
    });

    it("The owner should finish bets", async () => {
      const result = 0;
      await contract.setResult(gameHash, result, {from: accountOwner});
      assert.equal(await contract.getResult.call(gameHash), result, "The result is wrong");
    });

    it("The balance of the contract should be 0 after finish", async () => {
      await assertBalance(contract.address, 0, "The contract balance should finish with balance equals 0");
    });

    it("Distributes the jackpot to the winners", async () => {
      // contract balance = 21
      // jackpot = 20.37 (97% of 21)
      const expected1 = parseInt(account1BalanceAfterBet) + parseTokenQuantityToInt(6.111);// 30% of 20.37
      const expected4 = parseInt(account4BalanceAfterBet) + parseTokenQuantityToInt(12.222);// 60% of 20.37
      const expected5 = parseInt(account5BalanceAfterBet) + parseTokenQuantityToInt(2.037);// 10% of 20.37
      assert.equal(await balanceOf(account1), expected1.toString(), "The account1 balance is wrong");
      assert.equal(await balanceOf(account4), expected4.toString(), "The account4 balance is wrong");
      assert.equal(await balanceOf(account5), expected5.toString(), "The account5 balance is wrong");
    });

    it("Not distributes the jackpot to the losers", async () => {
      assert.equal(await balanceOf(account2), account2BalanceAfterBet, "The account2 balance is wrong");
      assert.equal(await balanceOf(account3), account3BalanceAfterBet, "The account3 balance is wrong");
    });

    it("The result can be displayed when the match is finished", async () => {
      const expected = 0;
      const returned = await contract.getResult.call(gameHash, {from: account1});
      assert.equal(expected, returned, "The contract should display the result")
    });

    it("Should thrown an error when an account try to bet when the contract is finished", async () => {
      await tryCatchRevert(contract.addBet(gameHash, 1, parseTokenQuantity(1), {from: account6}), "The contract isn't open to bets");
    });
  });
});
