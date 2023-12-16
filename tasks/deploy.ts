import { BigNumber, Contract, ContractFactory, ContractTransaction } from "ethers";
import { task } from "hardhat/config";
import { splitString } from "./utils";

task("deploy", "Deploy contract")
  .addParam("primaryAddr", "Primary address")
  .addParam("secondaryAddr", "Secondary addresses")
  .setAction(async (taskArgs, hre) => {
    const secondary_addr_split: string[] = splitString(taskArgs.secondaryAddr);
    const secondary_addr: {addr: string, perc: BigNumber}[] = [];

    for (let i = 0; i < secondary_addr_split.length; i += 2) {
      secondary_addr.push({
        addr: secondary_addr_split[i],
        perc: BigNumber.from(secondary_addr_split[i + 1])
      });
    }

    console.log("Deploying contract logic...");

    const contract_factory: ContractFactory = await hre.ethers.getContractFactory("Erc20Splitter");
    const logic_instance: Contract = await contract_factory
      .deploy();
    await logic_instance.deployed();

    console.log("Deploying contract proxy...");

    const proxy_contract_factory: ContractFactory = await hre.ethers.getContractFactory("ERC1967Proxy");
    const proxy_instance: Contract = await proxy_contract_factory
      .deploy(
        logic_instance.address,
        logic_instance.interface.encodeFunctionData("init", [taskArgs.primaryAddr, secondary_addr])
      );
    await proxy_instance.deployed();

    console.log(`Primary address: ${taskArgs.primaryAddr}`);
    console.log(`Secondary addresses: ${taskArgs.secondaryAddr}`);
    console.log(`Erc20Splitter logic deployed to ${logic_instance.address}`);
    console.log(`Erc20Splitter proxy deployed to ${proxy_instance.address}`);
  });

task("upgrade-to", "Upgrade contract")
  .addParam("proxyAddr", "Proxy address")
  .setAction(async (taskArgs, hre) => {
    console.log("Deploying new contract logic...");

    const contract_factory: ContractFactory = await hre.ethers.getContractFactory("Erc20Splitter");
    const logic_instance: Contract = await contract_factory
      .deploy();
    await logic_instance.deployed();

    console.log("Upgrading contract...");

    const proxy_instance: Contract = await contract_factory.attach(taskArgs.proxyAddr);
    const tx: ContractTransaction = await proxy_instance.upgradeTo(logic_instance.address);

    console.log(`Erc20Splitter updated logic deployed to ${logic_instance.address}`);
    console.log(`Transaction hash: ${tx.hash}`);
  });
