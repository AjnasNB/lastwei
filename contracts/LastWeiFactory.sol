// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {LastWeiAccount} from "./LastWeiAccount.sol";

contract LastWeiFactory {
    mapping(address => address) public accounts;
    event AccountCreated(address indexed owner, address indexed account);
    function createAccount(address owner) external returns (address account) {
        require(owner != address(0), "Zero owner");
        account = accounts[owner];
        if (account != address(0)) return account;
        account = address(new LastWeiAccount(owner));
        accounts[owner] = account;
        emit AccountCreated(owner, account);
    }
}
