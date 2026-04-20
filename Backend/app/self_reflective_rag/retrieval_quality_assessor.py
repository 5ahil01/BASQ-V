from typing import List, Dict, Optional
import re
import logging

logger = logging.getLogger(__name__)


class RetrievalQualityAssessor:
    """
    Assesses quality of retrieved business context using multi-dimensional scoring.

    Improvements over baseline:
    - Embedding-based relevance (sentence-transformers) with term-overlap fallback
    - spaCy-based aspect extraction for coverage (with simple fallback)
    - Contradiction-aware coherence scoring
    - Decoupled sufficiency metric with lexical diversity
    - Chunk deduplication before scoring
    - Configurable weights and thresholds
    - Cached embedding model
    """

    DEFAULT_WEIGHTS = {
        "relevance": 0.35,
        "coverage": 0.30,
        "coherence": 0.20,
        "sufficiency": 0.15,
    }

    STOP_WORDS = {
        "the", "a", "an", "is", "are", "was", "were", "of", "for",
        "in", "on", "at", "to", "by", "show", "calculate", "get",
        "list", "what", "how", "when", "where", "who", "why", "and",
        "or", "but", "if", "then", "so", "this", "that", "these",
        "those", "with", "from", "about", "which", "its", "it", "be",
    }

    # Patterns that hint at contradictions when many distinct values appear
    CONTRADICTION_PATTERNS = [
        r"\$[\d,]+(?:\.\d+)?[MBKmk]?",   # monetary values
        r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%",  # percentages
        r"\b(?:Q[1-4]|FY)\s?\d{2,4}\b",   # quarters / fiscal years
    ]

    TREND_WORDS = {"increased", "decreased", "grew", "fell", "declined", "rose", "dropped"}

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        confidence_threshold: float = 0.70,
        dedup_threshold: float = 0.85,
        use_embeddings: bool = True,
        use_spacy: bool = True,
        embedding_model_name: str = "all-MiniLM-L6-v2",
    ):
        """
        Args:
            weights: Scoring weights for each dimension (must sum to 1.0).
            confidence_threshold: Below this overall score, triggers needs_more_retrieval=True.
            dedup_threshold: Jaccard similarity above which chunks are considered duplicates.
            use_embeddings: Whether to use sentence-transformers for relevance scoring.
            use_spacy: Whether to use spaCy for aspect extraction in coverage scoring.
            embedding_model_name: sentence-transformers model to load.
        """
        self.weights = weights or self.DEFAULT_WEIGHTS
        assert abs(sum(self.weights.values()) - 1.0) < 1e-6, "Weights must sum to 1.0"

        self.confidence_threshold = confidence_threshold
        self.dedup_threshold = dedup_threshold

        # ── Embedding model ──────────────────────────────────────────────────
        self._embed_model = None
        if use_embeddings:
            try:
                from sentence_transformers import SentenceTransformer
                self._embed_model = SentenceTransformer(embedding_model_name)
                logger.info("Loaded embedding model: %s", embedding_model_name)
            except ImportError:
                logger.warning(
                    "sentence-transformers not installed. "
                    "Falling back to term-overlap relevance. "
                    "Install with: pip install sentence-transformers"
                )

        # ── spaCy NLP ────────────────────────────────────────────────────────
        self._nlp = None
        if use_spacy:
            try:
                import spacy
                self._nlp = spacy.load("en_core_web_sm")
                logger.info("Loaded spaCy model: en_core_web_sm")
            except (ImportError, OSError):
                logger.warning(
                    "spaCy or en_core_web_sm not available. "
                    "Falling back to stopword-filtered term extraction. "
                    "Install with: pip install spacy && python -m spacy download en_core_web_sm"
                )

    # =========================================================================
    # Public API
    # =========================================================================

    def assess(self, query: str, retrieved_chunks: List[str]) -> Dict:
        """
        Multi-dimensional quality assessment of retrieved chunks.

        Args:
            query: User's query.
            retrieved_chunks: Documents retrieved from the retrieval component.

        Returns:
            {
                'overall_confidence': float (0-1),
                'dimension_scores': {
                    'relevance': float,      # Semantic similarity to query
                    'coverage': float,       # Query aspects covered
                    'coherence': float,      # Chunks consistency / no contradictions
                    'sufficiency': float     # Volume, diversity, completeness
                },
                'needs_more_retrieval': bool,
                'chunk_count_after_dedup': int,
                'assessment_reasoning': str
            }
        """
        if not retrieved_chunks:
            return self._empty_result()

        # Deduplicate before scoring so inflated scores are prevented
        chunks = self.deduplicate_chunks(retrieved_chunks)

        relevance = self.calculate_relevance(query, chunks)
        coverage = self.calculate_coverage(query, chunks)
        coherence = self.calculate_coherence(chunks)
        sufficiency = self.calculate_sufficiency(query, chunks)

        overall = (
            relevance   * self.weights["relevance"] +
            coverage    * self.weights["coverage"] +
            coherence   * self.weights["coherence"] +
            sufficiency * self.weights["sufficiency"]
        )

        needs_more = overall < self.confidence_threshold

        reasons = []
        if relevance   < 0.5: reasons.append("Low relevance to query")
        if coverage    < 0.5: reasons.append("Missing key query aspects")
        if coherence   < 0.5: reasons.append("Potentially contradictory information")
        if sufficiency < 0.5: reasons.append("Insufficient / redundant content")

        return {
            "overall_confidence": round(overall, 3),
            "dimension_scores": {
                "relevance":   round(relevance, 3),
                "coverage":    round(coverage, 3),
                "coherence":   round(coherence, 3),
                "sufficiency": round(sufficiency, 3),
            },
            "needs_more_retrieval": needs_more,
            "chunk_count_after_dedup": len(chunks),
            "assessment_reasoning": ", ".join(reasons) if reasons else "Good quality retrieval",
        }

    # =========================================================================
    # Preprocessing
    # =========================================================================

    def deduplicate_chunks(self, chunks: List[str]) -> List[str]:
        """
        Remove near-duplicate chunks using Jaccard similarity on token sets.
        Preserves order; keeps the first occurrence of similar chunks.
        """
        seen_term_sets: List[set] = []
        unique: List[str] = []

        for chunk in chunks:
            terms = set(re.findall(r"\w+", chunk.lower()))
            if not terms:
                continue

            is_duplicate = False
            for seen in seen_term_sets:
                union = seen | terms
                if not union:
                    continue
                jaccard = len(seen & terms) / len(union)
                if jaccard >= self.dedup_threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                unique.append(chunk)
                seen_term_sets.append(terms)

        return unique

    # =========================================================================
    # Dimension: Relevance
    # =========================================================================

    def calculate_relevance(self, query: str, chunks: List[str]) -> float:
        """
        Semantic relevance of each chunk to the query.

        Primary:  Cosine similarity via sentence-transformers embeddings.
        Fallback: Token-overlap (Jaccard-style) when embeddings unavailable.

        Returns 0.0–1.0 (mean over all chunks).
        """
        if self._embed_model is not None:
            return self._embedding_relevance(query, chunks)
        return self._token_overlap_relevance(query, chunks)

    def _embedding_relevance(self, query: str, chunks: List[str]) -> float:
        from sentence_transformers import util
        import torch

        query_emb = self._embed_model.encode(query, convert_to_tensor=True)
        chunk_embs = self._embed_model.encode(chunks, convert_to_tensor=True)
        # cos_sim returns shape (1, N); take the row and average
        scores = util.cos_sim(query_emb, chunk_embs)[0]
        return float(scores.mean().item())

    def _token_overlap_relevance(self, query: str, chunks: List[str]) -> float:
        query_terms = set(re.findall(r"\w+", query.lower()))
        if not query_terms:
            return 0.0

        scores = []
        for chunk in chunks:
            chunk_terms = set(re.findall(r"\w+", chunk.lower()))
            if not chunk_terms:
                scores.append(0.0)
                continue
            overlap = len(query_terms & chunk_terms) / len(query_terms)
            scores.append(overlap)

        return sum(scores) / len(scores) if scores else 0.0

    # =========================================================================
    # Dimension: Coverage
    # =========================================================================

    def calculate_coverage(self, query: str, chunks: List[str]) -> float:
        """
        Fraction of distinct query aspects present in the retrieved chunks.

        Primary:  Noun-chunk extraction via spaCy.
        Fallback: Stopword-filtered significant terms.

        Returns 0.0–1.0.
        """
        aspects = self._extract_aspects(query)
        if not aspects:
            return 1.0  # No aspects to check → trivially covered

        combined_text = " ".join(chunks).lower()
        covered = sum(
            1 for aspect in aspects
            if aspect.lower() in combined_text
        )
        return covered / len(aspects)

    def _extract_aspects(self, query: str) -> List[str]:
        """Return meaningful query aspects (noun chunks or significant terms)."""
        if self._nlp is not None:
            doc = self._nlp(query)
            aspects = [chunk.text for chunk in doc.noun_chunks]
            if aspects:
                return aspects

        # Fallback: significant tokens after stopword removal
        tokens = re.findall(r"\w+", query.lower())
        return [t for t in tokens if t not in self.STOP_WORDS and len(t) > 2]

    # =========================================================================
    # Dimension: Coherence
    # =========================================================================

    def calculate_coherence(self, chunks: List[str]) -> float:
        """
        Detect incoherence through numerical/trend contradictions.

        Strategy:
        - Penalise when many distinct monetary values / percentages appear
          (suggests conflicting figures for the same entity).
        - Penalise when both upward and downward trend words co-exist.
        - Slightly penalise very low lexical overlap between chunks (totally
          disjoint chunks may be irrelevant / off-topic).

        Returns 0.0–1.0.
        """
        if len(chunks) <= 1:
            return 1.0

        full_text = " ".join(chunks)
        penalty = 0.0

        # Contradictory numerical values
        for pattern in self.CONTRADICTION_PATTERNS:
            matches = re.findall(pattern, full_text)
            unique_values = set(matches)
            if len(unique_values) > 3:   # many distinct values → suspicious
                penalty += 0.15

        # Contradictory trend direction
        words_in_text = set(re.findall(r"\b\w+\b", full_text.lower()))
        up_words   = {"increased", "grew", "rose", "improved", "surged"}
        down_words = {"decreased", "fell", "declined", "dropped", "reduced"}
        has_up   = bool(words_in_text & up_words)
        has_down = bool(words_in_text & down_words)
        if has_up and has_down:
            penalty += 0.15

        # Pairwise lexical overlap penalty for completely disjoint chunks
        overlap_scores = []
        chunk_term_sets = [set(re.findall(r"\w+", c.lower())) for c in chunks]
        for i in range(len(chunk_term_sets)):
            for j in range(i + 1, len(chunk_term_sets)):
                s1, s2 = chunk_term_sets[i], chunk_term_sets[j]
                union = s1 | s2
                if union:
                    overlap_scores.append(len(s1 & s2) / len(union))
        if overlap_scores:
            avg_overlap = sum(overlap_scores) / len(overlap_scores)
            if avg_overlap < 0.05:   # chunks share almost no vocabulary
                penalty += 0.10

        return max(0.0, 1.0 - penalty)

    # =========================================================================
    # Dimension: Sufficiency
    # =========================================================================

    def calculate_sufficiency(self, query: str, chunks: List[str]) -> float:
        """
        Estimate whether the retrieved content is enough to answer the query.

        Components (independent of relevance/coverage to avoid circular scoring):
        - chunk_count_score : more chunks (up to ~5) is better
        - length_score      : total word count (target ~300 words)
        - diversity_score   : lexical diversity across chunks (penalises redundancy)

        Returns 0.0–1.0.
        """
        if not chunks:
            return 0.0

        # How many chunks do we have (ideal ≈ 5)
        chunk_count_score = min(1.0, len(chunks) / 5)

        # Total token volume (ideal ≈ 300 words)
        total_words = sum(len(c.split()) for c in chunks)
        length_score = min(1.0, total_words / 300)

        # Lexical diversity: unique tokens / all tokens across chunks
        diversity_score = self._lexical_diversity(chunks)

        return (
            chunk_count_score * 0.30 +
            length_score      * 0.40 +
            diversity_score   * 0.30
        )

    def _lexical_diversity(self, chunks: List[str]) -> float:
        """
        Ratio of unique terms to total terms across all chunks.
        Low ratio → chunks are repetitive (low diversity → low sufficiency).
        """
        all_term_lists = [re.findall(r"\w+", c.lower()) for c in chunks]
        unique_terms   = set(t for terms in all_term_lists for t in terms)
        total_terms    = sum(len(terms) for terms in all_term_lists)
        return len(unique_terms) / total_terms if total_terms else 0.0

    # =========================================================================
    # Helpers
    # =========================================================================

    @staticmethod
    def _empty_result() -> Dict:
        return {
            "overall_confidence": 0.0,
            "dimension_scores": {
                "relevance":   0.0,
                "coverage":    0.0,
                "coherence":   0.0,
                "sufficiency": 0.0,
            },
            "needs_more_retrieval": True,
            "chunk_count_after_dedup": 0,
            "assessment_reasoning": "No chunks retrieved.",
        }


# =============================================================================
# Quick smoke-test
# =============================================================================
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    assessor = RetrievalQualityAssessor(use_embeddings=False, use_spacy=False)

    query = "What was the revenue growth in Q3 2024?"
    chunks = [
        "In Q3 2024, the company reported revenue of $4.2B, up 12% year-over-year.",
        "Q3 2024 earnings call highlighted strong growth in the cloud segment, which grew 18%.",
        "The CFO noted that operating expenses increased by 8% in Q3 2024.",
    ]

    result = assessor.assess(query, chunks)

    print("\n=== Assessment Result ===")
    print(f"Overall Confidence : {result['overall_confidence']}")
    print(f"Needs More         : {result['needs_more_retrieval']}")
    print(f"Deduped Chunks     : {result['chunk_count_after_dedup']}")
    print(f"Reasoning          : {result['assessment_reasoning']}")
    print("Dimension Scores:")
    for dim, score in result["dimension_scores"].items():
        print(f"  {dim:<12}: {score}")