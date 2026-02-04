import re


_BANNED_TOPICS = re.compile(
    r"\b(sex|porn|nsfw|nude|nudes|drugs|cocaine|heroin|meth|illegal|crime)\b",
    re.IGNORECASE,
)


def is_disallowed_topic(message: str) -> bool:
    return _BANNED_TOPICS.search(message) is not None


def is_in_scope(message: str) -> bool:
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
    ]
    return any(keyword in lowered for keyword in keywords)
