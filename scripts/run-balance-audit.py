#!/usr/bin/env python3
"""
Combat Balance Audit — Run 6 batteries via batch-simulate endpoint.
Outputs raw JSON results to scripts/balance-audit-results.json.
"""
import urllib.request
import json
import time
import sys

API_BASE = "https://realm-of-crowns.ambitioustree-37a1315e.eastus.azurecontainerapps.io/api"

def api_call(method, path, body=None, token=None):
    url = API_BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=300)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  HTTP {e.code}: {err_body[:300]}")
        return None

def main():
    # Login
    print("Authenticating...")
    login = api_call("POST", "/auth/login", {
        "email": "admin@roc.com",
        "password": "RealmAdmin2026!"
    })
    if not login or "token" not in login:
        print("Login failed!")
        sys.exit(1)
    token = login["token"]
    print("Authenticated.\n")

    # Verify endpoint
    print("Verifying batch-simulate endpoint...")
    test = api_call("POST", "/admin/combat/batch-simulate", {
        "matchups": [{"race": "human", "class": "warrior", "level": 5, "opponent": "Goblin", "iterations": 10}],
        "persist": False
    }, token)
    if not test:
        print("Endpoint test failed!")
        sys.exit(1)
    print(f"  Test OK: {test['totalFights']} fights, {test['results'][0]['winRate']*100:.0f}% win rate\n")

    # Define batteries
    # Note: actual race IDs are lowercase and use in-game names:
    # halfling=harthfolk, tiefling=nethkin, dragonborn=drakonid
    batteries = [
        {
            "name": "Battery 1: Class balance at L1",
            "body": {
                "grid": {
                    "races": ["human"],
                    "classes": ["ALL"],
                    "levels": [1],
                    "monsters": ["Goblin", "Giant Rat", "Slime"],
                    "iterationsPerMatchup": 200
                },
                "persist": True,
                "notes": "Battery 1: Class balance at L1 vs Tier 1 monsters (Human only, isolates class)"
            }
        },
        {
            "name": "Battery 2: Class balance at L5",
            "body": {
                "grid": {
                    "races": ["human"],
                    "classes": ["ALL"],
                    "levels": [5],
                    "monsters": ["Orc Warrior", "Skeleton Warrior", "Giant Spider", "Dire Wolf"],
                    "iterationsPerMatchup": 200
                },
                "persist": True,
                "notes": "Battery 2: Class balance at L5 vs Tier 2 monsters (Human only)"
            }
        },
        {
            "name": "Battery 3: Class balance at L10",
            "body": {
                "grid": {
                    "races": ["human"],
                    "classes": ["ALL"],
                    "levels": [10],
                    "monsters": ["Troll", "Young Dragon", "Lich"],
                    "iterationsPerMatchup": 200
                },
                "persist": True,
                "notes": "Battery 3: Class balance at L10 vs Tier 2-3 monsters (Human only)"
            }
        },
        {
            "name": "Battery 4: Core race balance",
            "body": {
                "grid": {
                    "races": ["human", "elf", "dwarf", "harthfolk", "orc", "nethkin", "drakonid"],
                    "classes": ["warrior"],
                    "levels": [1, 5, 10],
                    "monsters": ["Goblin", "Orc Warrior", "Young Dragon"],
                    "iterationsPerMatchup": 150
                },
                "persist": True,
                "notes": "Battery 4: Core race balance as Warriors at L1/5/10"
            }
        },
        {
            "name": "Battery 5: All 20 races",
            "body": {
                "grid": {
                    "races": ["ALL"],
                    "classes": ["warrior"],
                    "levels": [5],
                    "monsters": ["Orc Warrior", "Giant Spider"],
                    "iterationsPerMatchup": 150
                },
                "persist": True,
                "notes": "Battery 5: All 20 races as L5 Warrior vs Tier 2 monsters"
            }
        },
        {
            "name": "Battery 6: Monster difficulty curve",
            "body": {
                "grid": {
                    "races": ["human"],
                    "classes": ["warrior"],
                    "levels": [1, 3, 5, 7, 10, 15, 20],
                    "monsters": ["ALL"],
                    "iterationsPerMatchup": 100
                },
                "persist": True,
                "notes": "Battery 6: Human Warrior at all level tiers vs all 21 monsters — difficulty curve"
            }
        }
    ]

    all_results = []
    total_fights = 0
    total_duration = 0

    for i, battery in enumerate(batteries):
        print(f"{'='*60}")
        print(f"[{i+1}/6] {battery['name']}")
        print(f"{'='*60}")

        start = time.time()
        result = api_call("POST", "/admin/combat/batch-simulate", battery["body"], token)
        elapsed = time.time() - start

        if not result:
            print(f"  FAILED! Elapsed: {elapsed:.1f}s")
            all_results.append({"name": battery["name"], "error": "Request failed"})
            continue

        fights = result.get("totalFights", 0)
        matchups = result.get("totalMatchups", 0)
        duration = result.get("durationMs", 0)
        total_fights += fights
        total_duration += duration

        print(f"  {matchups} matchups, {fights} fights in {duration}ms (HTTP: {elapsed:.1f}s)")
        print(f"  Overall win rate: {result['summary']['overallPlayerWinRate']*100:.1f}%")
        print(f"  Avg rounds: {result['summary']['avgRounds']}")

        if result.get("errors"):
            print(f"  Errors: {result['errors']}")

        # Print class/race win rates
        if result["summary"].get("classWinRates"):
            rates = result["summary"]["classWinRates"]
            sorted_rates = sorted(rates.items(), key=lambda x: -x[1])
            print(f"  Class win rates: {', '.join(f'{k}:{v*100:.0f}%' for k,v in sorted_rates)}")

        if result["summary"].get("raceWinRates"):
            rates = result["summary"]["raceWinRates"]
            sorted_rates = sorted(rates.items(), key=lambda x: -x[1])
            print(f"  Race win rates: {', '.join(f'{k}:{v*100:.0f}%' for k,v in sorted_rates)}")

        if result["summary"].get("monsterDifficulty"):
            rates = result["summary"]["monsterDifficulty"]
            sorted_rates = sorted(rates.items(), key=lambda x: -x[1])
            print(f"  Monster death rates: {', '.join(f'{k}:{v*100:.0f}%' for k,v in sorted_rates)}")

        all_results.append({
            "name": battery["name"],
            "notes": battery["body"].get("notes", ""),
            "totalMatchups": matchups,
            "totalFights": fights,
            "durationMs": duration,
            "simulationRunId": result.get("simulationRunId"),
            "errors": result.get("errors"),
            "summary": result["summary"],
            "results": result["results"]
        })
        print()

    # Save all results
    output_path = "scripts/balance-audit-results.json"
    with open(output_path, "w") as f:
        json.dump({
            "totalFights": total_fights,
            "totalDurationMs": total_duration,
            "batteries": all_results
        }, f, indent=2)
    print(f"\n{'='*60}")
    print(f"ALL BATTERIES COMPLETE")
    print(f"Total: {total_fights} fights, {total_duration}ms engine time")
    print(f"Results saved to {output_path}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
