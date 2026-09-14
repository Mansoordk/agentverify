# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class AgentVerify(gl.Contract):
    """
    AgentVerify
    -----------

    AI-powered claim verification with native web evidence.

    Users submit:
        1. A claim
        2. Supporting evidence

    Supporting evidence can be:
        - Plain text
        - A public HTTP/HTTPS URL

    When a URL is supplied, GenLayer validators
    independently retrieve the webpage and evaluate
    its content.

    Possible results:
        VERIFIED
        REJECTED
        UNCERTAIN
    """

    claim_count: u32

    claims: DynArray[str]
    evidence: DynArray[str]
    source_urls: DynArray[str]

    statuses: DynArray[str]
    verdicts: DynArray[str]
    scores: DynArray[u32]
    explanations: DynArray[str]

    def __init__(self):
        self.claim_count = u32(0)

    # ---------------------------------------------------------
    # SUBMIT CLAIM
    # ---------------------------------------------------------

    @gl.public.write
    def submit_claim(
        self,
        claim: str,
        supporting_evidence: str
    ) -> u32:

        if len(claim.strip()) == 0:
            raise ValueError(
                "Claim cannot be empty"
            )

        if len(supporting_evidence.strip()) == 0:
            raise ValueError(
                "Supporting evidence cannot be empty"
            )

        claim_id = self.claim_count

        evidence_value = supporting_evidence.strip()

        source_url = ""

        if (
            evidence_value.startswith("https://")
            or evidence_value.startswith("http://")
        ):
            source_url = evidence_value

        self.claims.append(
            claim.strip()
        )

        self.evidence.append(
            evidence_value
        )

        self.source_urls.append(
            source_url
        )

        self.statuses.append(
            "PENDING"
        )

        self.verdicts.append(
            ""
        )

        self.scores.append(
            u32(0)
        )

        self.explanations.append(
            ""
        )

        self.claim_count = (
            self.claim_count + u32(1)
        )

        return claim_id

    # ---------------------------------------------------------
    # VERIFY CLAIM
    # ---------------------------------------------------------

    @gl.public.write
    def verify_claim(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        if self.statuses[claim_id] == "VERIFIED":
            raise ValueError(
                "Claim has already been verified"
            )

        if self.statuses[claim_id] == "REJECTED":
            raise ValueError(
                "Claim has already been rejected"
            )

        if self.statuses[claim_id] == "UNCERTAIN":
            raise ValueError(
                "Claim has already been resolved"
            )

        claim_text = self.claims[claim_id]
        evidence_value = self.evidence[claim_id]
        source_url = self.source_urls[claim_id]

        # -----------------------------------------------------
        # FETCH + AI EVALUATION
        # -----------------------------------------------------

        def evaluate_claim():

            evidence_content = evidence_value

            # If evidence is a URL, retrieve the actual
            # rendered webpage text.
            if (
                source_url.startswith("https://")
                or source_url.startswith("http://")
            ):

                evidence_content = gl.nondet.web.render(
                    source_url,
                    mode="text",
                    wait_after_loaded="2s"
                )

                if not isinstance(
                    evidence_content,
                    str
                ):
                    evidence_content = str(
                        evidence_content
                    )

                # Keep the prompt reasonably sized.
                evidence_content = (
                    evidence_content[:12000]
                )

            prompt = f"""
You are an independent decentralized
claim verification judge.

Evaluate whether the evidence actually
supports the submitted claim.

CLAIM:
{claim_text}

SOURCE:
{evidence_value}

EVIDENCE CONTENT:
{evidence_content}

IMPORTANT RULES:

1. Evaluate ONLY the supplied evidence.
2. Do not invent facts.
3. Do not assume a claim is true merely
   because the source appears authoritative.
4. If the webpage could not provide enough
   relevant information, use UNCERTAIN.
5. If the evidence directly supports the
   claim, use VERIFIED.
6. If the evidence contradicts the claim,
   use REJECTED.

Return ONLY JSON:

{{
  "verdict": "VERIFIED" | "REJECTED" | "UNCERTAIN",
  "score": 0-100,
  "explanation": "short explanation"
}}

The explanation must briefly explain
why the evidence supports, contradicts,
or fails to establish the claim.
"""

            result = gl.nondet.exec_prompt(
                prompt,
                response_format="json"
            )

            if not isinstance(
                result,
                dict
            ):
                raise ValueError(
                    "LLM did not return an object"
                )

            verdict = str(
                result.get(
                    "verdict",
                    ""
                )
            ).upper()

            if verdict not in (
                "VERIFIED",
                "REJECTED",
                "UNCERTAIN"
            ):
                raise ValueError(
                    "Invalid verdict"
                )

            raw_score = result.get(
                "score",
                0
            )

            try:
                score = int(
                    raw_score
                )
            except (
                ValueError,
                TypeError
            ):
                score = 0

            score = max(
                0,
                min(100, score)
            )

            explanation = str(
                result.get(
                    "explanation",
                    ""
                )
            ).strip()

            if len(explanation) == 0:
                explanation = (
                    "No explanation provided."
                )

            return {
                "verdict": verdict,
                "score": score,
                "explanation": explanation
            }

        # -----------------------------------------------------
        # LEADER
        # -----------------------------------------------------

        def leader_fn():
            return evaluate_claim()

        # -----------------------------------------------------
        # VALIDATOR
        # -----------------------------------------------------

        def validator_fn(
            leader_result
        ):

            if not isinstance(
                leader_result,
                gl.vm.Return
            ):
                return False

            leader_data = (
                leader_result.calldata
            )

            if not isinstance(
                leader_data,
                dict
            ):
                return False

            leader_verdict = (
                leader_data.get(
                    "verdict"
                )
            )

            leader_score = (
                leader_data.get(
                    "score"
                )
            )

            if leader_verdict not in (
                "VERIFIED",
                "REJECTED",
                "UNCERTAIN"
            ):
                return False

            if not isinstance(
                leader_score,
                int
            ):
                return False

            if (
                leader_score < 0
                or leader_score > 100
            ):
                return False

            # Validator independently retrieves
            # the evidence and evaluates it.
            validator_result = evaluate_claim()

            if not isinstance(
                validator_result,
                dict
            ):
                return False

            validator_verdict = (
                validator_result.get(
                    "verdict"
                )
            )

            validator_score = (
                validator_result.get(
                    "score"
                )
            )

            # The verdict MUST agree.
            if (
                validator_verdict
                != leader_verdict
            ):
                return False

            if not isinstance(
                validator_score,
                int
            ):
                return False

            # Confidence may vary between models,
            # but not by more than 20 points.
            return (
                abs(
                    validator_score
                    - leader_score
                )
                <= 20
            )

        # -----------------------------------------------------
        # GENLAYER CONSENSUS
        # -----------------------------------------------------

        result = gl.vm.run_nondet_unsafe(
            leader_fn,
            validator_fn
        )

        if not isinstance(
            result,
            dict
        ):
            raise ValueError(
                "Invalid consensus result"
            )

        final_verdict = str(
            result.get(
                "verdict",
                "UNCERTAIN"
            )
        ).upper()

        final_score = int(
            result.get(
                "score",
                0
            )
        )

        final_explanation = str(
            result.get(
                "explanation",
                ""
            )
        )

        self.statuses[claim_id] = (
            final_verdict
        )

        self.verdicts[claim_id] = (
            final_verdict
        )

        self.scores[claim_id] = u32(
            max(
                0,
                min(100, final_score)
            )
        )

        self.explanations[claim_id] = (
            final_explanation
        )

        return final_verdict

    # ---------------------------------------------------------
    # COMPLETE CLAIM
    # ---------------------------------------------------------

    @gl.public.view
    def get_claim(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        result = {
            "id": claim_id,
            "claim": self.claims[claim_id],
            "evidence": self.evidence[claim_id],
            "source_url": self.source_urls[claim_id],
            "status": self.statuses[claim_id],
            "verdict": self.verdicts[claim_id],
            "score": self.scores[claim_id],
            "explanation": self.explanations[claim_id]
        }

        return json.dumps(
            result
        )

    # ---------------------------------------------------------
    # READ METHODS
    # ---------------------------------------------------------

    @gl.public.view
    def get_claim_count(
        self
    ) -> u32:
        return self.claim_count

    @gl.public.view
    def get_claim_text(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.claims[claim_id]

    @gl.public.view
    def get_evidence(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.evidence[claim_id]

    @gl.public.view
    def get_source_url(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.source_urls[claim_id]

    @gl.public.view
    def get_status(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.statuses[claim_id]

    @gl.public.view
    def get_verdict(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.verdicts[claim_id]

    @gl.public.view
    def get_score(
        self,
        claim_id: u32
    ) -> u32:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.scores[claim_id]

    @gl.public.view
    def get_explanation(
        self,
        claim_id: u32
    ) -> str:

        if claim_id >= self.claim_count:
            raise ValueError(
                "Claim does not exist"
            )

        return self.explanations[claim_id]
