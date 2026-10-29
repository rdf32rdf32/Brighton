#!/usr/bin/env python3
"""Update the public match-results overlay from ESPN final match records."""
import datetime as dt
import json
import pathlib
import re
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "albion-data-r78.js"
OUT = ROOT / "auto-results.js"
LEAGUES = {
    "Premier League": "eng.1",
    "Carabao Cup": "eng.league_cup",
    "EFL Cup": "eng.league_cup",
    "UEFA Conference League": "uefa.europa.conf",
    "FA Cup": "eng.fa",
}

def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"\b(?:football|club|fc|afc|fk|cf|sc|town)\b", "", value.lower())
    return re.sub(r"[^a-z0-9]", "", value)

def team_is_brighton(team):
    return str(team.get("id", "")) == "331" or "brighton" in normalize(team.get("displayName", ""))

def load_fixtures():
    source = DATA.read_text(encoding="utf-8")
    body = source.split("Object.freeze(", 1)[1].rsplit(");", 1)[0]
    return json.loads(body)["fixtures"]

def fetch_events(league, start, end):
    url = ("https://site.api.espn.com/apis/site/v2/sports/soccer/"
           + league + "/scoreboard?dates=" + start + "-" + end + "&limit=500")
    request = urllib.request.Request(url, headers={"User-Agent": "AlbionFanHub/1.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response).get("events", [])

def main():
    fixtures = load_fixtures()
    today = dt.datetime.now(dt.timezone.utc).date()
    begin = (today - dt.timedelta(days=21)).strftime("%Y%m%d")
    end = (today + dt.timedelta(days=1)).strftime("%Y%m%d")
    events = {}
    successful = 0
    for league in set(LEAGUES.values()):
        try:
            events[league] = fetch_events(league, begin, end)
            successful += 1
        except Exception as exc:
            print("Feed failed for", league, str(exc))
    if not successful:
        raise RuntimeError("No score feeds accessible; preserving prior results")
    current = OUT.read_text(encoding="utf-8")
    start_mark = "/* RESULTS_START */"
    end_mark = "/* RESULTS_END */"
    match = re.search(r"const changes = (\[[\s\S]*?\]);", current)
    previous = json.loads(match.group(1)) if match else []
    accepted = { (x["date"],x["competition"],x["venue"],x["opponent"]): x for x in previous }
    new_count = 0
    for fixture in fixtures:
        if isinstance(fixture.get("albionGoals"), int) and isinstance(fixture.get("opponentGoals"), int):
            continue
        league = LEAGUES.get(fixture.get("competition"))
        if not league or league not in events:
            continue
        try:
            date = dt.datetime.strptime(fixture["date"], "%d %b %Y").date()
        except (ValueError, KeyError):
            continue
        if not (today - dt.timedelta(days=21) <= date <= today):
            continue
        for event in events[league]:
            if not event.get("status", {}).get("type", {}).get("completed"):
                continue
            try:
                event_day = dt.datetime.fromisoformat(event["date"].replace("Z", "+00:00")).date()
                entries = event["competitions"][0]["competitors"]
                if len(entries) != 2 or abs((event_day - date).days) > 1:
                    continue
                ours = next(c for c in entries if team_is_brighton(c["team"]))
                theirs = next(c for c in entries if c is not ours)
                actual = normalize(theirs["team"].get("displayName", ""))
                expected = normalize(fixture["opponent"])
                if not actual or not expected or (actual not in expected and expected not in actual):
                    continue
                if (ours["homeAway"] == "home") != (fixture["venue"] == "H"):
                    continue
                home_score = int(ours["score"])
                away_score = int(theirs["score"])
                if not (0 <= home_score <= 25 and 0 <= away_score <= 25):
                    continue
                event_id = str(event["id"])
                if not re.fullmatch(r"\d{6,15}", event_id):
                    continue
                key = (fixture["date"],fixture["competition"],fixture["venue"],fixture["opponent"])
                accepted[key] = dict(date=key[0], competition=key[1], venue=key[2],
                                     opponent=key[3], albionGoals=home_score,
                                     opponentGoals=away_score, eventId=event_id,
                                     checkedISO=today.isoformat())
                new_count += 1
                break
            except (KeyError, ValueError, TypeError, StopIteration):
                continue
    payload = json.dumps(list(accepted.values()), ensure_ascii=False, indent=2)
    replacement = start_mark + "\nconst changes = " + payload + ";\n" + end_mark
    updated = re.sub(re.escape(start_mark)+r"[\s\S]*?"+re.escape(end_mark),
                     lambda _: replacement, current, count=1)
    if updated == current:
        print("No new changes.")
    else:
        OUT.write_text(updated, encoding="utf-8")
        print("Updated auto-results.js with", new_count, "new confirmed results")

if __name__ == "__main__":
    main()
