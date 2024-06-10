from micropython import const
from scratch import runtime
import websockets
import ntptime
import hashlib
import base64
import json
import hmac
import time

SPARKAI_HOST = "spark-api.xf-yun.com"
SPARKAI_PATHNAME = "/v1.1/chat"
SPARKAI_APP_ID = "db45f79e"
SPARKAI_API_SECRET = "MWFiNjVmNDA4YjNhODFkZGE0MGQ1YWRj"
SPARKAI_API_KEY = "6a3dfe79b9e9ec588ca65bf3b9d9c847"
SPARKAI_DOMAIN = "general"
SPARKAI_TEMPERATURE = const(0.1)  # 0.1 ~ 1
SPARKAI_MAX_TOKENS = const(200)  # 1 token = 1.5 chinese or 0.8 english
SPARKAI_TOP_K = const(1)  # 1 ~ 6

# Weekday and month names for HTTP date/time formatting; always English!
WEEKDAYNAME = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MONTHNAME = [
    None,  # Dummy so we can use 1-based month numbers
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

TIMESTAMP_2024 = time.mktime((2024, 1, 1, 0, 0, 0, 1, 366))


def format_date_time(timestamp):
    # (year, month, mday, hour, minute, second, weekday, yearday)
    year, month, mday, hour, minute, second, weekday, _ = time.gmtime(timestamp)
    return "%s, %02d %3s %4d %02d:%02d:%02d GMT" % (
        WEEKDAYNAME[weekday],
        mday,
        MONTHNAME[month],
        year,
        hour,
        minute,
        second,
    )


def create_url():
    timestamp = time.time()
    if timestamp < TIMESTAMP_2024:
        # sync world time
        ntptime.settime()
        timestamp = time.time()
    date = format_date_time(timestamp)

    signature_raw = f"host: {SPARKAI_HOST}\n"
    signature_raw += f"date: {date}\n"
    signature_raw += f"GET {SPARKAI_PATHNAME} HTTP/1.1"

    signature_sha = hmac.new(
        SPARKAI_API_SECRET.encode("utf-8"),
        signature_raw.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    signature_sha_base64 = base64.b64encode(signature_sha).decode("utf-8")

    authorization_raw = f'api_key="{SPARKAI_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'
    authorization = base64.b64encode(authorization_raw.encode("utf-8")).decode("utf-8")

    return f"wss://{SPARKAI_HOST}{SPARKAI_PATHNAME}?authorization={authorization}&date={date}&host={SPARKAI_HOST}".replace(
        " ", "%20"
    )


def dump_data(content, prompts=[]):
    data = {
        "header": {
            "app_id": SPARKAI_APP_ID,
            "uid": SPARKAI_APP_ID,
        },
        "parameter": {
            "chat": {
                "domain": SPARKAI_DOMAIN,
                "temperature": SPARKAI_TEMPERATURE,
                "max_tokens": SPARKAI_MAX_TOKENS,
                "top_k": SPARKAI_TOP_K,
            }
        },
        "payload": {
            "message": {
                "text": [
                    {"role": "user", "content": content},
                ]
            }
        },
    }
    return json.dumps(data)


def sender(data, result):
    try:
        url = create_url()
    except:
        result["done"] = True
        return

    ws = websockets.connect(url)
    ws.send(data)

    message = ""
    while True:
        resp = ws.recv()
        data = json.loads(resp)
        if data["header"]["code"] != 0:
            result["done"] = True
            break
        message += "".join(
            map(lambda s: s["content"], data["payload"]["choices"]["text"])
        )
        if data["header"]["status"] == 2:
            ws.close()
            result["message"] = message
            result["done"] = True
            break


brains = {}
brain_worker = runtime.create_worker(sender)


def set_prompt(id, prompt):
    brains.setdefault(id, {})
    brains[id].setdefault("prompts", [])
    brains[id]["prompts"].append(prompt)


def clear_prompt(id):
    brains.setdefault(id, {})
    brains[id]["prompts"] = []


async def ask_brain(id, content):
    if not runtime.wifi_connected or not content:
        return ""

    brains.setdefault(id, {})
    prompts = brains[id].get("prompts", [])

    data = dump_data(content, prompts)
    result = {"done": False, "message": ""}
    brain_worker.start(data, result)
    brains[id]["result"] = result

    while not result["done"]:
        await runtime.next_tick()
    brain_worker.stop()


def brain_answer(id):
    brains.setdefault(id, {})
    return brains[id]["result"]["message"] or ""
