import { expect } from "chai";
import { Signer } from "ethers";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";


describe("Erc20Splitter.Access", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initTestContext();
  });

  it("should revert if functions are not called by the owner", async () => {
    const not_owner_account: Signer = test_ctx.accounts.signers[0];

    await expect(test_ctx.splitter.connect(not_owner_account).upgradeTo(constants.NULL_ADDRESS))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(test_ctx.splitter.connect(not_owner_account).upgradeToAndCall(constants.NULL_ADDRESS, constants.EMPTY_BYTES))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(test_ctx.splitter.connect(not_owner_account).setPrimaryAddressMaxAmount(constants.NULL_ADDRESS, 0))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(test_ctx.splitter.connect(not_owner_account).setPrimaryAddress(constants.NULL_ADDRESS))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(test_ctx.splitter.connect(not_owner_account).setSecondaryAddresses(test_ctx.secondary_addresses))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });
});
