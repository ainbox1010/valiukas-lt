import re


_BANNED_TOPICS = re.compile(
    r"\b(sex|porn|nsfw|nude|nudes|drugs|cocaine|heroin|meth|illegal|crime)\b",
    re.IGNORECASE,
)


def is_disallowed_topic(message: str) -> bool:
    return _BANNED_TOPICS.search(message) is not None


# Short affirmative replies that may be follow-ups to "Would you like me to dive deeper?" etc.
# Treat as in-scope so we don't refuse; let the LLM handle (may ask for clarification without history).
_FOLLOWUP_AFFIRMATIVE = re.compile(
    r"^(yes|yeah|yep|yup|yea|sure|please|ok|okay|go ahead|go on|absolutely|definitely|of course|continue|expand|more|tell me more|elaborate)(\s+please)?\.?$",
    re.IGNORECASE,
)


def is_followup_affirmative(message: str) -> bool:
    """True if message is a short affirmative that could be a follow-up reply."""
    return _FOLLOWUP_AFFIRMATIVE.match(message.strip()) is not None


def is_in_scope(message: str) -> bool:
    if is_followup_affirmative(message):
        return True
    lowered = message.lower()
    keywords = [
        "tomas",
        "valiukas",
        "you",
        "your",
        "ai me",
        "experience",
        "projects",
        "work",
        "background",
        "this site",
        "this website",
        "dev stack",
        "tech stack",
        "architecture",
        "stack",
        "partner",
        "partners",
        "erobot",
        "beelogic",
        "darius",
        "gudaciauskas",
    ]
    if any(kw in lowered for kw in keywords):
        return True
    if re.search(r"how\s+(was|is)\s+.*(built|made|created)", lowered):
        return True
    return False
