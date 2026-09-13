# AgentVerify

### Decentralized AI-powered claim verification with GenLayer

AgentVerify is a decentralized claim verification application built on **GenLayer**.

Users submit a factual claim together with a supporting website URL. GenLayer validators independently access the real web source, evaluate the evidence using AI, and reach consensus on the result.

The system produces:

- **VERIFIED** — the evidence supports the claim
- **REJECTED** — the evidence contradicts the claim
- **UNCERTAIN** — the evidence is insufficient or ambiguous
- **Confidence score** from 0–100
- **AI-generated explanation** describing the verification decision

The verification result is stored on-chain and can be retrieved through the AgentVerify contract.

## Why GenLayer?

Traditional blockchains are excellent at deterministic computation, but they cannot natively determine whether information found on a website supports a real-world claim.

AgentVerify uses GenLayer's intelligent-contract capabilities to let validators independently:

1. Access external web information
2. Process natural-language evidence
3. Evaluate claims using AI
4. Reach decentralized consensus on the result

This makes GenLayer useful as a **trust and verification layer for AI agents and applications that depend on real-world information**.

## How it works

User
  │
  ▼
Submit Claim + Source URL
  │
  ▼
AgentVerify Smart Contract
  │
  ▼
GenLayer Validators
  │
  ├── Fetch source from the web
  ├── Analyze evidence with AI
  ├── Determine verdict
  └── Determine confidence
  │
  ▼
GenLayer Consensus
  │
  ▼
VERIFIED / REJECTED / UNCERTAIN
  │
  ▼
Result stored on-chain


## Example

### Claim

> The Eiffel Tower is located in Paris, France.

### Source

`https://www.toureiffel.paris/en`

GenLayer validators independently access and analyze the source.

Example result:

VERIFIED
Confidence: High

Explanation:
The official Eiffel Tower website repeatedly references Paris
and identifies information associated with Paris, France,
providing strong evidence that the Eiffel Tower is located there.

## Features

### Web-based evidence

Instead of relying only on evidence pasted by the user, AgentVerify can evaluate information directly from a submitted website.

### AI-powered evaluation

GenLayer validators use AI to interpret natural-language claims and supporting evidence.

### Decentralized consensus

The verification decision is produced through GenLayer's validator consensus rather than a single centralized AI service.

### Transparent results

The verdict, confidence score, explanation, and source URL are stored and retrievable through the smart contract.

### Simple user experience

The frontend provides a straightforward flow:

**Submit → Verify → Wait for consensus → Review result**


## Smart Contract

The AgentVerify intelligent contract is deployed on:

**GenLayer Studionet**

Contract address:

0x2d43a914816b6718e772FCd67BA3C138EE0c2EB9

The contract supports:

* `submit_claim`
* `verify_claim`
* `get_claim`
* `get_source_url`
* `get_explanation`

## Project Structure

agentverify/
├── app/
│   ├── page.js
│   ├── layout.js
│   └── globals.css
├── public/
├── package.json
├── package-lock.json
└── README.md


## Running locally

Clone the repository and install dependencies:

bash
git clone https://github.com/Mansoordk/agentverify.git
cd agentverify
npm install

Start the development server:

bash
npm run dev

Open:

http://localhost:3000

Connect a wallet configured for **GenLayer Studionet**.


## Technology Stack

* **GenLayer** — intelligent contracts and decentralized AI consensus
* **genlayer-js** — frontend interaction with GenLayer
* **Next.js** — frontend application
* **React** — user interface
* **JavaScript** — application logic
* **GenLayer Studionet** — deployment network


## Verification Flow

1. Connect a wallet.
2. Enter a factual claim.
3. Provide a supporting website URL.
4. Submit the claim.
5. Trigger verification.
6. GenLayer validators independently access the source.
7. Validators evaluate the claim using AI.
8. GenLayer reaches consensus.
9. AgentVerify stores the verdict, confidence, explanation, and source.
10. The frontend displays the finalized result.


## Genlayer Contribution

AgentVerify was built for the **GenLayer Contribution**.

The project demonstrates a practical use case for GenLayer's ability to combine:

* Smart contracts
* External web information
* AI reasoning
* Validator independence
* Decentralized consensus

AgentVerify is designed as a foundation for trustworthy AI agents that need to verify claims before taking actions.


## License

This project is provided for contribution and demonstration purposes.