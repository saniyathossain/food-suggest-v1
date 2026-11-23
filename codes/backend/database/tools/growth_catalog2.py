"""Writes database/seeders/catalog_growth2.sql: the everyday foods and drinks the first growth batch missed (pizza, burgers, pastries, cakes,
doughnuts, juices, milkshakes, hot chocolate) with USDA figures read by FoodData Central id, plus well-known Bangladeshi dishes and drinks with
no USDA entry (kacchi, tehari, morog polao, badam sharbat, falooda, rasgulla...) added WITHOUT nutrition numbers: the page says "nutrition
coming" rather than carrying an invented figure. Run: USDA_SR_DIR=... python3 growth_catalog2.py > ../seeders/catalog_growth2.sql"""
import growth_catalog as g

V = g.V
FOODS = [
    # fast food and bakery
    ("pizza", "snacks", "fast-food", "imported", "Pizza", "পিজ্জা", [V("cheese", "Cheese pizza, regular crust, baked", "চিজ পিজ্জা, সাধারণ ক্রাস্ট, বেক করা", 170317, "baked")]),
    ("burger", "snacks", "fast-food", "imported", "Burger", "বার্গার", [V("hamburger", "Hamburger, single patty, plain", "হ্যামবার্গার, একটি প্যাটি, সাদামাটা", 170693), V("hamburger-condiments", "Hamburger, single patty, with condiments", "হ্যামবার্গার, সস-সালাদসহ", 170694), V("cheeseburger", "Cheeseburger, single patty, plain", "চিজবার্গার, একটি প্যাটি", 170690), V("cheeseburger-double", "Cheeseburger, double patty, with condiments", "ডাবল চিজবার্গার, সসসহ", 170293)]),
    ("french-toast", "snacks", "bakery", "local", "French toast", "ফ্রেঞ্চ টোস্ট", [V("homemade", "Prepared from a recipe, with low-fat milk", "ঘরে বানানো, কম চর্বির দুধে", 174998, "fried")]),
    ("pastry", "snacks", "bakery", "imported", "Pastry", "পেস্ট্রি", [V("danish-cheese", "Danish pastry, cheese", "ড্যানিশ পেস্ট্রি, চিজ", 172754), V("danish-fruit", "Danish pastry, fruit", "ড্যানিশ পেস্ট্রি, ফল", 172755), V("puff", "Puff pastry, baked", "পাফ পেস্ট্রি, বেক করা", 172738, "baked")]),
    ("croissant", "snacks", "bakery", "imported", "Croissant", "ক্রোয়াসাঁ", [V("butter", "Butter croissant", "মাখনের ক্রোয়াসাঁ", 174987), V("cheese", "Cheese croissant", "চিজ ক্রোয়াসাঁ", 174989)]),
    ("chocolate-cake", "sweets", "desserts", "imported", "Chocolate cake", "চকলেট কেক", [V("plain", "Chocolate cake, home-made, no frosting", "চকলেট কেক, ঘরে বানানো, ক্রিম ছাড়া", 172697), V("frosted", "Chocolate cake with chocolate frosting (bakery)", "চকলেট ক্রিমসহ কেক (বেকারি)", 174934)]),
    ("vanilla-cake", "sweets", "desserts", "imported", "Vanilla cake", "ভ্যানিলা কেক", [V("plain", "Yellow cake, home-made, no frosting", "হলুদ কেক, ঘরে বানানো, ক্রিম ছাড়া", 172710), V("frosted", "Yellow cake with vanilla frosting", "ভ্যানিলা ক্রিমসহ কেক", 174945)]),
    ("cheesecake", "sweets", "desserts", "imported", "Cheesecake", "চিজকেক", [V("bakery", "Cheesecake, commercially prepared", "চিজকেক, তৈরি", 172711)]),
    ("brownie", "sweets", "desserts", "imported", "Brownie", "ব্রাউনি", [V("bakery", "Brownie, commercially prepared", "ব্রাউনি, তৈরি", 172713), V("homemade", "Brownie, prepared from a recipe", "ব্রাউনি, ঘরে বানানো", 174949, "baked")]),
    ("doughnut", "snacks", "bakery", "imported", "Doughnut", "ডোনাট", [V("glazed", "Yeast doughnut, glazed", "ইস্টের ডোনাট, গ্লেজ করা", 172758, "deep_fried"), V("cake", "Cake doughnut, plain", "কেক ডোনাট, সাদামাটা", 174990, "deep_fried"), V("jelly", "Doughnut with jelly filling", "জেলি ভরা ডোনাট", 172759, "deep_fried")]),
    ("cookie", "snacks", "bakery", "imported", "Cookie (chocolate chip)", "কুকি (চকলেট চিপ)", [V("soft", "Chocolate chip cookie, soft type", "চকলেট চিপ কুকি, নরম", 172717), V("homemade", "Chocolate chip cookie, home-made with butter", "চকলেট চিপ কুকি, ঘরে মাখনে বানানো", 172808, "baked")]),
    ("muffin", "snacks", "bakery", "imported", "Muffin (blueberry)", "মাফিন (ব্লুবেরি)", [V("bakery", "Blueberry muffin, commercially prepared", "ব্লুবেরি মাফিন, তৈরি", 172765)]),
    # drinks
    ("orange-juice", "drinks", "sweet-drinks", "local", "Orange juice", "কমলার জুস", [V("fresh", "Fresh squeezed", "তাজা চিপে নেওয়া", 169098), V("packaged", "Chilled, from concentrate", "প্যাকেটের, কনসেনট্রেট থেকে", 169100)]),
    ("apple-juice", "drinks", "sweet-drinks", "imported", "Apple juice", "আপেলের জুস", [V("packaged", "Bottled, unsweetened", "বোতলের, চিনি ছাড়া", 167771)]),
    ("grape-juice", "drinks", "sweet-drinks", "imported", "Grape juice", "আঙুরের জুস", [V("packaged", "Bottled, unsweetened", "বোতলের, চিনি ছাড়া", 173041)]),
    ("pineapple-juice", "drinks", "sweet-drinks", "local", "Pineapple juice", "আনারসের জুস", [V("packaged", "Canned or bottled, unsweetened", "টিন বা বোতলের, চিনি ছাড়া", 169947)]),
    ("pomegranate-juice", "drinks", "sweet-drinks", "imported", "Pomegranate juice", "ডালিমের জুস", [V("packaged", "Bottled", "বোতলের", 167787)]),
    ("mango-juice", "drinks", "sweet-drinks", "local", "Mango juice (nectar)", "আমের জুস", [V("nectar", "Mango nectar, canned", "আমের নেকটার, টিনের", 167785)]),
    ("carrot-juice", "drinks", "sweet-drinks", "local", "Carrot juice", "গাজরের জুস", [V("canned", "Canned", "টিনের", 170491)]),
    ("tomato-juice", "drinks", "sweet-drinks", "local", "Tomato juice", "টমেটোর জুস", [V("plain", "Canned, no salt added", "টিনের, লবণ ছাড়া", 170545), V("salted", "Canned, with salt", "টিনের, লবণসহ", 170458)]),
    ("milkshake", "drinks", "sweet-drinks", "local", "Milkshake", "মিল্কশেক", [V("chocolate", "Thick chocolate shake", "ঘন চকলেট শেক", 170883), V("vanilla", "Thick vanilla shake", "ঘন ভ্যানিলা শেক", 170884)]),
    ("hot-chocolate", "drinks", "water-tea", "imported", "Hot chocolate", "হট চকলেট", [V("homemade", "Hot cocoa, home-made with milk", "দুধে ঘরে বানানো হট কোকো", 171277)]),
    ("chocolate-milk", "dairy", "milk", "local", "Chocolate milk", "চকলেট দুধ", [V("whole", "Whole milk, commercial", "ফুল ক্রিম দুধ, তৈরি", 170879), V("reduced-fat", "Reduced fat", "কম চর্বি", 170880)]),
    ("espresso", "drinks", "water-tea", "imported", "Espresso", "এসপ্রেসো", [V("brewed", "Brewed espresso", "তৈরি এসপ্রেসো", 171891)]),
    ("lemon-tea", "drinks", "water-tea", "local", "Lemon tea", "লেবু চা", [V("instant", "Instant lemon tea, with added vitamin C", "ইনস্ট্যান্ট লেবু চা", 171918)]),
    ("almond-milk", "dairy", "milk", "imported", "Almond milk", "বাদামের দুধ", [V("unsweetened", "Unsweetened, shelf-stable", "চিনি ছাড়া", 174832), V("sweetened", "Sweetened, vanilla", "মিষ্টি, ভ্যানিলা", 168751)]),
]

# Bangladeshi dishes and drinks with no USDA entry: no variants, so no numbers
NO_DATA = [
    ("kacchi-biryani", "grains", "rice", "local", "Kacchi biryani", "কাচ্চি বিরিয়ানি"),
    ("tehari", "grains", "rice", "local", "Tehari", "তেহারি"),
    ("morog-polao", "grains", "rice", "local", "Morog polao", "মোরগ পোলাও"),
    ("badam-sharbat", "drinks", "traditional", "local", "Badam sharbat", "বাদাম শরবত"),
    ("falooda", "drinks", "traditional", "local", "Falooda", "ফালুদা"),
    ("rooh-afza", "drinks", "traditional", "local", "Rooh Afza sharbat", "রুহ আফজা শরবত"),
    ("rasgulla", "sweets", "desserts", "local", "Rasgulla", "রসগোল্লা"),
    ("rasmalai", "sweets", "desserts", "local", "Rasmalai", "রসমালাই"),
    ("chomchom", "sweets", "desserts", "local", "Chomchom", "চমচম"),
    ("firni", "sweets", "desserts", "local", "Firni", "ফিরনি"),
]

if __name__ == "__main__":
    out = [
        "-- Growth catalogue, second batch (2026-11-23): everyday foods and drinks the first batch missed. USDA figures read by FoodData Central id (the",
        "-- variant's source_ref). Bangladeshi dishes with no USDA entry (kacchi, tehari, badam sharbat, rasgulla...) carry NO nutrition numbers yet.",
        "-- Generated by database/tools/growth_catalog2.py. Idempotent. Run by migration 0048 and the seeder.",
        "",
    ]
    for item in FOODS:
        out += g.food_sql(*item)
    for slug, cat, sub, origin, en, bn in NO_DATA:
        out += g.food_sql(slug, cat, sub, origin, en, bn, [])
    print("\n".join(out))
