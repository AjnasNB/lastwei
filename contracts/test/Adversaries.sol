// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {LastWeiAccount} from "../LastWeiAccount.sol";

contract RevertingTarget {
    fallback() external payable { revert("Target fails"); }
}
contract ReentrantTarget {
    LastWeiAccount public account;
    bytes32 public intentId;
    bool public blocked;
    function arm(LastWeiAccount a, bytes32 id) external { account = a; intentId = id; }
    function attack() external payable {
        try account.execute(intentId, msg.data) { revert("Reentry worked"); }
        catch { blocked = true; }
    }
}
contract RejectRefund {
    function fund(LastWeiAccount account, LastWeiAccount.Intent calldata intent, bytes calldata sig) external payable {
        account.fund{value:msg.value}(intent, sig);
    }
    function claim(LastWeiAccount account, address payable to) external { account.withdrawRefund(to); }
    receive() external payable { revert("No receive"); }
}
