const Base = artifacts.require("Base");
const MCore = artifacts.require("MCore");
const MBill = artifacts.require("MBill");
const Auction = artifacts.require("Auction");
const truffleAssert = require("truffle-assertions");

// Account [9] is used as a fund account. DO NOT use as administrator! DO NOT use as user account!
// Other accounts[] addresses may be used as administrators and user accounts responsibly. 

contract("MCore", (accs) => {
    let owner = null;
    let accounts = null;
    let baseAddress = null;
    let mBillAddress = null;
    let baseInstance = null;
    let MCoreInstance = null;
    let mBillInstance = null; 
    let auctionInstance = null;

    beforeEach(async () => {
        accounts = accs;
        owner = accounts[0];
        MCoreInstance = await MCore.deployed();
        auctionInstance = await Auction.deployed();
        baseAddress = await MCoreInstance.base();
        mBillAddress = await MCoreInstance.mBill();
        baseInstance = await Base.at(baseAddress);
        mBillInstance = await MBill.at(mBillAddress);
        baseInstance.approveAddress(MCoreInstance.address, {from: owner});
        mBillInstance.approveAddress(MCoreInstance.address, {from: owner});
    });

    async function createAccount() {
        const new_account = await web3.eth.personal.newAccount('test-password');
        await web3.eth.personal.unlockAccount(new_account, 'test-password', 500);
        await web3.eth.sendTransaction({from: accounts[9], to: new_account, value: web3.utils.toWei("0.2", "ether")});

        return new_account;
    }

    it("Ensures that contracts are operational to make a deposit", async () => {
        await auctionInstance.setCFO(accounts[1], {from: owner});
        await auctionInstance.openAuction({from: accounts[1]});
        await auctionInstance.issueBond({from: accounts[2], value: "50"});
        await MCoreInstance.setCFO(accounts[1], {from: owner});
        await MCoreInstance.pause({from: accounts[1]});
        await truffleAssert.reverts(
            MCoreInstance.deposit({from: accounts[2], value: "50"}),
            "Contracts are currently paused."
        );
        await MCoreInstance.resume({from: owner});
    });

    it("Ensures that a value must be sent to the deposit function", async () => {
        await truffleAssert.fails(
            MCoreInstance.deposit({from: accounts[2]})
        );
    });

    it("Ensures that a user must be registered to make a deposit", async () => {
        await truffleAssert.reverts(
            MCoreInstance.deposit({from: accounts[3], value: "50"}),
            "Address provided for deposit is not linked to a Kyama account."
        );
    });

    it("Ensures that the deposit amount is greater than the current pps", async () => {
        const currentPPs = await baseInstance.currentMPPS();
        const less_pps = currentPPs.toNumber() - 1;
        await truffleAssert.reverts(
            MCoreInstance.deposit({from: accounts[2], value: less_pps.toString()}),
            "Ether amount is too low for this transaction."
        );
    });

    it("Ensures that the deposit amount is correctly transferred to the MBill contract", async () => {
        const init_MBill_val = await web3.eth.getBalance(mBillAddress);
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const fin_MBill_val = await web3.eth.getBalance(mBillAddress);
        assert.isAbove(parseInt(fin_MBill_val), parseInt(init_MBill_val));
        assert.equal(50, parseInt(fin_MBill_val) - parseInt(init_MBill_val))
    });

    it("Ensures that the total capital is incremented by the deposit amount", async () => {
        const init_total_cap = await baseInstance.totalCapital();
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const fin_total_cap = await baseInstance.totalCapital();
        assert.isAbove(parseInt(fin_total_cap), parseInt(init_total_cap));
        assert.equal(50, parseInt(fin_total_cap) - parseInt(init_total_cap))
    });

    it("Ensures that the totalMIssued is incremented by the deposit amount", async () => {
        const init_total_M = await baseInstance.totalMIssued();
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const fin_total_M = await baseInstance.totalMIssued();
        assert.isAbove(parseInt(fin_total_M), parseInt(init_total_M));
        assert.equal(50, parseInt(fin_total_M) - parseInt(init_total_M))
    });

    it("Ensures that the total share capital is incremented by the equivalent deposit amount", async () => {
        const init_total_sharecap = await baseInstance.totalMShareCapital();
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const fin_total_sharecap = await baseInstance.totalMShareCapital();
        assert.isAbove(parseInt(fin_total_sharecap), parseInt(init_total_sharecap));
    });

    it("Ensures that multiple deposits trigger an increase in current pps", async () => {
        const currentPPs = await baseInstance.currentMPPS();
        for(let i = 0; i < currentPPs.toNumber() + 1; i++) {
            const newAccount = await createAccount();
            await auctionInstance.issueBond({from: newAccount, value: "50"});
            await MCoreInstance.deposit({from: newAccount, value: "50"});
        }
        const fin_currentPPs = await baseInstance.currentMPPS();
        assert.isAbove(fin_currentPPs.toNumber(), currentPPs.toNumber());
    });

    it("Ensures that share capital equivalent MBills are minted to the user on deposit", async () => {
        const init_shareCap = await mBillInstance.balanceOf(accounts[2]);
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const fin_shareCap = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(fin_shareCap.toNumber(), init_shareCap.toNumber());
    });

    it("Ensures that contracts must be operational for a user to withdraw", async () => {
        const ceoAddress = await MCoreInstance.ceoAddress();
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        await MCoreInstance.pause({from: ceoAddress});
        await truffleAssert.reverts(
            MCoreInstance.withdraw("25", {from: accounts[2]}),
            "Contracts are currently paused."
        );
        await MCoreInstance.resume({from: ceoAddress});
    });

    it("Ensures that a user must be registered to make a withdrawal request", async () => {
        await truffleAssert.reverts(
            MCoreInstance.withdraw("50", {from: accounts[3]}),
            "Address provided for withdrawal is not linked to a Kyama account."
        );  
    });

    it("Ensures that withdrawal amount must be greater than 0", async () => {
        await truffleAssert.reverts(
            MCoreInstance.withdraw("0", {from: accounts[2]}),
            "Withdrawal amount provided is invalid."
        );
    });
    
    it("Ensures that the maximum withdrawable amount is less than or equal to the total account value", async () => {
        const accShareCap = await mBillInstance.balanceOf(accounts[2]);
        const maxWithdrawable = await baseInstance.getTotalMWithdrawable(accShareCap);
        const totalAccVal = await baseInstance.getTotalMVal(accShareCap);
        assert.isAtLeast(totalAccVal.toNumber(), maxWithdrawable.toNumber());
    });

    it("Ensures that the withdrawal amount is less than or equal to the max withdrawal amount", async () => {
        const accShareCap = await mBillInstance.balanceOf(accounts[2]);
        const maxWithdrawable = await baseInstance.getTotalMWithdrawable(accShareCap);
        truffleAssert.reverts(
            MCoreInstance.withdraw((maxWithdrawable.toNumber() + 1).toString(), {from: accounts[2]}),
            "Withdrawal amount provided is above account withdrawal quota."
        );
    });

    it("Ensures that the withdrawal amount is greater than the current pps", async () => {
        const currentPPS = await baseInstance.currentMPPS();
        truffleAssert.reverts(
            MCoreInstance.withdraw((currentPPS.toNumber() - 1).toString(), {from: accounts[2]}),
            "Withdrawal amount provided is below account withdrawal quota."
        );
    });
   
    it("Ensures that withdrawal share capital is correctly burnt from user's account", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const initShareCap = await mBillInstance.balanceOf(accounts[2]);
        await MCoreInstance.withdraw("26", {from: accounts[2]});
        const finShareCap = await mBillInstance.balanceOf(accounts[2]);
        assert.isAbove(initShareCap.toNumber(), finShareCap.toNumber());
    });

    it("Ensures that total capital is decremented by value of the withdrawal amount", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const initTotalCap = await baseInstance.totalCapital();
        await MCoreInstance.withdraw("26", {from: accounts[2]});
        const finTotalCap = await baseInstance.totalCapital();
        assert.isAbove(initTotalCap.toNumber(), finTotalCap.toNumber());
        assert.equal(26, initTotalCap.toNumber() - finTotalCap.toNumber())
    });

    it("Ensures that totalMIssued is decremented by value of the withdrawal amount", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const initTotalMIssued = await baseInstance.totalMIssued();
        await MCoreInstance.withdraw("26", {from: accounts[2]});
        const finTotalMIssued = await baseInstance.totalMIssued();
        assert.isAbove(initTotalMIssued.toNumber(), finTotalMIssued.toNumber());
        assert.equal(26, initTotalMIssued.toNumber() - finTotalMIssued.toNumber())
    });

    it("Ensures that total share capital is decremented on withdrawal", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: "50"});
        const initTotalShareCap = await baseInstance.totalMShareCapital();
        await MCoreInstance.withdraw("26", {from: accounts[2]});
        const finTotalShareCap = await baseInstance.totalMShareCapital();
        assert.isAbove(initTotalShareCap.toNumber(), finTotalShareCap.toNumber());
    });

    it("Ensures that withdrawal amount is successfuly issued to the user", async () => {
        await MCoreInstance.deposit({from: accounts[2], value: await web3.utils.toWei("0.7", "ether")});
        const initAccVal = await web3.utils.fromWei(await web3.eth.getBalance(accounts[2]), "ether");
        await MCoreInstance.withdraw(await web3.utils.toWei("0.5", "ether"), {from: accounts[2]});
        const finAccVal = await web3.utils.fromWei(await web3.eth.getBalance(accounts[2]), "ether");
        assert.isAbove(parseFloat(finAccVal), parseFloat(initAccVal));
    });
});