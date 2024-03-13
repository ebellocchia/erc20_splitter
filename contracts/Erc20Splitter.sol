// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

//=============================================================//
//                            IMPORTS                          //
//=============================================================//
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Receiver} from "./IERC20Receiver.sol";


/**
 * @author Emanuele Bellocchia (ebellocchia@gmail.com)
 * @title  ERC20 splitter
 * @notice Split the ERC20 tokens received among different wallets with different percentages
 */
contract Erc20Splitter is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IERC20Receiver
{
    //=============================================================//
    //                           CONSTANTS                         //
    //=============================================================//

    /// Percentage decimal precision in number of digits
    uint256 constant private PERCENTAGE_DEC_PRECISION = 2;
    /// Percentage maximum value
    uint256 constant private PERCENTAGE_MAX_VAL = 100 * (10**PERCENTAGE_DEC_PRECISION);

    //=============================================================//
    //                         STRUCTURES                          //
    //=============================================================//

    /// Structure for maximum token amount
    struct MaxTokenAmount {
        uint256 maxAmount;
        bool isSet;
    }

    /// Structure for secondary address
    struct SecondaryAddress {
        address addr;
        uint256 perc;
    }

    //=============================================================//
    //                           ERRORS                            //
    //=============================================================//

    /**
     * Error raised in case of address error
     * @param addr Address
     */
    error AddressError(
        address addr
    );

    /**
     * Error raised in case of a null address
     */
    error NullAddressError();

    /**
     * Error raised in case of percentage address
     * @param perc Percentage
     */
    error PercentageError(
        uint256 perc
    );

    //=============================================================//
    //                             EVENTS                          //
    //=============================================================//

    /**
     * Event emitted when primary address maximum amount is changed
     * @param token     Token address
     * @param oldAmount Old amount
     * @param newAmount New amount
     */
    event PrimaryAddressMaxAmountChanged(
        IERC20  token,
        uint256 oldAmount,
        uint256 newAmount
    );

    /**
     * Event emitted when primary address is changed
     * @param oldAddress Old address
     * @param newAddress New address
     */
    event PrimaryAddressChanged(
        address oldAddress,
        address newAddress
    );

    /**
     * Event emitted when secondary addresses are changed
     * @param oldAddresses Old addresses
     * @param newAddresses New addresses
     */
    event SecondaryAddressesChanged(
        SecondaryAddress[] oldAddresses,
        SecondaryAddress[] newAddresses
    );

    //=============================================================//
    //                           MODIFIERS                         //
    //=============================================================//

    /**
     * Modifier to make a function callable only if the address `address_` is not null
     * @param address_ Address
     */
    modifier notNullAddress(
        address address_
    ) {
        if (address_ == address(0)) {
            revert NullAddressError();
        }
        _;
    }

    //=============================================================//
    //                            STORAGE                          //
    //=============================================================//

    /// Mapping from token address to maximum amount that the primary address can have
    mapping(IERC20 => MaxTokenAmount) public primaryAddressMaxTokenAmounts;
    /// Primary wallet address
    address public primaryAddress;
    /// Secondary wallet addresses
    SecondaryAddress[] public secondaryAddresses;

    //=============================================================//
    //                          CONSTRUCTOR                        //
    //=============================================================//

    /**
     * Constructor
     * @dev Disable initializer for implementation contract
     */
    constructor() {
        _disableInitializers();
    }

    //=============================================================//
    //                       PUBLIC FUNCTIONS                      //
    //=============================================================//

    /**
     * Get the number of secondary addresses
     * @return Number of secondary addresses
     */
    function SecondaryAddressesNum() external view returns (uint256) {
        return secondaryAddresses.length;
    }

    /**
     * Initialize
     * @param primaryAddress_     Primary address
     * @param secondaryAddresses_ Secondary addresses
     */
    function init(
        address primaryAddress_,
        SecondaryAddress[] memory secondaryAddresses_
    ) public initializer {
       __setPrimaryAddress(primaryAddress_);
       __setSecondaryAddresses(secondaryAddresses_);

        __Ownable_init(_msgSender());
    }

    /**
     * Set the maximum amount `maxAmount_` of ERC20 token `token_` for the primary address
     * @param token_     Token address
     * @param maxAmount_ Maximum amount
     */
    function setPrimaryAddressMaxAmount(
        IERC20 token_,
        uint256 maxAmount_
    ) public onlyOwner {
        uint256 old_amount = primaryAddressMaxTokenAmounts[token_].maxAmount;
        __setPrimaryAddressMaxAmount(token_, maxAmount_);

        emit PrimaryAddressMaxAmountChanged(
            token_,
            old_amount,
            maxAmount_
        );
    }

    /**
     * Set the primary address
     * @param primaryAddress_ Primary address
     */
    function setPrimaryAddress(
        address primaryAddress_
    ) public onlyOwner {
        address old_addr = primaryAddress;
        __setPrimaryAddress(primaryAddress_);

        emit PrimaryAddressChanged(
            old_addr,
            primaryAddress_
        );
    }

    /**
     * Set the secondary addresses
     * @param secondaryAddresses_ Secondary addresses
     */
    function setSecondaryAddresses(
        SecondaryAddress[] memory secondaryAddresses_
    ) public onlyOwner {
        SecondaryAddress[] memory old_addr = secondaryAddresses;
        __setSecondaryAddresses(secondaryAddresses_);

        emit SecondaryAddressesChanged(
            old_addr,
            secondaryAddresses
        );
    }

    //=============================================================//
    //                      PRIVATE FUNCTIONS                      //
    //=============================================================//

    /**
     * Set the maximum amount `maxAmount_` of ERC20 token `token_` for the primary address
     * @param token_     Token address
     * @param maxAmount_ Maximum amount
     */
    function __setPrimaryAddressMaxAmount(
        IERC20 token_,
        uint256 maxAmount_
    ) private notNullAddress(address(token_)) {
        MaxTokenAmount storage max_token_amount = primaryAddressMaxTokenAmounts[token_];
        max_token_amount.maxAmount = maxAmount_;
        max_token_amount.isSet = true;
    }

    /**
     * Set the primary address
     * @param primaryAddress_ Primary address
     */
    function __setPrimaryAddress(
        address primaryAddress_
    ) private notNullAddress(primaryAddress_) {
        // Primary address shall no be equal to one secondary address
        for (uint256 i = 0; i < secondaryAddresses.length; i++) {
            if (primaryAddress_ == secondaryAddresses[i].addr) {
                revert AddressError(primaryAddress_);
            }
        }

        primaryAddress = primaryAddress_;
    }

    /**
     * Set the secondary addresses
     * @param secondaryAddresses_ Secondary addresses
     */
    function __setSecondaryAddresses(
        SecondaryAddress[] memory secondaryAddresses_
    ) private {
        delete secondaryAddresses;

        if (secondaryAddresses_.length == 0) {
            return;
        }

        uint256 tot_perc = 0;
        for (uint256 i = 0; i < secondaryAddresses_.length; i++) {
            __validateSecondaryAddress(secondaryAddresses_[i]);
            tot_perc += secondaryAddresses_[i].perc;
            secondaryAddresses.push(secondaryAddresses_[i]);
        }

        // Total percentage shall be exact
        if (tot_perc != PERCENTAGE_MAX_VAL) {
            revert PercentageError(tot_perc);
        }
    }

    /**
     * Split the received amount `amount_` of token `token_`
     * @param token_  Token address
     * @param amount_ Token amount
     */
    function __splitERC20Amount(
        IERC20 token_,
        uint256 amount_
    ) private {
        MaxTokenAmount storage max_token_amount = primaryAddressMaxTokenAmounts[token_];

        // Transfer all to primary address if maximum amount or secondary addresses are not set
        if (!max_token_amount.isSet || secondaryAddresses.length == 0) {
            __transferERC20AmountToPrimaryAddress(token_, amount_);
            return;
        }

        uint256 primary_addr_amount;
        uint256 secondary_addr_amount;
        (primary_addr_amount, secondary_addr_amount) = __computeSplitAmounts(
            token_,
            amount_,
            max_token_amount.maxAmount
        );

        __transferERC20AmountToPrimaryAddress(token_, primary_addr_amount);
        __transferERC20AmountToSecondaryAddresses(token_, secondary_addr_amount);
    }

    /**
     * Transfer amount to primary address
     * @param token_  Token address
     * @param amount_ Token amount
     */
    function __transferERC20AmountToPrimaryAddress(
        IERC20 token_,
        uint256 amount_
    ) private {
        if (amount_ == 0) {
            return;
        }
        token_.transfer(primaryAddress, amount_);
    }

    /**
     * Transfer amount to secondary addresses
     * @param token_  Token address
     * @param amount_ Token amount
     */
    function __transferERC20AmountToSecondaryAddresses(
        IERC20 token_,
        uint256 amount_
    ) private {
        if (amount_ == 0) {
            return;
        }

        for (uint256 i = 0; i < secondaryAddresses.length; i++) {
            uint256 curr_amount = (amount_ * secondaryAddresses[i].perc) / PERCENTAGE_MAX_VAL;
            token_.transfer(secondaryAddresses[i].addr, curr_amount);
        }
        // Transfer any remaining token to the first address
        if (token_.balanceOf(address(this)) != 0) {
            token_.transfer(secondaryAddresses[0].addr, token_.balanceOf(address(this)));
        }
    }

    /**
     * Compute the split amounts between the primary and secondary addresses
     * @param token_     Token address
     * @param amount_    Token amount
     * @param maxAmount_ Maximum token amount
     */
    function __computeSplitAmounts(
        IERC20 token_,
        uint256 amount_,
        uint256 maxAmount_
    ) private view returns (uint256, uint256) {
        uint256 primary_addr_balance = token_.balanceOf(primaryAddress);
        uint256 primary_addr_amount;
        uint256 secondary_addr_amount;

        // Primary address already full, transfer all to secondary addresses
        if (primary_addr_balance > maxAmount_) {
            primary_addr_amount = 0;
            secondary_addr_amount = amount_;
        }
        else {
            // Primary address not full, transfer all to primary address
            if (primary_addr_balance + amount_ <= maxAmount_) {
                primary_addr_amount = amount_;
                secondary_addr_amount = 0;
            }
            // Primary address partially full, split amount between primary and secondary addresses
            else {
                primary_addr_amount = maxAmount_ - primary_addr_balance;
                secondary_addr_amount = amount_ - primary_addr_amount;
            }
        }

        return (primary_addr_amount, secondary_addr_amount);
    }

    /**
     * Validate a secondary address
     * @param secondaryAddress_ Secondary address
     */
    function __validateSecondaryAddress(
        SecondaryAddress memory secondaryAddress_
    ) private view {
        if (secondaryAddress_.addr == address(0)) {
            revert NullAddressError();
        }
        if (secondaryAddress_.addr == primaryAddress) {
            revert AddressError(secondaryAddress_.addr);
        }
        if ((secondaryAddress_.perc == 0) || (secondaryAddress_.perc > PERCENTAGE_MAX_VAL)) {
            revert PercentageError(secondaryAddress_.perc);
        }
    }

    //=============================================================//
    //                    OVERRIDDEN FUNCTIONS                     //
    //=============================================================//

    /**
     * Restrict upgrade to owner
     * See {UUPSUpgradeable-_authorizeUpgrade}
     */
    function _authorizeUpgrade(
        address newImplementation_
    ) internal override onlyOwner {
    }

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
    ) external override returns (bytes4) {
        __splitERC20Amount(token_, amount_);

        return IERC20Receiver.onERC20Received.selector;
    }
}
