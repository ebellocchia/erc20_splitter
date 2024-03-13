import { expect } from "chai";
import { Contract } from "ethers";
// Project
import * as utils from "./Utils";
import * as constants from "./Constants";


describe("Erc20Splitter.Deploy", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initTestContext();
  });

  it("should be initialized correctly", async () => {
    expect(await test_ctx.splitter.primaryAddress()).to.equal(test_ctx.primary_address);
    expect(await test_ctx.splitter.SecondaryAddressesNum()).to.equal(test_ctx.secondary_addresses.length);

    for (let i = 0; i < test_ctx.secondary_addresses.length; i++) {
      expect(await test_ctx.splitter.secondaryAddresses(i)).to.deep.equal(
        test_ctx.secondary_addresses[i]
      );
    }
  });

  it("should upgrade the logic", async () => {
    const new_splitter_logic: Contract = await utils.deploySplitterUpgradedContract();

    await expect(await test_ctx.splitter.upgradeToAndCall(new_splitter_logic.address, constants.EMPTY_BYTES))
      .not.to.be.reverted;

    test_ctx.splitter = await utils.getSplitterUpgradedContractAt(test_ctx.splitter.address);  // Update ABI
    expect(await test_ctx.splitter.isUpgraded())
      .to.equal(true);
  });

  it("should revert if initializing more than once", async () => {
    await expect(test_ctx.splitter.init(
      test_ctx.primary_address,
      test_ctx.secondary_addresses
    ))
      .to.be.revertedWithCustomError(test_ctx.splitter, "InvalidInitialization");
  });

  it("should revert if initializing the logic contract without a proxy", async () => {
    const splitter = await utils.deploySplitterContract();
    await expect(splitter.init(
      test_ctx.primary_address,
      test_ctx.secondary_addresses
    ))
      .to.be.revertedWithCustomError(splitter, "InvalidInitialization");
  });
});
