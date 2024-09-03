from micropython import const
from language import language_id
from aisdks import sparkai
from scratch import runtime

DIALOGS_LENGTH = const(3)
brains = {}


def set_default(id):
    brains.setdefault(id, {})
    brains[id].setdefault("prompts", [])
    brains[id].setdefault("dialogs", [])
    brains[id].setdefault("result", [])


def set_prompt(id, prompt):
    set_default(id)
    brains[id]["prompts"].append(prompt)


def clear_prompt(id):
    set_default(id)
    brains[id]["prompts"] = []


def get_language():
    if language_id == "en":
        return "英语"
    elif language_id == "jp":
        return "日语"
    elif language_id == "zh-Hans":
        return "简体中文"
    else:
        return "英语"


async def ask(id, content, key=sparkai.SPARKAI_KEY, secret=sparkai.SPARKAI_SECRET):
    if not runtime.wifi_connected or not content:
        return ""

    set_default(id)
    prompts = brains[id].get("prompts", [])
    dialogs = brains[id].get("dialogs", [])

    if len(dialogs) > DIALOGS_LENGTH:
        dialogs.pop(0)
    dialogs.append({"role": "user", "content": content})

    messages = [
        {
            "role": "system",
            "content": f"{'；'.join(prompts)}。请用{get_language()}回答，每次只回答一句话。",
        }
    ]
    messages.extend(dialogs)
    message = await sparkai.ask(messages, key=key, secret=secret)

    if len(dialogs) > DIALOGS_LENGTH:
        dialogs.pop(0)
    dialogs.append({"role": "assistant", content: message})
    brains[id]["dialogs"] = dialogs
    brains[id]["result"] = message


def answer(id):
    set_default(id)
    return brains[id]["result"] or ""
