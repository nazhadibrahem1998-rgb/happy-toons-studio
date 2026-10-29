class_name GameConfig
extends Object

# Player-facing title lives here. Also set application/config/name in project.godot
# and the Windows export product name so the desktop build matches.
const GAME_TITLE := "Untitled Kurdish Shooter"
const GAME_TITLE_CKB := "ناوی یاری"
const HERO_NAME := "گڕوت"
const HERO_NAME_LATIN := "Gurut"
const FACTION_CKB := "ئیمپراتۆریەتی ئاسن"
const FACTION_EN := "Iron Empire"
const COPYRIGHT := "© 2026 Nazhad Ibrahem – Happy Toons Studio"
const STUDIO_NAME := "Happy Toons Studio"
const VERSION := "0.1.0"

const MAG_SIZE := 30
const START_RESERVE := 90
const MAX_RESERVE := 210
const RELOAD_TIME := 2.2
const FIRE_INTERVAL := 0.108
const PLAYER_MAX_HEALTH := 150
const BODY_DAMAGE := 34
const HEAD_DAMAGE := 200
const GUNSHOT_HEAR_RADIUS := 36.0

const STR := {
	"play": "دەستپێکردن",
	"settings": "ڕێکخستنەکان",
	"quit": "دەرچوون",
	"controls": "کۆنتڕۆڵەکان",
	"resume": "بەردەوامبوون",
	"restart": "دووبارەکردنەوە",
	"main_menu": "مێنیوی سەرەکی",
	"paused": "وەستان",
	"game_over": "مردیت",
	"level_complete": "ئاست تەواو بوو",
	"cleared": "گوندەکە پاک کرایەوە",
	"objective": "ئامانج: گوندەکە لە دوژمن پاک بکەرەوە",
	"enemies": "دوژمن",
	"health": "تەندروستی",
	"ammo": "فیشەک",
	"reloading": "پڕکردنەوە",
	"empty": "فیشەک نەما — R بۆ پڕکردنەوە",
	"quality": "کوالێتی",
	"low": "نزم",
	"medium": "مامناوەند",
	"high": "بەرز",
	"volume": "ئاستی دەنگ",
	"sensitivity": "هەستیاری ماوس",
	"back": "گەڕانەوە",
	"next_level": "ئاستی داهاتوو",
	"coming_soon": "ئاستەکانی داهاتوو دواتر دەخرێنە سەر",
	"against": "دژی ئیمپراتۆریەتی ئاسن",
	"rating": "١٦+",
	"level_name": "ئاستی ١ — گوندی چیا",
	"ammo_gain": "+%d فیشەک",
	"difficulty": "سەختی",
	"easy": "ئاسان",
	"normal": "ئاسایی",
}


static func is_easy() -> bool:
	return Settings.difficulty != "normal"


static func player_max_health() -> int:
	return 150 if is_easy() else 100


static func regen_delay() -> float:
	return 3.4 if is_easy() else 5.5


static func regen_per_second() -> float:
	return 20.0 if is_easy() else 8.0


static func hip_spread_deg() -> float:
	return 0.28 if is_easy() else 0.7


static func ads_spread_deg() -> float:
	return 0.03 if is_easy() else 0.12


static func bloom_per_shot() -> float:
	return 0.08 if is_easy() else 0.22


static func bloom_max() -> float:
	return 0.45 if is_easy() else 1.2


static func bloom_decay() -> float:
	return 3.2 if is_easy() else 2.4


static func magnet_deg() -> float:
	return 3.6 if is_easy() else 1.25


static func enemy_profile(kind: String) -> Dictionary:
	var easy := is_easy()
	var profile := {
		"health": 100,
		"damage": 6 if easy else 10,
		"spread": 6.5 if easy else 3.6,
		"spread_per_m": 0.34 if easy else 0.15,
		"move_spread": 5.0 if easy else 2.4,
		"fire_min": 1.35 if easy else 0.78,
		"fire_max": 1.95 if easy else 1.12,
		"react": 1.1 if easy else 0.7,
		"vision": 28.0 if easy else 34.0,
	}
	if kind == "commander":
		profile = {
			"health": 136,
			"damage": 8 if easy else 12,
			"spread": 4.8 if easy else 2.6,
			"spread_per_m": 0.22 if easy else 0.1,
			"move_spread": 3.6 if easy else 1.8,
			"fire_min": 1.5 if easy else 0.9,
			"fire_max": 2.1 if easy else 1.25,
			"react": 1.15 if easy else 0.75,
			"vision": 32.0 if easy else 40.0,
		}
	return profile
