"""Unit tests for retrieval tweaks: short follow-up composition, methodology intent, business discovery."""

import pytest

from app.api.chat import _is_short_narrowing_reply, _retrieval_query
from app.rag.retrieval import (
    _detect_methodology_intent,
    _is_business_discovery_query,
)


class TestIsShortNarrowingReply:
    """Short narrowing replies trigger composition; question starters do not."""

    def test_single_word_narrowing(self):
        assert _is_short_narrowing_reply("inventory") is True
        assert _is_short_narrowing_reply("documents") is True
        assert _is_short_narrowing_reply("orders") is True

    def test_two_words_narrowing(self):
        assert _is_short_narrowing_reply("inventory management") is True

    def test_three_words_narrowing(self):
        assert _is_short_narrowing_reply("documents and spreadsheets") is True

    def test_question_starter_excluded(self):
        assert _is_short_narrowing_reply("how") is False
        assert _is_short_narrowing_reply("what") is False
        assert _is_short_narrowing_reply("why") is False
        assert _is_short_narrowing_reply("when") is False
        assert _is_short_narrowing_reply("where") is False
        assert _is_short_narrowing_reply("who") is False

    def test_three_words_question_starter_excluded(self):
        assert _is_short_narrowing_reply("what about that") is False
        assert _is_short_narrowing_reply("how do I") is False

    def test_more_than_three_words(self):
        assert _is_short_narrowing_reply("tell me about inventory") is False

    def test_empty_or_whitespace(self):
        assert _is_short_narrowing_reply("") is False
        assert _is_short_narrowing_reply("   ") is False


class TestRetrievalQuery:
    """Composition uses last substantive message + current when follow-up."""

    def test_short_narrowing_composes(self):
        history = [
            {"role": "user", "content": "I run a coffee shop"},
            {"role": "assistant", "content": "Would you like me to dive deeper?"},
            {"role": "user", "content": "inventory"},
        ]
        assert _retrieval_query("inventory", history) == "I run a coffee shop inventory"

    def test_affirmative_composes(self):
        history = [
            {"role": "user", "content": "Tell me about automation"},
            {"role": "assistant", "content": "Sure. Would you like examples?"},
            {"role": "user", "content": "yes"},
        ]
        assert _retrieval_query("yes", history) == "Tell me about automation yes"

    def test_question_starter_no_composition(self):
        history = [
            {"role": "user", "content": "I need help"},
            {"role": "assistant", "content": "What area?"},
            {"role": "user", "content": "how"},
        ]
        # "how" is question starter, not short narrowing -> no composition
        assert _retrieval_query("how", history) == "how"

    def test_long_message_no_composition(self):
        history = [
            {"role": "user", "content": "I run a coffee shop"},
            {"role": "assistant", "content": "..."},
            {"role": "user", "content": "tell me about inventory management"},
        ]
        assert _retrieval_query("tell me about inventory management", history) == "tell me about inventory management"

    def test_no_history_returns_message(self):
        assert _retrieval_query("inventory", []) == "inventory"

    def test_skips_affirmative_when_finding_substantive(self):
        history = [
            {"role": "user", "content": "I run a coffee shop"},
            {"role": "assistant", "content": "..."},
            {"role": "user", "content": "yes"},
            {"role": "assistant", "content": "Which area?"},
            {"role": "user", "content": "inventory"},
        ]
        # Last substantive is "I run a coffee shop", not "yes"
        assert _retrieval_query("inventory", history) == "I run a coffee shop inventory"


class TestMethodologyIntent:
    """Methodology queries should prioritize tomas namespace."""

    def test_methodology_keywords(self):
        assert _detect_methodology_intent("how do you decide if AI is needed") is True
        assert _detect_methodology_intent("what is your framework") is True
        assert _detect_methodology_intent("when do you use RPA") is True
        assert _detect_methodology_intent("tell me about your approach") is True

    def test_non_methodology(self):
        assert _detect_methodology_intent("I run a coffee shop") is False
        assert _detect_methodology_intent("what projects have you done") is False


class TestBusinessDiscoveryQuery:
    """Business discovery queries get guaranteed tomas chunk."""

    def test_business_discovery_phrases(self):
        assert _is_business_discovery_query("I run a coffee shop") is True
        assert _is_business_discovery_query("we import fruits") is True
        assert _is_business_discovery_query("I need help") is True
        assert _is_business_discovery_query("we have too much manual work") is True
        assert _is_business_discovery_query("we do logistics") is True

    def test_not_business_discovery(self):
        assert _is_business_discovery_query("how do you decide") is False
        assert _is_business_discovery_query("what is your background") is False
