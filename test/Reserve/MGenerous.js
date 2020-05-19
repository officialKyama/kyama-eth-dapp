const Base = artifacts.require("Base");
const MCore = artifacts.require("MCore");
const MBill = artifacts.require("MBill");
const Auction = artifacts.require("Auction");
const MGenerous = artifacts.require("MGenerous");
const truffleAssert = require("truffle-assertions");

contract("MGenerous", accs => {
    let owner = null;
    let accounts = null;
    let baseAddress = null;
    let mBillAddress = null;
    let baseInstance = null;
    let MCoreInstance = null;
    let mBillInstance = null; 
    let auctionInstance = null;
    let mGenerousInstance = null;

    beforeEach(async () => {
        accounts = accs;
        owner = accounts[0];
        MCoreInstance = await MCore.deployed();
        auctionInstance = await Auction.deployed();
        mGenerousInstance = await MGenerous.deployed();
        baseAddress = await mGenerousInstance.base();
        mBillAddress = await mGenerousInstance.mBill();
        baseInstance = await Base.at(baseAddress);
        mBillInstance = await MBill.at(mBillAddress);
        baseInstance.approveAddress(mGenerousInstance.address, {from: owner});
        mBillInstance.approveAddress(mGenerousInstance.address, {from: owner});
    });

    it("Ensures that contracts are operational for a successful transfer", async () => {
        await auctionInstance.setCFO(accounts[1], {from: owner});
        await auctionInstance.openAuction({from: accounts[1]});
        await auctionInstance.issueBond({from: accounts[2], value: "50"});
        await auctionInstance.issueBond({from: accounts[3], value: "50"});
        await mGenerousInstance.setCFO(accounts[1], {from: owner});
        await mGenerousInstance.pause({from: accounts[1]});
        await truffleAssert.reverts(
            mGenerousInstance.transferMBill(accounts[3], "20", {from: accounts[2]}),
            "Contracts are currently paused."
        );
        await mGenerousInstance.resume({from: owner});
    });

    it("Ensures that the user is registered on Kyama to transfer MBill(s)", async () => {
        await truffleAssert.reverts(
            mGenerousInstance.transferMBill(accounts[2], "50", {from: accounts[4]}),
            "Address provided for M-Bill transfer is not linked to a Kyama account."
        );
    });
    
    it("Ensures that the recipient is registered on Kyama to receive MBill(s)", async () => {
        await truffleAssert.reverts(
            mGenerousInstance.transferMBill(accounts[4], "10", {from: accounts[2]}),
            "Recipient address provided for M-Bill transfer has no linked account."
        );
    });

    it("Ensures that transfer amount is greater than 0", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        await truffleAssert.reverts(
            mGenerousInstance.transferMBill(accounts[3], "0", {from: accounts[2]}),
            "M-Bill transfer amount provided is invalid."
        );
    });
    
    it("Ensures that the transfer amount is equal to or less than total account value", async () => {
        const accShareCap = await mBillInstance.balanceOf(accounts[2]);
        const totalAccVal = await baseInstance.getTotalMVal(accShareCap);
        const sendAmount = totalAccVal.toNumber() + 1;
        await truffleAssert.reverts(
            mGenerousInstance.transferMBill(accounts[3], sendAmount.toString(), {from: accounts[2]}),
            "You do not have sufficient M-Bills to process this transfer."
        );
    });

    it("Ensures that MBill(s) are successfuly transfered from sender to receiver", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const accShareCap_sender = await mBillInstance.balanceOf(accounts[2]);
        const totalAccVal_sender = await baseInstance.getTotalMVal(accShareCap_sender);
        const accShareCap_receiver = await mBillInstance.balanceOf(accounts[3]);
        const totalAccVal_receiver = await baseInstance.getTotalMVal(accShareCap_receiver);
        await mGenerousInstance.transferMBill(accounts[3], "30", {from: accounts[2]});
        const accShareCap_sender_fin = await mBillInstance.balanceOf(accounts[2]);
        const totalAccVal_sender_fin = await baseInstance.getTotalMVal(accShareCap_sender_fin);
        const accShareCap_receiver_fin = await mBillInstance.balanceOf(accounts[3]);
        const totalAccVal_receiver_fin = await baseInstance.getTotalMVal(accShareCap_receiver_fin);
        assert.isAbove(totalAccVal_receiver_fin.toNumber(), totalAccVal_receiver.toNumber());
        assert.isAbove(totalAccVal_sender.toNumber(), totalAccVal_sender_fin.toNumber());
    });

    it("Ensures that contracts are operational for a debenture to be requested", async () => {
        await mGenerousInstance.pause({from: accounts[1]});
        await truffleAssert.reverts(
            mGenerousInstance.requestMDebenture("20", {from: accounts[2]}),
            "Contracts are currently paused."
        );
        await mGenerousInstance.resume({from: owner});
    });

    it("Ensures that a user is registered to request for a debenture", async () => {
        await truffleAssert.reverts(
            mGenerousInstance.requestMDebenture("20", {from: accounts[4]}),
            "Address provided for loan request is not linked to a Kyama account."
        );
    });

    it("Ensures that debenture request amount is greater than 0", async () => {
        await truffleAssert.reverts(
            mGenerousInstance.requestMDebenture("0", {from: accounts[2]}),
            "Loan request amount provided is invalid."
        );
    });

    it("Ensures that a user account is harmonized before requesting a debenture", async () => {
        await auctionInstance.issueBond({from: accounts[4], value: "50"});
        await truffleAssert.reverts(
            mGenerousInstance.requestMDebenture("20", {from: accounts[4]}),
            "Account is yet to meet investment consensus."
        );
    });

    it("Ensures that debenture request amount is less than or equal to max debenture amount", async () => {
        const accShareCap = await mBillInstance.balanceOf(accounts[2]);
        const maxDebenture = await baseInstance.getTotalDebenture(accShareCap);
        const requestAmount = maxDebenture.toNumber() + 1;
        truffleAssert.reverts(
            mGenerousInstance.requestMDebenture(requestAmount.toString(), {from: accounts[2]}),
            "Loan amount provided is above account loan quota."
        );
    });

    it("Ensures that debenture request amount is greater than the current pps", async () => {
        const currentPPs = await baseInstance.currentMPPS();
        const requestAmount = currentPPs.toNumber() - 1;
        await truffleAssert.reverts(
            mGenerousInstance.requestMDebenture(requestAmount.toString(), {from: accounts[2]}),
            "Loan amount provided is below account loan quota."
        );
    });

    it("Ensures that MBill(s) are burnt on successful debenture request", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const accShareCap_init = await mBillInstance.balanceOf(accounts[2]);
        await mGenerousInstance.requestMDebenture("30", {from: accounts[2]});
        const accShareCap_fin = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(accShareCap_init.toNumber(), accShareCap_fin.toNumber());
    });

    it("Ensures that total capital is correctly decremented on debenture request", async () => {
        const totalCap_init = await baseInstance.totalCapital();
        await mGenerousInstance.requestMDebenture("23", {from: accounts[2]});
        const totalCap_fin = await baseInstance.totalCapital();
        assert.isAbove(totalCap_init.toNumber(), totalCap_fin.toNumber());
    });

    it("Ensures that totalMIssued is correctly decremented on debenture request", async () => {
        const totalMIssued_init = await baseInstance.totalMIssued();
        await mGenerousInstance.requestMDebenture("25", {from: accounts[2]});
        const totalMIssued_fin = await baseInstance.totalMIssued();
        assert.isAbove(totalMIssued_init.toNumber(), totalMIssued_fin.toNumber());
    });

    it("Ensures that total share capital is correctly decremented on debenture request", async () => {
        const totalShareCap_init = await baseInstance.totalMShareCapital();
        await mGenerousInstance.requestMDebenture("25", {from: accounts[2]});
        const totalShareCap_fin = await baseInstance.totalMShareCapital();
        assert.isAbove(totalShareCap_init.toNumber(), totalShareCap_fin.toNumber());
    });

    it("Ensures that debenture amount is issues to user successfuly", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: await web3.utils.toWei("0.7", "ether")});
        const userInitBal = await web3.eth.getBalance(accounts[2]);
        await mGenerousInstance.requestMDebenture(await web3.utils.toWei("0.4", "ether"), {from: accounts[2]});
        const userFinBal = await web3.eth.getBalance(accounts[2]);
        assert.isAbove(parseInt(userFinBal), parseInt(userInitBal));
    });

    it("Ensures that outstanding debentures are below maximum", async () => {
        await auctionInstance.issueBond({from: accounts[6], value: "50"});
        await MCoreInstance.deposit({from: accounts[6], value: "50"});
        const maxDebentures = await baseInstance.maxMDebentures();
        assert.equal(10, maxDebentures.toNumber());
        const currentDebentures = await baseInstance.outstandingMDebentures(accounts[6]);
        for(let i = 0; i < maxDebentures.toNumber() - currentDebentures.toNumber(); i++) {
            await MCoreInstance.deposit({from: accounts[6], value: "50"});
            await mGenerousInstance.requestMDebenture("30", {from: accounts[6]});
        }
        await MCoreInstance.deposit({from: accounts[6], value: "50"});
        await truffleAssert.reverts(
            mGenerousInstance.requestMDebenture("30", {from: accounts[6]}),
            "Account has too many outstanding loans at the moment."
        );
    });
});