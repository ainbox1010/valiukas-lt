"""Unit tests for contextual contact CTA detection."""

import pytest

from app.api.chat import _detect_cta


class TestDetectCta:
    """CTA is 'contact' for reach-out/commercial/implementation intent, 'none' otherwise."""

    def test_should_show_cta_reachout(self):
        assert _detect_cta("How can I contact you?") == "contact"
        assert _detect_cta("How can I contact the real you?") == "contact"
        assert _detect_cta("Can we discuss this?") == "contact"
        assert _detect_cta("How do we proceed?") == "contact"
        assert _detect_cta("What is your email?") == "contact"

    def test_should_show_cta_commercial(self):
        assert _detect_cta("What would it cost?") == "contact"
        assert _detect_cta("Can you send me a quote?") == "contact"

    def test_should_show_cta_implementation(self):
        assert _detect_cta("Can you help us implement this?") == "contact"
        assert _detect_cta("Can we work together?") == "contact"
        assert _detect_cta("I want to work with you") == "contact"

    def test_should_show_cta_engagement_build_for_me(self):
        assert _detect_cta("yes but can you build such system for me?") == "contact"
        assert _detect_cta("Can you build this for us?") == "contact"
        assert _detect_cta("Could you implement an automation for me?") == "contact"

    def test_should_show_cta_engagement_help_solve(self):
        assert _detect_cta("Can you help me solve this?") == "contact"
        assert _detect_cta("Could you help us implement the solution?") == "contact"

    def test_should_not_show_cta(self):
        assert _detect_cta("I have a lot of contacts.") == "none"
        assert _detect_cta("My latest contact sent wrong contact details.") == "none"
        assert _detect_cta("What are your core skills?") == "none"
        assert _detect_cta("Tell me about your background.") == "none"
        assert _detect_cta("contact") == "none"  # standalone word excluded
