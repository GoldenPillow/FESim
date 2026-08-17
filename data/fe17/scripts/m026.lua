Include("Common")

g_pid_lueur						= "PID_リュール"
g_pid_sombre1					= "PID_M026_ソンブル_人型"
g_pid_sombre2					= "PID_M026_ソンブル_竜型"

g_map_width						= 31
g_map_height					= 31

temp_x_start					= 9
temp_x_end						= 21
temp_z_start					= 19
temp_z_end						= 21

g_key_sombre1_defeat			= "撃破セリフ_ソンブル人型_済"
g_key_end_battle1				= "前半戦終了"
g_key_start_battle2				= "後半戦開始"

g_battle2_counter				= "後半戦カウンター"
g_reinforcement_counter			= "後半戦増援カウンター"

g_reinforcement_start_normal	= 7
g_reinforcement_start_hard		= 5

g_reinforcement_span_normal		= 4
g_reinforcement_span_hard		= 2

g_key_break_barrier				= "バリア破壊"
g_key_re_barrier				= "バリア復活"
g_key_re_barrier_counter		= "バリア復活回数"
g_actUnit_border				= 5

g_key_barrier_broken			= "バリア破壊初回_済"

_ug___k_e_y___6226_95d8_524d_30e1_30c7_30a3_30a6_30b9			= "戦闘前会話メディウス×マルス_済"
_ug___k_e_y___6226_95d8_524d_30ed_30d7_30c8_30a6_30b9			= "戦闘前会話ロプトウス×シグルド_済"
_ug___k_e_y___6226_95d8_524d_30c9_30fc_30de				= "戦闘前会話ドーマ×セリカ_済"
_ug___k_e_y___6226_95d8_524d_30a2_30b9_30bf_30eb_30c6			= "戦闘前会話アスタルテ×ミカヤ_済"
_ug___k_e_y___6226_95d8_524d_30a4_30c9_30a5_30f3			= "戦闘前会話イドゥン×ロイ_済"
_ug___k_e_y___6226_95d8_524d_30d9_30eb_30c9				= "戦闘前会話ベルド×リーフ_済"
_ug___k_e_y___6226_95d8_524d_30ae_30e0_30ec_30fc			= "戦闘前会話ギムレー×ルキナ_済"
_ug___k_e_y___6226_95d8_524d_30cd_30eb_30ac_30eb			= "戦闘前会話ネルガル×リン_済"
_ug___k_e_y___6226_95d8_524d_30a2_30b7_30e5_30ca_30fc_30c9		= "戦闘前会話アシュナード×アイク_済"
_ug___k_e_y___6226_95d8_524d_30cd_30e1_30b7_30b9			= "戦闘前会話ネメシス×ベレト_済"
_ug___k_e_y___6226_95d8_524d_30cf_30a4_30c9_30e9			= "戦闘前会話ハイドラ×カムイ_済"
_ug___k_e_y___6226_95d8_524d_30d5_30a9_30c7_30b9			= "戦闘前会話フォデス×エイリーク_済"

g_key_EngageBreak				= "ソンブル攻撃_エンゲージブレイク"
g_key_Beam						= "ソンブル攻撃_ビーム"
g_key_SpinAttack				= "ソンブル攻撃_スピンアタック"

g_EngageBreak_span				= 4
g_Beam_span						= 4
g_SpinAttack_span				= 0

g_EngageBreak_unitBorder		= 2
g_Beam_unitBorder				= 3
g_SpinAttack_unitBorder			= 3

g_Beam_Dirty_Rate				= 30

g_key_EngageBreak_startup		= "ソンブル攻撃_エンゲージブレイク_準備中"
g_key_Beam_startup				= "ソンブル攻撃_ビーム_準備中"

g_key_EngageBreak_tutorial		= "ソンブル攻撃_エンゲージブレイク_説明"
g_key_Beam_Direction			= "ソンブル攻撃_ビーム_方向"

g_key_M026_gameover				= "G_M026_ゲームオーバー済"

g_magic_circle_position = {
	{X=15,	Z=7},
	{X=9,	Z=9},
	{X=7,	Z=15},
	{X=9,	Z=21},
	{X=15,	Z=23},
	{X=21,	Z=21},
	{X=23,	Z=15},
	{X=21,	Z=9}
}

g_SpinAttack_Area_OffsetX		= -4
g_SpinAttack_Area_OffsetZ		= -4
g_SpinAttack_Area_Size			= 11

G_DIR_NONE						= 0
G_DIR_RIGHT						= 1
G_DIR_DOWN						= 2
G_DIR_LEFT						= 3
G_DIR_UP						= 4
G_DIR_DIAGONAL					= 5

local g_SpinAttack_Area = {
	{ 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0 },
	{ 0, 0, 5, 2, 2, 2, 2, 2, 5, 0, 0 },
	{ 0, 5, 5, 2, 2, 2, 2, 2, 5, 5, 0 },
	{ 3, 3, 3, 0, 0, 0, 0, 0, 1, 1, 1 },
	{ 3, 3, 3, 0, 0, 0, 0, 0, 1, 1, 1 },
	{ 3, 3, 3, 0, 0, 0, 0, 0, 1, 1, 1 },
	{ 3, 3, 3, 0, 0, 0, 0, 0, 1, 1, 1 },
	{ 3, 3, 3, 0, 0, 0, 0, 0, 1, 1, 1 },
	{ 0, 5, 5, 4, 4, 4, 4, 4, 5, 5, 0 },
	{ 0, 0, 5, 4, 4, 4, 4, 4, 5, 0, 0 },
	{ 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0 }
}

local g_SpinAttack_Route = {
	{ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4 },
	{ 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 4 },
	{ 2, 1, 1, 1, 1, 1, 1, 1, 4, 4, 4 },
	{ 2, 2, 1, 0, 0, 0, 0, 0, 4, 4, 4 },
	{ 2, 2, 2, 0, 0, 0, 0, 0, 4, 4, 4 },
	{ 2, 2, 2, 0, 0, 0, 0, 0, 4, 4, 4 },
	{ 2, 2, 2, 0, 0, 0, 0, 0, 4, 4, 4 },
	{ 2, 2, 2, 0, 0, 0, 0, 0, 4, 4, 4 },
	{ 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4 },
	{ 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4 },
	{ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 }
}

local g_BeamArea_1_4_7_10 = {
	{10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  0,1,1,1,1,1,1,1,1,1,1,1},
	{10,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  1,1,1,1,1,1,1,1,1,1,1,0},
	{10,10,10, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  1,1,1,1,1,1,1,1,1,1,0,0},
	{10,10,10,10, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  1,1,1,1,1,1,1,1,1,0,0,0},
	{10,10,10,10,10, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  1,1,1,1,1,1,1,1,0,0,0,0},
	{10,10,10,10,10,10, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  1,1,1,1,1,1,1,0,0,0,0,0},
	{10,10,10,10,10,10,10, 0, 0, 0, 0, 0,  0,0,0,0,0,  1,1,1,1,1,1,0,0,0,0,0,0},
	{10,10,10,10,10,10,10,10, 0, 0, 0, 0,  0,0,0,0,1,  1,1,1,1,1,0,0,0,0,0,0,0},
	{10,10,10,10,10,10,10,10,10, 0, 0, 0,  0,0,0,0,1,  1,1,1,1,0,0,0,0,0,0,0,0},
	{10,10,10,10,10,10,10,10,10,10, 0, 0,  0,0,0,0,1,  1,1,1,0,0,0,0,0,0,0,0,0},
	{10,10,10,10,10,10,10,10,10,10,10, 0,  0,0,0,0,1,  1,1,0,0,0,0,0,0,0,0,0,0},
	{ 0,10,10,10,10,10,10,10,10,10,10,10,  0,0,0,0,1,  1,0,0,0,0,0,0,0,0,0,0,0},

	{ 0, 0, 0, 0, 0, 0, 0,10,10,10,10,10,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0,0,0,0,0,  4,4,4,4,4,0,0,0,0,0,0,0},

	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7,  7,0,0,0,0,  4,4,4,4,4,4,4,4,4,4,4,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7,  7,0,0,0,0,  0,4,4,4,4,4,4,4,4,4,4,4},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 7,  7,0,0,0,0,  0,0,4,4,4,4,4,4,4,4,4,4},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 7,  7,0,0,0,0,  0,0,0,4,4,4,4,4,4,4,4,4},
	{ 0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 7, 7,  7,0,0,0,0,  0,0,0,0,4,4,4,4,4,4,4,4},
	{ 0, 0, 0, 0, 0, 0, 7, 7, 7, 7, 7, 7,  0,0,0,0,0,  0,0,0,0,0,4,4,4,4,4,4,4},
	{ 0, 0, 0, 0, 0, 7, 7, 7, 7, 7, 7, 7,  0,0,0,0,0,  0,0,0,0,0,0,4,4,4,4,4,4},
	{ 0, 0, 0, 0, 7, 7, 7, 7, 7, 7, 7, 7,  0,0,0,0,0,  0,0,0,0,0,0,0,4,4,4,4,4},
	{ 0, 0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7,  0,0,0,0,0,  0,0,0,0,0,0,0,0,4,4,4,4},
	{ 0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,4,4,4},
	{ 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,4,4},
	{ 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0,  0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,4}
}

local g_BeamArea_2_5_8_11 = {
	{11,11,11,11,11,11,11,11,11,11,11, 0,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,2},
	{ 0,11,11,11,11,11,11,11,11,11,11,11,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,2,2},
	{ 0, 0,11,11,11,11,11,11,11,11,11,11,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,2,2,2},
	{ 0, 0, 0,11,11,11,11,11,11,11,11,11,   0,0,0,0,0,  0,0,0,0,0,0,0,0,2,2,2,2},
	{ 0, 0, 0, 0,11,11,11,11,11,11,11,11,   0,0,0,0,0,  0,0,0,0,0,0,0,2,2,2,2,2},
	{ 0, 0, 0, 0, 0,11,11,11,11,11,11,11,   0,0,0,0,0,  0,0,0,0,0,0,2,2,2,2,2,2},
	{ 0, 0, 0, 0, 0, 0,11,11,11,11,11,11,   0,0,0,0,0,  0,0,0,0,0,2,2,2,2,2,2,2},
	{ 0, 0, 0, 0, 0, 0, 0,11,11,11,11,11,  11,0,0,0,0,  0,0,0,0,2,2,2,2,2,2,2,2},
	{ 0, 0, 0, 0, 0, 0, 0, 0,11,11,11,11,  11,0,0,0,0,  0,0,0,2,2,2,2,2,2,2,2,2},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0,11,11,11,  11,0,0,0,0,  0,0,2,2,2,2,2,2,2,2,2,2},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11,11,  11,0,0,0,0,  0,2,2,2,2,2,2,2,2,2,2,2},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11,  11,0,0,0,0,  2,2,2,2,2,2,2,2,2,2,2,0},

	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  2,2,2,2,2,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 8,   0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0,0,0},

	{ 0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,   0,0,0,0,5,  5,0,0,0,0,0,0,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 0,   0,0,0,0,5,  5,5,0,0,0,0,0,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 0, 0,   0,0,0,0,5,  5,5,5,0,0,0,0,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 8, 8, 8, 8, 0, 0, 0,   0,0,0,0,5,  5,5,5,5,0,0,0,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0,   0,0,0,0,5,  5,5,5,5,5,0,0,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0, 0,   0,0,0,0,0,  5,5,5,5,5,5,0,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  5,5,5,5,5,5,5,0,0,0,0,0},
	{ 8, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  5,5,5,5,5,5,5,5,0,0,0,0},
	{ 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  5,5,5,5,5,5,5,5,5,0,0,0},
	{ 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  5,5,5,5,5,5,5,5,5,5,0,0},
	{ 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  5,5,5,5,5,5,5,5,5,5,5,0},
	{ 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,0,0,0,0,  0,5,5,5,5,5,5,5,5,5,5,5}
}

local g_BeamArea_3_6_9_12 = {
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,12,  12,12,12,12,12,  12,12,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,12,  12,12,12,12,12,  12,12,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,12,  12,12,12,12,12,  12,12,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,  12,12,12,12,12,  12, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,  12,12,12,12,12,  12, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,  12,12,12,12,12,  12, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  12,12,12,12,12,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  12,12,12,12,12,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  12,12,12,12,12,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,12,12,12, 0,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 9, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0,12,12,12, 0,   0, 0,0,0,0,0,0,0,0,3,3,3},
	{ 9, 9, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0,   0,12,12,12, 0,   0, 0,0,0,0,0,3,3,3,3,3,3},

	{ 9, 9, 9, 9, 9, 9, 9, 9, 9, 0, 0, 0,   0, 0, 0, 0, 0,   0, 0,0,3,3,3,3,3,3,3,3,3},
	{ 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,   0, 0, 0, 0, 0,   3, 3,3,3,3,3,3,3,3,3,3,3},
	{ 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,   0, 0, 0, 0, 0,   3, 3,3,3,3,3,3,3,3,3,3,3},
	{ 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,   0, 0, 0, 0, 0,   3, 3,3,3,3,3,3,3,3,3,3,3},
	{ 9, 9, 9, 9, 9, 9, 9, 9, 9, 0, 0, 0,   0, 0, 0, 0, 0,   0, 0,0,3,3,3,3,3,3,3,3,3},

	{ 9, 9, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0,   0, 6, 6, 6, 0,   0, 0,0,0,0,0,3,3,3,3,3,3},
	{ 9, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0, 6, 6, 6, 0,   0, 0,0,0,0,0,0,0,0,3,3,3},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0, 6, 6, 6, 0,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   6, 6, 6, 6, 6,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   6, 6, 6, 6, 6,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   6, 6, 6, 6, 6,   0, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6,   6, 6, 6, 6, 6,   6, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6,   6, 6, 6, 6, 6,   6, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6,   6, 6, 6, 6, 6,   6, 0,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6,   6, 6, 6, 6, 6,   6, 6,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6,   6, 6, 6, 6, 6,   6, 6,0,0,0,0,0,0,0,0,0,0},
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6,   6, 6, 6, 6, 6,   6, 6,0,0,0,0,0,0,0,0,0,0}
}

POS_UP			= 8
POS_DOWN		= 4
POS_LEFT		= 2
POS_RIGHT		= 1
POS_ALL			= 15

POS_UP_LEFT		= 10
POS_UP_RIGHT	= 9
POS_DOWN_LEFT	= 6
POS_DOWN_RIGHT	= 5

POS_PREFIX	= "紋章士位置_"

function Startup()

	Log("Startup")

	WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
	WinRuleSetMID( "MID_RULE_M026_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry( g_key_sombre1_defeat, 0 )
	VariableEntry( g_key_end_battle1, 0 )
	VariableEntry( g_key_start_battle2, 0 )

	VariableEntry( g_battle2_counter, 1 )

	VariableEntry( g_reinforcement_counter, 1 )

	VariableEntry( "後半戦ターン２", 0 )
	VariableEntry( "後半戦ターン３", 0 )
	VariableEntry( "後半戦ターン５", 0 )

	VariableEntry( g_key_break_barrier, 0 )
	VariableEntry( g_key_re_barrier, 0 )
	VariableEntry( g_key_re_barrier_counter, 0 )

	VariableEntry( g_key_barrier_broken, 0 )

	VariableEntry( _ug___k_e_y___6226_95d8_524d_30e1_30c7_30a3_30a6_30b9,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30c9_30fc_30de,			0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30ed_30d7_30c8_30a6_30b9,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30d9_30eb_30c9,			0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30a4_30c9_30a5_30f3,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30cd_30eb_30ac_30eb,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30d5_30a9_30c7_30b9,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30a2_30b7_30e5_30ca_30fc_30c9,	0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30a2_30b9_30bf_30eb_30c6,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30ae_30e0_30ec_30fc,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30cf_30a4_30c9_30e9,		0 )
	VariableEntry( _ug___k_e_y___6226_95d8_524d_30cd_30e1_30b7_30b9,		0 )

	VariableEntry( g_key_EngageBreak,			g_EngageBreak_span )
	VariableEntry( g_key_Beam,					g_Beam_span )
	VariableEntry( g_key_SpinAttack,			g_SpinAttack_span )
	VariableEntry( g_key_EngageBreak_startup,	0 )
	VariableEntry( g_key_Beam_startup,			0 )
	VariableEntry( g_key_EngageBreak_tutorial,	0 )
	VariableEntry( g_key_Beam_Direction,		0 )

	VariableEntry( POS_PREFIX .. "GID_M026_敵メディウス",		POS_DOWN_LEFT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ドーマ",			POS_UP_LEFT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ロプトウス",		POS_DOWN_RIGHT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ベルド",			POS_UP_RIGHT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵イドゥン",			POS_UP )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ネルガル",			POS_LEFT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵フォデス",			POS_RIGHT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵アシュナード",		POS_DOWN )
	VariableEntry( POS_PREFIX .. "GID_M026_敵アスタルテ",		POS_DOWN_LEFT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ギムレー",			POS_UP_LEFT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ハイドラ",			POS_DOWN_RIGHT )
	VariableEntry( POS_PREFIX .. "GID_M026_敵ネメシス",			POS_UP_RIGHT )

	VariableEntry( g_key_M026_gameover, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u5f8c_534a_6226_30ab_30a6_30f3_30bf_30fc,		-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_30ab_30a6_30f3_30bf_30fc)
	EventEntryTurn(_u5f8c_534a_6226_5897_63f4___30ce_30fc_30de_30eb,		-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___30ce_30fc_30de_30eb)
	EventEntryTurn(_u5f8c_534a_6226_5897_63f4___30cf_30fc_30c9_4ee5_4e0a,	-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___30cf_30fc_30c9_4ee5_4e0a)

	EventEntryTurn(_u958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1, FORCE_PLAYER, "開始直後イベント_済")

	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_エル",		FORCE_PLAYER, g_pid_sombre1, FORCE_ENEMY, true, "戦闘前会話_ソンブル人型_エル_済",		"MID_EX4")
	EventEntryBattleTalk(Talk, "PID_ラファール",FORCE_PLAYER, g_pid_sombre1, FORCE_ENEMY, true, "戦闘前会話_ソンブル人型_ラファール_済","MID_EX5")
	EventEntryBattleTalk(Talk, g_pid_lueur,		FORCE_PLAYER, g_pid_sombre1, FORCE_ENEMY, true, "戦闘前会話_ソンブル人型_リュール_済",	"MID_BT2")
	EventEntryBattleTalk(Talk, "PID_ヴェイル",	FORCE_PLAYER, g_pid_sombre1, FORCE_ENEMY, true, "戦闘前会話_ソンブル人型_ヴェイル_済",	"MID_BT3")
	EventEntryBattleTalk(Talk, "",				FORCE_PLAYER, g_pid_sombre1, FORCE_ENEMY, true, "戦闘前会話_ソンブル人型_済",			"MID_BT1")

	EventEntryDie(Talk, g_pid_sombre1, FORCE_ENEMY, g_key_sombre1_defeat, "MID_BT4")

	EventEntryBattleAfter(VariableSet, g_pid_sombre1, FORCE_ENEMY, "", FORCE_PLAYER, false, _uc_o_n_d_i_t_i_o_n___5f37_5236_6575_30d5_30a7_30a4_30ba_7d42_4e86, "行動後フェイズ終了", 1)
	EventEntryTurnEnd(_u524d_534a_6226_7d42_4e86_304b_3089_5f8c_534a_6226_958b_59cb, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___524d_534a_6226_7d42_4e86)

	EventEntryBattleAfter(VariableSet, "", FORCE_PLAYER, g_pid_sombre1, FORCE_ENEMY, false, _uc_o_n_d_i_t_i_o_n___5f37_5236_6575_30d5_30a7_30a4_30ba_7d42_4e86, "行動後フェイズ終了", 1)
	EventEntryFixed(_u524d_534a_6226_7d42_4e86, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___524d_534a_6226_7d42_4e86)
	EventEntryTurn(_u5f8c_534a_6226_958b_59cb, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_958b_59cb)

	EventEntryTurnAfter(_u524d_534a_6226_7d42_4e86, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___524d_534a_6226_7d42_4e86)

	EventEntryBattleAfter(_u30d0_30ea_30a2_7834_58ca, "", FORCE_ENEMY, "", FORCE_PLAYER, true, _uc_o_n_d_i_t_i_o_n___30d0_30ea_30a2_7834_58ca)
	EventEntryFixed(_u30d0_30ea_30a2_7834_58ca, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30d0_30ea_30a2_7834_58ca)
	EventEntryTurnEnd(_u30d0_30ea_30a2_5fa9_6d3b, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30d0_30ea_30a2_5fa9_6d3b)

	EventEntryTurnAfter(_u90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483,		-1, -1, FORCE_ENEMY,	_uc_o_n_d_i_t_i_o_n___90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483)
	EventEntryTurnEnd(	_u90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483_4e88_544a,	-1, -1, FORCE_ENEMY,	_uc_o_n_d_i_t_i_o_n___90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483_4e88_544a)

	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_メディウス",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30e1_30c7_30a3_30a6_30b9,	"MID_BT9",	_ug___k_e_y___6226_95d8_524d_30e1_30c7_30a3_30a6_30b9		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ロプトウス",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30ed_30d7_30c8_30a6_30b9,	"MID_BT10",	_ug___k_e_y___6226_95d8_524d_30ed_30d7_30c8_30a6_30b9		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ドーマ",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30c9_30fc_30de,		"MID_BT11",	_ug___k_e_y___6226_95d8_524d_30c9_30fc_30de			)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_アスタルテ",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30a2_30b9_30bf_30eb_30c6,	"MID_BT12",	_ug___k_e_y___6226_95d8_524d_30a2_30b9_30bf_30eb_30c6		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_イドゥン",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30a4_30c9_30a5_30f3,	"MID_BT13",	_ug___k_e_y___6226_95d8_524d_30a4_30c9_30a5_30f3		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ベルド",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30d9_30eb_30c9,		"MID_BT14",	_ug___k_e_y___6226_95d8_524d_30d9_30eb_30c9			)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ギムレー",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30ae_30e0_30ec_30fc,	"MID_BT15",	_ug___k_e_y___6226_95d8_524d_30ae_30e0_30ec_30fc		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ネルガル",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30cd_30eb_30ac_30eb,	"MID_BT16",	_ug___k_e_y___6226_95d8_524d_30cd_30eb_30ac_30eb		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_アシュナード",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30a2_30b7_30e5_30ca_30fc_30c9,"MID_BT17",	_ug___k_e_y___6226_95d8_524d_30a2_30b7_30e5_30ca_30fc_30c9	)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ネメシス",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30cd_30e1_30b7_30b9,	"MID_BT18",	_ug___k_e_y___6226_95d8_524d_30cd_30e1_30b7_30b9		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_ハイドラ",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30cf_30a4_30c9_30e9,	"MID_BT19",	_ug___k_e_y___6226_95d8_524d_30cf_30a4_30c9_30e9		)
	EventEntryBattleTalk(_u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M026_異形兵_マスター_フォデス",		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30d5_30a9_30c7_30b9,	"MID_BT20",	_ug___k_e_y___6226_95d8_524d_30d5_30a9_30c7_30b9		)

	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_メディウス",		FORCE_ENEMY, "撃破時会話メディウス_済",		"MID_BT21")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ロプトウス",		FORCE_ENEMY, "撃破時会話ロプトウス_済",		"MID_BT22")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ドーマ",			FORCE_ENEMY, "撃破時会話ドーマ_済",			"MID_BT23")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_アスタルテ",		FORCE_ENEMY, "撃破時会話アスタルテ_済",		"MID_BT24")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_イドゥン",		FORCE_ENEMY, "撃破時会話イドゥン_済",		"MID_BT25")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ベルド",			FORCE_ENEMY, "撃破時会話ベルド_済",			"MID_BT26")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ギムレー",		FORCE_ENEMY, "撃破時会話ギムレー_済",		"MID_BT27")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ネルガル",		FORCE_ENEMY, "撃破時会話ネルガル_済",		"MID_BT28")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_アシュナード",	FORCE_ENEMY, "撃破時会話アシュナード_済",	"MID_BT29")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ネメシス",		FORCE_ENEMY, "撃破時会話ネメシス_済",		"MID_BT30")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_ハイドラ",		FORCE_ENEMY, "撃破時会話ハイドラ_済",		"MID_BT31")
	EventEntryDie(_u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71, "PID_M026_異形兵_マスター_フォデス",		FORCE_ENEMY, "撃破時会話フォデス_済",		"MID_BT32")

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M026", "MID_OP2")
	PuppetDemo("M026", "MID_OP3")

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait(FADE_FAST)

	TerrainSetBegin()
	if ( #g_magic_circle_position > 0 ) then
		for index = 1, #g_magic_circle_position do

			TerrainSet( g_magic_circle_position[index].X, g_magic_circle_position[index].Z, "TID_平地" )

		end
	end
	TerrainSetEnd()

	FadeInAndWait(FADE_FAST)

end

function _u958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	FadeOutAndWait( FADE_NORMAL )
		Movie("Scene28")
		local list = _u7d0b_7ae0_58eb_3092_5916_3059()
		CursorSetPos( 15, 10 )
		CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
		MapCameraWait()
		SkipEscape()
	FadeInAndWait( FADE_NORMAL )

	local unit = ForceUnitGetFirst(FORCE_PLAYER)
	while unit ~= nil do

		local pid = UnitGetPID( unit )
		if not ( pid == g_pid_lueur ) then

			local name = SubPrefix( UnitGetMPID( unit ) )
			local mid = "MID_OP5_" .. name .. "1"
			Talk( mid )

		end

		unit = ForceUnitGetNext(unit)
	end

	FadeOutAndWait( FADE_NORMAL )
		Movie("Scene29")
		SkipEscape()

		_u7d0b_7ae0_58eb_3092_4ed8_3051_306a_304a_3059( list )
	FadeInAndWait( FADE_NORMAL )

end

function _u7d0b_7ae0_58eb_3092_5916_3059()
	local list = {}

	local unit = ForceUnitGetFirst(FORCE_PLAYER)
	while unit ~= nil do

		local godUnit = UnitGetGodUnit( unit )
		if godUnit ~= nil then
			list[ #list + 1 ] = { UNIT=unit, GOD=godUnit }
			UnitSetGodUnit(unit, nil)
		end

		unit = ForceUnitGetNext( unit )
	end

	return list
end

function _u7d0b_7ae0_58eb_3092_4ed8_3051_306a_304a_3059( list )
	if #list > 0 then
		for pointer = 1, #list do
			UnitSetGodUnit( list[pointer].UNIT, list[pointer].GOD )
		end
	end
end

function _uc_o_n_d_i_t_i_o_n___5f37_5236_6575_30d5_30a7_30a4_30ba_7d42_4e86()

	if VariableGet( g_key_sombre1_defeat ) == 1 then
		return true
	end

end

function _u524d_534a_6226_7d42_4e86_304b_3089_5f8c_534a_6226_958b_59cb()
	_u524d_534a_6226_7d42_4e86()
	_u5f8c_534a_6226_958b_59cb()
end

function _uc_o_n_d_i_t_i_o_n___524d_534a_6226_7d42_4e86()
	if VariableGet( g_key_end_battle1 ) == 1 then
		return false
	end

	if VariableGet( g_key_sombre1_defeat ) == 1 then
		return true
	end

	return false
end

function _u524d_534a_6226_7d42_4e86()

	VariableSet( "自軍フェイズスキップ", 1 )
	VariableSet( "敵軍フェイズスキップ", 1 )
	VariableSet( "行動後フェイズ終了", 1 )

	FadeOutAndWait(FADE_FAST)

		CursorSetPos(15, 12)
		CursorSetDistanceMode(CURSOR_DISTANCE_MIDDLE)

		_u6307_5b9a_P_I_D_4ee5_5916_306e_6575_304c_6d88_3048_308b( g_pid_sombre1 )
		_u30a8_30f3_30b2_30fc_30b8_72b6_614b_3084_72b6_614b_7570_5e38_306a_3069_3092_521d_671f_5316()
		UnitUpdate()

		_u5168_30e6_30cb_30c3_30c8_3092_4e00_65e6_9000_907f()

		UnitSetPos( g_pid_sombre1,	15, 15 )
		UnitSetPos( g_pid_lueur,	15, 11 )
		Yield()

		UnitRotation( g_pid_sombre1, ROTATE_DOWN )
		UnitMoveWait()

		_u5473_65b9_30ad_30e3_30e9_3092_518d_914d_7f6e()

		_u9b54_6cd5_9663_8ffd_52a0()

		MapCameraWait()

	FadeInAndWait(FADE_FAST)

	Talk("MID_EV1")

	FadeOutAndWait(FADE_FAST)
		SkipEscape()
		Movie("Scene31")
		_u30bd_30f3_30d6_30eb_304c_7adc_578b_306b_5909_5316()
	FadeInAndWait(FADE_FAST)

	SkipEscape()
	Dispos( "DarkEmblem", DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
	Yield()

	EffectCreate("ソンブルバリア_Lv4", 15, 15)
	WaitTime( 2.0 )

	if DifficultyGet() == DIFFICULTY_NORMAL then
		_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア４_ノーマル用" )
	else
		_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア４" )
	end

	SkipEscape()
	Talk("MID_EV2")

	Tutorial( "TUTID_闇の結界" )
	Tutorial( "TUTID_闇の紋章士" )

	FadeOutAndWait(FADE_FAST)

		_u6307_5b9a_P_I_D_4ee5_5916_306e_6575_304c_6d88_3048_308b( g_pid_sombre2 )
		Dispos( "DarkEmblem1", DISPOS_FLAG_FORCED )
		Dispos( "Enemy2", DISPOS_FLAG_NONE )
		Yield()

		_u7d0b_7ae0_6c23_30de_30b9_306e_914d_7f6e()

	FadeInAndWait(FADE_FAST)

	VariableSet( g_key_end_battle1, 1 )

end

function _u7d0b_7ae0_6c23_30de_30b9_306e_914d_7f6e()

	MapOverlapSetOne(21, 16, "TID_紋章氣")
	MapOverlapSetOne( 7, 17, "TID_紋章氣")
	MapOverlapSetOne(23, 20, "TID_紋章氣")
	MapOverlapSetOne(11, 23, "TID_紋章氣")
	MapOverlapSetOne(10,  7, "TID_紋章氣")
	MapOverlapSetOne(13,  5, "TID_紋章氣")
	MapOverlapSetOne(23,  8, "TID_紋章氣")
	MapOverlapSetOne( 5, 13, "TID_紋章氣")
	MapOverlapSetOne(25, 13, "TID_紋章氣")

end

function _u5168_30e6_30cb_30c3_30c8_3092_4e00_65e6_9000_907f()

	for fromZ = 1, g_map_height - 2 do
		for fromX = 1, g_map_width - 2 do

			if ( fromX < temp_x_start ) or ( temp_x_end < fromX )
				or ( fromZ < temp_z_start ) or ( temp_z_end < fromZ ) then

				local unit = UnitGetByPos(fromX, fromZ)
				if not ( unit == nil ) then

					local dicede = false

					for toZ = temp_z_start, temp_z_end do

						for toX = temp_x_start, temp_x_end do

							if ( UnitGetByPos(toX, toZ) == nil ) and ( TerrainGetMoveCost(toX, toZ) == "COST_平地" ) then

								UnitSetPos(unit, toX, toZ)

								dicede = true
								break

							end

						end

						if dicede then
							break
						end

					end

				end

			end

		end
	end

end

function _u6307_5b9a_P_I_D_4ee5_5916_306e_6575_304c_6d88_3048_308b( pid )

	local list = {}
	local index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		if not ( UnitGetPID( index ) == pid ) then
			list[ #list + 1 ] = index
		end
		index = ForceUnitGetNext(index)
	end

	if ( #list > 0 ) then
		for index = 1, #list do
			UnitDelete( list[index] )
		end
	end

end

function _u5473_65b9_30ad_30e3_30e9_3092_518d_914d_7f6e()

	local posList = {
		{ 11, 12 },
		{ 19, 12 },
		{ 12, 11 },
		{ 18, 11 },
		{ 11, 10 },
		{ 12, 10 },
		{ 14, 10 },
		{ 16, 10 },
		{ 18, 10 },
		{ 19, 10 },
		{ 13, 9  },
		{ 15, 9  },
		{ 17, 9  }
	}

	local index = 1

	for z = temp_z_start, temp_z_end do
		for x = temp_x_start, temp_x_end do

			local unit = UnitGetByPos( x, z )
			if not ( unit == nil ) then

				UnitSetPos( unit, posList[index][1], posList[index][2] )
				index = index + 1

			end

		end
	end

end

function _u9b54_6cd5_9663_8ffd_52a0()

	TerrainSetBegin()
	if ( #g_magic_circle_position > 0 ) then
		for index = 1, #g_magic_circle_position do

			TerrainSet( g_magic_circle_position[index].X, g_magic_circle_position[index].Z, "TID_魔法陣" )
			EffectCreate( "魔法陣", g_magic_circle_position[index].X, g_magic_circle_position[index].Z )

		end
	end
	TerrainSetEnd()

end

function _u30a8_30f3_30b2_30fc_30b8_72b6_614b_3084_72b6_614b_7570_5e38_306a_3069_3092_521d_671f_5316()

	MapOverlapSetBegin()
	for z = 1, g_map_width - 2 do
		for x = 1, g_map_width - 2 do

			MapOverlapSet(x, z, "TID_無し")

		end
	end
	MapOverlapSetEnd()

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do

		UnitResetParam(index)
		UnitRotation(index, ROTATE_UP)

		index = ForceUnitGetNext( index )

	end

end

function _u30bd_30f3_30d6_30eb_304c_7adc_578b_306b_5909_5316()

	if UnitExistOnMap( g_pid_sombre1 ) then
		UnitDelete( g_pid_sombre1 )
	end

	Dispos( "Sombre2", DISPOS_FLAG_NONE )
	Yield()

	local sombreX = UnitGetX( g_pid_sombre2 )
	local sombreZ = UnitGetZ( g_pid_sombre2 )
	TerrainSetBegin()
	for z = sombreZ, sombreZ + 4 do
		for x = sombreX, sombreX + 4 do
			TerrainSet( x, z, "TID_進入不可_M026" )
		end
	end
	TerrainSetEnd()

end

function _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_958b_59cb()
	if VariableGet( g_key_start_battle2 ) == 1 then
		return false
	end

	if VariableGet( g_key_end_battle1 ) == 1 then
		return true
	end

	return false
end

function _u5f8c_534a_6226_958b_59cb()

	VariableSet( "自軍フェイズスキップ", 0 )
	VariableSet( "敵軍フェイズスキップ", 0 )
	VariableSet( "行動後フェイズ終了", 0 )

	VariableSet( g_key_start_battle2, 1 )

	MapHistoryRewindReset()

end

function _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_30ab_30a6_30f3_30bf_30fc()
	if VariableGet( g_key_start_battle2 ) == 0 then
		return false
	end

	if ( VariableGet( g_battle2_counter ) > 10 ) then
		return false
	end

	return true
end

function _u5f8c_534a_6226_30ab_30a6_30f3_30bf_30fc()
	local counter = VariableGet( g_battle2_counter )
	counter = counter + 1

	VariableSet( g_battle2_counter, counter )

	if		counter == 2 then
		VariableSet( "後半戦ターン２", 1 )

	elseif	counter == 3 then
		VariableSet( "後半戦ターン３", 1 )

	elseif	counter == 5 then
		VariableSet( "後半戦ターン５", 1 )

	end

end

function _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___30ce_30fc_30de_30eb()
	if VariableGet( g_key_start_battle2 ) == 0 then
		return false
	end

	if ( DifficultyGet() > DIFFICULTY_NORMAL ) then
		return false
	end

	if ( VariableGet( g_battle2_counter ) < g_reinforcement_start_normal ) then
		return false
	end

	return _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___6575_6570_30c1_30a7_30c3_30af()
end

function _u5f8c_534a_6226_5897_63f4___30ce_30fc_30de_30eb()

	local counter = VariableGet( g_reinforcement_counter )
	counter = counter - 1
	VariableSet( g_reinforcement_counter, counter )

	if ( counter == 0 ) then

		VariableSet( g_reinforcement_counter, g_reinforcement_span_normal )
		_u95c7_7d0b_7ae0_58eb_5897_63f4()

	elseif ( counter == g_reinforcement_span_normal -  2 ) then

		_u7a7a_304d_30b9_30da_30fc_30b9_306b_5897_63f4()

	end

end

function _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___30cf_30fc_30c9_4ee5_4e0a()
	if VariableGet( g_key_start_battle2 ) == 0 then
		return false
	end

	if ( DifficultyGet() < DIFFICULTY_HARD ) then
		return false
	end

	if VariableGet( g_battle2_counter ) < g_reinforcement_start_hard then
		return false
	end

	return _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___6575_6570_30c1_30a7_30c3_30af()
end

function _u5f8c_534a_6226_5897_63f4___30cf_30fc_30c9_4ee5_4e0a()

	local counter = VariableGet( g_reinforcement_counter )
	counter = counter - 1
	VariableSet( g_reinforcement_counter, counter )

	if ( counter == 0 ) then

		VariableSet( g_reinforcement_counter, g_reinforcement_span_hard )
		_u95c7_7d0b_7ae0_58eb_5897_63f4()

	else

		_u7a7a_304d_30b9_30da_30fc_30b9_306b_5897_63f4()

	end

end

function _uc_o_n_d_i_t_i_o_n___5f8c_534a_6226_5897_63f4___6575_6570_30c1_30a7_30c3_30af()

	local max = 64 - 4 - 8

	local count = 0
	local index = ForceUnitGetFirst( FORCE_ENEMY )
	while index ~= nil do
		count = count + 1
		index = ForceUnitGetNext(index)
	end

	if ( count <= max ) then
		return true
	else
		return false
	end

end

function _u95c7_7d0b_7ae0_58eb_5897_63f4()

	if UnitExistOnMap( "PID_M026_異形兵_マスター_メディウス"	) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Mediuth" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ロプトウス"	) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Loptous" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ドーマ"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Duma" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_アスタルテ"	) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Astarte" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_イドゥン"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Idenn" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ベルド"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Veld" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ギムレー"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Gimle" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ネルガル"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Nergal" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_アシュナード"	) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Ashnard" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ネメシス"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Nemesis" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_ハイドラ"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Hydra" )
	end

	if UnitExistOnMap( "PID_M026_異形兵_マスター_フォデス"		) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Fodeth" )
	end

end

function _u7a7a_304d_30b9_30da_30fc_30b9_306b_5897_63f4()

	local table = _u751f_304d_3066_3044_308b_95c7_7d0b_7ae0_58eb_306e_30ea_30b9_30c8_53d6_5f97()

	if ( #table <= 0 ) or ( 4 <= #table ) then
		return
	end

    local pos_smty = _u5bfe_79f0_306e_30dd_30a4_30f3_30c8_3092_53d6_5f97( table[1] )

    if bit32.band( table[1], ( table[1] - 1 ) ) == 0 then

    	if		#table == 1 then
    		_u98db_884c_306e_5897_63f4( table[1] )
    		_u98db_884c_306e_5897_63f4( pos_smty )

    	elseif	#table == 2 then
    		local pos_not = bit32.band( POS_ALL, bit32.bnot( bit32.bor( table[1], table[2] ) ) )

    		if ( table[2] == pos_smty ) then
    			_u98db_884c_306e_5897_63f4( pos_not )

    		else
    		 	_u5730_4e0a_306e_5897_63f4( bit32.band( POS_UP,		pos_not ) )
    		 	_u5730_4e0a_306e_5897_63f4( bit32.band( POS_LEFT,	pos_not ) )
    		 	_u5730_4e0a_306e_5897_63f4( bit32.band( POS_RIGHT,	pos_not ) )
    		 	_u5730_4e0a_306e_5897_63f4( bit32.band( POS_DOWN,	pos_not ) )

    		end

    	elseif	#table == 3 then
    		local pos_not = bit32.band( POS_ALL, bit32.bnot( bit32.bor( table[1], table[2], table[3] ) ) )
    		_u98db_884c_306e_5897_63f4( pos_not )

    	end

    else

    	if		#table == 1 then
    		_u5730_4e0a_306e_5897_63f4( _u5bfe_79f0_306e_30dd_30a4_30f3_30c8_3092_53d6_5f97( table[1] ) )
    		_u98db_884c_306e_5897_63f4( table[1] )

    	elseif	#table == 2 then

    		if ( table[2] == pos_smty ) then

    			if ( table[1] ~= POS_UP_LEFT ) and ( table[2] ~= POS_UP_LEFT ) then
    		 		_u5730_4e0a_306e_5897_63f4( POS_UP_LEFT )
    		 	end

    			if ( table[1] ~= POS_UP_RIGHT ) and ( table[2] ~= POS_UP_RIGHT ) then
    		 		_u5730_4e0a_306e_5897_63f4( POS_UP_RIGHT )
    		 	end

    			if ( table[1] ~= POS_DOWN_LEFT ) and ( table[2] ~= POS_DOWN_LEFT ) then
    		 		_u5730_4e0a_306e_5897_63f4( POS_DOWN_LEFT )
    		 	end

    			if ( table[1] ~= POS_DOWN_RIGHT ) and ( table[2] ~= POS_DOWN_RIGHT ) then
    		 		_u5730_4e0a_306e_5897_63f4( POS_DOWN_RIGHT )
    		 	end

    		else
    			local pos_and = bit32.band( table[1], table[2] )
    			_u5730_4e0a_306e_5897_63f4( _u5bfe_79f0_306e_30dd_30a4_30f3_30c8_3092_53d6_5f97( pos_and ) )
    			_u98db_884c_306e_5897_63f4( pos_and )

    		end

    	elseif	#table == 3 then
    		local pos_not = 30 - table[1] - table[2] - table[3]
    		_u5730_4e0a_306e_5897_63f4( pos_not )

    	end

    end

end

function _u751f_304d_3066_3044_308b_95c7_7d0b_7ae0_58eb_306e_30ea_30b9_30c8_53d6_5f97()

	local table = {}

	local index = ForceUnitGetFirst( FORCE_ENEMY )
	while index ~= nil do

		local gid = UnitGetGodUnit( index )
		if gid ~= nil then
			local pos = VariableGet( POS_PREFIX .. gid )
			table[ #table + 1 ] = pos
		end

		index = ForceUnitGetNext(index)
	end

	return table

end

function _u5bfe_79f0_306e_30dd_30a4_30f3_30c8_3092_53d6_5f97( pos )

	local pos_smty = bit32.bnot( pos )

    if bit32.band( pos, ( pos - 1 ) ) == 0 then

		if pos >= 4 then
			pos_smty = bit32.band( pos_smty, 12 )
		else
			pos_smty = bit32.band( pos_smty, 3 )
		end

		return pos_smty

	else

		pos_smty = bit32.band( pos_smty, 15 )
		return pos_smty

	end

end

function _u5730_4e0a_306e_5897_63f4( pos )

	if		( pos == POS_UP ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Up" )

	elseif	( pos == POS_DOWN ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Down" )

	elseif	( pos == POS_LEFT ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Left" )

	elseif	( pos == POS_RIGHT ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_Right" )

	elseif	( pos == POS_UP_LEFT ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_UpLeft" )

	elseif	( pos == POS_UP_RIGHT ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_UpRight" )

	elseif	( pos == POS_DOWN_LEFT ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_DownLeft" )

	elseif	( pos == POS_DOWN_RIGHT ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( "Reinforcement_DownRight" )

	end

end

function _u98db_884c_306e_5897_63f4( pos )

	if	( bit32.band( POS_UP,		pos ) ~= 0 ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S( "Reinforcement_Fly_Up" )
	end

	if	( bit32.band( POS_LEFT,		pos ) ~= 0 ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S( "Reinforcement_Fly_Left" )
	end

	if	( bit32.band( POS_RIGHT,	pos ) ~= 0 ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S( "Reinforcement_Fly_Right" )
	end

	if	( bit32.band( POS_DOWN,		pos ) ~= 0 ) then
		_u5897_63f4_914d_7f6e___F_O_C_U_S( "Reinforcement_Fly_Down" )
	end

end

function _u5897_63f4_914d_7f6e___F_O_C_U_S( group )
	Dispos( group, DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )
end

function _u5897_63f4_914d_7f6e___F_O_C_U_S_a_n_d_W_A_R_P( group )
	Dispos( group, DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 0.5 )
end

function _uc_o_n_d_i_t_i_o_n___30d0_30ea_30a2_7834_58ca()

	if VariableGet( g_key_break_barrier ) == 1 then
		return true
	end

	return false

end

function _u30d0_30ea_30a2_7834_58ca()

	local _x = CursorGetX()
	local _z = CursorGetZ()

	if		UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア４" ) or UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア４_ノーマル用" )  then

		if DifficultyGet() == DIFFICULTY_NORMAL then
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア４_ノーマル用" )
			_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア３_ノーマル用" )
		else
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア４" )
			_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア３" )
		end

		CursorSetPos( g_pid_sombre2 )
		MapCameraWait()

		EffectPlay("ソンブルバリア_破壊", 15, 15)
		EffectDelete("ソンブルバリア_Lv4", 15, 15)
		EffectCreate("ソンブルバリア_Lv3", 15, 15)
		WaitTime( 2.0 )

	elseif	UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア３" ) or UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア３_ノーマル用" ) then

		if DifficultyGet() == DIFFICULTY_NORMAL then
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア３_ノーマル用" )
			_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア２_ノーマル用" )
		else
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア３" )
			_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア２" )
		end

		CursorSetPos( g_pid_sombre2 )
		MapCameraWait()

		EffectPlay("ソンブルバリア_破壊", 15, 15)
		EffectDelete("ソンブルバリア_Lv3", 15, 15)
		EffectCreate("ソンブルバリア_Lv2", 15, 15)
		WaitTime( 2.0 )

	elseif	UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア２" ) or UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア２_ノーマル用" ) then

		if DifficultyGet() == DIFFICULTY_NORMAL then
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア２_ノーマル用" )
			_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア１_ノーマル用" )
		else
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア２" )
			_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア１" )
		end

		CursorSetPos( g_pid_sombre2 )
		MapCameraWait()

		EffectPlay("ソンブルバリア_破壊", 15, 15)
		EffectDelete("ソンブルバリア_Lv2", 15, 15)
		EffectCreate("ソンブルバリア_Lv1", 15, 15)
		WaitTime( 2.0 )

	elseif	UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア１" ) or UnitHasPrivateSkill( g_pid_sombre2, "SID_バリア１_ノーマル用" ) then

		if DifficultyGet() == DIFFICULTY_NORMAL then
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア１_ノーマル用" )
		else
			_u30b9_30ad_30eb_89e3_9664( g_pid_sombre2, "SID_バリア１" )
		end

		CursorSetPos( g_pid_sombre2 )
		MapCameraWait()

		EffectPlay("ソンブルバリア_破壊", 15, 15)
		EffectDelete("ソンブルバリア_Lv1", 15, 15)
		WaitTime( 2.0 )

		if VariableGet( g_key_barrier_broken ) == 0 then
			Talk( "MID_EV3" )
			VariableSet( g_key_barrier_broken, 1 )
		end

		local counter = VariableGet( g_key_re_barrier_counter )
		counter = counter + 1
		VariableSet( g_key_re_barrier_counter, counter )

		if ( DifficultyGet() == DIFFICULTY_NORMAL ) then

			if ( MindGetForce() == FORCE_PLAYER ) and ( _u672a_884c_52d5_30e6_30cb_30c3_30c8_6570() >= g_actUnit_border ) then
				VariableSet( g_key_re_barrier, 2 )
			else
				VariableSet( g_key_re_barrier, 3 )
			end

		else

			if ( MindGetForce() == FORCE_PLAYER ) and ( _u672a_884c_52d5_30e6_30cb_30c3_30c8_6570() >= g_actUnit_border ) then
				VariableSet( g_key_re_barrier, 1 )
			else
				VariableSet( g_key_re_barrier, 2 )
			end

		end

	end

	CursorSetPos( _x, _z )
	MapCameraWait()

	VariableSet( g_key_break_barrier, 0 )

end

function _u672a_884c_52d5_30e6_30cb_30c3_30c8_6570()

	local noAct = -1

	local index = ForceUnitGetFirst( FORCE_PLAYER )
	while index ~= nil do

		if not UnitIsStatus( index, UNIT_STATUS_FIXED ) then
			noAct = noAct + 1
		end

		index = ForceUnitGetNext(index)
	end

	return noAct

end

function _uc_o_n_d_i_t_i_o_n___30d0_30ea_30a2_5fa9_6d3b()

	local counter = VariableGet( g_key_re_barrier )
	if counter == 0 then
		return false
	end

	local stage = VariableGet( g_key_re_barrier_counter )
	if not ( ( stage == 1 ) or ( stage == 2 ) ) then
		return false
	end

	counter = counter - 1
	VariableSet( g_key_re_barrier, counter )

	return ( counter == 0 )

end

function _u30d0_30ea_30a2_5fa9_6d3b()

	local stage = VariableGet( g_key_re_barrier_counter )

	local x = UnitGetX( g_pid_sombre2 )
	local z = UnitGetZ( g_pid_sombre2 )
	CursorSetPos( x + 2, z )
	CursorSetDistanceMode( CURSOR_DISTANCE_FAR )
	MapCameraWait()

	if 		( stage == 1 ) then

		Talk( "MID_EV4" )

		Dispos( "DarkEmblem2", DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
		Yield()

	elseif 	( stage == 2 ) then

		Dispos( "DarkEmblem3", DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
		Yield()

	end

	EffectCreate("ソンブルバリア_Lv4", 15, 15)
	WaitTime( 2.0 )

	if DifficultyGet() == DIFFICULTY_NORMAL then
		_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア４_ノーマル用" )
	else
		_u30b9_30ad_30eb_88c5_5099( g_pid_sombre2, "SID_バリア４" )
	end

	VariableSet( g_reinforcement_counter, 1 )

	VariableSet( g_key_re_barrier, 0 )

end

function _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end
	return god

end

function _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71( mid, flag )
	Talk( mid )
	VariableSet( flag, 1 )
end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30e1_30c7_30a3_30a6_30b9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30e1_30c7_30a3_30a6_30b9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_マルス" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30ed_30d7_30c8_30a6_30b9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30ed_30d7_30c8_30a6_30b9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_シグルド" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30c9_30fc_30de()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30c9_30fc_30de ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_セリカ" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30a2_30b9_30bf_30eb_30c6()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30a2_30b9_30bf_30eb_30c6 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_ミカヤ" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30a4_30c9_30a5_30f3()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30a4_30c9_30a5_30f3 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_ロイ" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30d9_30eb_30c9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30d9_30eb_30c9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_リーフ" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30ae_30e0_30ec_30fc()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30ae_30e0_30ec_30fc ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_ルキナ" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30cd_30eb_30ac_30eb()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30cd_30eb_30ac_30eb ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_リン" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30a2_30b7_30e5_30ca_30fc_30c9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30a2_30b7_30e5_30ca_30fc_30c9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_アイク" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30cd_30e1_30b7_30b9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30cd_30e1_30b7_30b9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_ベレト" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30cf_30a4_30c9_30e9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30cf_30a4_30c9_30e9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_カムイ" then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71_30d5_30a9_30c7_30b9()

	if VariableGet( _ug___k_e_y___6226_95d8_524d_30d5_30a9_30c7_30b9 ) == 1 then
		return false
	end

	local god = _u95c7_7d0b_7ae0_58eb_6226_95d8_524d_4f1a_8a71___5473_65b9_7d0b_7ae0_58eb_53d6_5f97()
	if god == "GID_エイリーク" then
		return true
	end

	return false

end

function _u95c7_7d0b_7ae0_58eb_6b7b_4ea1_4f1a_8a71( mid )
	Talk( mid )
	VariableSet( g_key_break_barrier, 1 )
end

function _uc_o_n_d_i_t_i_o_n___90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483()

	if VariableGet( g_key_start_battle2 ) == 0 then
		return false
	end

	return true

end

function _u90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483()

	VariableSet( g_key_EngageBreak,		math.max( 0, VariableGet( g_key_EngageBreak ) - 1 ) )
	VariableSet( g_key_SpinAttack,		math.max( 0, VariableGet( g_key_SpinAttack ) - 1 ) )
	VariableSet( g_key_Beam,			math.max( 0, VariableGet( g_key_Beam ) - 1 ) )

	if		VariableGet( g_key_EngageBreak_startup ) == 1 then
		_u30a8_30f3_30b2_30fc_30b8_30d6_30ec_30a4_30af()

	elseif	VariableGet( g_key_Beam_startup ) == 1 then
		_u30d3_30fc_30e0()

	elseif	_uc_o_n_d_i_t_i_o_n___56de_8ee2_30a2_30bf_30c3_30af_53ef_80fd() then
		_u56de_8ee2_30a2_30bf_30c3_30af()

	else
		return

	end

	UnitSetStatus( g_pid_sombre2, UNIT_STATUS_FIXED )

	MapHistoryMindDone()
end

function _uc_o_n_d_i_t_i_o_n___90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483_4e88_544a()

	if VariableGet( g_key_start_battle2 ) == 0 then
		return false
	end

	return true

end

function _u90aa_7adc_30bd_30f3_30d6_30eb_306e_653b_6483_4e88_544a()

	if	_uc_o_n_d_i_t_i_o_n___30a8_30f3_30b2_30fc_30b8_30d6_30ec_30a4_30af_53ef_80fd() then
		_u30a8_30f3_30b2_30fc_30b8_30d6_30ec_30a4_30af_4e88_544a()

	elseif	_uc_o_n_d_i_t_i_o_n___30d3_30fc_30e0_767a_5c04_53ef_80fd() then
		_u30d3_30fc_30e0_4e88_544a()

	end

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	Movie("Scene32")

	FadeInAndWait(0)
	Talk("MID_BT8")
	FadeOutAndWait(0)

	PuppetDemo("M026", "MID_ED1")
	PuppetDemo("M026", "MID_ED2")
	PuppetDemo("M026", "MID_ED3")
	PuppetDemo("M026", "MID_ED4")

end

function GameOver()

	Log("GameOver")

	Movie("S21")
	SkipEscape()

	VariableSet(g_key_M026_gameover, 1)

end

function _uc_o_n_d_i_t_i_o_n___30a8_30f3_30b2_30fc_30b8_30d6_30ec_30a4_30af_53ef_80fd()
	if VariableGet( g_key_EngageBreak ) > 0 then
		return false
	end

	local count_all = 0
	local count_engage = 0
	local index = ForceUnitGetFirst( FORCE_PLAYER )
	while index ~= nil do

		count_all = count_all + 1

		if UnitGetEngaging( index ) then
			count_engage = count_engage + 1
		end

		index = ForceUnitGetNext(index)
	end

	if ( count_all <= g_EngageBreak_unitBorder * 2 ) then
		return ( count_engage >= 1 )

	else
		return ( count_engage >= g_EngageBreak_unitBorder )

	end
end

function _u30a8_30f3_30b2_30fc_30b8_30d6_30ec_30a4_30af_4e88_544a()
	CursorSetPos( g_pid_sombre2 )
	MapCameraWait()

	if VariableGet( g_key_EngageBreak_tutorial ) == 0 then
		Dialog( "MID_TUT_NAVI_M026_ENGAGEBREAKE" )

		VariableSet( g_key_EngageBreak_tutorial, 1 )
	end

	VariableSet( g_key_EngageBreak_startup, 1 )
end

function _u30a8_30f3_30b2_30fc_30b8_30d6_30ec_30a4_30af()

	CursorSetDistanceMode( CURSOR_DISTANCE_FAR )
	CursorSetPos( 15, 16 )
	MapCameraWait()

	MapHistoryEngageBreak( g_pid_sombre2 )

	UnitRotation( g_pid_sombre2, ROTATE_DOWN )
	UnitMoveWait()

	BattleSetAttack( g_pid_sombre2, "IID_ソンブル_エンゲージブレイク" )

	local list = {}
	local breakX = 0
	local breakZ = 0

	local index = ForceUnitGetFirst( FORCE_PLAYER )
	while index ~= nil do

		if UnitGetEngaging( index ) then
			list[ #list + 1 ] = index
			breakX = breakX + UnitGetX( index )
			breakZ = breakZ + UnitGetZ( index )
		end

		index = ForceUnitGetNext(index)
	end

	if #list > 0 then
		BattleStart( breakX/#list, breakZ/#list )
	else
		local centerX, centerZ = _u30d7_30ec_30a4_30e4_30fc_8ecd_306e_4e2d_5fc3_70b9_3092_7b97_51fa()
		BattleStart( centerX, centerZ )
	end

	if #list > 0 then
		for id in pairs( list ) do
			EffectPlay( "エンゲージブレイク_ヒット", UnitGetX( list[id] ), UnitGetZ( list[id] ) )
			UnitSetEngaging( list[id], false )
			UnitSetEngageCount( list[id], 0 )
		end
	end

	UnitUpdate()

	WaitTime( 2.0 )

	VariableSet( g_key_EngageBreak_startup, 0 )
	VariableSet( g_key_EngageBreak, g_EngageBreak_span )
end

function _uc_o_n_d_i_t_i_o_n___30d3_30fc_30e0_767a_5c04_53ef_80fd()
	if VariableGet( g_key_Beam ) > 0 then
		return false
	end

	local count = {
		{ DIR= 1, POINT=0 },
		{ DIR= 2, POINT=0 },
		{ DIR= 3, POINT=0 },
		{ DIR= 4, POINT=0 },
		{ DIR= 5, POINT=0 },
		{ DIR= 6, POINT=0 },
		{ DIR= 7, POINT=0 },
		{ DIR= 8, POINT=0 },
		{ DIR= 9, POINT=0 },
		{ DIR=10, POINT=0 },
		{ DIR=11, POINT=0 },
		{ DIR=12, POINT=0 }
	}

	for z = 1, g_map_height-2 do
		for x = 1, g_map_width-2 do

			local unit = UnitGetByPos( x, z )
			if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then

				local num = g_BeamArea_1_4_7_10[z][x]
				if num > 0 then
					count[num].POINT = count[num].POINT + 1
				end

				num = g_BeamArea_2_5_8_11[z][x]
				if num > 0 then
					count[num].POINT = count[num].POINT + 1
				end

				num = g_BeamArea_3_6_9_12[z][x]
				if num > 0 then
					count[num].POINT = count[num].POINT + 1
				end

			end

		end
	end

	table.sort( count,
				function( a, b )
					return ( a.POINT > b.POINT )
				end
				)

	if ( count[1].POINT < g_Beam_unitBorder ) then
		return false
	end

	local max_danger_num = 0
	for i = 1, #count do
		if ( count[i].POINT == count[1].POINT ) then
			max_danger_num = max_danger_num + 1
		end
	end

	local beamDir = count[RandomGet( max_danger_num ) + 1].DIR
	VariableSet( g_key_Beam_Direction, beamDir )

	return true
end

function _u30d3_30fc_30e0_4e88_544a()

	local dir = VariableGet( g_key_Beam_Direction )
	local group = ( dir - 1 ) % 3

	_u30d3_30fc_30e0___30ab_30e1_30e9_5236_5fa1( dir )

	MapRangeAddBegin()
	for z = 1, g_map_height-2 do
		for x = 1, g_map_width-2 do

			if		group == 0 then
				if g_BeamArea_1_4_7_10[z][x] == dir then
					MapRangeAdd( x, z )
				end

			elseif	group == 1 then
				if g_BeamArea_2_5_8_11[z][x] == dir then
					MapRangeAdd( x, z )
				end

			elseif	group == 2 then
				if g_BeamArea_3_6_9_12[z][x] == dir then
					MapRangeAdd( x, z )
				end

			end

		end
	end
	MapRangeAddEnd()

	Dialog( "MID_TUT_NAVI_M026_BEAM_WARNING" )

	VariableSet( g_key_Beam_startup, 1 )
end

function _u30d3_30fc_30e0()

	local dir = VariableGet( g_key_Beam_Direction )
	local group = ( dir - 1 ) % 3
	local unitCount = 0

	MapRangeClear()

	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )
	_u30bd_30f3_30d6_30eb_5411_304d_5236_5fa1( dir )
	BattleSetAttack( g_pid_sombre2, "IID_ソンブル_ビーム" )

		for z = 1, g_map_height-2 do
			for x = 1, g_map_width-2 do

				local num = 0

				if		group == 0 then
					num = g_BeamArea_1_4_7_10[z][x]

				elseif	group == 1 then
					num = g_BeamArea_2_5_8_11[z][x]

				elseif	group == 2 then
					num = g_BeamArea_3_6_9_12[z][x]

				end

				if num == dir then

					local unit = UnitGetByPos( x, z )
					if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then

						BattleAddTarget( unit )
						unitCount = unitCount + 1

					end

				end

			end
		end

	local targetX, targetZ = _u30d3_30fc_30e0___30ab_30e1_30e9_5236_5fa1___5ea7_6a19_8a08_7b97( dir )
	BattleStart( targetX, targetZ )

	_u30d3_30fc_30e0___7634_6c17_30de_30b9_8a2d_7f6e( dir, group )

	WaitTime( 1.5 )

	VariableSet( g_key_Beam_startup, 0 )
	VariableSet( g_key_Beam, g_Beam_span )
end

function _u30d3_30fc_30e0___7634_6c17_30de_30b9_8a2d_7f6e( dir, group )

	MapOverlapSetBegin()
	for z = 1, g_map_height-2 do
		for x = 1, g_map_width-2 do

			local num = 0

			if		group == 0 then
				num = g_BeamArea_1_4_7_10[z][x]

			elseif	group == 1 then
				num = g_BeamArea_2_5_8_11[z][x]

			elseif	group == 2 then
				num = g_BeamArea_3_6_9_12[z][x]

			end

			if num == dir then

				local cost = TerrainGetMoveCost( x, z )
				if ( ( cost == "COST_平地" )
					or ( cost == "COST_林" )
					or ( cost == "COST_浅瀬" ) )
					and ( RandomGet( 100 ) < g_Beam_Dirty_Rate ) then
						MapOverlapSet( x, z, "TID_瘴気" )
				else
						MapOverlapSet( x, z, "TID_無し" )
				end

			end

		end
	end
	MapOverlapSetEnd()

end

function _u30d3_30fc_30e0___30ab_30e1_30e9_5236_5fa1( dir )
	local x, z = _u30d3_30fc_30e0___30ab_30e1_30e9_5236_5fa1___5ea7_6a19_8a08_7b97( dir )

	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )
	CursorSetPos( x, z )
	MapCameraWait()
end

function _u30d3_30fc_30e0___30ab_30e1_30e9_5236_5fa1___5ea7_6a19_8a08_7b97( dir )

	if UnitExistOnMap( g_pid_sombre2 ) then

		local x = UnitGetX( g_pid_sombre2 ) + 2
		local z = UnitGetZ( g_pid_sombre2 ) + 2

		if		( dir == 1 ) or ( dir == 2 ) then
			x = x + 3
			z = z - 3

		elseif	( dir == 3 ) then
			x = x + 4

		elseif	( dir == 4 ) or ( dir == 5 ) then
			x = x + 3
			z = z + 3

		elseif	( dir == 6 ) then
			z = z + 4

		elseif	( dir == 7 ) or ( dir == 8 ) then
			x = x - 3
			z = z + 3

		elseif	( dir == 9 ) then
			x = x - 4

		elseif	( dir == 10 ) or ( dir == 11 ) then
			x = x - 3
			z = z - 3

		elseif	( dir == 12 ) then
			z = z - 4

		end

		return x, z

	end

	return 15, 15

end

function _u30bd_30f3_30d6_30eb_5411_304d_5236_5fa1( dir )

	if UnitExistOnMap( g_pid_sombre2 ) then

		if		( dir == 1 ) or ( dir == 2 ) then
			UnitRotation( g_pid_sombre2, ROTATE_DOWN_RIGHT )

		elseif	( dir == 3 ) then
			UnitRotation( g_pid_sombre2, ROTATE_RIGHT )

		elseif	( dir == 4 ) or ( dir == 5 ) then
			UnitRotation( g_pid_sombre2, ROTATE_UP_RIGHT )

		elseif	( dir == 6 ) then
			UnitRotation( g_pid_sombre2, ROTATE_UP )

		elseif	( dir == 7 ) or ( dir == 8 ) then
			UnitRotation( g_pid_sombre2, ROTATE_UP_LEFT )

		elseif	( dir == 9 ) then
			UnitRotation( g_pid_sombre2, ROTATE_LEFT )

		elseif	( dir == 10 ) or ( dir == 11 ) then
			UnitRotation( g_pid_sombre2, ROTATE_DOWN_LEFT )

		elseif	( dir == 12 ) then
			UnitRotation( g_pid_sombre2, ROTATE_DOWN )

		end

		UnitMoveWait()

	end

end

function _uc_o_n_d_i_t_i_o_n___56de_8ee2_30a2_30bf_30c3_30af_53ef_80fd()
	if VariableGet( g_key_SpinAttack ) > 0 then
		return false
	end

	local count = 0
	local sombreX = UnitGetX( g_pid_sombre2 )
	local sombreZ = UnitGetZ( g_pid_sombre2 )

	for z = 1, g_SpinAttack_Area_Size do
		for x = 1, g_SpinAttack_Area_Size do

			if not ( g_SpinAttack_Area[z][x] == 0 ) then

				local unitX = sombreX + g_SpinAttack_Area_OffsetX + x
				local unitZ = sombreZ + g_SpinAttack_Area_OffsetZ + z
				local unit = UnitGetByPos( unitX, unitZ )

				if ( unit ~= nil ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					count = count + 1
				end

			end

		end
	end

	return ( count >= g_SpinAttack_unitBorder )
end

function _u56de_8ee2_30a2_30bf_30c3_30af()

	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )
	CursorSetPos( 15, 14 )
	MapCameraWait()

	local sombreX = UnitGetX( g_pid_sombre2 )
	local sombreZ = UnitGetZ( g_pid_sombre2 )

	local x = 1
	local z = 1

	BattleSetAttack( g_pid_sombre2, "IID_ソンブル_回転アタック" )

		while( g_SpinAttack_Route[z][x] ~= G_DIR_NONE ) do

			if not ( g_SpinAttack_Area[z][x] == 0 ) then

				local unitX = sombreX + g_SpinAttack_Area_OffsetX + x
				local unitZ = sombreZ + g_SpinAttack_Area_OffsetZ + z

				local unit = UnitGetByPos( unitX, unitZ )
				if		( unit ~= nil )
					and	( UnitGetForce( unit ) == FORCE_PLAYER ) then

					BattleAddTarget( unit )

				end

			end

			x, z = _u56de_8ee2_30a2_30bf_30c3_30af___30a4_30f3_30c7_30c3_30af_30b9_66f4_65b0( x, z, g_SpinAttack_Route[z][x] )

		end

	local centerX, centerZ = _u30d7_30ec_30a4_30e4_30fc_8ecd_306e_4e2d_5fc3_70b9_3092_7b97_51fa()
	BattleStart( centerX, centerZ )

	WaitTime( 1.0 )

	VariableSet( g_key_SpinAttack, g_SpinAttack_span )
end

function _u56de_8ee2_30a2_30bf_30c3_30af___30b9_30de_30c3_30b7_30e5( unit, dir )

	if ( dir == G_DIR_DIAGONAL ) then
		return
	end

	local x = UnitGetX( unit )
	local z = UnitGetZ( unit )
	local toX, toZ = _u56de_8ee2_30a2_30bf_30c3_30af___30a4_30f3_30c7_30c3_30af_30b9_66f4_65b0( x, z, dir )

	if ( UnitGetByPos( toX, toZ ) == nil ) and UnitCanEnter( unit, toX, toZ ) then
		UnitSetPos( unit, toX, toZ )
	else
		_u30b9_30ad_30eb_88c5_5099( unit, "SID_気絶" )
	end

end

function _u56de_8ee2_30a2_30bf_30c3_30af___30a4_30f3_30c7_30c3_30af_30b9_66f4_65b0( x, z, dir )

	if		( dir == G_DIR_LEFT )	then
		x = x - 1
	elseif	( dir == G_DIR_RIGHT )	then
		x = x + 1
	elseif	( dir == G_DIR_UP )		then
		z = z + 1
	elseif	( dir == G_DIR_DOWN )	then
		z = z - 1
	end

	return x, z

end
