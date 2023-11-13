import { BigNumber, Contract, ContractFactory, Signer } from "ethers";
import hre from "hardhat";
// Project
import * as constants from "./Constants";

//
// Interfaces/Types
//

export interface Accounts {
  signers: Signer[];
  owner: Signer;
}

export type SecondaryAddress = [string, BigNumber] | {
  addr: string;
  perc: BigNumber;
}

export type MaxTokenAmount = [BigNumber, boolean] | {
  maxAmount: BigNumber;
  isSet: boolean;
}

export interface TestContext {
  accounts: Accounts;
  mock_erc20: Contract;
  primary_address: string;
  secondary_addresses: SecondaryAddress[];
  splitter: Contract;
}

//
// Exported functions
//

export async function initTestContext() : Promise<TestContext> {
  const accounts: Accounts = await initAccounts();

  const mock_erc20: Contract = await deployMockERC20TokenContract(accounts);

  const primary_address: string = await accounts.signers[0].getAddress();
  const secondary_addresses: SecondaryAddress[] = await generateSecondaryAddresses(accounts);

  const splitter: Contract = await deploySplitterProxyContract(
    primary_address,
    secondary_addresses
  );

  return {
    accounts,
    mock_erc20,
    primary_address,
    secondary_addresses,
    splitter,
  };
}

export async function deploySplitterContract() : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("Erc20Splitter");
  const instance: Contract = await contract_factory.deploy();
  await instance.deployed();

  return instance;
}

export async function deploySplitterUpgradedContract() : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("Erc20SplitterUpgraded");
  const instance: Contract = await contract_factory.deploy();
  await instance.deployed();

  return instance;
}

export async function getSplitterUpgradedContractAt(
  address: string
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("Erc20SplitterUpgraded");
  return contract_factory.attach(address);
}

//
// Not exported functions
//

async function initAccounts() : Promise<Accounts> {
  const all_signers: Signer[] = await hre.ethers.getSigners();

  const owner: Signer = all_signers[0];
  const signers: Signer[] = [];
  for (let i = 1; i < all_signers.length; i++) {
    signers.push(all_signers[i])
  }

  return {
    owner,
    signers,
  };
}

async function generateSecondaryAddresses(
  accounts: Accounts
) : Promise<SecondaryAddress[]> {
  let tot_perc: number = 0;
  const secondary_addresses: SecondaryAddress[] = [];

  for (let i = 1; i <= constants.SECONDARY_ADDR_NUM - 1; i++) {
    const curr_prec: number = i * 10 * (10**constants.PERCENTAGE_DEC_PRECISION);
    tot_perc += curr_prec;

    secondary_addresses.push([
      await accounts.signers[i].getAddress(),
      BigNumber.from(curr_prec),
    ]);
  }

  secondary_addresses.push([
    await accounts.signers[constants.SECONDARY_ADDR_NUM].getAddress(),
    BigNumber.from(100 * (10**constants.PERCENTAGE_DEC_PRECISION) - tot_perc),
  ]);

  return secondary_addresses;
}

async function getSplitterContractAt(
  address: string
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("Erc20Splitter");
  return contract_factory.attach(address);
}

async function deployMockERC20TokenContract(
  accounts: Accounts
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("MockERC20Token");
  const instance: Contract = await contract_factory.deploy(constants.ERC20_TOKEN_SUPPLY);
  await instance.deployed();

  return instance;
}

async function deployProxyContract(
  logicInstance: Contract,
  primary_address: string,
  secondary_addresses: SecondaryAddress[]
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("ERC1967Proxy");
  const instance: Contract = await contract_factory.deploy(
    logicInstance.address,
    logicInstance.interface.encodeFunctionData(
      "init",
      [primary_address, secondary_addresses]
    )
  );
  await instance.deployed();

  return instance;
}

async function deploySplitterProxyContract(
  primary_address: string,
  secondary_addresses: SecondaryAddress[]
) : Promise<Contract> {
  const nft_logic_instance: Contract = await deploySplitterContract();
  const proxy_instance: Contract = await deployProxyContract(
    nft_logic_instance,
    primary_address,
    secondary_addresses
  );

  return getSplitterContractAt(proxy_instance.address);
}
