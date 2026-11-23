"""USDA FoodData Central SR Legacy (April 2018) lookups for the seeders: `usda.py find rice brown cooked` lists matching foods with
their energy, `usda.py show 168878` prints one food's per-100 g nutrients in the catalogue's JSON shape. The CSV directory is read from
USDA_SR_DIR (the unzipped FoodData_Central_sr_legacy_food_csv_2018-04 folder). Public domain data; nothing here invents a number."""
import csv, json, os, sys

DIR = os.environ.get("USDA_SR_DIR", "")
NUTRIENTS = {1008: "kcal", 1003: "protein_g", 1004: "fat_g", 1005: "carb_g", 1079: "fibre_g", 2000: "sugar_g", 1258: "sat_fat_g", 1093: "sodium_mg", 1092: "potassium_mg", 1089: "iron_mg", 1087: "calcium_mg"}


def foods():
    with open(os.path.join(DIR, "food.csv"), newline="", encoding="utf-8") as handle:
        return {row["fdc_id"]: row["description"] for row in csv.DictReader(handle)}


def per100(fdc_id):
    out = {key: None for key in NUTRIENTS.values()}
    with open(os.path.join(DIR, "food_nutrient.csv"), newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["fdc_id"] == str(fdc_id) and row["nutrient_id"].isdigit() and int(row["nutrient_id"]) in NUTRIENTS:
                out[NUTRIENTS[int(row["nutrient_id"])]] = float(row["amount"])
    return out


if __name__ == "__main__":
    command, rest = sys.argv[1], sys.argv[2:]
    names = foods()
    if command == "find":
        words = [word.lower() for word in rest]
        hits = [(fid, desc) for fid, desc in names.items() if all(word in desc.lower() for word in words)]
        for fid, desc in hits[:40]:
            print(fid, "|", desc)
    elif command == "show":
        for fid in rest:
            print(fid, names.get(fid), json.dumps(per100(fid)))
