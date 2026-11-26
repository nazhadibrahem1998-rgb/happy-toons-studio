#!/usr/bin/env python3
"""Deterministic Sharsten layout from the web demo's road sketch. Writes data/layout.json."""
import json
from pathlib import Path

CELL = 2.4
PENT = [(0, 10), (26, 2), (55, 28), (36, 71), (10, 71)]
ROAD_LINES = [
    ("stone", [[17, 29], [17, 31], [19, 31], [19, 29], [17, 29]]),
    ("stone", [[17, 29], [14, 26], [10, 22], [6, 16], [2, 12], [0, 10]]),
    ("stone", [[19, 30], [24, 30], [30, 31], [38, 30], [46, 30], [55, 30]]),
    ("stone", [[18, 31], [19, 36], [20, 44], [21, 54], [22, 62], [22, 71]]),
    ("stone", [[19, 29], [22, 24], [26, 16], [28, 8], [28, 4]]),
    ("stone", [[28, 4], [32, 8], [34, 14], [32, 20], [28, 26], [22, 29]]),
    ("dirt", [[17, 30], [14, 30], [12, 30]]),
    ("dirt", [[24, 28], [28, 22], [32, 16]]),
    ("dirt", [[19, 31], [21, 32], [20, 35], [23, 36], [22, 39], [25, 41], [23, 44]]),
    ("dirt", [[21, 32], [24, 33], [26, 31], [28, 34], [26, 37]]),
    ("dirt", [[23, 36], [26, 38], [24, 40], [27, 42]]),
    ("dirt", [[17, 31], [15, 33], [16, 36], [14, 38]]),
]


def inside(x, z):
    ins = False
    j = len(PENT) - 1
    for i in range(len(PENT)):
        xi, zi = PENT[i]
        xj, zj = PENT[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / ((zj - zi) or 1e-9) + xi:
            ins = not ins
        j = i
    return ins


def w(gx, gz):
    return [round(gx * CELL, 2), round(gz * CELL, 2)]


roads = {}


def trace(kind, x0, z0, x1, z1):
    x, z = x0, z0
    sx = (x1 > x0) - (x1 < x0)
    sz = (z1 > z0) - (z1 < z0)

    def paint(gx, gz):
        prev = roads.get((gx, gz))
        if prev == "stone":
            return
        roads[(gx, gz)] = kind

    paint(x, z)
    guard = 0
    while (x != x1 or z != z1) and guard < 400:
        guard += 1
        if x != x1 and (z == z1 or abs(x1 - x) >= abs(z1 - z)):
            x += sx
        else:
            z += sz
        paint(x, z)


for kind, pts in ROAD_LINES:
    for i in range(len(pts) - 1):
        trace(kind, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])

# Mosque courtyard is not a road.
for dx in range(-1, 2):
    for dz in range(-1, 2):
        roads.pop((18 + dx, 30 + dz), None)


def near_road(gx, gz, dist):
    for (rx, rz) in roads:
        if max(abs(rx - gx), abs(rz - gz)) <= dist:
            return True
    return False


cands = []
for gx in range(-1, 58):
    for gz in range(6, 70):
        if (gx, gz) in roads:
            continue
        if not inside(gx + 0.5, gz + 0.5):
            continue
        if not near_road(gx, gz, 3):
            continue
        if near_road(gx, gz, 1):
            continue
        if max(abs(gx - 18), abs(gz - 30)) < 4:
            continue
        cands.append((gx, gz))

picked = []
for gx, gz in cands:
    if all(max(abs(gx - px), abs(gz - pz)) >= 4 for px, pz in picked):
        picked.append((gx, gz))
    if len(picked) >= 24:
        break
if len(picked) < 24:
    for gx, gz in cands:
        if (gx, gz) in picked:
            continue
        if all(max(abs(gx - px), abs(gz - pz)) >= 3 for px, pz in picked):
            picked.append((gx, gz))
        if len(picked) >= 24:
            break

ids = [
    "khola_rut", "hasana_nono", "ama_damshr", "fata_chawpes", "khola_direzh",
    "mam_raso", "hama_kawchkan", "khola_piza", "khola_dom", "baya_kachal",
    "awa_kurzh", "pura_shrin", "mama_qadir", "nabata_bchuk", "smaya_kachal",
    "kwexa_smail", "khana_nasre", "dayka_hapsa", "pira_majid", "haji_wasman",
    "kcha_zenab", "kura_rasho", "gyana", "mullah_husen",
]
assert len(picked) >= len(ids), len(picked)

# Preferred work spots (cell space), hand-authored so quests stay put.
work_cells = {
    "khola_rut": (10, 26),
    "hasana_nono": (22, 13),
    "ama_damshr": (26, 32),
    "fata_chawpes": (21, 37),
    "khola_direzh": (23.4, 35.0),
    "mam_raso": (16.2, 28.2),
    "hama_kawchkan": (22.2, 35.2),
    "khola_piza": (40, 31),
    "khola_dom": (46, 34),
    "baya_kachal": (14, 22),
    "awa_kurzh": (19, 13),
    "pura_shrin": (27.2, 12.2),
    "mama_qadir": (41.5, 31.4),
    "nabata_bchuk": (20, 33),
    "smaya_kachal": (8, 18),
    "kwexa_smail": (15, 34),
    "khana_nasre": (20, 39),
    "dayka_hapsa": (29.2, 12.6),
    "pira_majid": (16, 36),
    "haji_wasman": (25.2, 32.4),
    "kcha_zenab": (19, 34),
    "kura_rasho": (21, 40),
    "gyana": (18, 33),
    "mullah_husen": (18.2, 28.4),
}
walkers = {"khola_rut", "smaya_kachal", "gyana", "kura_rasho", "nabata_bchuk", "kwexa_smail"}

homes = []
npcs = []
for i, nid in enumerate(ids):
    hx, hz = picked[i]
    wx, wz = work_cells[nid]
    entry = {
        "id": nid,
        "home": w(hx, hz),
        "work": w(wx, wz),
        "yaw": round((i * 0.7) % 6.28318 - 3.14, 3),
    }
    if nid in walkers:
        entry["walk"] = True
    npcs.append(entry)
    homes.append({"id": "house_%s" % nid, "at": w(hx, hz), "style": i % 5, "resident": nid})

stone_tiles = [w(gx, gz) for (gx, gz), k in sorted(roads.items()) if k == "stone"]
dirt_tiles = [w(gx, gz) for (gx, gz), k in sorted(roads.items()) if k == "dirt"]

# A calm loop along the north-south stone road for walkers.
loop = []
for gz in range(14, 62, 2):
    loop.append(w(20, gz))
for gz in range(60, 14, -2):
    loop.append(w(16, gz))

spots = {
    "start": {"x": 12.0, "z": 43.2},
    "stump": {"x": 16.8, "z": 45.6},
    "carpenter": {"x": 52.8, "z": 86.4},
    "clay_wheel": {"x": 19.2, "z": 96.0},
    "stone_bench": {"x": 110.4, "z": 79.2},
    "trade": {"x": 60.0, "z": 79.2},
    "spoon_bench": {"x": 54.24, "z": 84.48},
    "tandoor": {"x": 58.8, "z": 77.28},
    "spring": {"x": 67.2, "z": 28.8},
    "braid_spot": {"x": 68.64, "z": 29.76},
    "cup_spot": {"x": 59.52, "z": 78.24},
    "fence_spot": {"x": 57.6, "z": 33.6},
    "mosque": {"x": 43.2, "z": 72.0},
    "echo_a": {"x": 28.8, "z": 36.0},
    "echo_b": {"x": 86.4, "z": 52.8},
    "note_mosque": {"x": 44.16, "z": 75.6},
    "note_pasture": {"x": 55.2, "z": 36.0},
    "note_echo": {"x": 30.2, "z": 37.4},
    "altar": {"x": 67.2, "z": -4.8},
    "final_start": {"x": 67.2, "z": 8.4, "yaw": 0.0},
    "gate": {"x": 67.2, "z": 12.0},
    "ore": {"x": 120.0, "z": 86.4},
}

nodes = [
    {"id": "wood_start_a", "kind": "wood", "item": "wood", "amount": 2, "at": [14.4, 40.8]},
    {"id": "wood_start_b", "kind": "wood", "item": "wood", "amount": 2, "at": [20.0, 48.0]},
    {"id": "wood_c", "kind": "wood", "item": "wood", "amount": 2, "at": [10.0, 28.0]},
    {"id": "wood_d", "kind": "wood", "item": "wood", "amount": 2, "at": [33.6, 24.0]},
    {"id": "wood_e", "kind": "wood", "item": "wood", "amount": 2, "at": [96.0, 60.0]},
    {"id": "wood_f", "kind": "wood", "item": "wood", "amount": 2, "at": [40.0, 120.0]},
    {"id": "wood_g", "kind": "wood", "item": "wood", "amount": 2, "at": [78.0, 110.0]},
    {"id": "wood_h", "kind": "wood", "item": "wood", "amount": 2, "at": [24.0, 100.0]},
    {"id": "stone_a", "kind": "stone", "item": "stone", "amount": 2, "at": [100.8, 74.0]},
    {"id": "stone_b", "kind": "stone", "item": "stone", "amount": 2, "at": [108.0, 86.0]},
    {"id": "stone_c", "kind": "stone", "item": "stone", "amount": 2, "at": [114.0, 70.0]},
    {"id": "stone_d", "kind": "stone", "item": "stone", "amount": 2, "at": [36.0, 18.0]},
    {"id": "stone_e", "kind": "stone", "item": "stone", "amount": 2, "at": [88.0, 40.0]},
    {"id": "clay_a", "kind": "clay", "item": "clay", "amount": 2, "at": [16.8, 92.0]},
    {"id": "clay_b", "kind": "clay", "item": "clay", "amount": 2, "at": [22.0, 100.0]},
    {"id": "clay_c", "kind": "clay", "item": "clay", "amount": 2, "at": [14.0, 104.0]},
    {"id": "clay_d", "kind": "clay", "item": "clay", "amount": 2, "at": [28.0, 90.0]},
    {"id": "fibre_a", "kind": "fibre", "item": "fibre", "amount": 2, "at": [62.0, 34.0]},
    {"id": "fibre_b", "kind": "fibre", "item": "fibre", "amount": 2, "at": [72.0, 32.0]},
    {"id": "fibre_c", "kind": "fibre", "item": "fibre", "amount": 2, "at": [18.0, 70.0]},
    {"id": "herb_a", "kind": "herb", "item": "fibre", "amount": 2, "herb": True, "at": [50.0, 30.0]},
    {"id": "herb_b", "kind": "herb", "item": "fibre", "amount": 2, "herb": True, "at": [74.0, 26.0]},
    {"id": "herb_c", "kind": "herb", "item": "fibre", "amount": 2, "herb": True, "at": [40.0, 50.0]},
    {"id": "hide_a", "kind": "hide", "item": "hide", "amount": 1, "at": [46.0, 30.0]},
    {"id": "hide_b", "kind": "hide", "item": "hide", "amount": 1, "at": [50.5, 28.5]},
    {"id": "hide_c", "kind": "hide", "item": "hide", "amount": 1, "at": [44.0, 34.0]},
    {"id": "rug_a", "kind": "found", "item": "worn_rug", "amount": 1, "at": [18.5, 47.5]},
    {"id": "basket_a", "kind": "found", "item": "old_basket", "amount": 1, "at": [48.0, 80.0]},
    {"id": "pot_a", "kind": "found", "item": "broken_pot", "amount": 1, "at": [22.0, 98.0]},
    {"id": "jug_a", "kind": "found", "item": "cracked_jug", "amount": 1, "at": [64.0, 40.0]},
    {"id": "basket_b", "kind": "found", "item": "old_basket", "amount": 1, "at": [90.0, 70.0]},
    {"id": "rug_b", "kind": "found", "item": "worn_rug", "amount": 1, "at": [36.0, 110.0]},
    {"id": "ore_a", "kind": "ore", "item": "iron_ore", "amount": 0, "locked": True, "at": [120.0, 86.4]},
    {"id": "ore_b", "kind": "ore", "item": "iron_ore", "amount": 0, "locked": True, "at": [116.0, 92.0]},
]

runes = [
    {"id": "rune_1", "flag": "rune_1", "at": [28.8, 16.8]},
    {"id": "rune_2", "flag": "rune_2", "at": [115.2, 48.0]},
    {"id": "rune_3", "flag": "rune_3", "at": [48.0, 144.0]},
]

notes = [
    {"id": "mosque_clay", "at": spots["note_mosque"]},
    {"id": "pasture_fence", "at": spots["note_pasture"]},
    {"id": "echo_grove", "at": spots["note_echo"]},
    {"id": "unmake_note", "at": [20.2, 50.4]},
]

stations = [
    {"id": "stump", "kind": "stump", "at": [16.8, 45.6]},
    {"id": "carpenter", "kind": "carpenter", "at": [52.8, 86.4]},
    {"id": "clay_wheel", "kind": "clay", "at": [19.2, 96.0]},
    {"id": "stone_bench", "kind": "stone", "at": [110.4, 79.2]},
    {"id": "trade", "kind": "trade", "at": [60.0, 79.2]},
]

layout = {
    "cell": CELL,
    "bounds": {"min_x": -4.0, "max_x": 148.0, "min_z": -16.0, "max_z": 184.0},
    "start": {"x": 12.0, "y": 0.0, "z": 43.2, "yaw": 0.4},
    "final_start": {"x": 67.2, "y": 0.0, "z": 8.4, "yaw": 0.0},
    "spots": spots,
    "roads": {"stone": stone_tiles, "dirt": dirt_tiles},
    "walk_loop": loop,
    "houses": homes,
    "npcs": npcs,
    "nodes": nodes,
    "runes": runes,
    "notes": notes,
    "stations": stations,
    "echoes": [spots["echo_a"], spots["echo_b"]],
    "puzzle_hooks": [
        {"id": "star_spring_circle", "x": 67.2, "z": -2.0, "radius": 3.0}
    ],
}
out = Path(__file__).resolve().parents[1] / "data" / "layout.json"
out.write_text(json.dumps(layout, indent=2) + "\n")
print("houses", len(homes), "roads", len(stone_tiles), len(dirt_tiles), "npcs", len(npcs))
