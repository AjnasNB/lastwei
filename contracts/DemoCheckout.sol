// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice A non-transferable testnet receipt for a sample developer workshop.
contract DemoCheckout {
    uint256 public constant PRICE = 0.001 ether;
    mapping(address => uint256) public receipts;
    uint256 public totalReceipts;
    event Purchased(address indexed beneficiary, address indexed payer, uint256 receiptId, uint256 value);
    function purchase(address beneficiary) external payable {
        require(msg.value == PRICE, "Wrong price");
        require(beneficiary != address(0), "Zero beneficiary");
        uint256 id = ++totalReceipts;
        receipts[beneficiary]++;
        emit Purchased(beneficiary, msg.sender, id, msg.value);
    }
}
