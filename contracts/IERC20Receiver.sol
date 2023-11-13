// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//=============================================================//
//                            IMPORTS                          //
//=============================================================//
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @author Emanuele Bellocchia (ebellocchia@gmail.com)
 * @title  Interface for any contract that wants to support ERC20 transfers from NFT manager contracts
 */
interface IERC20Receiver
{
    //=============================================================//
    //                       PUBLIC FUNCTIONS                      //
    //=============================================================//

    /**
     * Function that shall be called when ERC20 toke are transferred to the contract.
     * Calling this function will trigger the split of the specific ERC20 token `token_` of amount `amount_`.
     * It must return its Solidity selector to confirm the token transfer.
     *
     * @param token_  Token address
     * @param amount_ Token amount
     * @return Function selector, i.e. `IERC20Receiver.onERC20Received.selector`
     */
    function onERC20Received(
        IERC20 token_,
        uint256 amount_
    ) external returns (bytes4);
}
