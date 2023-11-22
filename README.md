# ERC20 Splitter
[![Testing](https://github.com/ebellocchia/erc20_splitter/actions/workflows/test.yml/badge.svg)](https://github.com/ebellocchia/erc20_splitter/actions/workflows/test.yml)

## Introduction

Smart contract that splits the received ERC20 tokens among different wallets with different percentages.

The smart contract is upgradeable using a UUPS proxy, so it's deployed together with a `ERC1967Proxy` proxy contract.

## Setup

Install `yarn` if not installed:

    npm install -g yarn

### Install package

Simply run:

    npm i --include=dev

### Compile

- To compile the contract:

        yarn compile

- To compile by starting from a clean build:

        yarn recompile

### Run tests

- To run tests without coverage:

        yarn test

- To run tests with coverage:

        yarn coverage

### Deploy

To deploy the contract:

    yarn deploy <NETWORK> --primary-addr <PRIMARY_ADDRESS> --secondary-addr <SECONDARY_ADDRESS>

The format of `SECONDARY_ADDRESS` is a list of multiple addresses and integers (there is no limit to the maximum number) as follows:

    <ADDRESS_1>,<PERCENTAGE_1>,<ADDRESS_2>,<PERCENTAGE_2>,...

Integers represent the percentage of each address as a fixed-point number with two decimal digits. Therefore, each percentage shall be multiplied by 100, i.e. 1% = 100, 5.35% = 535, 25% = 2500, etc...\
The sum of all percentages shall be 100%, i.e. 10000, otherwise an error will be raised.\
For example:

    0x9858EfFD232B4033E47d90003D41EC34EcaEda94,5000,0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0,3000,0xb6716976A3ebe8D39aCEB04372f22Ff8e6802D7A,2000

Will set the following secondary addresses:

- `0x9858EfFD232B4033E47d90003D41EC34EcaEda94`: 50%
- `0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0`: 30%
- `0xb6716976A3ebe8D39aCEB04372f22Ff8e6802D7A`: 20%

To upgrade the contract:

    yarn upgrade-to <NETWORK> --proxy-addr <PROXY_ADDRESS>

### Configuration

Hardhat is configured with the following networks:

|Network name|Description|
|---|---|
|`hardhat`|Hardhat built-in network|
|`locahost`|Localhost network (address: `127.0.0.1:8545`, it can be run with the following command: `yarn run-node`)|
|`bscTestnet`|Zero address|
|`bsc`|BSC mainnet|
|`ethereumSepolia`|ETH testnet (Sepolia)|
|`ethereum`|ETH mainnet|
|`polygonMumbai`|Polygon testnet (Mumbai)|
|`polygon`|Polygon mainnet|

The API keys, RPC nodes and mnemonic shall be configured in the `.env` file.\
You may need to modify the gas limit and price in the Hardhat configuration file for some networks (e.g. Polygon), to successfully execute the transactions (you'll get a gas error).

## How it works

The contract allows to define:

- One primary address that is "filled" up a specific amount of an ERC20 token. A different amount can be specified for each ERC20 token address.
- Multiple secondary addresses, each one with its associated percentage, to which ERC20 tokens are sent when the primary address is full. The amount of tokens will be split among the secondary addresses depending on their percentages.

For example, let's suppose you defined:
- A primary address that can hold at maximum 25000 USDC
- Three secondary addresses as follows:
    - 1st address: receives 50%
    - 2nd address: receives 30%
    - 3rd address: receives 20%

Consider the following token transfers:

1. 20000 USDC sent to the contract: 20000 USDC sent to the primary address
2. 15000 USDC sent to the contract: 5000 USDC sent to the primary address (now full), 10000 USDC sent to the secondary addresses as follows:
    - 1st address: 5000 USDC
    - 2nd address: 3000 USDC
    - 3rd address: 2000 USDC
3. 5000 USDC sent to the contract: nothing sent to the primary address (already "full"), 5000 USDC sent to the secondary addresses as follows:
    - 1st address: 2500 USDC
    - 2nd address: 1500 USDC
    - 3rd address: 1000 USDC

At the end of the three transfers, the balance of the addresses will be:

- Primary address: 25000 USDC
- 1st secondary address: 7500 USDC
- 2nd secondary address: 4500 USDC
- 3rd secondary address: 3000 USDC

For triggering the split after the ERC20 tokens are received, the `onERC20Received` function of the contract shall be called.

## Functions

    function init(
        address primaryAddress_,
        SecondaryAddress[] memory secondaryAddresses_
    ) initializer

Initialize the contract with the specified primary address and secondary addresses.\
The function is an `initializer`, so it can be called only once.

The function is usually called by the `ERC1967Proxy` that manages the contract.

For the format of `secondaryAddresses_`, check the `setSecondaryAddresses` function.

___

    function setPrimaryAddress(
        address primaryAddress_
    ) onlyOwner

Set the primary address to `primaryAddress_`.\
The primary address shall not be equal to the zero address or one of the secondary addresses, otherwise the function will revert.

___

    function setPrimaryAddressMaxAmount(
        IERC20 token_,
        uint256 maxAmount_
    ) onlyOwner

Set the maximum amount of ERC20 token with address `token_` to `maxAmount_` that the primary address can hold.\
When the amount is reached, tokens will be split amount secondary addresses.\
`maxAmount_` shall take into account the specific ERC20 token decimals.

Special cases:

- `maxAmount_` equal to infinite: no token will be sent to the secondary addresses, everything will be sent to the primary one
- `maxAmount_` equal to zero: no token will be sent to the primary address, everything will be split among the secondary ones

___

    function setSecondaryAddresses(
        SecondaryAddress[] memory secondaryAddresses_
    ) onlyOwner

Set the secondary addresses to `secondaryAddresses_`.\
Each secondary address is a structure as follows:

    struct SecondaryAddress {
        address addr;
        uint256 perc;
    }

As written in the "Deploy" paragraph, the percentage is a fixed-point number with two decimal digits, so it shall be multiplied by 100.\
Requirements for the secondary addresses:

- The sum of all percentages shall be 100%, i.e. 10000
- A secondary address cannot be equal to the primary address
- A secondary address cannot be equal to the zero address

If the requirements are not met, the function will revert.

___

    function onERC20Received(
        IERC20 token_,
        uint256 amount_
    ) external returns (bytes4)

Function that shall be called when the ERC20 token with address `token_` is transferred to the contract.\
Calling this function will trigger the split of amount `amount_` of token `token_` among primary and secondary addresses.

It must return its Solidity selector to confirm the token transfer (i.e. `IERC20Receiver.onERC20Received.selector`).
