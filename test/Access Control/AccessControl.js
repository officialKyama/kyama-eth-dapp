const truffleAssert = require("truffle-assertions");
const AccessControl = artifacts.require("AccessControl");

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

    it("Creates the CEO at deployment", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        assert.equal(owner, ceoAddress);
    });

    it("Ensures that (0) address cannot be deployed as CEO", async () => {
        await truffleAssert.reverts(
            accessControlInstance.setCEO(address_0, {from: owner}),
            "New CEO address provided must be valid."
        );
    });

    it("Is able to set a new CEO after deployment", async () => {
        await accessControlInstance.setCEO(accounts[1], {from: owner});
        const ceoAddress = await accessControlInstance.ceoAddress();
        assert.equal(accounts[1], ceoAddress);
    });

    it("Ensures that (0) address cannot be deployed as CFO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(address_0, {from: ceoAddress}),
            "New CFO address provided must be valid."
        );
    });

    it("Is able to set a new CFO after deployment", async () => {
        await accessControlInstance.setCFO(accounts[2], {from: accounts[1]});
        const cfoAddress = await accessControlInstance.cfoAddress();
        assert.equal(accounts[2], cfoAddress);
    });

    it("Ensures that CEO address cannot be reused as CFO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(ceoAddress, {from: ceoAddress}),
            "New CFO address must not be a current administrator."
        );
    });

    it("Ensures that CFO address must be different from current CFO address", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCFO(cfoAddress, {from: ceoAddress}),
            "New CFO address must not be a current administrator."
        );
    });

    it("Ensures that CFO address cannot be reused as CEO", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCEO(cfoAddress, {from: ceoAddress}),
            "New CEO address must not be a current administrator."
        );
    });

    it("Ensures that CEO address must be different from current CEO address", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await truffleAssert.reverts(
            accessControlInstance.setCEO(ceoAddress, {from: ceoAddress}),
            "New CEO address must not be a current administrator."
        );
    });

    it("Is capable of resuming application contracts (CEO)", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        await accessControlInstance.resume({from: ceoAddress});
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, true);
    });

    it("Ensures that CFO cannot resume application contracts", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        const cfoAddress = await accessControlInstance.cfoAddress();
        await truffleAssert.fails(
            accessControlInstance.resume({from: cfoAddress})
        )
        await accessControlInstance.resume({from: ceoAddress});
    });

    it("Is capable of pausing the application contracts (CEO)", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        await accessControlInstance.pause({from: ceoAddress});
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, false);
        await accessControlInstance.resume({from: ceoAddress});
    });

    it("Is capable of pausing the application contracts (CFO)", async () => {
        const ceoAddress = await accessControlInstance.ceoAddress();
        const cfoAddress = await accessControlInstance.cfoAddress();
        await accessControlInstance.pause({from: cfoAddress});
        const isOperational = await accessControlInstance.isOperational();
        assert.equal(isOperational, false);
        await accessControlInstance.resume({from: ceoAddress});
    });
});