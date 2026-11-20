# RefTer - On-chain Reference Letters

RefTer issues and verifies reference letters on Monad Testnet. An authorized issuer writes a credential for a holder wallet, and anyone can verify it instantly using only a Credential ID.

## Explore the implementation

Follow a reference letter through three roles. The owner authorizes an issuer, the issuer signs a credential for a holder, and a verifier checks its ID without connecting a wallet.

- [Credential and role rules](contracts/src/Credentials.sol)
- [Contract tests](contracts/test/Credentials.t.sol)
- [Run the verifier interface](web/README.md)

## The Problem

Reference letters (paklaring / employment records) are critical for hiring, yet today's system is broken:

- **Easy to forge.** A paper letter or PDF can be copied, edited, or fabricated. Verifiers cannot tell a real letter from a fake one.
- **Slow to verify.** HR teams must call or email former employers, wait for replies, and trust a stranger's word. Hiring is delayed by days.
- **Fragile and centralized.** Records live in one company's inbox or HR database. When a company is shut down or an email is lost, the proof disappears.
- **Not owned by the holder.** Employees cannot access their own work history after leaving a company; they must beg for copies.
- **No tamper evidence.** Even a genuine letter can be altered after issuance with no trace.

## The Solution

RefTer turns a reference letter into a verifiable on-chain record:

- An **authorized issuer** signs an `issueCredential` transaction to a **holder wallet**.
- The credential is stored on Monad with the issuer, holder, issue time, type, and status.
- Any **verifier** can check the Credential ID publicly without a wallet or database.
- The issuer can **revoke** a credential, and verification immediately reflects the new status.
- Blockchain finality makes the record permanent, transparent, and tamper-evident.

## Role Model

- **Owner**: the smart contract owner. The owner manages which wallets may act as issuers.
- **Issuer**: a wallet listed in `authorizedIssuers`. Issuers create and revoke credentials.
- **Holder**: the wallet address that receives a credential. The holder does not need to connect during issuance.
- **Verifier**: anyone. Verifiers do not need a wallet or database; they only need a Credential ID.

Holder names are not used as on-chain identity. The holder wallet address is the identity in the MVP.

## MVP Flow

1. The owner connects a wallet and authorizes a company or HR wallet in the **Roles** tab.
2. The issuer connects the authorized wallet.
3. The issuer enters the holder wallet address, holder name as a display label, job title, and employment period.
4. The issuer signs the `issueCredential` transaction in MetaMask.
5. The holder connects the recipient wallet to view its credentials.
6. The holder shares the Credential ID with a verifier.
7. The verifier checks the ID in the **Verify** tab without connecting a wallet.

The company name is not required in every form. In the MVP, the authorized issuer wallet is the issuer identity. A company profile can be added later as on-chain or off-chain metadata.

## Stack

| Layer | Technology |
|-------|------------|
| Smart Contract | Solidity + Foundry |
| Frontend | Vite + React + TypeScript + viem |
| Agent | Local pattern matching, with no browser API key |
| Blockchain | Monad Testnet, chain ID 10143 |

## Quickstart

```bash
# Contract
cd contracts
forge build
forge test

# Web
cd ../web
npm install
npm run dev
```

## Environment

`web/.env.local` only needs these public values:

```env
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_CONTRACT_ADDRESS=0x079D95b97f062888227D7237AE3a9312C978747D
```

The MVP does not send a Gemini API key from the browser. If generative AI is added later, use a server-side proxy with rate limiting.

## MVP Deployment

- Contract: `0x079D95b97f062888227D7237AE3a9312C978747D`
- Explorer: https://testnet.monadexplorer.com

Keep the frontend, documentation, and deployment metadata on the same address. If the Solidity source changes after deployment, deploy again before relying on the new contract validation.

## MVP Limitations

- Credentials store compact metadata, not PDF files.
- Public verification uses an ID, not a name search.
- There is no database, indexer, or encrypted document storage yet.
- The Roles tab checks the connected wallet; a global issuer directory requires an event indexer.
- A revoked credential cannot be restored.
- Identity trust depends on the owner authorizing legitimate issuer wallets, not on KYC of the issuer.
