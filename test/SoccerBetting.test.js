const SoccerBetting = artifacts.require("SoccerBetting");
const tryCatchRevert = require("./exceptions.js").tryCatchRevert;

contract("SoccerBetting", accounts => {  
  const ether = 1000000000000000000;
  const accountOwner = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];
  const account3 = accounts[3];
  const account4 = accounts[4];
  const account5 = accounts[5];
  const account6 = accounts[6];

  let contract;
  let account1BalanceAfterBet;
  let account2BalanceAfterBet;
  let account3BalanceAfterBet;
  let account4BalanceAfterBet;
  let account5BalanceAfterBet;

  before(async () => {
    contract = await SoccerBetting.deployed();
  });

  describe("Test the contract end to end", async () => {
    it("should start open", async () => {
      const returned = await contract.open();
      const expected = true;
      assert.equal(returned, expected, "The contract should start open");
    });

    it("should start with balance equals 0", async () => {
      const returned = await web3.eth.getBalance(contract.address);
      const expected = 0;
      assert.equal(returned, expected, "The contract should start with balance equals 0");
    });

    it("can't receive bets from contract's owner", async () => {
      await tryCatchRevert(contract.addBet(0, {value: 1 * ether, from: accountOwner}), "Owner can't call this function");
    });

    it("can receive bets from other accounts", async () => {
      await contract.addBet(0, {value: 1 * ether, from: account1});
      await contract.addBet(0, {value: 2 * ether, from: account1});
      await contract.addBet(1, {value: 2 * ether, from: account2});
      await contract.addBet(2, {value: 9 * ether, from: account3});
      await contract.addBet(0, {value: 6 * ether, from: account4});
      await contract.addBet(0, {value: 1 * ether, from: account5});

      account1BalanceAfterBet = await web3.eth.getBalance(account1);
      account2BalanceAfterBet = await web3.eth.getBalance(account2);
      account3BalanceAfterBet = await web3.eth.getBalance(account3);
      account4BalanceAfterBet = await web3.eth.getBalance(account4);
      account5BalanceAfterBet = await web3.eth.getBalance(account5);

      const betsTotal = 21;
      const returned = await web3.eth.getBalance(contract.address);
      const expected = betsTotal * ether;
      assert.equal(returned, expected, "Contract's balance is wrong");
    });

    it("should thrown an error when pass invalid bet option", async () => {
        await tryCatchRevert(contract.addBet(3, {value: 1 * ether, from: account6}), "Invalid bet option");
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
      await tryCatchRevert(contract.addBet(1, {value: 1 * ether, from: account6}), "The contract isn't open to bets");
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
      const returned = await web3.eth.getBalance(contract.address);
      const expected = 0;
      assert.equal(returned, expected, "The contract balance should finish with balance equals 0");
    });

    it("distributes the jackpot to the winners", async () => {
      // contract balance = 21
      // jackpot = 20.37 (97% of 21)
      const returned1 = await web3.eth.getBalance(account1);
      const returned4 = await web3.eth.getBalance(account4);
      const returned5 = await web3.eth.getBalance(account5);
      const expected1 = parseInt(account1BalanceAfterBet) + 6.111 * ether;// 30% of 20.37
      const expected4 = parseInt(account4BalanceAfterBet) + 12.222 * ether;// 60% of 20.37
      const expected5 = parseInt(account5BalanceAfterBet) + 2.037 * ether;// 10% of 20.37
      assert.equal(returned1, expected1, "The account 1 balance is wrong");
      assert.equal(returned4, expected4, "The account 4 balance is wrong");
      assert.equal(returned5, expected5, "The account 5 balance is wrong");
    });

    it("not distributes the jackpot to the losers", async () => {
      const account2Balance = await web3.eth.getBalance(account2);
      const account3Balance = await web3.eth.getBalance(account3);
      assert.equal(account2Balance, account2BalanceAfterBet, "The account 2 balance is wrong");
      assert.equal(account3Balance, account3BalanceAfterBet, "The account 3 balance is wrong");
    });

    it("the result can be displayed when the match is finished", async () => {
      const expected = 0;
      const returned = await contract.getResult({from: account1});
      assert.equal(expected, returned, "The contract should display the result")
    });

    it("should thrown an error when an account try to bet when the contract is finished", async () => {
      await tryCatchRevert(contract.addBet(1, {value: 1 * ether, from: account6}), "The contract isn't open to bets");
    });
  });
});
