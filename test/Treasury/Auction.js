const Base = artifacts.require("Base");
const MBill = artifacts.require("MBill");
const Auction = artifacts.require("Auction");
const truffleAssert = require("truffle-assertions");

contract("Auction", accs => {
    let owner = null;
    let accounts = null;
    let baseAddress = null;
    let mBillAddress = null;
    let baseInstance = null;
    let mBillInstance = null;
    let auctionInstance = null;

    beforeEach(async () => {
        accounts = accs;
        owner = accounts[0];
        auctionInstance = await Auction.deployed();
        baseAddress = await auctionInstance.base();
        mBillAddress = await auctionInstance.mBill();
        baseInstance = await Base.at(baseAddress);
        mBillInstance = await MBill.at(mBillAddress);
        baseInstance.approveAddress(auctionInstance.address, {from: owner});
        mBillInstance.approveAddress(auctionInstance.address, {from: owner});
    });

    it("Ensures that the auction is closed by default", async () => {
        const isAuctioning = await auctionInstance.isAuctioning();
        assert.isFalse(isAuctioning);
    });

    it("Successfully opens an auction when previously closed", async () => {
        await auctionInstance.setCFO(accounts[1], {from: owner});
        await auctionInstance.openAuction({from: accounts[1]});
        const isAuctioning = await auctionInstance.isAuctioning();
        assert.isTrue(isAuctioning);
    });

    it("Successfully closes the auction when previously open", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.closeAuction({from: cfoAddress});
        const isAuctioning = await auctionInstance.isAuctioning();
        assert.isFalse(isAuctioning);
    });

    it("Ensures that only the CFO can open the auction", async () => {
        const ceoAddress = await auctionInstance.ceoAddress();
        await truffleAssert.fails(
            auctionInstance.openAuction({from: ceoAddress})
        );
    });

    it("Ensures that only the CFO can close the auction", async () => {
        const ceoAddress = await auctionInstance.ceoAddress();
        await truffleAssert.fails(
            auctionInstance.closeAuction({from: ceoAddress})
        );
    });

    it("Ensures that bonds are issued only when auction is open", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: accounts[2], value: '50'}),
            'Auction has to be opened.'
        );
        await auctionInstance.openAuction({from: cfoAddress});
    });

    it("Ensures that bonds are issued only if the user is not registered", async () => {
        await auctionInstance.issueBond({from: accounts[2], value: '50'});
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: accounts[2], value: '50'}),
            'User is already registered.'
        );
    });

    it("Ensures that bonds are issued only if investment is greater than current ppS", async () => {
        const val = '9';
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: accounts[4], value: val}),
            'Ether amount is too low for this transaction.'
        );
        const pps = await baseInstance.currentMPPS();
        assert.isAbove(pps.toNumber(), parseInt(val));
    });

    it("Ensures that total capial is incremented correctly", async () => {
        const initTotalVal = await baseInstance.totalCapital();
        const val = '50';
        await auctionInstance.issueBond({from: accounts[5], value: val});
        const finTotalVal = await baseInstance.totalCapital();
        assert.equal(parseInt(val), finTotalVal - initTotalVal);
    });

    it("Ensures that share capital is calculated correctly", async () => {
        const pps = await baseInstance.currentMPPS();
        const val = '51';
        const bondTx = await auctionInstance.issueBond({from: accounts[6], value: val});
        const predShareCap = (parseInt(val) - (parseInt(val) % pps)) / pps;
        truffleAssert.eventEmitted(bondTx, 'MInvest', (ev) => {
            return ev._shareCapital == predShareCap;
        });
    });

    it("Ensures that total MBill issued is incremented correctly", async () => {
        const initTotalMBill = await baseInstance.totalMIssued();
        const val = '50';
        await auctionInstance.issueBond({from: accounts[7], value: val});
        const finTotalMBill = await baseInstance.totalMIssued();
        assert.equal(parseInt(val), finTotalMBill - initTotalMBill);
    });

    it("Ensures that total share capial is incremented correctly", async () => {
        const initTotalShareCap = await baseInstance.totalMShareCapital();
        const val = '50';
        const pps = await baseInstance.currentMPPS();
        const predShareCap = (parseInt(val) - (parseInt(val) % pps)) / pps;
        await auctionInstance.issueBond({from: accounts[8], value: val});
        const finTotalShareCap = await baseInstance.totalMShareCapital();
        assert.equal(predShareCap, finTotalShareCap - initTotalShareCap);
    });

    it("Ensures that user's MBill(s) are minted correctly", async () => {
        const val = '50';
        await auctionInstance.issueBond({from: accounts[9], value: val});
        const pps = await baseInstance.currentMPPS();
        const predShareCap = (parseInt(val) - (parseInt(val) % pps)) / pps;
        const userMBill = await mBillInstance.balanceOf(accounts[9]);
        assert.equal(predShareCap, userMBill.toNumber());
    });

    it("Ensures that funds sent to Auction contract are transferred to MBill contract", async () => {
        const init_mBillBalance = await web3.eth.getBalance(mBillAddress);
        await auctionInstance.issueBond({from: accounts[4], value: '50'});
        const fin_mBillBalance = await web3.eth.getBalance(mBillAddress);
        assert.isAbove(parseInt(fin_mBillBalance), parseInt(init_mBillBalance));
    });

    it("Increments currentMIndex counter", async () => {
        const prev_num_investors = await baseInstance.currentMIndex();
        const new_account = await web3.eth.personal.newAccount('test-password');
        await web3.eth.personal.unlockAccount(new_account, 'test-password', 500);
        await web3.eth.sendTransaction({from: accounts[3], to: new_account, value: web3.utils.toWei("0.2", "ether")});
        await auctionInstance.issueBond({from: new_account, value: web3.utils.toWei("0.001", "ether")});
        const current_num_investors = await baseInstance.currentMIndex();
        assert.equal(current_num_investors.toNumber(), prev_num_investors.toNumber() + 1);
    });

    it("Updates the currentMPPS successfully", async () => {
        const prev_pps = await baseInstance.currentMPPS();
        for(let i = 0; i < 12; i++) {
            const newAcc = await web3.eth.personal.newAccount('test-password');
            await web3.eth.personal.unlockAccount(newAcc, 'test-password', 500);
            await web3.eth.sendTransaction({from: accounts[9], to: newAcc, value: web3.utils.toWei("0.2", "ether")});
            await auctionInstance.issueBond({from: newAcc, value: web3.utils.toWei("0.001", "ether")});
        }
        const current_pps = await baseInstance.currentMPPS();
        assert.isAbove(current_pps.toNumber(), prev_pps.toNumber());
    });
});