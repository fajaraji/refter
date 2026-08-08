// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Credentials} from "../src/Credentials.sol";

contract CredentialsTest is Test {
    Credentials public credentials;
    address public issuer2 = address(0xB0B);
    address public holder = address(0xCAFE);

    uint8 constant REFERENCE_LETTER = 0;
    uint8 constant CERTIFICATE = 1;

    function setUp() public {
        credentials = new Credentials();
    }

    function testDeployerIsAuthorizedIssuer() public view {
        assertTrue(credentials.isAuthorizedIssuer(address(this)));
    }

    function testIssueCredential() public {
        uint256 id = credentials.issueCredential(holder, REFERENCE_LETTER, "Senior Developer, 2020-2024", bytes32(0));
        assertEq(id, 1);

        (bool isValid, address issuer, address h, uint8 ctype, bytes32 title, uint256 issuedAt) =
            credentials.verifyCredential(1);
        assertTrue(isValid);
        assertEq(issuer, address(this));
        assertEq(h, holder);
        assertEq(uint8(ctype), REFERENCE_LETTER);
        assertEq(title, "Senior Developer, 2020-2024");
        assertTrue(issuedAt > 0);
    }

    function testHolderCredentialsTracked() public {
        credentials.issueCredential(holder, CERTIFICATE, "Workshop Monad 101", bytes32(0));
        credentials.issueCredential(holder, REFERENCE_LETTER, "Senior Dev", bytes32(0));

        uint256[] memory ids = credentials.getHolderCredentials(holder);
        assertEq(ids.length, 2);
    }

    function testUnauthorizedIssuerCannotIssue() public {
        vm.prank(issuer2);
        vm.expectRevert("Not authorized issuer");
        credentials.issueCredential(holder, CERTIFICATE, "X", bytes32(0));
    }

    function testAuthorizeIssuer() public {
        credentials.authorizeIssuer(issuer2);
        assertTrue(credentials.isAuthorizedIssuer(issuer2));

        vm.prank(issuer2);
        uint256 id = credentials.issueCredential(holder, CERTIFICATE, "Test", bytes32(0));
        assertEq(id, 1);
    }

    function testNonOwnerCannotAuthorizeIssuer() public {
        vm.prank(issuer2);
        vm.expectRevert();
        credentials.authorizeIssuer(address(0x123));
    }

    function testRevokeCredential() public {
        uint256 id = credentials.issueCredential(holder, REFERENCE_LETTER, "Senior Dev", bytes32(0));
        credentials.revokeCredential(id);
        (bool isValid, , , , , ) = credentials.verifyCredential(id);
        assertFalse(isValid);
    }

    function testOnlyIssuerCanRevoke() public {
        uint256 id = credentials.issueCredential(holder, CERTIFICATE, "X", bytes32(0));
        vm.prank(issuer2);
        vm.expectRevert("Not the issuer");
        credentials.revokeCredential(id);
    }

    function testCannotRevokeTwice() public {
        uint256 id = credentials.issueCredential(holder, CERTIFICATE, "X", bytes32(0));
        credentials.revokeCredential(id);
        vm.expectRevert("Already revoked");
        credentials.revokeCredential(id);
    }

    function testVerifyChecksIssuerStillAuthorized() public {
        uint256 id = credentials.issueCredential(holder, CERTIFICATE, "X", bytes32(0));
        credentials.revokeIssuer(address(this));
        (bool isValid, , , , , ) = credentials.verifyCredential(id);
        assertFalse(isValid);
    }

    function testCannotIssueToZeroAddress() public {
        vm.expectRevert("Invalid holder");
        credentials.issueCredential(address(0), REFERENCE_LETTER, "X", bytes32(0));
    }

    function testCannotIssueInvalidCredentialType() public {
        vm.expectRevert("Invalid type");
        credentials.issueCredential(holder, 3, "X", bytes32(0));
    }

    function testCannotAuthorizeZeroAddress() public {
        vm.expectRevert("Invalid issuer");
        credentials.authorizeIssuer(address(0));
    }
}
