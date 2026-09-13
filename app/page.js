"use client";

import { useEffect, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

const CONTRACT =
  "0x2d43a914816b6718e772FCd67BA3C138EE0c2EB9";

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");
  const [claimId, setClaimId] = useState("");
  const [result, setResult] = useState(null);
  const [claims, setClaims] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask or another browser wallet is required."
        );
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts?.length) {
        throw new Error("No wallet account found.");
      }

      setWallet(accounts[0]);
      setStatus("Wallet connected.");
    } catch (error) {
      console.error(error);
      setStatus(
        error?.message || "Failed to connect wallet."
      );
    }
  }

  function getWriteClient() {
    if (!wallet) {
      throw new Error("Connect your wallet first.");
    }

    return createClient({
      chain: studionet,
      account: wallet,
      provider: window.ethereum,
    });
  }

  function getReadClient() {
    return createClient({
      chain: studionet,
    });
  }

  async function ensureStudioNetwork(client) {
    await client.connect("studionet");
  }

  async function submitClaim() {
    if (!claim.trim()) {
      setStatus("Enter a claim.");
      return;
    }

    if (!evidence.trim()) {
      setStatus("Enter supporting evidence.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Preparing transaction...");

      const client = getWriteClient();

      await ensureStudioNetwork(client);

      const txId = await client.writeContract({
        address: CONTRACT,
        functionName: "submit_claim",
        args: [
          claim.trim(),
          evidence.trim(),
        ],
      });

      setStatus(
        "Claim submitted. Waiting for confirmation..."
      );

      const receipt =
        await client.waitForTransactionReceipt({
          hash: txId,
        });

      if (
        receipt?.txExecutionResultName &&
        receipt.txExecutionResultName !==
          "FINISHED_WITH_RETURN"
      ) {
        throw new Error(
          `Transaction failed: ${
            receipt?.statusName ||
            receipt?.txExecutionResultName ||
            "unknown status"
          }`
        );
      }

      setStatus("Claim created successfully.");

      setClaim("");
      setEvidence("");

      await loadClaims();
    } catch (error) {
      console.error(error);
      setStatus(
        error?.message ||
          "Failed to submit claim."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyClaim() {
    if (claimId === "") {
      setStatus("Enter a claim ID.");
      return;
    }

    const numericClaimId = Number(claimId);

    if (
      !Number.isInteger(numericClaimId) ||
      numericClaimId < 0
    ) {
      setStatus("Claim ID must be a valid number.");
      return;
    }

    try {
      setLoading(true);
      setStatus(
        "Starting GenLayer verification..."
      );

      const client = getWriteClient();

      await ensureStudioNetwork(client);

      const txId = await client.writeContract({
        address: CONTRACT,
        functionName: "verify_claim",
        args: [numericClaimId],
      });

      setStatus(
        "GenLayer validators are evaluating the claim..."
      );

      const receipt =
        await client.waitForTransactionReceipt({
          hash: txId,
        });

      if (
        receipt?.txExecutionResultName &&
        receipt.txExecutionResultName !==
          "FINISHED_WITH_RETURN"
      ) {
        throw new Error(
          `Verification failed: ${
            receipt?.statusName ||
            receipt?.txExecutionResultName ||
            "unknown status"
          }`
        );
      }

      setStatus("Verification finalized.");

      await loadClaim(numericClaimId);
      await loadClaims();
    } catch (error) {
      console.error(error);
      setStatus(
        error?.message ||
          "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadClaim(id) {
    try {
      const client = getReadClient();

      const data = await client.readContract({
        address: CONTRACT,
        functionName: "get_claim",
        args: [Number(id)],
        transactionHashVariant:
          TransactionHashVariant.LATEST_FINAL,
      });

      const parsed =
        typeof data === "string"
          ? JSON.parse(data)
          : data;

      setResult(parsed);
      setClaimId(String(id));

      return parsed;
    } catch (error) {
      console.error(error);
      setStatus(
        error?.message ||
          "Could not load claim."
      );
    }
  }

  async function loadClaims() {
    try {
      const client = getReadClient();

      const count = await client.readContract({
        address: CONTRACT,
        functionName: "get_claim_count",
        args: [],
        transactionHashVariant:
          TransactionHashVariant.LATEST_FINAL,
      });

      const total = Number(count);
      const loaded = [];

      for (let i = 0; i < total; i++) {
        try {
          const data =
            await client.readContract({
              address: CONTRACT,
              functionName: "get_claim",
              args: [i],
              transactionHashVariant:
                TransactionHashVariant.LATEST_FINAL,
            });

          const parsed =
            typeof data === "string"
              ? JSON.parse(data)
              : data;

          loaded.push(parsed);
        } catch (error) {
          console.error(
            `Failed to load claim ${i}`,
            error
          );
        }
      }

      setClaims(loaded);

      if (loaded.length > 0) {
        setResult((current) => {
          if (current) {
            return current;
          }

          return loaded[loaded.length - 1];
        });

        setClaimId((current) => {
          if (current !== "") {
            return current;
          }

          return String(
            loaded[loaded.length - 1].id
          );
        });
      }
    } catch (error) {
      console.error(error);
      setStatus(
        error?.message ||
          "Could not load claims."
      );
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <div className="logo">AV</div>

          <div>
            <div className="brandName">
              AgentVerify
            </div>

            <div className="network">
              GenLayer Studionet
            </div>
          </div>
        </div>

        <button
          className="walletButton"
          onClick={connectWallet}
        >
          {wallet
            ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </nav>

      <section className="hero">
        <div className="badge">
          ● GENLAYER INTELLIGENT CONTRACT
        </div>

        <h1>
          Verify claims with
          <span>
            {" "}
            decentralized AI consensus.
          </span>
        </h1>

        <p>
          Submit a claim and supporting
          evidence. GenLayer validators
          independently evaluate the evidence
          and reach a consensus verdict.
        </p>
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <div className="eyebrow">
                NEW VERIFICATION
              </div>

              <h2>Submit a claim</h2>
            </div>
          </div>

          <label>Claim</label>

          <textarea
            value={claim}
            onChange={(e) =>
              setClaim(e.target.value)
            }
            placeholder="Example: This product is made from 100% recycled materials."
          />

          <label>
            Supporting evidence
          </label>

          <textarea
            value={evidence}
            onChange={(e) =>
              setEvidence(e.target.value)
            }
            placeholder="Provide the evidence that supports the claim..."
          />

          <button
            className="primary"
            onClick={submitClaim}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : "Submit claim"}
          </button>
        </div>

        <div className="panel">
          <div className="eyebrow">
            GENLAYER CONSENSUS
          </div>

          <h2>Verify a claim</h2>

          <p className="muted">
            Enter the claim ID created above
            and ask GenLayer validators to
            evaluate it.
          </p>

          <label>Claim ID</label>

          <input
            value={claimId}
            onChange={(e) =>
              setClaimId(e.target.value)
            }
            placeholder="0"
            type="number"
            min="0"
          />

          <button
            className="verify"
            onClick={verifyClaim}
            disabled={loading}
          >
            {loading
              ? "Verifying..."
              : "Run AI verification"}
          </button>
        </div>
      </section>

      <section className="statusBar">
        <div className="statusDot" />
        <span>{status}</span>
      </section>

      {result && (
        <section className="resultSection">
          <div className="sectionTitle">
            <div>
              <div className="eyebrow">
                VERIFICATION RESULT
              </div>

              <h2>
                Claim #{result.id}
              </h2>
            </div>

            <div
              className={`verdict ${
                result.verdict?.toLowerCase() ||
                ""
              }`}
            >
              {result.verdict || "PENDING"}
            </div>
          </div>

          <div className="resultGrid">
            <div className="resultCard large">
              <div className="cardLabel">
                CLAIM
              </div>

              <p>{result.claim}</p>
            </div>

            <div className="resultCard">
              <div className="cardLabel">
                CONFIDENCE
              </div>

              <div className="score">
                {result.score}%
              </div>
            </div>

            <div className="resultCard large">
              <div className="cardLabel">
                SUPPORTING EVIDENCE
              </div>

              <p>{result.evidence}</p>
            </div>

            <div className="resultCard">
              <div className="cardLabel">
                STATUS
              </div>

              <div className="statusValue">
                {result.status}
              </div>
            </div>

            <div className="resultCard explanation">
              <div className="cardLabel">
                GENLAYER EXPLANATION
              </div>

              <p>
                {result.explanation}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="history">
        <div className="eyebrow">
          VERIFICATION HISTORY
        </div>

        <h2>Recent claims</h2>

        {claims.length === 0 ? (
          <div className="empty">
            No claims submitted yet.
          </div>
        ) : (
          <div className="claimList">
            {claims.map((item) => (
              <button
                key={item.id}
                className="claimRow"
                onClick={() =>
                  loadClaim(
                    Number(item.id)
                  )
                }
              >
                <div>
                  <span>
                    #{item.id}
                  </span>

                  <strong>
                    {item.claim}
                  </strong>
                </div>

                <div
                  className={`smallVerdict ${
                    item.verdict?.toLowerCase() ||
                    ""
                  }`}
                >
                  {item.verdict ||
                    item.status}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer>
        <span>AgentVerify</span>

        <span>
          Powered by GenLayer · Studionet
        </span>
      </footer>
    </main>
  );
}