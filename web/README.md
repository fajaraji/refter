# RefTer web client

React and TypeScript interface for issuing, viewing, and verifying reference letters on Monad Testnet. Use the Verify tab with a credential ID. Issuers and holders connect their wallets for their respective actions.

## Run locally

From this folder, use Node.js and npm. Review [.env.example](.env.example) for the public RPC endpoint and contract address.

```bash
npm install
npm run dev
```

See the [project guide](../README.md) for the role model and contract setup. The [client](src/lib/client.ts) and [contract bindings](src/lib/contract.ts) connect the UI to the chain.
