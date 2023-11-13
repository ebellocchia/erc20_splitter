// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//=============================================================//
//                           IMPORTS                           //
//=============================================================//
import "../Erc20Splitter.sol";


/**
 * @author Emanuele (@emanueleb88)
 * @title  Token to test the contract upgradeability
 */
contract Erc20SplitterUpgraded is
    Erc20Splitter
{
    //=============================================================//
    //                       PUBLIC FUNCTIONS                      //
    //=============================================================//

    /**
     * New function to check if the contract has been upgraded
     */
    function isUpgraded() public pure returns (bool) {
        return true;
    }
}
