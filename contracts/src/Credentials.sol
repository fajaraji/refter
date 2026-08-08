// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Credentials is Ownable {
    struct Credential {
        address issuer;
        address holder;
        string credentialType; // "Sertifikat" / "Paklaring" / "Surat Referensi"
        string title;          // "Workshop Monad 101"
        string ipfsHash;       // hash dokumen di IPFS (placeholder untuk MVP)
        uint256 issuedAt;
        bool active;
    }

    mapping(uint256 => Credential) public credentials;
    uint256 public nextId = 1;

    mapping(address => bool) public authorizedIssuers;
    mapping(address => uint256[]) public holderCredentials;

    event CredentialIssued(uint256 indexed id, address indexed issuer, address indexed holder, string credentialType, string title);
    event CredentialRevoked(uint256 indexed id);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    constructor() Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }

    // === ISSUER MANAGEMENT ===
    function authorizeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }

    function revokeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }

    // === ISSUE ===
    function issueCredential(
        address _holder,
        string calldata _credentialType,
        string calldata _title,
        string calldata _ipfsHash
    ) external returns (uint256) {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");

        uint256 id = nextId++;
        credentials[id] = Credential({
            issuer: msg.sender,
            holder: _holder,
            credentialType: _credentialType,
            title: _title,
            ipfsHash: _ipfsHash,
            issuedAt: block.timestamp,
            active: true
        });
        holderCredentials[_holder].push(id);

        emit CredentialIssued(id, msg.sender, _holder, _credentialType, _title);
        return id;
    }

    function revokeCredential(uint256 _id) external {
        require(credentials[_id].issuer == msg.sender, "Not the issuer");
        require(credentials[_id].active, "Already revoked");
        credentials[_id].active = false;
        emit CredentialRevoked(_id);
    }

    // === VIEW ===
    function getCredential(uint256 _id) external view returns (Credential memory) {
        return credentials[_id];
    }

    function getHolderCredentials(address _holder) external view returns (uint256[] memory) {
        return holderCredentials[_holder];
    }

    function verifyCredential(uint256 _id) external view returns (
        bool isValid,
        address issuer,
        address holder,
        string memory credentialType,
        string memory title,
        uint256 issuedAt
    ) {
        Credential memory c = credentials[_id];
        return (c.active && authorizedIssuers[c.issuer], c.issuer, c.holder, c.credentialType, c.title, c.issuedAt);
    }

    function isAuthorizedIssuer(address _issuer) external view returns (bool) {
        return authorizedIssuers[_issuer];
    }
}
