const MBill = artifacts.require("MBill");
const truffleAssert = require("truffle-assertions");

contract("MBill", accs => {
    let owner = null;
    let accounts = null;

    beforeEach(async () => {
        accounts = accs;
        owner = accounts[0];
        mBillInstance = await MBill.deployed();
    });

    it("Ensure underscore functions cannot be called by public", async () => {
        await truffleAssert.reverts(
            mBillInstance.mintM_Bill(accounts[2], "32", {from: accounts[2]}),
            "Token data access denied."
        );
    });
});