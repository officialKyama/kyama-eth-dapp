const Base = artifacts.require("Kyama Base/Base");
const MCore = artifacts.require("Kyama Reserve/MCore");
const MBill = artifacts.require("Kyama Treasury/MBill");
const Auction = artifacts.require("Kyama Treasury/Auction");
const MPayment = artifacts.require("Kyama Reserve/MPayment");
const Accounts = artifacts.require("Kyama Treasury/Accounts");
const MGenerous = artifacts.require("Kyama Reserve/MGenerous");
const AccessControl = artifacts.require("Kyama Access Control/AccessControl");

module.exports = function(deployer) {
    // Access Control
    deployer.deploy(AccessControl);

    // MCore
    deployer.deploy(MCore, Base.address, MBill.address)
        .then(() => {
            Base.deployed().then(bI => {
                return bI.approveAddress(MCore.address);
            });
        })
        .then(() => {
            MBill.deployed().then(mI => {
                return mI.approveAddress(MCore.address);
            });
        });

    // Accounts
    deployer.deploy(Accounts, Base.address, MBill.address)
        .then(() => {
            Base.deployed().then(bI => {
                return bI.approveAddress(Accounts.address);
            });
        })
        .then(() => {
            MBill.deployed().then(mI => {
                return mI.approveAddress(Accounts.address);
            });
        });
    
    // MGenerous
    deployer.deploy(MGenerous, Base.address, MBill.address)
        .then(() => {
            Base.deployed().then(bI => {
                return bI.approveAddress(MGenerous.address);
            });
        })
        .then(() => {
            MBill.deployed().then(mI => {
                return mI.approveAddress(MGenerous.address);
            });
        });
    
    // MPayment
    deployer.deploy(MPayment, Base.address, MBill.address)
        .then(() => {
            Base.deployed().then(bI => {
                return bI.approveAddress(MPayment.address);
            });
        })
        .then(() => {
            MBill.deployed().then(mI => {
                return mI.approveAddress(MPayment.address);
            });
        });
    
    // Auction
    deployer.deploy(Auction, Base.address, MBill.address)
        .then(() => {
            Base.deployed().then(bI => {
                return bI.approveAddress(Auction.address);
            });
        })
        .then(() => {
            MBill.deployed().then(mI => {
                return mI.approveAddress(Auction.address);
            });
        });
};