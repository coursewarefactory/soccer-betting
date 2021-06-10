var SoccerBetting = artifacts.require("SoccerBetting");
var TestToken = artifacts.require("TestToken");

module.exports = function(deployer) {
  deployer.deploy(SoccerBetting, 'FLA', 'FLU', '2021-10-30');
  deployer.deploy(TestToken);
};
