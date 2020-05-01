const truffleAssert = require("truffle-assertions");
const AccessControl = artifacts.require("AccessControl");

// Accounts [8] and [9] are being used as random addresses. DO NOT use as administrators!

contract("Access Control", accs => {
    let owner = null;
    let accounts = null;
    let address_0 = null;
    let accessControlInstance = null;

    beforeEach(async () => {
        accounts = accs;
        owner = accounts[0];
        address_0 = "0x0000000000000000000000000000000000000000";
        accessControlInstance = await AccessControl.deployed();
    });

    it("Ensures that deploying address is set as CEO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        assert.equal(owner, ceoAddress);
    });

    it("Ensures that the operational status is initialized to true", async () => {
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, true);
    });

    it("Ensures that (0) address cannot be set as CEO", async () => {
        await truffleAssert.reverts(
            accessControlInstance.setCEO(address_0, {from: owner}),
            "New CEO address provided must be valid."
        );
    });

    it("Ensures that unique address can be set as CEO by current CEO", async () => {
        await accessControlInstance.setCEO(accounts[1], {from: owner});
        const ceoAddress = await accessControlInstance.ceoAddress();
        assert.equal(accounts[1], ceoAddress);
    });

    it("Ensures that (0) address cannot be set as CFO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(address_0, {from: ceoAddress}),
            "New CFO address provided must be valid."
        );
    });

    it("Ensures that unique address can be set as CFO by current CEO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.setCFO(accounts[2], {from: ceoAddress});
        const cfoAddress = await accessControlInstance.cfoAddress();
        assert.equal(accounts[2], cfoAddress);
    });

    it("Ensures that the CFO cannot set a new CEO address", async () => {
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCEO(accounts[9], {from: cfoAddress}),
            "Address must be that of the CEO."
        );
    });

    it("Ensures that a random address cannot set a new CEO address", async () => {
        await truffleAssert.reverts(
            accessControlInstance.setCEO(accounts[9], {from: accounts[8]}),
            "Address must be that of the CEO."
        );
    });

    it("Ensures that the current CEO address cannot be set as CFO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(ceoAddress, {from: ceoAddress}),
            "New CFO address must not be a current administrator."
        );
    });

    it("Ensures that the current CFO address cannot be set as CFO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(cfoAddress, {from: ceoAddress}),
            "New CFO address must not be a current administrator."
        );
    });

    it("Ensures that the CFO cannot set a new CFO address", async () => {
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(accounts[9], {from: cfoAddress}),
            "Address must be that of the CEO."
        );
    });

    it("Ensures that a random address cannot set a new CFO address", async () => {
        await truffleAssert.reverts(
            accessControlInstance.setCFO(accounts[9], {from: accounts[8]}),
            "Address must be that of the CEO."
        );
    });

    it("Ensures that current CFO address cannot be set as CEO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCEO(cfoAddress, {from: ceoAddress}),
            "New CEO address must not be a current administrator."
        );
    });

    it("Ensures that current CEO address cannot be set as CEO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCEO(ceoAddress, {from: ceoAddress}),
            "New CEO address must not be a current administrator."
        );
    });

    it("Ensures that contracts must be operational for contracts to be paused", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        await truffleAssert.reverts(
            accessControlInstance.pause({from: ceoAddress}),
            "Contracts are currently paused."
        );
        await accessControlInstance.resume({from: ceoAddress}); 
    });

    it("Ensures that the CEO can pause contracts", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, false);
        await accessControlInstance.resume({from: ceoAddress});
    });

    it("Ensures that a random address cannot pause contracts", async () => {
        await truffleAssert.reverts(
            accessControlInstance.pause({from: accounts[9]}),
            "Address must be that of an administrator."
        );
    });

    it("Ensures that the CFO can pause contracts", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await accessControlInstance.pause({from: cfoAddress});
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, false);
        await accessControlInstance.resume({from: ceoAddress});
    });

    it("Ensures that the operational status changes to false on pause", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        let isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, true);
        await accessControlInstance.pause({from: ceoAddress});
        isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, false);
        await accessControlInstance.resume({from: ceoAddress});
    });

    it("Ensures that the CEO can resume contracts", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        await accessControlInstance.resume({from: ceoAddress});
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, true);
    });

    it("Ensures that the CFO cannot resume contracts", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        await truffleAssert.fails(
            accessControlInstance.resume({from: cfoAddress})
        )
        await accessControlInstance.resume({from: ceoAddress});
    });

    it("Ensures that contracts must not be operational for contracts to resume", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.resume({from: ceoAddress}),
            "Contracts are currently active."
        );
    });

    it("Ensures that random address cannot resume contracts", async () => {
        await truffleAssert.reverts(
            accessControlInstance.resume({from: accounts[9]}),
            "Address must be that of the CEO."
        );
    });

    it("Ensures that the operational status changes to true on resume", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        let isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, false);
        await accessControlInstance.resume({from: ceoAddress});
        isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, true);
    });
});