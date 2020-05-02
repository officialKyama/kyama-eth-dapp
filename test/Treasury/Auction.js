const Base = artifacts.require("Base");
const MBill = artifacts.require("MBill");
const Auction = artifacts.require("Auction");
const truffleAssert = require("truffle-assertions");

// Account [9] is used as a fund account. DO NOT use as administrator!
// To preserve accounts and due to potential numerous calls, use the *createAccount()* ...
// function to create a new account to test the contract *issueBond()* functionality.
// DO NOT use the accounts[] as new users in the *issueBond()* function.
 
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

    async function createAccount() {
        const new_account = await web3.eth.personal.newAccount('test-password');
        await web3.eth.personal.unlockAccount(new_account, 'test-password', 500);
        await web3.eth.sendTransaction({from: accounts[9], to: new_account, value: web3.utils.toWei("0.2", "ether")});

        return new_account;
    }

    it("Ensures that auctioning status is initialized to false", async () => {
        const isAuctioning = await auctionInstance.isAuctioning();
        assert.isFalse(isAuctioning);
    });

    it("Ensures that the CFO can open the auction", async () => {
        await auctionInstance.setCFO(accounts[1], {from: owner});
        await auctionInstance.openAuction({from: accounts[1]});
        const isAuctioning = await auctionInstance.isAuctioning();
        assert.isTrue(isAuctioning);
        await auctionInstance.closeAuction({from: accounts[1]});
    });

    it("Ensures that the auction can only be opened when contracts are operational", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        const ceoAddress = await auctionInstance.ceoAddress();
        await auctionInstance.pause({from: cfoAddress});
        await truffleAssert.reverts(
            auctionInstance.openAuction({from: cfoAddress}),
            "Contracts are currently paused."
        );
        await auctionInstance.resume({from: ceoAddress});
    });

    it("Ensures that the CFO can close the auction", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await auctionInstance.closeAuction({from: cfoAddress});
        const isAuctioning = await auctionInstance.isAuctioning();
        assert.isFalse(isAuctioning);
    });

    it("Ensures that the CEO cannot open the auction", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const ceoAddress = await auctionInstance.ceoAddress();
        await truffleAssert.reverts(
            auctionInstance.openAuction({from: ceoAddress}),
            "Address must be that of the CFO."
        );
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that a random address cannot open the auction", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const random_address = await createAccount();
        await truffleAssert.reverts(
            auctionInstance.openAuction({from: random_address}),
            "Address must be that of the CFO."
        );
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that the auction is closed before opening it", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await truffleAssert.reverts(
            auctionInstance.openAuction({from: cfoAddress}),
            "Auction currently open."
        );
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that the auctioning status changes to true on auction open", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        const isInitiallyAuctioning = await auctionInstance.isAuctioning();
        await auctionInstance.openAuction({from: cfoAddress});
        const isFinallyAuctioning = await auctionInstance.isAuctioning();
        assert.isFalse(isInitiallyAuctioning);
        assert.isTrue(isFinallyAuctioning);
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that auction can only be closed when contracts are operational", async () => {
        const ceoAddress = await auctionInstance.ceoAddress();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await auctionInstance.pause({from: cfoAddress});
        await truffleAssert.reverts(
            auctionInstance.closeAuction({from: cfoAddress}),
            "Contracts are currently paused."
        );
        await auctionInstance.resume({from: ceoAddress});
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that a random address cannot close the auction", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await truffleAssert.reverts(
            auctionInstance.closeAuction({from: new_account}),
            "Address must be that of the CFO."
        );
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that the auction is open before closing it", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        truffleAssert.reverts(
            auctionInstance.closeAuction({from: cfoAddress}),
            "Auction currently closed."
        );
    });

    it("Ensures that the auctioning status changes to false on auction close", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const isInitiallyAuctioning = await auctionInstance.isAuctioning();
        await auctionInstance.closeAuction({from: cfoAddress});
        const isFinallyAuctioning = await auctionInstance.isAuctioning();
        assert.isTrue(isInitiallyAuctioning);
        assert.isFalse(isFinallyAuctioning);
    });

    it("Ensures that the CEO cannot close the auction", async () => {
        const ceoAddress = await auctionInstance.ceoAddress();
        await truffleAssert.reverts(
            auctionInstance.closeAuction({from: ceoAddress}),
            "Address must be that of the CFO."
        );
    });

    it("Ensures that auctioning status is true before issuing a bond", async () => {
        const new_account = await createAccount();
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: new_account, value: '50'}),
            "Auction has to be opened."
        );
    });

    it("Ensures that contracts are operational before issuing a bond", async () => {
        const new_account = await createAccount();
        const ceoAddress = await auctionInstance.ceoAddress();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await auctionInstance.pause({from: cfoAddress});
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: new_account, value: '50'}),
            "Contracts are currently paused."
        );
        await auctionInstance.resume({from: ceoAddress});
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that a user is new to Kyama before issuing a bond", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await auctionInstance.issueBond({from: new_account, value: '50'});
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: new_account, value: '50'}),
            "User is already registered."
        );
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that amount invested is greater than investment pps", async () => {
        let val = await baseInstance.currentMPPS();
        val = val.toNumber() - 1;
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        await truffleAssert.reverts(
            auctionInstance.issueBond({from: new_account, value: val}),
            "Ether amount is too low for this transaction."
        );
        const pps = await baseInstance.currentMPPS();
        assert.isAbove(pps.toNumber(), val);
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that total capital is correctly incremented by the investment amount", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const initTotalVal = await baseInstance.totalCapital();
        const val = '50';
        await auctionInstance.issueBond({from: new_account, value: val});
        const finTotalVal = await baseInstance.totalCapital();
        assert.equal(parseInt(val), finTotalVal - initTotalVal);
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that initial user share capital is calculated correctly", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const pps = await baseInstance.currentMPPS();
        const val = '51';
        const bondTx = await auctionInstance.issueBond({from: new_account, value: val});
        const predShareCap = (parseInt(val) - (parseInt(val) % pps)) / pps;
        truffleAssert.eventEmitted(bondTx, 'MInvest', (ev) => {
            return ev._shareCapital == predShareCap;
        });
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that total MBill issued is incremented correctly by the investment amount", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const initTotalMBill = await baseInstance.totalMIssued();
        const val = '53';
        await auctionInstance.issueBond({from: new_account, value: val});
        const finTotalMBill = await baseInstance.totalMIssued();
        assert.equal(parseInt(val), finTotalMBill - initTotalMBill);
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that total share capial is incremented correctly by predicted user share capital", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const initTotalShareCap = await baseInstance.totalMShareCapital();
        const val = '50';
        const pps = await baseInstance.currentMPPS();
        const predShareCap = (parseInt(val) - (parseInt(val) % pps)) / pps;
        await auctionInstance.issueBond({from: new_account, value: val});
        const finTotalShareCap = await baseInstance.totalMShareCapital();
        assert.equal(predShareCap, finTotalShareCap - initTotalShareCap);
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that investment amount equivalent MBill(s) are minted for the user", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const val = '50';
        const pps = await baseInstance.currentMPPS();
        const predShareCap = (parseInt(val) - (parseInt(val) % pps)) / pps;
        await auctionInstance.issueBond({from: new_account, value: val});
        const userMBill = await mBillInstance.balanceOf(new_account);
        assert.equal(predShareCap, userMBill.toNumber());
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensures that amount invested is correctly transferred to the MBill contract", async () => {
        const new_account = await createAccount();
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const init_mBillBalance = await web3.eth.getBalance(mBillAddress);
        const val = '50';
        await auctionInstance.issueBond({from: new_account, value: val});
        const fin_mBillBalance = await web3.eth.getBalance(mBillAddress);
        assert.isAbove(parseInt(fin_mBillBalance), parseInt(init_mBillBalance));
        assert.equal(parseInt(val), fin_mBillBalance - init_mBillBalance);
        await auctionInstance.closeAuction({from: cfoAddress});
    });

    it("Ensure that multiple bond issues trigger an increase in investment pps", async () => {
        const cfoAddress = await auctionInstance.cfoAddress();
        await auctionInstance.openAuction({from: cfoAddress});
        const prev_pps = await baseInstance.currentMPPS();
        for(let i = 0; i < prev_pps.toNumber() + 1; i++) {
            const new_account = await createAccount();
            await auctionInstance.issueBond({from: new_account, value: web3.utils.toWei("0.00000001", "ether")});
        }
        const current_pps = await baseInstance.currentMPPS();
        assert.isAbove(current_pps.toNumber(), prev_pps.toNumber());
        await auctionInstance.closeAuction({from: cfoAddress});
    });
});