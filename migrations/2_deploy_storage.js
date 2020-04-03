const Base = artifacts.require("Kyama Base/Base");
const MBill = artifacts.require("Kyama Treasury/MBill");

module.exports = function(deployer) {
  deployer.deploy(Base);
  deployer.deploy(MBill);
};