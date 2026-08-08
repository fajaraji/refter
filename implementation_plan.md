# RefPer Implementation Plan

## Product

RefPer is an on-chain reference letter issuer and verifier for Monad Testnet. The MVP demonstrates a complete flow:

`owner authorizes issuer -> issuer issues credential -> holder receives credential -> verifier checks Credential ID -> issuer can revoke`

## Role Model

| Role | Source of truth | Permissions |
|------|-----------------|-------------|
| Owner | `owner()` | Authorize and revoke issuer wallets |
| Issuer | `authorizedIssuers(address)` | Issue and revoke credentials created by that wallet |
| Holder | `Credential.holder` | View credentials assigned to the wallet |
| Verifier | Public read access | Verify any credential by ID without a wallet |

The owner is authorized as the first issuer in the constructor. A wallet can hold multiple roles at the same time. A holder does not need to connect during issuance; the issuer sends the recipient address to the contract.

## Contract

`contracts/src/Credentials.sol` stores:

- Issuer address
- Holder address
- Credential type
- Compact title metadata
- Optional 32-byte document hash placeholder
- Issue timestamp
- Active or revoked status

Credential type indexes are stable:

- `0`: Reference Letter
- `1`: Certificate
- `2`: Recommendation Letter

The contract rejects zero addresses, invalid credential types, unauthorized issuers, and unauthorized revocations. Revoking an issuer also makes credentials from that issuer invalid during verification.

## Frontend

The frontend is a Vite + React + TypeScript application using viem.

Main surfaces:

- **AI Agent**: four action chips for issuing, viewing personal credentials, verifying, and revoking.
- **My Credentials**: reads credentials whose holder address matches the connected wallet.
- **Verify**: public Credential ID verification; no wallet is required.
- **Roles**: displays owner, issuer, holder, and verifier status. The owner can manage issuer wallets.

The agent uses local pattern matching for the MVP. It does not call Gemini from the browser. A future Gemini integration must use a server-side proxy and rate limiting.

## Wallet and Network

- Chain: Monad Testnet
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Native token: `MON`
- Explorer: `https://testnet.monadexplorer.com`

The frontend listens for account and chain changes, validates wallet addresses, and requests Monad Testnet before write transactions.

## Configuration

Create `web/.env.local`:

```env
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_CONTRACT_ADDRESS=0x079D95b97f062888227D7237AE3a9312C978747D
```

Never place private keys or server-side API keys in `VITE_*` variables. The current MVP does not require a Gemini key.

## Commands

```bash
cd contracts
forge build
forge test

cd ../web
npm install
npm run dev
npm run build
npm run lint
```

## MVP Boundaries

- Metadata is limited to a compact 32-byte title.
- PDF documents, encrypted storage, and IPFS publishing are deferred.
- Name-based global search is intentionally not supported.
- A database is not required for the core flow.
- A future indexer can provide a global issuer directory, event history, and analytics.
- Solidity changes require a new deployment before they affect an existing contract address.

## Demo Flow

1. Show the Roles tab and the connected issuer status.
2. Issue a Reference Letter to a second wallet address.
3. Switch to the holder wallet and show My Credentials.
4. Disconnect the application and verify the Credential ID publicly.
5. Reconnect the issuer, revoke the credential, and verify the same ID again.
