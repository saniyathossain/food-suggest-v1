"""Writes database/seeders/catalog_growth.sql: new categories and subcategories, new foods and new variants of existing foods.
Every nutrient figure is read from the USDA SR Legacy CSV by FoodData Central id (tools/usda.py), never typed here; the id is stored
as the variant's source_ref so any number can be traced. A food with no USDA entry keeps a closest-match note in its name, as the
earlier seeders do. New foods carry no verdicts until reviewed. Output is idempotent (ON CONFLICT DO NOTHING).

    USDA_SR_DIR=/path/to/FoodData_Central_sr_legacy_food_csv_2018-04 python3 growth_catalog.py > ../seeders/catalog_growth.sql
"""
import csv, json, os, sys

import usda

NUT = {}
with open(os.path.join(usda.DIR, "food_nutrient.csv"), newline="", encoding="utf-8") as handle:
    for row in csv.DictReader(handle):
        if row["nutrient_id"].isdigit() and int(row["nutrient_id"]) in usda.NUTRIENTS:
            NUT.setdefault(row["fdc_id"], {})[usda.NUTRIENTS[int(row["nutrient_id"])]] = float(row["amount"])
DESC = usda.foods()


def q(text):
    return "'" + text.replace("'", "''") + "'"


def jb(en, bn):
    return f"jsonb_build_object('en', {q(en)}, 'bn', {q(bn)})"


def per100(fdc):
    found = NUT.get(str(fdc), {})
    if not found:
        raise SystemExit(f"USDA id {fdc} has no nutrients")
    return json.dumps({key: found.get(key) for key in usda.NUTRIENTS.values()})


# ---- structure: (slug, en, bn, sort) ----
CATEGORIES = [("baby", "Baby & toddler food", "শিশুর খাবার", 12), ("functional", "Functional foods", "ফাংশনাল খাবার", 13)]
SUBCATEGORIES = [
    ("baby", "milk-formula", "Breast milk & formula", "মায়ের দুধ ও ফর্মুলা", 0),
    ("baby", "cereals", "Baby cereals", "শিশুর সিরিয়াল", 1),
    ("baby", "purees", "Fruit, vegetable & meat purées", "ফল, সবজি ও মাংসের পিউরি", 2),
    ("baby", "snacks", "Teething biscuits & snacks", "দাঁত ওঠার বিস্কুট ও নাস্তা", 3),
    ("functional", "fermented", "Fermented & probiotic", "গাঁজানো ও প্রোবায়োটিক", 0),
    ("functional", "superfoods", "Seeds, algae & superfoods", "বীজ, শৈবাল ও সুপারফুড", 1),
    ("functional", "leaves-sprouts", "Healing leaves & sprouts", "উপকারী পাতা ও অঙ্কুর", 2),
    ("kitchen", "masala", "Masala blends", "মশলার মিশ্রণ", 10),
    ("kitchen", "pantry", "Pantry & baking", "রান্নাঘরের উপকরণ ও বেকিং", 11),
    ("fruits", "berries", "Berries", "বেরি জাতীয় ফল", 10),
    ("fruits", "citrus-melon", "Citrus & melon", "লেবুজাতীয় ও তরমুজজাতীয় ফল", 11),
]

# ---- new foods: (slug, category, subcategory, origin, en, bn, [(variant slug, en, bn, fdc, method)]) ----
V = lambda slug, en, bn, fdc, method=None: (slug, en, bn, fdc, method)
FOODS = [
    # fruits
    ("fig", "fruits", "imported", "imported", "Fig", "ডুমুর", [V("raw", "Fig, raw", "কাঁচা ডুমুর", 173021, "raw")]),
    ("mulberry", "fruits", "berries", "local", "Mulberry", "তুঁত", [V("raw", "Mulberry, raw", "কাঁচা তুঁত", 169913, "raw")]),
    ("persimmon", "fruits", "imported", "imported", "Persimmon", "জাপানি ফল (পার্সিমন)", [V("raw", "Persimmon, raw", "কাঁচা পার্সিমন", 169941, "raw")]),
    ("passion-fruit", "fruits", "imported", "imported", "Passion fruit", "প্যাশন ফ্রুট", [V("raw", "Passion fruit, raw", "কাঁচা প্যাশন ফ্রুট", 169108, "raw")]),
    ("honeydew", "fruits", "citrus-melon", "imported", "Honeydew melon", "হানিডিউ তরমুজ", [V("raw", "Honeydew, raw", "কাঁচা হানিডিউ", 169911, "raw")]),
    ("mandarin", "fruits", "citrus-melon", "imported", "Mandarin orange", "ম্যান্ডারিন কমলা", [V("raw", "Mandarin, raw", "কাঁচা ম্যান্ডারিন", 169105, "raw"), V("canned", "Mandarin, canned in juice", "রসে ডোবানো টিনের ম্যান্ডারিন", 169106)]),
    ("apricot", "fruits", "imported", "imported", "Apricot", "খুবানি", [V("raw", "Apricot, raw", "কাঁচা খুবানি", 171697, "raw")]),
    ("cherry", "fruits", "imported", "imported", "Sweet cherry", "চেরি", [V("raw", "Cherry, raw", "কাঁচা চেরি", 171719, "raw")]),
    ("blackberry", "fruits", "berries", "imported", "Blackberry", "ব্ল্যাকবেরি", [V("raw", "Blackberry, raw", "কাঁচা ব্ল্যাকবেরি", 173946, "raw")]),
    ("raspberry", "fruits", "berries", "imported", "Raspberry", "রাস্পবেরি", [V("raw", "Raspberry, raw", "কাঁচা রাস্পবেরি", 167755, "raw")]),
    ("cranberry", "fruits", "berries", "imported", "Cranberry", "ক্র্যানবেরি", [V("raw", "Cranberry, raw", "কাঁচা ক্র্যানবেরি", 171722, "raw")]),
    ("olive", "fruits", "imported", "imported", "Olive (ripe, canned)", "জলপাই (পাকা, টিনের)", [V("canned", "Olive, ripe, canned", "পাকা জলপাই, টিনের", 169094)]),
    # oils
    ("coconut-oil", "kitchen", "oils", "local", "Coconut oil", "নারকেল তেল", [V("oil", "Coconut oil", "নারকেল তেল", 171412)]),
    ("sunflower-oil", "kitchen", "oils", "local", "Sunflower oil", "সূর্যমুখী তেল", [V("oil", "Sunflower oil", "সূর্যমুখী তেল", 171025)]),
    ("sesame-oil", "kitchen", "oils", "local", "Sesame oil", "তিলের তেল", [V("oil", "Sesame oil", "তিলের তেল", 171016)]),
    ("peanut-oil", "kitchen", "oils", "local", "Groundnut (peanut) oil", "চীনাবাদামের তেল", [V("oil", "Peanut oil", "চীনাবাদামের তেল", 171410)]),
    ("corn-oil", "kitchen", "oils", "local", "Corn oil", "ভুট্টার তেল", [V("oil", "Corn oil", "ভুট্টার তেল", 171029)]),
    ("canola-oil", "kitchen", "oils", "imported", "Canola oil", "ক্যানোলা তেল", [V("oil", "Canola oil", "ক্যানোলা তেল", 172336)]),
    # masala and whole spices
    ("curry-powder", "kitchen", "masala", "local", "Curry powder (masala blend)", "কারি মশলা", [V("powder", "Curry powder", "কারি গুঁড়া", 170924)]),
    ("chili-powder", "kitchen", "spices", "local", "Red chilli powder (closest match: cayenne)", "লঙ্কাগুঁড়া", [V("powder", "Red or cayenne pepper, ground", "লঙ্কাগুঁড়া (কেয়েন)", 170932)]),
    ("paprika", "kitchen", "spices", "imported", "Paprika", "পেপরিকা", [V("powder", "Paprika", "পেপরিকা গুঁড়া", 171329)]),
    ("coriander-seed", "kitchen", "spices", "local", "Coriander seed (dhonia)", "ধনিয়া", [V("seed", "Coriander seed", "ধনিয়া দানা", 170922)]),
    ("fennel-seed", "kitchen", "spices", "local", "Fennel seed (mouri)", "মৌরি", [V("seed", "Fennel seed", "মৌরি", 171323)]),
    ("mustard-seed", "kitchen", "spices", "local", "Mustard seed (shorshe)", "সরিষা", [V("seed", "Mustard seed, ground", "সরিষা, গুঁড়া", 170929)]),
    ("bay-leaf", "kitchen", "spices", "local", "Bay leaf (tej pata)", "তেজপাতা", [V("dried", "Bay leaf, dried", "শুকনো তেজপাতা", 170917)]),
    ("nutmeg", "kitchen", "spices", "local", "Nutmeg (joyphol)", "জায়ফল", [V("ground", "Nutmeg, ground", "জায়ফল, গুঁড়া", 171326)]),
    ("saffron", "kitchen", "spices", "imported", "Saffron (zafran)", "জাফরান", [V("dried", "Saffron", "জাফরান", 170934)]),
    ("dill-seed", "kitchen", "spices", "local", "Dill seed (sholpha)", "শুলফা", [V("seed", "Dill seed", "শুলফা দানা", 170925)]),
    ("ginger-powder", "kitchen", "spices", "local", "Ginger powder (shuth)", "আদা গুঁড়া (শুঁঠ)", [V("ground", "Ginger, ground", "আদা গুঁড়া", 170926)]),
    ("garlic-powder", "kitchen", "spices", "local", "Garlic powder", "রসুন গুঁড়া", [V("powder", "Garlic powder", "রসুন গুঁড়া", 171325)]),
    ("poppy-seed", "kitchen", "spices", "local", "Poppy seed (posto)", "পোস্তদানা", [V("seed", "Poppy seed", "পোস্তদানা", 171330)]),
    # pantry ingredients
    ("cornstarch", "kitchen", "pantry", "local", "Cornflour (cornstarch)", "কর্নফ্লাওয়ার", [V("dry", "Cornstarch", "কর্নফ্লাওয়ার", 169698)]),
    ("tomato-paste", "kitchen", "pantry", "local", "Tomato paste", "টমেটো পেস্ট", [V("canned", "Tomato paste, no salt added", "টমেটো পেস্ট (লবণ ছাড়া)", 170459)]),
    ("desiccated-coconut", "kitchen", "pantry", "local", "Desiccated coconut (dried, unsweetened)", "শুকনো নারকেল কুরা", [V("dried", "Coconut, dried, unsweetened", "শুকনো নারকেল কুরা (চিনিহীন)", 170170)]),
    ("yeast", "kitchen", "pantry", "local", "Baker's yeast", "ইস্ট (খামির)", [V("compressed", "Yeast, baker's, compressed", "চাপা ইস্ট", 175042)]),
    # baby
    ("breast-milk", "baby", "milk-formula", "local", "Breast milk", "মায়ের বুকের দুধ", [V("mature", "Human milk, mature", "পরিণত বুকের দুধ", 171279)]),
    ("infant-formula", "baby", "milk-formula", "imported", "Infant formula (milk-based)", "ফর্মুলা দুধ (গরুর দুধভিত্তিক)", [V("powder", "Milk-based powder (a typical USDA entry)", "গুঁড়া ফর্মুলা (USDA-র একটি সাধারণ তথ্য)", 168967), V("ready", "Ready to feed (a typical USDA entry)", "তৈরি ফর্মুলা (USDA-র একটি সাধারণ তথ্য)", 169790)]),
    ("baby-rice-cereal", "baby", "cereals", "imported", "Baby rice cereal (dry, fortified)", "শিশুর চালের সিরিয়াল (গুঁড়া, পুষ্টি-মিশ্রিত)", [V("dry", "Dry, fortified", "গুঁড়া, পুষ্টি-মিশ্রিত", 170969)]),
    ("baby-oat-cereal", "baby", "cereals", "imported", "Baby oat cereal (dry, fortified)", "শিশুর ওটসের সিরিয়াল (গুঁড়া, পুষ্টি-মিশ্রিত)", [V("dry", "Dry, fortified", "গুঁড়া, পুষ্টি-মিশ্রিত", 171360)]),
    ("baby-mixed-cereal", "baby", "cereals", "imported", "Baby mixed-grain cereal (dry, fortified)", "শিশুর মিশ্র শস্যের সিরিয়াল (গুঁড়া)", [V("dry", "Dry, fortified", "গুঁড়া, পুষ্টি-মিশ্রিত", 170964)]),
    ("apple-puree", "baby", "purees", "imported", "Apple purée (baby, strained)", "আপেলের পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 173512)]),
    ("pear-puree", "baby", "purees", "imported", "Pear purée (baby, strained)", "নাশপাতির পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 171338)]),
    ("banana-puree", "baby", "purees", "local", "Banana purée (baby, with tapioca)", "কলার পিউরি (শিশুর)", [V("strained", "Strained, with tapioca", "ছাঁকা, টাপিওকাসহ", 171335)]),
    ("carrot-puree", "baby", "purees", "local", "Carrot purée (baby, strained)", "গাজরের পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 173506)]),
    ("sweet-potato-puree", "baby", "purees", "local", "Sweet potato purée (baby)", "মিষ্টি আলুর পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 172276), V("junior", "Junior (thicker)", "একটু ঘন পিউরি", 172277)]),
    ("pumpkin-puree", "baby", "purees", "local", "Squash purée (baby)", "কুমড়ার পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 172274), V("junior", "Junior (thicker)", "একটু ঘন পিউরি", 172275)]),
    ("pea-puree", "baby", "purees", "local", "Pea purée (baby, strained)", "মটরশুঁটির পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 170939)]),
    ("chicken-puree", "baby", "purees", "local", "Chicken purée (baby)", "মুরগির পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 173483), V("junior", "Junior (thicker)", "একটু ঘন পিউরি", 172248)]),
    ("beef-puree", "baby", "purees", "local", "Beef purée (baby, strained)", "গরুর মাংসের পিউরি (শিশুর)", [V("strained", "Strained", "ছাঁকা পিউরি", 173479)]),
    ("teething-biscuit", "baby", "snacks", "imported", "Teething biscuit (arrowroot)", "দাঁত ওঠার বিস্কুট (অ্যারারুট)", [V("arrowroot", "Arrowroot", "অ্যারারুট", 171369)]),
    # functional foods
    ("sauerkraut", "functional", "fermented", "imported", "Sauerkraut (fermented cabbage)", "সাওয়ারক্রাউট (গাঁজানো বাঁধাকপি)", [V("canned", "Canned, with its liquid", "টিনের, রসসহ", 169279)]),
    ("miso", "functional", "fermented", "imported", "Miso (fermented soybean paste)", "মিসো (গাঁজানো সয়াবিনের পেস্ট)", [V("paste", "Miso", "মিসো", 172442)]),
    ("tempeh", "functional", "fermented", "imported", "Tempeh (fermented soybean)", "টেম্পে (গাঁজানো সয়াবিন)", [V("raw", "Tempeh", "টেম্পে", 174272), V("cooked", "Tempeh, cooked", "রান্না করা টেম্পে", 172467)]),
    ("natto", "functional", "fermented", "imported", "Natto (fermented soybean)", "নাত্তো (গাঁজানো সয়াবিন)", [V("natto", "Natto", "নাত্তো", 172443)]),
    ("sour-pickle", "functional", "fermented", "imported", "Sour cucumber pickle (fermented)", "টক শসার আচার (গাঁজানো)", [V("sour", "Sour, fermented", "টক, গাঁজানো", 169379), V("low-sodium", "Sour, low sodium", "টক, কম লবণ", 168562)]),
    ("moringa-leaves", "functional", "leaves-sprouts", "local", "Moringa leaves (sajna pata)", "সজনে পাতা", [V("raw", "Raw", "কাঁচা পাতা", 168416, "raw"), V("boiled", "Boiled", "সেদ্ধ পাতা", 168417, "boiled")]),
    ("alfalfa-sprouts", "functional", "leaves-sprouts", "imported", "Alfalfa sprouts", "আলফালফা অঙ্কুর", [V("raw", "Sprouted, raw", "অঙ্কুরিত, কাঁচা", 168384, "raw")]),
    ("spirulina", "functional", "superfoods", "imported", "Spirulina", "স্পিরুলিনা", [V("dried", "Dried", "শুকনো", 170495), V("raw", "Raw", "কাঁচা", 170091, "raw")]),
    ("kelp", "functional", "superfoods", "imported", "Kelp (seaweed)", "কেল্প (সামুদ্রিক শৈবাল)", [V("raw", "Raw", "কাঁচা", 168457, "raw")]),
    ("hemp-seeds", "functional", "superfoods", "imported", "Hemp seeds (hulled)", "শণ বীজ (খোসা ছাড়ানো)", [V("hulled", "Hulled", "খোসা ছাড়ানো", 170148)]),
    ("cocoa-powder", "functional", "superfoods", "imported", "Cocoa powder (unsweetened)", "কোকো পাউডার (চিনিহীন)", [V("natural", "Natural, unsweetened", "প্রাকৃতিক, চিনিহীন", 169593), V("alkali", "Processed with alkali (Dutch)", "ক্ষার-প্রক্রিয়াজাত (ডাচ)", 169594)]),
]

# ---- new variants of foods that already exist: (food slug, [variant tuples]) ----
MORE = [
    ("white-rice", [
        V("parboiled", "Parboiled (sedda), boiled", "সেদ্ধ চালের ভাত", 169708),
        V("medium-grain", "Medium-grain, boiled", "মাঝারি দানার ভাত", 168880),
        V("short-grain", "Short-grain, boiled", "ছোট দানার ভাত", 168882),
        V("glutinous", "Glutinous (sticky), boiled", "আঠালো চালের ভাত", 169711),
        V("raw-long", "Long-grain, uncooked (dry rice)", "কাঁচা চাল (লম্বা দানা, রান্নার আগে)", 168877, "raw"),
    ]),
    ("red-rice", [V("brown-medium", "Brown medium-grain, boiled", "লাল/বাদামি মাঝারি দানার ভাত", 168875)]),
    ("banana", [V("dried", "Dried (banana powder)", "শুকনো কলার গুঁড়া", 173945)]),
]


def emit(lines):
    print("\n".join(lines))


def food_sql(slug, cat, sub, origin, en, bn, variants):
    out = [f"INSERT INTO foods (slug, category_id, name, origin) SELECT {q(slug)}, c.id, {jb(en, bn)}, {q(origin)} FROM food_categories c WHERE c.slug = {q(cat)} ON CONFLICT (slug) DO NOTHING;"]
    out.append(f"UPDATE foods f SET subcategory_id = s.id FROM food_subcategories s JOIN food_categories c ON c.id = s.category_id WHERE c.slug = {q(cat)} AND s.slug = {q(sub)} AND f.slug = {q(slug)} AND f.subcategory_id IS NULL;")
    out += variant_sql(slug, variants)
    return out


def variant_sql(slug, variants):
    out = []
    for vslug, ven, vbn, fdc, method in variants:
        if str(fdc) not in DESC:
            raise SystemExit(f"{fdc} not in USDA")
        out.append(
            "INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, method, sort) "
            f"SELECT f.id, {q(vslug)}, {jb(ven, vbn)}, NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), {q(per100(fdc))}::jsonb, 'usda-sr', {q(str(fdc))}, "
            f"{q(method) if method else 'NULL'}, (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = {q(slug)} ON CONFLICT (food_id, slug) DO NOTHING;"
        )
    return out


if __name__ == "__main__":
    lines = [
        "-- Growth catalogue (2026-11-23): categories for baby food and functional foods, subcategories for masala, pantry, berries and citrus,",
        "-- 60 new foods and extra kinds of rice and banana. Every nutrient figure is read from the USDA SR Legacy CSV (FoodData Central, April 2018) by",
        "-- id (the variant's source_ref); a closest match says so in its name. New foods carry no verdicts until reviewed. Generated by",
        "-- database/tools/growth_catalog.py. Idempotent. Run by migration 0041 and the seeder.",
        "",
    ]
    for slug, en, bn, sort in CATEGORIES:
        lines.append(f"INSERT INTO food_categories (slug, name, sort) VALUES ({q(slug)}, {jb(en, bn)}, {sort}) ON CONFLICT (slug) DO NOTHING;")
    for cat, slug, en, bn, sort in SUBCATEGORIES:
        lines.append(f"INSERT INTO food_subcategories (category_id, slug, name, sort) SELECT c.id, {q(slug)}, {jb(en, bn)}, {sort} FROM food_categories c WHERE c.slug = {q(cat)} ON CONFLICT (category_id, slug) DO NOTHING;")
    for item in FOODS:
        lines += food_sql(*item)
    for slug, variants in MORE:
        lines += variant_sql(slug, variants)
    # unripe papaya: the green fruit's figures are the Bangladesh Food Composition Table entry kacha-pepe already holds (copied, not retyped)
    lines.append(
        "INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, method, sort) "
        "SELECT p.id, 'unripe', jsonb_build_object('en', 'Unripe (green, kacha pepe)', 'bn', 'কাঁচা পেঁপে'), false, d.per_100g, d.source, d.source_ref, NULL, "
        "(SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = p.id) FROM foods p "
        "JOIN foods k ON k.slug = 'kacha-pepe' JOIN food_variants d ON d.food_id = k.id AND d.is_default WHERE p.slug = 'papaya' ON CONFLICT (food_id, slug) DO NOTHING;"
    )
    emit(lines)
    print(f"-- {len(FOODS)} new foods, {sum(len(v) for _, v in MORE) + 1} new variants of existing foods", file=sys.stderr)
