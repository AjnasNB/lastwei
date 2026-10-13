// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet prototype. A minimal intent account, not an ERC-4337 account.
/// A sponsor authorizes a specific target and calldata by funding a signed intent.
contract LastWeiAccount is EIP712, ReentrancyGuard {
    struct Intent {
        address target;
        uint256 value;
        bytes32 dataHash;
        uint256 contribution;
        uint256 nonce;
        uint256 deadline;
    }
    enum Status { None, Funded, Executed, Refunded, Cancelled }
    struct Sponsorship {
        address sponsor;
        address target;
        uint256 value;
        bytes32 dataHash;
        uint256 contribution;
        uint256 deadline;
        Status status;
    }

    bytes32 public constant INTENT_TYPEHASH = keccak256(
        "Intent(address target,uint256 value,bytes32 dataHash,uint256 contribution,uint256 nonce,uint256 deadline)"
    );
    address public immutable owner;
    uint256 public ownerBalance;
    uint256 public totalLocked;
    uint256 public totalRefunds;
    mapping(uint256 => bool) public usedNonces;
    mapping(bytes32 => Sponsorship) public sponsorships;
    mapping(address => uint256) public refunds;

    error Unauthorized();
    error InvalidIntent();
    error InvalidSignature();
    error NonceUsed();
    error WrongFunding();
    error InsufficientContribution();
    error NotFunded();
    error Expired();
    error NotExpired();
    error CalldataMismatch();
    error ActionFailed();
    error TransferFailed();

    event Deposited(address indexed sender, uint256 amount);
    event Funded(bytes32 indexed intentId, address indexed sponsor, address indexed target, uint256 value, uint256 contribution, uint256 nonce, uint256 deadline);
    event Executed(bytes32 indexed intentId, address indexed executor, bytes32 resultHash);
    event Released(bytes32 indexed intentId, address indexed sponsor, uint256 refund, Status status);
    event Withdrawn(address indexed recipient, uint256 amount);
    event RefundWithdrawn(address indexed sponsor, address indexed recipient, uint256 amount);
    event NonceCancelled(uint256 indexed nonce);

    constructor(address owner_) EIP712("LastWei", "1") {
        if (owner_ == address(0)) revert InvalidIntent();
        owner = owner_;
    }

    /// Donations to the account are credited to its owner, never to a sponsorship.
    receive() external payable { ownerBalance += msg.value; emit Deposited(msg.sender, msg.value); }

    function hashIntent(Intent calldata intent) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INTENT_TYPEHASH, intent.target, intent.value,
            intent.dataHash, intent.contribution, intent.nonce, intent.deadline)));
    }

    /// Funding commits the owner's signature and reserves their contribution.
    function fund(Intent calldata intent, bytes calldata signature) external payable nonReentrant returns (bytes32 id) {
        if (intent.target == address(this) || intent.target.code.length == 0 || intent.value == 0
            || intent.contribution >= intent.value || intent.deadline > block.timestamp + 7 days) revert InvalidIntent();
        if (block.timestamp >= intent.deadline) revert Expired();
        if (usedNonces[intent.nonce]) revert NonceUsed();
        if (msg.value != intent.value - intent.contribution) revert WrongFunding();
        if (ownerBalance < intent.contribution) revert InsufficientContribution();
        id = hashIntent(intent);
        (address signer, ECDSA.RecoverError error,) = ECDSA.tryRecover(id, signature);
        if (error != ECDSA.RecoverError.NoError || signer != owner) revert InvalidSignature();
        usedNonces[intent.nonce] = true;
        ownerBalance -= intent.contribution;
        totalLocked += intent.value;
        sponsorships[id] = Sponsorship(msg.sender, intent.target, intent.value, intent.dataHash,
            intent.contribution, intent.deadline, Status.Funded);
        emit Funded(id, msg.sender, intent.target, intent.value, intent.contribution, intent.nonce, intent.deadline);
    }

    /// Any relayer may pay gas. No sponsor ETH is transferred to the owner's EOA.
    /// A reverting action rolls back the state changes and retains all locked funds.
    function execute(bytes32 id, bytes calldata data) external nonReentrant {
        Sponsorship storage s = sponsorships[id];
        if (s.status != Status.Funded) revert NotFunded();
        if (block.timestamp >= s.deadline) revert Expired();
        if (keccak256(data) != s.dataHash) revert CalldataMismatch();
        s.status = Status.Executed;
        totalLocked -= s.value;
        (bool ok, bytes memory result) = s.target.call{value: s.value}(data);
        if (!ok) revert ActionFailed();
        emit Executed(id, msg.sender, keccak256(result));
    }

    /// Permissionless expiry release; refund withdrawal belongs to the sponsor.
    function reclaim(bytes32 id) external nonReentrant {
        Sponsorship storage s = sponsorships[id];
        if (s.status != Status.Funded) revert NotFunded();
        if (block.timestamp < s.deadline) revert NotExpired();
        _release(id, s, Status.Refunded);
    }

    function cancel(bytes32 id) external nonReentrant {
        if (msg.sender != owner) revert Unauthorized();
        Sponsorship storage s = sponsorships[id];
        if (s.status != Status.Funded) revert NotFunded();
        _release(id, s, Status.Cancelled);
    }

    function cancelNonce(uint256 nonce) external {
        if (msg.sender != owner) revert Unauthorized();
        if (usedNonces[nonce]) revert NonceUsed();
        usedNonces[nonce] = true;
        emit NonceCancelled(nonce);
    }

    function _release(bytes32 id, Sponsorship storage s, Status status) private {
        s.status = status;
        totalLocked -= s.value;
        ownerBalance += s.contribution;
        uint256 amount = s.value - s.contribution;
        refunds[s.sponsor] += amount;
        totalRefunds += amount;
        emit Released(id, s.sponsor, amount, status);
    }

    function withdraw(uint256 amount, address payable recipient) external nonReentrant {
        if (msg.sender != owner) revert Unauthorized();
        if (recipient == address(0) || recipient == address(this) || amount == 0 || amount > ownerBalance) revert InvalidIntent();
        ownerBalance -= amount;
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(recipient, amount);
    }

    function withdrawRefund(address payable recipient) external nonReentrant {
        uint256 amount = refunds[msg.sender];
        if (amount == 0 || recipient == address(0) || recipient == address(this)) revert InvalidIntent();
        refunds[msg.sender] = 0;
        totalRefunds -= amount;
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit RefundWithdrawn(msg.sender, recipient, amount);
    }
}
