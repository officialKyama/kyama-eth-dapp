const Base = artifacts.require("Base");
const MCore = artifacts.require("MCore");
const MBill = artifacts.require("MBill");
const Auction = artifacts.require("Auction");
const MPayment = artifacts.require("MPayment");
const MGenerous = artifacts.require("MGenerous");
const truffleAssert = require("truffle-assertions");

contract("MPayment", (accs) => {
    let owner = null;
    let accounts = null;
    let baseAddress = null;
    let mBillAddress = null;
    let baseInstance = null;
    let MCoreInstance = null;
    let mBillInstance = null; 
    let auctionInstance = null;
    let mPaymentInstance = null;
    let mGenerousInstance = null;

    beforeEach(async () => {
        accounts = accs;
        owner = accounts[0];
        MCoreInstance = await MCore.deployed();
        auctionInstance = await Auction.deployed();
        mPaymentInstance = await MPayment.deployed();
        mGenerousInstance = await MGenerous.deployed();
        baseAddress = await mPaymentInstance.base();
        mBillAddress = await mPaymentInstance.mBill();
        baseInstance = await Base.at(baseAddress);
        mBillInstance = await MBill.at(mBillAddress);
        baseInstance.approveAddress(mPaymentInstance.address, {from: owner});
        mBillInstance.approveAddress(mPaymentInstance.address, {from: owner});
    });

    it("Ensures that contracts are operational before a debenture is repayed", async () => {
        await auctionInstance.setCFO(accounts[1], {from: owner});
        await auctionInstance.openAuction({from: accounts[1]});
        await auctionInstance.issueBond({from: accounts[2], value: "50"});
        await mPaymentInstance.setCFO(accounts[1], {from: owner});
        await mPaymentInstance.pause({from: accounts[1]});
        truffleAssert.reverts(
            mPaymentInstance.payMDebenture({from: accounts[2], value: "20"}),
            "Contracts are currently paused."
        );
        await mPaymentInstance.resume({from: owner});
    });

    it("Ensures that user is registered before repaying a debenture", async () => {
        truffleAssert.reverts(
            mPaymentInstance.payMDebenture({from: accounts[3], value: "20"}),
            "Address provided for loan payment is not linked to a Kyama account."
        );
    });

    it("Ensures that loan repayment amount is greater than 0", async () => {
        truffleAssert.reverts(
            mPaymentInstance.payMDebenture({from: accounts[2], value: "0"}),
            "Loan payment amount provided is invalid."
        );
    });

    it("Ensures that the user has an outstanding debenture", async () => {
        truffleAssert.reverts(
            mPaymentInstance.payMDebenture({from: accounts[2], value: "20"}),
            "Account holder does not have any outstanding M-Bill loan balance."
        );
    });

    it("Ensures that a debenture can be repayed successfuly", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "200"});
        await mGenerousInstance.requestMDebenture("100", {from: accounts[2]});
        const accShareCap_init = await mBillInstance.balanceOf(accounts[2]);
        await mPaymentInstance.payMDebenture({from: accounts[2], value: "150"});
        const accShareCap_fin = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(accShareCap_fin.toNumber(), accShareCap_init.toNumber());
    });

    it("Ensures that multiple debentures can be repayed successfuly", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "400"});
        const accShareCap = await mBillInstance.balanceOf(accounts[2]);
        await mGenerousInstance.requestMDebenture("100", {from: accounts[2]});
        const accShareCap_1 = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(accShareCap.toNumber(), accShareCap_1.toNumber());
        await mGenerousInstance.requestMDebenture("200", {from: accounts[2]});
        const accShareCap_2 = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(accShareCap_1.toNumber(), accShareCap_2.toNumber());
        await mPaymentInstance.payMDebenture({from: accounts[2], value: "350"});
        const accShareCap_3 = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(accShareCap_3.toNumber(), accShareCap_1.toNumber());
    });
});