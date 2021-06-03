var SoccerBetting = artifacts.require("SoccerBetting");

module.exports = function(deployer) {
  deployer.deploy(SoccerBetting, 'FLA', 'FLU', '2021-10-30');
};
