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
const VERSION := "0.2.0"

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
	"sensitivity": "هەستیاری سەیرکردن",
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
	"sword_wood": "شمشێری دار",
	"sword_metal": "شمشێری ئاسن",
	"combo": "زنجیرە",
	"touch_hint": "چەپ: جوڵە    ڕاست: سەیرکردن",
	"blocking": "گرتن",
	"dodging": "خۆلادان",
}


const LIGHT_DAMAGE: Array[int] = [36, 36, 42]
const HEAVY_DAMAGE := 62


static func melee_damage(step: int, heavy: bool, metal: bool) -> int:
	var base := HEAVY_DAMAGE
	if not heavy:
		var index := clampi(step, 0, LIGHT_DAMAGE.size() - 1)
		base = LIGHT_DAMAGE[index]
	if metal:
		return int(round(float(base) * 1.25))
	return base


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
		"damage": 10 if easy else 16,
		"telegraph": 1.05 if easy else 0.72,
		"recover": 1.3 if easy else 0.85,
		"reach": 1.72,
		"react": 1.05 if easy else 0.62,
		"vision": 26.0 if easy else 34.0,
	}
	if kind == "commander":
		profile = {
			"health": 150,
			"damage": 14 if easy else 20,
			"telegraph": 1.2 if easy else 0.82,
			"recover": 1.45 if easy else 0.95,
			"reach": 1.9,
			"react": 1.15 if easy else 0.7,
			"vision": 30.0 if easy else 38.0,
		}
	elif kind == "shield":
		profile = {
			"health": 100,
			"damage": 8 if easy else 14,
			"telegraph": 1.25 if easy else 0.88,
			"recover": 1.4 if easy else 0.95,
			"reach": 1.65,
			"react": 1.15 if easy else 0.7,
			"vision": 24.0 if easy else 32.0,
		}
	return profile
