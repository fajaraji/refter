// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Credentials} from "../src/Credentials.sol";

contract CredentialsTest is Test {
    Credentials public credentials;
    address public issuer2 = address(0xB0B);
    address public holder = address(0xCAFE);

    function setUp() public {
        credentials = new Credentials(); // deployer = address(this) = authorized issuer
    }

    function testDeployerIsAuthorizedIssuer() public view {
        assertTrue(credentials.isAuthorizedIssuer(address(this)));
    }

    function testIssueCredential() public {
        uint256 id = credentials.issueCredential(holder, "Paklaring", "Senior Developer, 2020-2024", "QmPlaceholder");
        assertEq(id, 1);

        (bool isValid, address issuer, address h, string memory ctype, string memory title, uint256 issuedAt) =
            credentials.verifyCredential(1);
        assertTrue(isValid);
        assertEq(issuer, address(this));
        assertEq(h, holder);
        assertEq(ctype, "Paklaring");
        assertEq(title, "Senior Developer, 2020-2024");
        assertTrue(issuedAt > 0);
    }

    function testHolderCredentialsTracked() public {
        credentials.issueCredential(holder, "Sertifikat", "Workshop Monad 101", "QmPlaceholder");
        credentials.issueCredential(holder, "Paklaring", "Senior Dev", "QmPlaceholder");

        uint256[] memory ids = credentials.getHolderCredentials(holder);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
    }

    function testUnauthorizedIssuerCannotIssue() public {
        vm.prank(issuer2);
        vm.expectRevert("Not authorized issuer");
        credentials.issueCredential(holder, "Sertifikat", "X", "Qm");
    }

    function testAuthorizeIssuer() public {
        credentials.authorizeIssuer(issuer2);
        assertTrue(credentials.isAuthorizedIssuer(issuer2));

        vm.prank(issuer2);
        uint256 id = credentials.issueCredential(holder, "Sertifikat", "Test", "Qm");
        assertEq(id, 1);
    }

    function testRevokeCredential() public {
        uint256 id = credentials.issueCredential(holder, "Paklaring", "Senior Dev", "Qm");

        credentials.revokeCredential(id);
        (bool isValid, , , , , ) = credentials.verifyCredential(id);
        assertFalse(isValid);
    }

    function testOnlyIssuerCanRevoke() public {
        uint256 id = credentials.issueCredential(holder, "Sertifikat", "X", "Qm");

        vm.prank(issuer2);
        vm.expectRevert("Not the issuer");
        credentials.revokeCredential(id);
    }

    function testCannotRevokeTwice() public {
        uint256 id = credentials.issueCredential(holder, "Sertifikat", "X", "Qm");
        credentials.revokeCredential(id);

        vm.expectRevert("Already revoked");
        credentials.revokeCredential(id);
    }

    function testVerifyChecksIssuerStillAuthorized() public {
        uint256 id = credentials.issueCredential(holder, "Sertifikat", "X", "Qm");

        credentials.revokeIssuer(address(this));
        (bool isValid, , , , , ) = credentials.verifyCredential(id);
        assertFalse(isValid);
    }
}
