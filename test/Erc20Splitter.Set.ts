import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";


describe("Erc20Splitter.Set", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initTestContext();
  });

  it("should allow to set the primary address", async () => {
    const new_primary_account: Signer = test_ctx.accounts.signers[test_ctx.secondary_addresses.length + 1];
    const new_primary_address: string = await new_primary_account.getAddress();

    await expect(await test_ctx.splitter.setPrimaryAddress(new_primary_address))
      .to.emit(test_ctx.splitter, "PrimaryAddressChanged")
      .withArgs(test_ctx.primary_address, new_primary_address);
    expect(await test_ctx.splitter.primaryAddress()).to.equal(new_primary_address);
  });

  it("should allow to set the primary address maximum amount for an ERC20 token", async () => {
    const max_amount: number = 10;
    const token_addr: string = test_ctx.mock_erc20.address;

    expect(await test_ctx.splitter.primaryAddressMaxTokenAmounts(token_addr))
      .to.deep.equal([0, false]);

    await expect(await test_ctx.splitter.setPrimaryAddressMaxAmount(
      token_addr,
      max_amount
    ))
      .to.emit(test_ctx.splitter, "PrimaryAddressMaxAmountChanged")
      .withArgs(token_addr, 0, max_amount);

    expect(await test_ctx.splitter.primaryAddressMaxTokenAmounts(token_addr))
      .to.deep.equal([max_amount, true]);
  });

  it("should allow to set secondary addresses", async () => {
    const new_secondary_addresses: utils.SecondaryAddress[] = [
      [
        await test_ctx.accounts.signers[1].getAddress(),
        BigNumber.from(60 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
      [
        await test_ctx.accounts.signers[3].getAddress(),
        BigNumber.from(40 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
    ];

    await expect(await test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses))
      .to.emit(test_ctx.splitter, "SecondaryAddressesChanged");

    expect(await test_ctx.splitter.SecondaryAddressesNum())
      .to.equal(new_secondary_addresses.length);

    for (let i = 0; i < new_secondary_addresses.length; i++) {
      expect(await test_ctx.splitter.secondaryAddresses(i)).to.deep.equal(
        new_secondary_addresses[i]
      );
    }
  });

  it("should allow to set empty secondary addresses", async () => {
    await expect(await test_ctx.splitter.setSecondaryAddresses([]))
      .to.emit(test_ctx.splitter, "SecondaryAddressesChanged");

    expect(await test_ctx.splitter.SecondaryAddressesNum())
      .to.equal(0);
  });

  it("should revert if setting a null primary address", async () => {
    await expect(test_ctx.splitter.setPrimaryAddress(constants.NULL_ADDRESS))
      .to.be.revertedWithCustomError(test_ctx.splitter, "NullAddressError");
  });

  it("should revert if setting a primary address equal to a secondary one", async () => {
    const new_primary_address: string = test_ctx.secondary_addresses[1][0];

    await expect(test_ctx.splitter.setPrimaryAddress(new_primary_address))
      .to.be.revertedWithCustomError(test_ctx.splitter, "AddressError")
      .withArgs(new_primary_address);
  });

  it("should revert if setting the primary address maximum amount for a null address", async () => {
    await expect(test_ctx.splitter.setPrimaryAddressMaxAmount(
      constants.NULL_ADDRESS,
      1
    ))
      .to.be.revertedWithCustomError(test_ctx.splitter, "NullAddressError");
  });

  it("should revert if setting secondary addresses containing an address equal to the primary one", async () => {
    const new_secondary_addresses: utils.SecondaryAddress[] = [
      [
        await test_ctx.primary_address,
        BigNumber.from(100 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
    ];
    await expect(test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses))
      .to.be.revertedWithCustomError(test_ctx.splitter, "AddressError")
      .withArgs(test_ctx.primary_address);
  });

  it("should revert if setting secondary addresses containing a null address", async () => {
    const new_secondary_addresses: utils.SecondaryAddress[] = [
      [
        await test_ctx.accounts.signers[1].getAddress(),
        BigNumber.from(60 * (10**constants.PERCENTAGE_DEC_PRECISION))
      ],
      [
        constants.NULL_ADDRESS,
        BigNumber.from(40 * (10**constants.PERCENTAGE_DEC_PRECISION))
      ],
    ];
    await expect(test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses))
      .to.be.revertedWithCustomError(test_ctx.splitter, "NullAddressError");
  });

  it("should revert if setting secondary addresses containing an invalid percentage", async () => {
    const new_secondary_addresses_1: utils.SecondaryAddress[] = [
      [
        await test_ctx.accounts.signers[1].getAddress(),
        BigNumber.from(100 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
      [
        await test_ctx.accounts.signers[2].getAddress(),
        BigNumber.from(0),
      ],
    ];
    await expect(test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses_1))
      .to.be.revertedWithCustomError(test_ctx.splitter, "PercentageError")
      .withArgs(0);

    const new_secondary_addresses_2: utils.SecondaryAddress[] = [
      [
        await test_ctx.accounts.signers[1].getAddress(),
        BigNumber.from(100 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
      [
        await test_ctx.accounts.signers[2].getAddress(),
        BigNumber.from(101 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
      ];
      await expect(test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses_2))
        .to.be.revertedWithCustomError(test_ctx.splitter, "PercentageError")
        .withArgs(101 * (10**constants.PERCENTAGE_DEC_PRECISION));
  });

  it("should revert if setting secondary addresses with an invalid total percentage", async () => {
    // More than 100%
    const new_secondary_addresses_1: utils.SecondaryAddress[] = [
      [
        await test_ctx.accounts.signers[1].getAddress(),
        BigNumber.from(60 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
      [
        await test_ctx.accounts.signers[2].getAddress(),
        BigNumber.from(41 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
    ];
    await expect(test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses_1))
      .to.be.revertedWithCustomError(test_ctx.splitter, "PercentageError")
      .withArgs(101 * (10**constants.PERCENTAGE_DEC_PRECISION));

    // Less than 100%
    const new_secondary_addresses_2: utils.SecondaryAddress[] = [
      [
        await test_ctx.accounts.signers[1].getAddress(),
        BigNumber.from(60 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
      [
        await test_ctx.accounts.signers[2].getAddress(),
        BigNumber.from(39 * (10**constants.PERCENTAGE_DEC_PRECISION)),
      ],
    ];
    await expect(test_ctx.splitter.setSecondaryAddresses(new_secondary_addresses_2))
      .to.be.revertedWithCustomError(test_ctx.splitter, "PercentageError")
      .withArgs(99 * (10**constants.PERCENTAGE_DEC_PRECISION));
  });
});
