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
const COPYRIGHT := "© 2026 Nazhad Ibrahem"
const STUDIO_NAME := "" # intentionally blank
const VERSION := "0.1.0"

const MAG_SIZE := 30
const START_RESERVE := 90
const MAX_RESERVE := 210
const RELOAD_TIME := 2.2
const FIRE_INTERVAL := 0.108
const PLAYER_MAX_HEALTH := 100
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
}
