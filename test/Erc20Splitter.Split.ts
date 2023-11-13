import { expect } from "chai";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";


function computeSecondaryAddrAmounts(
  amount: number,
  secondary_addresses: utils.SecondaryAddress[]
) {
  const secondary_addr_amounts: number[] = [];
  for (let i = 0; i < secondary_addresses.length; i++) {
    secondary_addr_amounts.push(Math.floor((amount * secondary_addresses[i][1]) / constants.PERCENTAGE_MAX_VAL));
  }
  secondary_addr_amounts[0] += amount - secondary_addr_amounts.reduce((a,b) => {return a+b;}, 0);

  return secondary_addr_amounts;
}

describe("Erc20Splitter.Split", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initTestContext();
  });

  it("should transfer the entire amount to the primary address if the maximum token amount is not set", async () => {
    const token_amount: number = constants.ERC20_TOKEN_SUPPLY;
    const token_addr: string = test_ctx.mock_erc20.address;

    // Make sure the maximum amount is not set
    expect(await test_ctx.splitter.primaryAddressMaxTokenAmounts(token_addr))
      .to.deep.equal([0, false]);

    await test_ctx.mock_erc20
      .connect(test_ctx.accounts.owner)
      .transfer(test_ctx.splitter.address, token_amount);

    await test_ctx.splitter.onERC20Received(token_addr, token_amount);

    expect(await test_ctx.mock_erc20.balanceOf(test_ctx.primary_address))
      .to.equal(token_amount);
  });

  it("should transfer the entire amount to the primary address if the maximum token amount is set but secondary addresses are empty", async () => {
    const max_token_amount: number = Math.floor(constants.ERC20_TOKEN_SUPPLY / 10);
    const token_amount: number = max_token_amount * 2;
    const token_addr: string = test_ctx.mock_erc20.address;

    // Make sure the maximum amount is set with empty secondary addresses
    await test_ctx.splitter.setPrimaryAddressMaxAmount(
      token_addr,
      max_token_amount
    );
    await test_ctx.splitter.setSecondaryAddresses([]);

    await test_ctx.mock_erc20
      .connect(test_ctx.accounts.owner)
      .transfer(test_ctx.splitter.address, token_amount);

    await test_ctx.splitter.onERC20Received(token_addr, token_amount);

    expect(await test_ctx.mock_erc20.balanceOf(test_ctx.primary_address))
      .to.equal(token_amount);
  });

  it("should transfer the entire amount to the primary address if the maximum token amount is not reached", async () => {
    const max_token_amount: number = Math.floor(constants.ERC20_TOKEN_SUPPLY / 10);
    const token_amount_1: number = max_token_amount / 4;
    const token_amount_2: number = max_token_amount - token_amount_1;
    const token_amount_3: number = 1;
    const token_addr: string = test_ctx.mock_erc20.address;

    await test_ctx.splitter.setPrimaryAddressMaxAmount(
      token_addr,
      max_token_amount
    );

    // First transfer (less than maximum)
    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, token_amount_1);
    await test_ctx.splitter.onERC20Received(token_addr, token_amount_1);

    expect(await test_ctx.mock_erc20.balanceOf(test_ctx.primary_address))
      .to.equal(token_amount_1);

    // Second transfer (maximum reached)
    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, token_amount_2);
    await test_ctx.splitter.onERC20Received(token_addr, token_amount_2);

    expect(await test_ctx.mock_erc20.balanceOf(test_ctx.primary_address))
      .to.equal(max_token_amount);

    // Third transfer (maximum exceeded)
    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, token_amount_3);
    await test_ctx.splitter.onERC20Received(token_addr, token_amount_3);

    expect(await test_ctx.mock_erc20.balanceOf(test_ctx.primary_address))
      .to.equal(max_token_amount);
  });

  it("should split the amount among secondary addresses if the maximum token amount is reached on primary address (partial)", async () => {
    const primary_max_token_amount: number = Math.floor(constants.ERC20_TOKEN_SUPPLY / 10);
    const token_amount_1: number = Math.floor(primary_max_token_amount / 3);
    const token_amount_2: number = Math.floor(constants.ERC20_TOKEN_SUPPLY / 5);
    const token_addr: string = test_ctx.mock_erc20.address;

    await test_ctx.splitter.setPrimaryAddressMaxAmount(
      token_addr,
      primary_max_token_amount
    );

    // Make the primary address partially full
    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, token_amount_1);
    await test_ctx.splitter.onERC20Received(token_addr, token_amount_1);

    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, token_amount_2);
    await test_ctx.splitter.onERC20Received(token_addr, token_amount_2);

    const secondary_addr_amounts: number[] = computeSecondaryAddrAmounts(
      token_amount_2 + token_amount_1 - primary_max_token_amount,
      test_ctx.secondary_addresses
    );

    expect(await test_ctx.mock_erc20.balanceOf(test_ctx.primary_address))
      .to.equal(primary_max_token_amount);
    for (let i = 0; i < test_ctx.secondary_addresses.length; i++) {
      expect(await test_ctx.mock_erc20.balanceOf(test_ctx.secondary_addresses[i][0]))
        .to.equal(secondary_addr_amounts[i]);
    }
  });

  it("should split the amount among secondary addresses if the maximum token amount is reached on primary address (full)", async () => {
    const primary_token_amount: number = Math.floor(constants.ERC20_TOKEN_SUPPLY / 10);
    const secondary_token_amount: number = Math.floor(constants.ERC20_TOKEN_SUPPLY / 4);
    const token_addr: string = test_ctx.mock_erc20.address;

    await test_ctx.splitter.setPrimaryAddressMaxAmount(
      token_addr,
      primary_token_amount
    );

    // Make the primary address full
    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, primary_token_amount);
    await test_ctx.splitter.onERC20Received(token_addr, primary_token_amount);

    // Split the rest among secondary addresses
    await test_ctx.mock_erc20.transfer(test_ctx.splitter.address, secondary_token_amount);
    await test_ctx.splitter.onERC20Received(token_addr, secondary_token_amount);

    const secondary_addr_amounts: number[] = computeSecondaryAddrAmounts(
      secondary_token_amount,
      test_ctx.secondary_addresses
    );

    for (let i = 0; i < test_ctx.secondary_addresses.length; i++) {
      expect(await test_ctx.mock_erc20.balanceOf(test_ctx.secondary_addresses[i][0]))
        .to.equal(secondary_addr_amounts[i]);
    }
  });
});
