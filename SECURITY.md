# Security policy

## Supported code

This proof-of-concept fork is reviewed only at the current `main` revision. It
is not an audited custody product and carries no production-security warranty.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, wallet
material, or signed transactions. Use GitHub's private vulnerability-reporting
feature for `verbotenj/cardano-raw-sdk`. Revoke any credential that might have
been disclosed before sending the report.

## Deployment boundary

Importing the SDK as a library does not start a listener. The optional REST
server is a privileged operator interface because its routes can request
Fireblocks signatures and submit Cardano transactions.

- `SERVER_API_KEY` is mandatory and must contain at least 32 random bytes.
- The server binds to `127.0.0.1` unless `SERVER_HOST` is explicitly changed.
- Put any non-local deployment behind authenticated TLS and a trusted firewall.
- `/health` is public and returns no configuration. `/api/webhook` uses
  Fireblocks signature verification. Every other API and documentation route
  requires the server API key.
- Never place mnemonics, Fireblocks private keys, provider keys, or signed CBOR
  in source control, logs, CI inputs, or issue reports.
- Keep mainnet Fireblocks workspaces and CI environments approval-protected.

See the README's security section for configuration and threat boundaries.
