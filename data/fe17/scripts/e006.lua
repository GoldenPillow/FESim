Include("Common")
Include("Common_E")

g_debug_play = 0

g_Rush_Damage	= 30

g_pid_lueur = "PID_リュール"
g_pid_boss = "PID_E006_Boss"
g_pid_hide1 = "PID_E006_Hide1"
g_pid_hide2 = "PID_E006_Hide2"
g_pid_hide3 = "PID_E006_Hide3"
g_pid_hide4 = "PID_E006_Hide4"
g_pid_hide5 = "PID_E006_Hide5"
g_pid_hide6 = "PID_E006_Hide6"
g_pid_hide7 = "PID_E006_Hide7"
g_pid_hide8 = "PID_E006_Hide8"

g_key_Break	= "島崩番号"
g_key_area1 = "島崩中下_済"
g_key_area2 = "島崩左下_済"
g_key_area3 = "島崩中央_済"
g_key_area4 = "島崩右下_済"
g_key_area5 = "島崩左上_済"
g_key_area6 = "島崩右上_済"

g_key_HL_area5 = "ハードルナエリア５侵入"

g_key_Bress_Talk				= "イル攻撃_ブレス時会話"
_ug___k_e_y___6226_95d8_524d_30a8_30eb				= "戦闘前会話イル×エル_済"
_ug___k_e_y___6226_95d8_524d_30ea_30e5_30fc_30eb			= "戦闘前会話イル×リュール_済"
_ug___k_e_y___6226_95d8_524d_30bb_30ec_30b9_30c6_30a3_30a2		= "戦闘前会話イル×セレスティア_済"
_ug___k_e_y___6226_95d8_524d_30b0_30ec_30b4_30ea_30fc			= "戦闘前会話イル×グレゴリー_済"
_ug___k_e_y___6226_95d8_524d_30de_30c7_30ea_30fc_30f3			= "戦闘前会話イル×マデリーン_済"
_ug___k_e_y___6226_95d8_524d_6c4e_7528				= "戦闘前会話イル×汎用_済"

g_key_Bress						= "イル攻撃_ブレス"
g_key_Bress_Direction			= "イル攻撃_ブレス_方向"
g_key_Rush_Number				= "イル攻撃_突進番号"
g_key_Absorp_Number				= "イル攻撃_吸収番号"
g_key_Summon_Number				= "イル攻撃_召喚番号"

g_key_turn_Island7	= "最終島ターン元"
g_key_turn_Summon 	= "最終島召喚"
g_key_turn_Bress1  	= "最終島ブレス１"
g_key_turn_Bress2  	= "最終島ブレス２"
g_key_turn_Absorp 	= "最終島吸収"

g_Luna_Bress1				= 1
g_Luna_Summon1				= 2
g_Luna_Rush1				= 3

g_Luna_Summon2				= 5
g_Luna_Bress2				= 6
g_Luna_Rush2				= 7

g_Luna_Summon3				= 9
g_Luna_Bress3				= 10
g_Luna_Rush3				= 11

g_Luna_Summon4				= 13
g_Luna_Rush4				= 14

g_Luna_Summon6				= 16
g_Luna_Rush6				= 17

g_Luna_Summon5				= 19
g_Luna_Rush5				= 20

g_Luna_Island7				= 22

g_Hard_Bress1				= 1
g_Hard_Summon1				= 2
g_Hard_Rush1				= 3

g_Hard_Summon2				= 5
g_Hard_Bress2				= 6
g_Hard_Rush2				= 7

g_Hard_Summon3				= 9
g_Hard_Bress3a				= 10
g_Hard_Bress3b				= 11
g_Hard_Rush3				= 12

g_Hard_Summon4				= 14
g_Hard_Rush4				= 15

g_Hard_Summon6				= 17
g_Hard_Bress6				= 18
g_Hard_Rush6				= 19

g_Hard_Island7				= 21

g_Nor_Bress1a			= 1
g_Nor_Summon1			= 2
g_Nor_Bress1b			= 3
g_Nor_Rush1				= 4

g_Nor_Summon2a			= 6
g_Nor_Bress2			= 7
g_Nor_Summon2b			= 8
g_Nor_Rush2				= 9

g_Nor_Island5			= 11

local g_BreakArea1 = {0,
	 8, 8,  9, 8, 10, 8, 11, 8, 12, 8, 13, 8, 14, 8,
	 9, 7, 10, 7, 11, 7, 12, 7, 13, 7, 14, 7, 15, 7,
	 9, 6, 10, 6, 11, 6, 12, 6, 13, 6, 14, 6, 15, 6, 16, 6, 17, 6,
	10, 5, 11, 5, 12, 5, 13, 5, 14, 5, 15, 5, 16, 5, 17, 5, 18, 5,
	11, 4, 12, 4, 13, 4, 14, 4, 15, 4, 16, 4, 17, 4, 18, 4, 19, 4, 20, 4, 21, 4,
	 9, 3, 10, 3, 11, 3, 12, 3, 13, 3, 14, 3, 15, 3, 16, 3, 17, 3, 18, 3, 19, 3, 20, 3, 21, 3, 22, 3,
	 8, 2,  9, 2, 10, 2, 11, 2, 12, 2, 13, 2, 14, 2, 15, 2, 16, 2, 17, 2, 18, 2, 19, 2, 20, 2, 21, 2, 22, 2, 23, 2,
	 8, 1,  9, 1, 10, 1, 11, 1, 12, 1, 13, 1, 14, 1, 15, 1, 16, 1, 17, 1, 18, 1, 19, 1, 20, 1, 21, 1, 22, 1, 23, 1,
	 9, 0, 10, 0, 11, 0, 12, 0, 13, 0, 14, 0, 15, 0, 16, 0, 17, 0, 18, 0, 19, 0, 20, 0, 21, 0,
}

local g_BreakArea2 = {0,
	 3,17, 4,17,
	 2,16, 3,16, 4,16, 5,16,
	 3,15, 4,15, 5,15,
	 3,14, 4,14, 5,14,
	 3,13, 4,13, 5,13,
	 1,12, 2,12, 3,12, 4,12, 5,12, 6,12,
	 0,11, 1,11, 2,11, 3,11, 4,11, 5,11, 6,11, 7,11,
	 0,10, 1,10, 2,10, 3,10, 4,10, 5,10, 6,10, 7,10,
	 0, 9, 1, 9, 2, 9, 3, 9, 4, 9, 5, 9, 6, 9, 7, 9,
	 0, 8, 1, 8, 2, 8, 3, 8, 4, 8, 5, 8, 6, 8, 7, 8,
	 0, 7, 1, 7, 2, 7, 3, 7, 4, 7, 5, 7, 6, 7, 7, 7,
	 0, 6, 1, 6, 2, 6, 3, 6, 4, 6, 5, 6, 6, 6,
	 1, 5, 2, 5, 3, 5, 4, 5, 5, 5,
	 2, 4, 3, 4, 4, 4
}
local g_BreakArea3 = {0,
	15,17,16,17,19,17,20,17,21,17,22,17,
	13,16,14,16,15,16,16,16,17,16,18,16,19,16,20,16,21,16,
	12,15,13,15,14,15,15,15,16,15,17,15,18,15,19,15,20,15,
	11,14,12,14,13,14,14,14,15,14,16,14,17,14,18,14,19,14,20,14,
	 9,13,10,13,11,13,12,13,13,13,14,13,15,13,16,13,17,13,18,13,19,13,20,13,21,13,
	 8,12, 9,12,10,12,11,12,13,12,14,12,15,12,16,12,17,12,18,12,19,12,20,12,21,12,22,12,23,12,
	 8,11, 9,11,14,11,15,11,16,11,17,11,18,11,19,11,20,11,21,11,22,11,23,11,
	 8,10, 9,10,16,10,17,10,19,10,20,10,21,10,22,10,23,10,
	 8, 9, 9, 9,10, 9,21, 9,22, 9,23, 9
}
local g_BreakArea4 = {0,
	26,17,27,17,28,17,29,17,30,17,31,17,
	26,16,27,16,28,16,29,16,30,16,
	27,15,28,15,29,15,
	27,14,28,14,29,14,
	27,13,28,13,29,13,
	27,12,28,12,29,12,
	24,11,26,11,27,11,28,11,29,11,
	24,10,25,10,26,10,27,10,28,10,29,10,30,10,
	24, 9,25, 9,26, 9,27, 9,28, 9,29, 9,30, 9,
	24, 8,25, 8,26, 8,27, 8,28, 8,29, 8,30, 8,31, 8,
	24, 7,25, 7,26, 7,27, 7,28, 7,29, 7,30, 7,31, 7,
	25, 6,26, 6,27, 6,28, 6,29, 6,30, 6,
	26, 5,27, 5,28, 5,29, 5,30, 5,
	27, 4,28, 4,29, 4,30, 4,
	27, 3,28, 3,29, 3,30, 3,31, 3,
	26, 2,27, 2,28, 2,29, 2,30, 2,31, 2,
	26, 1,27, 1,28, 1,29, 1,30, 1,
	28, 0,29, 0
}
local g_BreakArea5 = {0,
	 2, 30, 3, 30,
	 2, 29, 3, 29, 4, 29,
	 1, 28, 2, 28, 3, 28, 4, 28,
	 0, 27, 1, 27, 2, 27, 3, 27, 6, 27,
	 0, 26, 1, 26, 2, 26, 3, 26, 5, 26, 6, 26, 7, 26,
	 0, 25, 1, 25, 2, 25, 3, 25, 4, 25, 5, 25, 6, 25,
	 0, 24, 1, 24, 2, 24, 3, 24, 4, 24, 5, 24, 6, 24,
	 0, 23, 1, 23, 2, 23, 3, 23, 4, 23, 5, 23, 6, 23, 7, 23, 8, 23, 9, 23,10, 23,
	 1, 22, 2, 22, 3, 22, 4, 22, 5, 22, 6, 22, 7, 22, 8, 22, 9, 22,10, 22,
	 2, 21, 3, 21, 4, 21, 5, 21, 6, 21, 7, 21, 8, 21, 9, 21,10, 21,
	 2, 20, 3, 20, 4, 20, 5, 20, 6, 20, 7, 20, 8, 20, 9, 20,10, 20,
	 1, 19, 2, 19, 3, 19, 4, 19, 5, 19, 6, 19, 7, 19, 8, 19, 9, 19,
	 0, 18, 1, 18, 2, 18, 3, 18, 4, 18, 7, 18, 8, 18
}
local g_BreakArea6 = {0,
	27,31,
	26,30,27,30,30,30,
	25,29,26,29,27,29,28,29,29,29,30,29,31,29,
	23,28,24,28,25,28,26,28,27,28,28,28,29,28,30,28,31,28,
	23,27,24,27,25,27,26,27,27,27,28,27,29,27,30,27,
	24,26,25,26,26,26,27,26,28,26,29,26,30,26,
	24,25,25,25,26,25,27,25,28,25,29,25,30,25,31,25,
	23,24,24,24,25,24,26,24,27,24,28,24,29,24,30,24,31,24,
	23,23,24,23,25,23,26,23,27,23,28,23,29,23,30,23,31,23,
	22,22,23,22,24,22,25,22,26,22,27,22,28,22,29,22,30,22,
	19,21,20,21,21,21,22,21,23,21,24,21,25,21,26,21,27,21,28,21,29,21,
	18,20,19,20,20,20,21,20,22,20,23,20,24,20,25,20,26,20,27,20,28,20,29,20,30,20,
	19,19,20,19,21,19,22,19,23,19,24,19,25,19,26,19,27,19,28,19,29,19,30,19,31,19,
	20,18,21,18,22,18,23,18,24,18,25,18,26,18,27,18,28,18,29,18,30,18
}

local g_BossPos = {0,

	14, 4,  3,8,  15,14,  27,5,  3,21,  27,23,  14,25
}

local g_BossBressD = {  ROTATE_DOWN_RIGHT,ROTATE_DOWN_LEFT,ROTATE_UP_LEFT,ROTATE_UP_RIGHT	}

local g_BossAbsorpD = {  0,120,240	}
local g_BossAbsorpD2 = {  ROTATE_DOWN,ROTATE_UP_LEFT,ROTATE_UP_RIGHT	}

local g_Hhani = {0,

	15,5,  4,9,  16,15,  28,6,  3,20,  28,24,  14,25
}

local g_HhaO = {0,

	15,3, 4,7, 16,13, 28,4, 4,20, 28,22
}

local g_HhaR = {0,

	15,5, 4,9, 16,15, 28,6, 4,22, 28,24, 15,26
}

local g_Rush2Saki = {
	2, 3, 4, 6, 5, 7, 5, 3, 7, 7
}

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_E006_WIN" )
	LoseRuleSetMID( "MID_RULE_DLC_LOSE2" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry(g_key_Break, 0)
	VariableEntry(g_key_area1, 0)
	VariableEntry(g_key_area2, 0)
	VariableEntry(g_key_area3, 0)
	VariableEntry(g_key_area4, 0)
	VariableEntry(g_key_area5, 0)
	VariableEntry(g_key_area6, 0)

	VariableEntry(g_key_HL_area5, 0)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		VariableEntry(g_key_turn_Island7, g_Nor_Island5)
		VariableEntry(g_key_turn_Summon , g_Nor_Island5)
		VariableEntry(g_key_turn_Bress1 , g_Nor_Island5+1 )
		VariableEntry(g_key_turn_Absorp , g_Nor_Island5+2 )
		VariableEntry(g_key_turn_Bress2 , g_Nor_Island5+4 )
	elseif DifficultyGet() == DIFFICULTY_HARD then
		VariableEntry(g_key_turn_Island7, g_Hard_Island7)
		VariableEntry(g_key_turn_Summon , g_Hard_Island7)
		VariableEntry(g_key_turn_Bress1 , g_Hard_Island7 )
		VariableEntry(g_key_turn_Absorp , g_Hard_Island7 )
		VariableEntry(g_key_turn_Bress2 , g_Hard_Island7 )
	else
		VariableEntry(g_key_turn_Island7, g_Luna_Island7)
		VariableEntry(g_key_turn_Summon , g_Luna_Island7)
		VariableEntry(g_key_turn_Bress1 , g_Luna_Island7 )
		VariableEntry(g_key_turn_Absorp , g_Luna_Island7 )
		VariableEntry(g_key_turn_Bress2 , 0 )

	end

	VariableEntry( g_key_Bress_Direction,	0 )
	VariableEntry( g_key_Rush_Number,		0 )
	VariableEntry( g_key_Summon_Number,		0 )
	VariableEntry( g_key_Absorp_Number,		0 )

	VariableEntry( "ヴェロニカ召喚カウント", 0 )

	VariableEntry( "紋章氣_済", 0 )
	VariableEntry( "紋章氣_X", 0 )
	VariableEntry( "紋章氣_Z", 0 )

	VariableEntry(g_key_Bress_Talk, 0)
	VariableEntry(_ug___k_e_y___6226_95d8_524d_30a8_30eb			,0)
	VariableEntry(_ug___k_e_y___6226_95d8_524d_30ea_30e5_30fc_30eb		,0)
	VariableEntry(_ug___k_e_y___6226_95d8_524d_30bb_30ec_30b9_30c6_30a3_30a2	,0)
	VariableEntry(_ug___k_e_y___6226_95d8_524d_30b0_30ec_30b4_30ea_30fc	,0)
	VariableEntry(_ug___k_e_y___6226_95d8_524d_30de_30c7_30ea_30fc_30f3	,0)
	VariableEntry(_ug___k_e_y___6226_95d8_524d_6c4e_7528			,0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( GodSaveEquipE,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )

	EventEntryTurnAfter(_u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3,-1,-1, FORCE_PLAYER);
	EventEntryTurnAfter(_u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3,-1,-1, FORCE_ENEMY);

	EventEntryTurnAfter(_u6700_7d42_5cf6_7ba1_7406_9752, -1  , -1  , FORCE_PLAYER);
	EventEntryTurnAfter(_u6700_7d42_5cf6_7ba1_7406_8d64, -1  , -1  , FORCE_ENEMY);

	EventEntryTurn(_u30f4_30a7_30ed_30cb_30ab_7ba1_7406,-1,-1, FORCE_PLAYER);

	EventEntryArea(_u30a8_30ea_30a2_ff15_4fb5_5165_5bfe_7b56, 1, 18, 7, 26, FORCE_PLAYER, g_key_area)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u5897_63f4_5de6_4e0b,  8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_5de6_4e0a,  9, 9, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b,    9, 9, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_5de6 ,  11,11, FORCE_PLAYER)

		EventEntryTurn(_u5cf6_ff14_884c_52d5,  7, 7, FORCE_PLAYER)
		EventEntryTurn(_u5cf6_ff16_884c_52d5, 12,12, FORCE_PLAYER)

	elseif DifficultyGet() == DIFFICULTY_HARD then

		EventEntryTurn(_u5897_63f4_5de6_4e0b,  6, 7, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b,  9,10, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_53f3_4e0a, 12,13, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_5de6_4e0a, 14,15, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff11,  22,22, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff12,  25,25, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff11,  28,28, FORCE_PLAYER)

	else

		EventEntryTurn(_u5897_63f4_5de6_4e0b,  3,3, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_5de6_4e0b,  5,5, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_5de6,    4,4, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_5de6,    6,6, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_4e0b,  8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b, 13,13, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_4e0b, 17,17, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_4e0b, 23,23, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_4e0b, 29,29, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_53f3_4e0a, 9,9, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_53f3_4e0a,11,11, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_5de6_4e0a, 13,13, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_4e0a_ff12,  16,16, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff11,  19,19, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff12,  22,22, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff11,  25,25, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff12,  28,28, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_ff11,  31,31, FORCE_PLAYER)

	end

	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71_30a8_30eb			, "PID_E006_エル"			, FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30a8_30eb			 );
	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71_30ea_30e5_30fc_30eb		, "PID_リュール"			, FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30ea_30e5_30fc_30eb		 );
	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71_30bb_30ec_30b9_30c6_30a3_30a2	, "PID_E006_セレスティア"	, FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30bb_30ec_30b9_30c6_30a3_30a2	 );
	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71_30b0_30ec_30b4_30ea_30fc	, "PID_E006_グレゴリー"		, FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30b0_30ec_30b4_30ea_30fc	 );
	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71_30de_30c7_30ea_30fc_30f3	, "PID_E006_マデリーン"		, FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30de_30c7_30ea_30fc_30f3	 );
	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71_6c4e_7528			, ""						, FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___6c4e_7528			 );

	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_hide6, FORCE_ENEMY, true, "戦闘前会話_裏６_リュール_済", "MID_BT24");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_hide8, FORCE_ENEMY, true, "戦闘前会話_裏８_リュール_済", "MID_BT25");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_済", "MID_BT3");
	EventEntryDie(Talk, g_pid_hide1, FORCE_ENEMY, condition_true, "MID_BT4");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide2, FORCE_ENEMY, true, "戦闘前会話_裏２_済", "MID_BT5");
	EventEntryDie(Talk, g_pid_hide2, FORCE_ENEMY, condition_true, "MID_BT6");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide3, FORCE_ENEMY, true, "戦闘前会話_裏３_済", "MID_BT7");
	EventEntryDie(Talk, g_pid_hide3, FORCE_ENEMY, condition_true, "MID_BT8");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide4, FORCE_ENEMY, true, "戦闘前会話_裏４_済", "MID_BT9");
	EventEntryDie(Talk, g_pid_hide4, FORCE_ENEMY, condition_true, "MID_BT10");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide5, FORCE_ENEMY, true, "戦闘前会話_裏５_済", "MID_BT11");
	EventEntryDie(Talk, g_pid_hide5, FORCE_ENEMY, condition_true, "MID_BT12");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide6, FORCE_ENEMY, true, "戦闘前会話_裏６_済", "MID_BT13");
	EventEntryDie(Talk, g_pid_hide6, FORCE_ENEMY, condition_true, "MID_BT14");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide7, FORCE_ENEMY, true, "戦闘前会話_裏７_済", "MID_BT15");
	EventEntryDie(Talk, g_pid_hide7, FORCE_ENEMY, condition_true, "MID_BT16");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide8, FORCE_ENEMY, true, "戦闘前会話_裏８_済", "MID_BT17");
	EventEntryDie(Talk, g_pid_hide8, FORCE_ENEMY, condition_true, "MID_BT18");

	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E006_エル", FORCE_PLAYER, FORCE_ALL )

end

function Cleanup()

	Log("Cleanup");

end

function Opening()
	Log("Opening");
	if g_debug_play ~= 1 then
		PlayChapterTitle("E006")
		Yield()
		FadeOut(0)

		Movie("Narration06")
		SkipEscape()

		PuppetDemo("E006", "MID_OP2")
		PuppetDemo("E006", "MID_OP3")
		PuppetDemo("E006", "MID_OP4")
	end

	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()
end

function MapOpening()

	Log("MapOpening");
	FadeOut(0)
	UnitSetHpStock(g_pid_boss, 1)

	UnitSetPrivateSkill( g_pid_boss, "SID_受けるダメージ-50" )

	bP = 2
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)
	bP = 3
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)
	bP = 4
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)
	bP = 5
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)
	bP = 6
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)
	bP = 7
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)

	FadeIn(FADE_FAST)

	bP = 1
	MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)

	Talk( "MID_EV1" )
	UnitPutOffItem("PID_リュール", "IID_リベラシオン")

	if DifficultyGet() == DIFFICULTY_NORMAL then
		ItemGain( g_pid_lueur, "IID_リベラシオン改_ノーマル" )
	else
		ItemGain( g_pid_lueur, "IID_リベラシオン改" )
	end

	Dialog( "MID_TUT_DLG_E006_ADVICE" )

	GodLoadEquipE()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( "E006" )
end

function _u6226_95d8_958b_59cb_76f4_5f8c()
	CursorSetPos_FromPid( "PID_E006_エル" )
	Talk( "MID_EV2" )

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()

	local x = UnitGetX( g_pid_boss )
	local z = UnitGetZ( g_pid_boss )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W3H3", x, z)
	WaitTime( 2.0 )

	WinRule()

	MapObjectDelete( "Eff_Cursor01" )

end

function _u5473_65b9_6b7b_4ea1()
	VariableSet( "敗北", 1 )
end

function _u6226_95d8_524d_4f1a_8a71_30a8_30eb()
	Talk( "MID_BT19" )
	VariableSet( _ug___k_e_y___6226_95d8_524d_30a8_30eb, 1 )
end
function _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30a8_30eb()
	if VariableGet( g_key_Bress_Talk ) == 1 then
		return false

	elseif VariableGet( _ug___k_e_y___6226_95d8_524d_30a8_30eb ) == 1 then
		return false
	end
	return true
end

function _u6226_95d8_524d_4f1a_8a71_30ea_30e5_30fc_30eb()
	Talk( "MID_BT20" )
	VariableSet( _ug___k_e_y___6226_95d8_524d_30ea_30e5_30fc_30eb, 1 )
end
function _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30ea_30e5_30fc_30eb()
	if VariableGet( g_key_Bress_Talk ) == 1 then
		return false

	elseif VariableGet( _ug___k_e_y___6226_95d8_524d_30ea_30e5_30fc_30eb ) == 1 then
		return false
	end
	return true
end

function _u6226_95d8_524d_4f1a_8a71_30bb_30ec_30b9_30c6_30a3_30a2()
	Talk( "MID_BT21" )
	VariableSet( _ug___k_e_y___6226_95d8_524d_30bb_30ec_30b9_30c6_30a3_30a2, 1 )
end
function _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30bb_30ec_30b9_30c6_30a3_30a2()
	if VariableGet( g_key_Bress_Talk ) == 1 then
		return false

	elseif VariableGet( _ug___k_e_y___6226_95d8_524d_30bb_30ec_30b9_30c6_30a3_30a2 ) == 1 then
		return false
	end
	return true
end

function _u6226_95d8_524d_4f1a_8a71_30b0_30ec_30b4_30ea_30fc()
	Talk( "MID_BT22" )
	VariableSet( _ug___k_e_y___6226_95d8_524d_30b0_30ec_30b4_30ea_30fc, 1 )
end
function _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30b0_30ec_30b4_30ea_30fc()
	if VariableGet( g_key_Bress_Talk ) == 1 then
		return false

	elseif VariableGet( _ug___k_e_y___6226_95d8_524d_30b0_30ec_30b4_30ea_30fc ) == 1 then
		return false
	end
	return true
end

function _u6226_95d8_524d_4f1a_8a71_30de_30c7_30ea_30fc_30f3()
	Talk( "MID_BT23" )
	VariableSet( _ug___k_e_y___6226_95d8_524d_30de_30c7_30ea_30fc_30f3, 1 )
end
function _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___30de_30c7_30ea_30fc_30f3()
	if VariableGet( g_key_Bress_Talk ) == 1 then
		return false

	elseif VariableGet( _ug___k_e_y___6226_95d8_524d_30de_30c7_30ea_30fc_30f3 ) == 1 then
		return false
	end
	return true
end

function _u6226_95d8_524d_4f1a_8a71_6c4e_7528()
	Talk( "MID_BT1" )
	VariableSet( _ug___k_e_y___6226_95d8_524d_6c4e_7528, 1 )
end
function _uc_o_n_d_i_t_i_o_n___5168_4f53_653b_6483_78ba_8a8d___6c4e_7528()
	if VariableGet( g_key_Bress_Talk ) == 1 then
		return false

	elseif VariableGet( _ug___k_e_y___6226_95d8_524d_6c4e_7528 ) == 1 then
		return false
	end
	return true
end

function _u5897_63f4_5de6_4e0b()
	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_4e0b()
	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_5de6()
	Dispos("Enemy_Reinforcement3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_53f3_4e0a()
	Dispos("Enemy_Reinforcement4", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_5de6_4e0a()
	Dispos("Enemy_Reinforcement5", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_4e0a_ff11()
	Dispos("Enemy_Reinforcement6", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_4e0a_ff12()
	Dispos("Enemy_Reinforcement7", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5358_4f53_884c_52d5_958b_59cb(unit)
	if UnitExistOnMap( unit ) then
		AiSetSequence(unit, AI_ORDER_CAUSE, "AI_AC_Everytime")
		AiSetSequence(unit, AI_ORDER_MOVE, "AI_MV_WeakEnemy")
	end
end

function _u5cf6_ff14_884c_52d5()
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,3))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(24,9))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(25,10))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(27,2))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(26,6))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(29,4))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,9))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(26,11))
end

function _u5cf6_ff16_884c_52d5()
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,28))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(25,21))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(23,22))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(26,20))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(24,25))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(25,24))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(29,21))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(26,27))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(29,18))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,15))
	_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(29,13))
end

function _u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff11()
	if UnitExistOnMap( g_pid_hide1 ) then
		AiSetSequence(g_pid_hide1, AI_ORDER_CAUSE, "AI_AC_Everytime")
		AiSetSequence(g_pid_hide1, AI_ORDER_MOVE, "AI_MV_Position", "pos(18, 20)")
		AiSetSequence(g_pid_hide1, AI_ORDER_ATTACK, "AI_AT_Null")
	end
end
function _u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff12()
	if UnitExistOnMap( g_pid_hide1 ) then

		AiSetSequence(g_pid_hide1, AI_ORDER_ATTACK,"AI_AT_EngageWaitGaze", "2,2,pos(18, 20)")
	end
end
function _u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff13()
	if UnitExistOnMap( g_pid_hide1 ) then
		AiSetSequence(g_pid_hide1, AI_ORDER_MOVE, "AI_MV_WeakEnemy")
		AiSetSequence(g_pid_hide1, AI_ORDER_ATTACK,"AI_AT_Attack")
	end
end

function _u30a8_30ea_30a2_ff15_4fb5_5165_5bfe_7b56()
	local turn = MapGetTurn()
	local pid = UnitGetPID(MindGetUnit())
	if turn < g_Hard_Summon3 then
		VariableSet(g_key_HL_area5, 1)
	end
end

function _u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3_30ce_30fc_30de_30eb()

	local turn = MapGetTurn()

		_u53ec_559a_914d_7f6e()

		if turn == g_Nor_Summon1 then
			VariableSet( g_key_Summon_Number, 1 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Nor_Summon2a then
			VariableSet( g_key_Summon_Number, 3 )
			_u53ec_559a_4e88_544a()

		elseif turn == g_Nor_Summon2b then
			VariableSet( g_key_Summon_Number, 3 )
			_u53ec_559a_4e88_544a()

		elseif turn == g_Nor_Bress1a then
			VariableSet( g_key_Bress_Direction, 1 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Nor_Bress1b then
			VariableSet( g_key_Bress_Direction, 2 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Nor_Bress2 then
			VariableSet( g_key_Bress_Direction, 2 )
			_u30d6_30ec_30b9_4e88_544a()
		end
end
function _u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3_30cf_30fc_30c9()

	local turn = MapGetTurn()

	if VariableGet( g_key_HL_area5 ) == 1 and turn >= 9 then

		if turn == 9 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_4e0a_ff11()
		elseif turn == 10 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_4e0a_ff11()
		elseif turn == 12 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_53f3_4e0a()
			_u5897_63f4_4e0a_ff11()
		elseif turn == 13 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_53f3_4e0a()
			_u5897_63f4_4e0a_ff12()
		elseif turn == 14 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_53f3_4e0a()
			_u5897_63f4_4e0a_ff12()

		elseif turn == 16 then
			_u5897_63f4_4e0a_ff11()
			_u5897_63f4_4e0a_ff12()

		elseif turn == 18 then
			_u5897_63f4_4e0a_ff11()
			_u5897_63f4_4e0a_ff12()

		elseif turn == 20 then
			_u5897_63f4_4e0a_ff11()
			_u5897_63f4_4e0a_ff12()
		end
	else

		_u53ec_559a_914d_7f6e()

		if turn == g_Hard_Summon1 then
			VariableSet( g_key_Summon_Number, 1 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Hard_Summon2 then
			VariableSet( g_key_Summon_Number, 2 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Hard_Summon3 then
			VariableSet( g_key_Summon_Number, 3 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Hard_Summon4 then
			VariableSet( g_key_Summon_Number, 4 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Hard_Summon6 then
			VariableSet( g_key_Summon_Number, 6 )
			_u53ec_559a_4e88_544a()

		elseif turn == g_Hard_Bress1 then
			VariableSet( g_key_Bress_Direction, 1 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Hard_Bress2 then
			VariableSet( g_key_Bress_Direction, 1 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Hard_Bress3a then
			VariableSet( g_key_Bress_Direction, 2 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Hard_Bress3b then
			VariableSet( g_key_Bress_Direction, 1 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Hard_Bress6 then
			VariableSet( g_key_Bress_Direction, 2 )
			_u30d6_30ec_30b9_4e88_544a()
		end
	end
end
function _u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3_30eb_30ca()
	local turn = MapGetTurn()

	if VariableGet( g_key_HL_area5 ) == 1 and turn >= 9 then

		if turn == 9 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_4e0a_ff11()

			_u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff13()

			_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,3))

		elseif turn == 10 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_4e0a_ff12()

			_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,28))

		elseif turn == 12 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_4e0a_ff11()

		elseif turn == 14 then
			_u5897_63f4_5de6_4e0a()
			_u5897_63f4_4e0a_ff12()
			_u5897_63f4_4e0b()
		elseif turn == 16 then
			_u5897_63f4_4e0a_ff11()

		elseif turn == 18 then
			_u5897_63f4_4e0a_ff12()

		elseif turn == 20 then
			_u5897_63f4_4e0a_ff11()
		end
	else

		_u53ec_559a_914d_7f6e()

		if turn == g_Luna_Summon1 then
			VariableSet( g_key_Summon_Number, 1 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Luna_Summon2 then
			VariableSet( g_key_Summon_Number, 2 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Luna_Summon3 then

			_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(28,3))
			VariableSet( g_key_Summon_Number, 3 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Luna_Summon4 then
			VariableSet( g_key_Summon_Number, 4 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Luna_Summon6 then
			VariableSet( g_key_Summon_Number, 6 )
			_u53ec_559a_4e88_544a()
		elseif turn == g_Luna_Summon5 then
			_u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff13()

			_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(3,25))
			_u5358_4f53_884c_52d5_958b_59cb(UnitGetByPos(7,22))

			VariableSet( g_key_Summon_Number, 5 )
			_u53ec_559a_4e88_544a()

		elseif turn == g_Luna_Bress1 then
			VariableSet( g_key_Bress_Direction, 2 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Luna_Bress2 then
			VariableSet( g_key_Bress_Direction, 4 )
			_u30d6_30ec_30b9_4e88_544a()
		elseif turn == g_Luna_Bress3 then
			VariableSet( g_key_Bress_Direction, 2 )
			_u30d6_30ec_30b9_4e88_544a()
		end
	end

end

function _u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3()
	if DifficultyGet() == DIFFICULTY_NORMAL then
		_u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3_30ce_30fc_30de_30eb()
	elseif DifficultyGet() == DIFFICULTY_HARD then
		_u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3_30cf_30fc_30c9()
	else
		_u30a4_30eb_884c_52d5_7ba1_7406_9752_30bf_30fc_30f3_30eb_30ca()
	end
end

function _u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3_30ce_30fc_30de_30eb()
	local turn = MapGetTurn()

	_u30d6_30ec_30b9_767a_5c04()
	if  turn < g_Nor_Island5 then

		local rNum1 = g_Nor_Rush1 + 1
		local rNum2 = g_Nor_Rush2 + 1

		if turn == g_Nor_Rush1 then

			VariableSet( g_key_Rush_Number, 8 )

			VariableSet( g_key_Break, 1 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Nor_Rush2 then

			VariableSet( g_key_Rush_Number, 9 )

			VariableSet( g_key_Break, 3 )
			_u7a81_9032_4e88_544a()

		elseif turn == rNum1 then
			Log("ノーマル突進１")
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum2 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		end
	end
end

function _u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3_30cf_30fc_30c9()
	local turn = MapGetTurn()

	if VariableGet( g_key_HL_area5 ) == 1 and turn >= 9 then

		if turn == 9 then
			VariableSet( g_key_Rush_Number, 3 )
			VariableSet( g_key_Break, 3 )
			_u7a81_9032_4e88_544a()
		elseif turn == 10 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == 11 then
			VariableSet( g_key_Rush_Number, 4 )
			VariableSet( g_key_Break, 4 )
			_u7a81_9032_4e88_544a()
		elseif turn == 12 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == 13 then
			VariableSet( g_key_Rush_Number, 10 )
			VariableSet( g_key_Break, 6 )
			_u7a81_9032_4e88_544a()
		elseif turn == 14 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn > 14 then
			_u30d6_30ec_30b9_767a_5c04()
		end

	else
		_u30d6_30ec_30b9_767a_5c04()

		local rNum1 = g_Hard_Rush1 + 1
		local rNum2 = g_Hard_Rush2 + 1
		local rNum3 = g_Hard_Rush3 + 1
		local rNum4 = g_Hard_Rush4 + 1
		local rNum6 = g_Hard_Rush6 + 1

		if turn == g_Hard_Rush1 then

			VariableSet( g_key_Rush_Number, 1 )

			VariableSet( g_key_Break, 1 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Hard_Rush2 then

			VariableSet( g_key_Rush_Number, 2 )

			VariableSet( g_key_Break, 2 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Hard_Rush3 then

			VariableSet( g_key_Rush_Number, 3 )

			VariableSet( g_key_Break, 3 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Hard_Rush4 then

			VariableSet( g_key_Rush_Number, 4 )

			VariableSet( g_key_Break, 4 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Hard_Rush6 then

			VariableSet( g_key_Rush_Number, 10 )

			VariableSet( g_key_Break, 6 )
			_u7a81_9032_4e88_544a()

		elseif turn == rNum1 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum2 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum3 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum4 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum6 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		end
	end

end

function _u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3_30eb_30ca()

	local turn = MapGetTurn()

	if VariableGet( g_key_HL_area5 ) == 1 and turn >= 9 then
		Log("◆◆◆ルナ移動")

		if turn == 9 then
			VariableSet( g_key_Rush_Number, 3 )
			VariableSet( g_key_Break, 3 )
			_u7a81_9032_4e88_544a()
		elseif turn == 10 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == 11 then
			VariableSet( g_key_Rush_Number, 4 )
			VariableSet( g_key_Break, 4 )
			_u7a81_9032_4e88_544a()
		elseif turn == 12 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == 13 then
			VariableSet( g_key_Rush_Number, 10 )
			VariableSet( g_key_Break, 6 )
			_u7a81_9032_4e88_544a()
		elseif turn == 14 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn > 14 then
			_u30d6_30ec_30b9_767a_5c04()
		end

	else
		_u30d6_30ec_30b9_767a_5c04()

		local rNum1 = g_Luna_Rush1 + 1
		local rNum2 = g_Luna_Rush2 + 1
		local rNum3 = g_Luna_Rush3 + 1
		local rNum4 = g_Luna_Rush4 + 1
		local rNum6 = g_Luna_Rush6 + 1
		local rNum5 = g_Luna_Rush5 + 1

		if turn == g_Luna_Rush1 then

			VariableSet( g_key_Rush_Number, 1 )

			VariableSet( g_key_Break, 1 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Luna_Rush2 then

			VariableSet( g_key_Rush_Number, 2 )

			VariableSet( g_key_Break, 2 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Luna_Rush3 then

			VariableSet( g_key_Rush_Number, 3 )

			_u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff12()

			VariableSet( g_key_Break, 3 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Luna_Rush4 then

			VariableSet( g_key_Rush_Number, 4 )

			VariableSet( g_key_Break, 4 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Luna_Rush6 then

			VariableSet( g_key_Rush_Number, 5 )

			VariableSet( g_key_Break, 6 )
			_u7a81_9032_4e88_544a()
		elseif turn == g_Luna_Rush5 then

			VariableSet( g_key_Rush_Number, 6 )

			VariableSet( g_key_Break, 5 )
			_u7a81_9032_4e88_544a()

		elseif turn == rNum1 then

			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum2 then
			_u30eb_30ca_30a2_30eb_30d5_30ec_30c3_30c9_ff11()
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum3 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum4 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum5 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		elseif turn == rNum6 then
			_u5486_54ee_5168_6ec5_79fb_52d5()
		end
	end
end

function _u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3()
	if DifficultyGet() == DIFFICULTY_NORMAL then
		_u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3_30ce_30fc_30de_30eb()
	elseif DifficultyGet() == DIFFICULTY_HARD then
		_u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3_30cf_30fc_30c9()
	else
		_u30a4_30eb_884c_52d5_7ba1_7406_8d64_30bf_30fc_30f3_30eb_30ca()
	end

end

function _u53ec_559a_6e26_4f5c_6210(areaname)
	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()

	local countD = DisposGetGroupCount(areaname)
	countD = countD - 1

		for i = 0, countD do
			local unitX = DisposGetUnitX(areaname, i,DifficultyGet())
			local unitZ = DisposGetUnitZ(areaname, i,DifficultyGet())

			if unitX ~= -1 then
				EffectCreate( "召喚渦", unitX,unitZ )
			end
		end
		WaitTime( 1.0 )

end

function _u53ec_559a_4e88_544a()

	local turn = MapGetTurn()
	local countD
	local sNum1
	local sNum2
	local sNum3
	local sNum3b
	local sNum4
	local sNum5
	local sNum6

	if DifficultyGet() == DIFFICULTY_NORMAL then
		sNum1 = g_Nor_Summon1
		sNum3  = g_Nor_Summon2a
		sNum3b = g_Nor_Summon2b
	elseif DifficultyGet() == DIFFICULTY_HARD then
		sNum1 = g_Hard_Summon1
		sNum2 = g_Hard_Summon2
		sNum3 = g_Hard_Summon3
		sNum4 = g_Hard_Summon4
		sNum6 = g_Hard_Summon6
	else
		sNum1 = g_Luna_Summon1
		sNum2 = g_Luna_Summon2
		sNum3 = g_Luna_Summon3
		sNum4 = g_Luna_Summon4
		sNum6 = g_Luna_Summon6
		sNum5 = g_Luna_Summon5
	end

	if turn == sNum1 then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area1")
		CursorSetPos(11,7)
		MapCameraWait()
		CursorAnimeCreate( 11, 7 )

		Talk( "MID_EV3" )
		Tutorial( "TUTID_イル召喚" )
		CursorAnimeDelete()

	elseif turn == sNum2 then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area2")

	elseif turn == sNum3 then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area3")

	elseif turn == sNum3b then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area3")

	elseif turn == sNum4 then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area4")

	elseif turn == sNum6 then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area6")

	elseif turn == sNum5 then
		_u53ec_559a_6e26_4f5c_6210("Enemy_Area5")
	end

end

function _u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e(areaname)

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()

	UnitPlayAnim(g_pid_boss, UNIT_ANIM_EVENT2)
	SoundPostEvent("SE_DLC_IL_DragonVoice")

	UnitMoveWait()
	WaitTime( 3.0 )

	Dispos( areaname, DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP  + DISPOS_FLAG_NOT_FORCED)
	Yield()
	WaitTime( 2.0 )

	countD = DisposGetGroupCount(areaname)
	countD = countD - 1
	for i = 0, countD do
		local unitX = DisposGetUnitX(areaname, i,DifficultyGet())
		local unitZ = DisposGetUnitZ(areaname, i,DifficultyGet())
		if unitX ~= -1 then
			EffectDelete( "召喚渦", unitX,unitZ )
		end
	end
	Yield()
	WaitTime( 1.0 )

end
function _u53ec_559a_914d_7f6e()

	local turn = MapGetTurn()

	local hai1
	local hai2
	local hai3
	local hai3b
	local hai4
	local hai5
	local hai6

	if DifficultyGet() == DIFFICULTY_NORMAL then
		hai1  = g_Nor_Summon1 + 1
		hai3  = g_Nor_Summon2a + 1
		hai3b = g_Nor_Summon2b + 1
	elseif DifficultyGet() == DIFFICULTY_HARD then
		hai1 = g_Hard_Summon1 + 1
		hai2 = g_Hard_Summon2 + 1
		hai3 = g_Hard_Summon3 + 1
		hai4 = g_Hard_Summon4 + 1
		hai6 = g_Hard_Summon6 + 1
	else
		hai1 = g_Luna_Summon1 + 1
		hai2 = g_Luna_Summon2 + 1
		hai3 = g_Luna_Summon3 + 1
		hai4 = g_Luna_Summon4 + 1
		hai6 = g_Luna_Summon6 + 1
		hai5 = g_Luna_Summon5 + 1
	end

	if turn == hai1 then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area1")

	elseif turn == hai2 then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area2")

	elseif turn == hai3 then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area3")

	elseif turn == hai3b then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area3")

	elseif turn == hai4 then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area4")

	elseif turn == hai6 then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area6")

	elseif turn == hai5 then
		_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area5")
	end
end

local g_BressPos = { 0,
	 3,-1,	-1,-1,	-1,3,	3,3
}

local g_BressAreaSize = 21
local g_BressArea = {

	{ 0, 3,2, 3,1, 3,0, 3,-1, 3,-2 , 4,2, 4,1, 4,0, 4,-1  ,0,-1, 1,-1, 2,-1 ,0,-2, 1,-2, 2,-2  ,5,1,5,0  ,1,-3,2,-3  ,3,3,-1,-1  },

	{ 0, -1,2,-1,1,-1,0,-1,-1,-1,-2 ,-2,2,-2,1,-2,0,-2,-1  ,0,-1, 1,-1, 2,-1 ,0,-2, 1,-2, 2,-2  ,-3,1,-3,0  ,0,-3,1,-3  ,3,-1,-1,3  },

	{ 0 ,-2,3, -1,3, 0,3, 1,3, 2,3, 3,3,  -1,4,0,4, 1,4, 2,4, 0,5, 1,5,  -1,-1, -1,0, -1,1, -1,2, -2,0, -2,1, -2,2, -3,1, -3,2       },

	{ 0, -1,3, 0,3, 1,3, 2,3, 3,3, 4,3, 0,4,1,4, 2,4, 3,4, 1,5, 2,5,  3,-1,3,0,3,1,3,2, 4,0,4,1,4,2, 5,1,5,2  },

	{ 0, 0,0, 0,0, 0, 0,0,0, 0,0, 0,0, 0,0, 0,0,  0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0}
}

function _u30d6_30ec_30b9_691c_7d22_4e88_544a()
	local bressNum = 1
	local debstr

	local unit = UnitGetPID(g_pid_boss)
	local x = UnitGetX(unit)
	local z = UnitGetZ(unit)

	local unitcount1 = 0
	local unitcount2 = 0
	local unitcount3 = 0
	local unitcount4 = 0

	local dirC = 1
	for i = 1,  g_BressAreaSize do
		local bx = x + g_BressArea[dirC][i*2]
		local bz = z + g_BressArea[dirC][i*2+1]

		local unit = UnitGetByPos( bx, bz )
		if ( not ( unit == nil ) )  then
			if UnitGetForce( unit ) == FORCE_PLAYER then
				unitcount1 = unitcount1 + 1
			end
		end
	end

	dirC = 2
	for i = 1,  g_BressAreaSize do
		local bx = x + g_BressArea[dirC][i*2]
		local bz = z + g_BressArea[dirC][i*2+1]

		local unit = UnitGetByPos( bx, bz )
		if ( not ( unit == nil ) )  then
			if UnitGetForce( unit ) == FORCE_PLAYER then
				unitcount2 = unitcount2 + 1
			end
		end
	end

	dirC = 3
	for i = 1,  g_BressAreaSize do
		local bx = x + g_BressArea[dirC][i*2]
		local bz = z + g_BressArea[dirC][i*2+1]

		local unit = UnitGetByPos( bx, bz )
		if ( not ( unit == nil ) )  then
			if UnitGetForce( unit ) == FORCE_PLAYER then
				unitcount3 = unitcount3 + 1
			end
		end
	end

	dirC = 4
	for i = 1,  g_BressAreaSize do
		local bx = x + g_BressArea[dirC][i*2]
		local bz = z + g_BressArea[dirC][i*2+1]

		local unit = UnitGetByPos( bx, bz )
		if ( not ( unit == nil ) )  then
			if UnitGetForce( unit ) == FORCE_PLAYER then
				unitcount4 = unitcount4 + 1
			end
		end
	end

	if (unitcount4 >= unitcount1) and (unitcount4 >= unitcount2) and (unitcount4 >= unitcount3) then
		bressNum = 4
	end
	if (unitcount3 >= unitcount1) and (unitcount3 >= unitcount2) and (unitcount3 >= unitcount4) then
		bressNum = 3
	end
	if (unitcount2 >= unitcount1) and (unitcount2 >= unitcount3) and (unitcount2 >= unitcount4) then
		bressNum = 2
	end
	if (unitcount1 >= unitcount2) and (unitcount1 >= unitcount3) and (unitcount1 >= unitcount4) then
		bressNum = 1
	end

	VariableSet( g_key_Bress_Direction, bressNum )

	CursorSetPos_FromPid( g_pid_boss )

	MapRangeAddBegin()
		for i = 1,  g_BressAreaSize do
			local bx = x + g_BressArea[bressNum][i*2]
			local bz = z + g_BressArea[bressNum][i*2+1]

			Log(debstr)
			MapRangeAdd( bx, bz )
		end

	MapRangeAddEnd()
end

function _u30d6_30ec_30b9_4e88_544a()

	local turn = MapGetTurn()

	local unit = UnitGetPID(g_pid_boss)
	local x = UnitGetX(unit)
	local z = UnitGetZ(unit)

	local dirC = VariableGet( g_key_Bress_Direction )

	CursorSetPos_FromPid( g_pid_boss )

	MapRangeAddBegin()
		for i = 1,  g_BressAreaSize do
			local bx = x + g_BressArea[dirC][i*2]
			local bz = z + g_BressArea[dirC][i*2+1]

			Log(debstr)
			MapRangeAdd( bx, bz )
		end
	MapRangeAddEnd()
end

function _u30d6_30ec_30b9_767a_5c04()
	local turn = MapGetTurn()
	local checkturn = 0

	Log("◆◆◆ルナブレス発射")
	VariableSet( g_key_Bress_Talk ,1 )
	if DifficultyGet() == DIFFICULTY_NORMAL then
		if turn == g_Nor_Bress1a then
			checkturn = 1
		elseif turn == g_Nor_Bress1b then
			checkturn = 1
		elseif turn == g_Nor_Bress2 then
			checkturn = 1
		elseif turn == VariableGet( g_key_turn_Bress1 ) then
			checkturn = 1
		elseif turn == VariableGet( g_key_turn_Bress2 ) then
			checkturn = 1
		end
	elseif DifficultyGet() == DIFFICULTY_HARD then
		if turn == g_Hard_Bress1 then
			checkturn = 1
		elseif turn == g_Hard_Bress2 then
			checkturn = 1
		elseif turn == g_Hard_Bress3a then
			checkturn = 1
		elseif turn == g_Hard_Bress3b then
			checkturn = 1
		elseif turn == g_Hard_Bress6 then
			checkturn = 1
		elseif turn == VariableGet( g_key_turn_Bress1 ) then
			checkturn = 1
		elseif turn == VariableGet( g_key_turn_Bress2 ) then
			checkturn = 1
		end
	else
		if turn == g_Luna_Bress1 then
			checkturn = 1
		elseif turn == g_Luna_Bress2 then
			checkturn = 1
		elseif turn == g_Luna_Bress3 then
			checkturn = 1
		elseif turn == VariableGet( g_key_turn_Bress1 ) then
			checkturn = 1

		end
	end

	if checkturn == 1 then

		local dirC = VariableGet( g_key_Bress_Direction )
		local boss = UnitGetPID(g_pid_boss)
		local x = UnitGetX(boss)
		local z = UnitGetZ(boss)

		CursorSetPos(x, z)
		MapCameraWait()
		WaitTime( 1.0 )

		MapRangeClear()
		CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )

		UnitRotation( g_pid_boss, g_BossBressD[dirC] )
		UnitMoveWait()

		BattleSetAttack( g_pid_boss, "IID_イル_薙払いビーム" )
			for i = 1,  g_BressAreaSize do
				local bx = x + g_BressArea[dirC][i*2]
				local bz = z + g_BressArea[dirC][i*2+1]

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end
		local targetX = x + g_BressPos[dirC*2]
		local targetZ = z + g_BressPos[dirC*2+1]
		BattleStart( targetX, targetZ )

		local debstr = "◆◆◆ターゲット座標:(" .. tostring( targetX ) .. "," .. tostring( targetZ ) .. ")◆◆◆"
		Log(debstr)

		WaitTime( 2.0 )

		MapHistoryMindDone()
	end
	VariableSet( g_key_Bress_Talk ,0 )
end

function _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(bx, bz,unitcount,unitScount,breakP)
	local unit = UnitGetByPos( bx, bz )
	local pidS = "無"

	if ( not ( unit == nil ) )  then
		local pid = UnitGetPID( unit )
		local stock = UnitGetHpStock(unit)
		local force = UnitGetForce(pid)
		local named = 0

		if pid ~= g_pid_boss then
			if  stock >= 1 then
				UnitSetHpStock(unit, 0)
			end
			local debstr = "◆◆◆スキル追加◆◆◆:"
			Log(debstr)
			if pid == "PID_E006_Hide8" then
				UnitSetPrivateSkill( g_pid_boss, "SID_殺戮者" )
			elseif pid == "PID_E006_Hide1" then
				UnitSetPrivateSkill( g_pid_boss, "SID_金蓮" )
			elseif pid == "PID_E006_Hide2" then
				UnitSetPrivateSkill( g_pid_boss, "SID_華炎" )
			elseif pid == "PID_E006_Hide3" then
				UnitSetPrivateSkill( g_pid_boss, "SID_太陽" )
			elseif pid == "PID_E006_Hide4" then
				UnitSetPrivateSkill( g_pid_boss, "SID_月光" )
			elseif pid == "PID_E006_Hide5" then
				UnitSetPrivateSkill( g_pid_boss, "SID_虚空" )
			elseif pid == "PID_E006_Hide6" then
				UnitSetPrivateSkill( g_pid_boss, "SID_大樹" )
			elseif pid == "PID_E006_Hide7" then
				UnitSetPrivateSkill( g_pid_boss, "SID_砂陣" )
	        end

			if ( force == FORCE_PLAYER ) 	then
				named = _u30d7_30ec_30a4_30e4_30fc_8ecd_4e00_822c_5175_5224_5b9a(pid)
			elseif pid == g_pid_boss then
				named = 1
			elseif pid == "PID_E006_Hide1" then
				named = 1
			elseif pid == "PID_E006_Hide2" then
				named = 1
			elseif pid == "PID_E006_Hide3" then
				named = 1
			elseif pid == "PID_E006_Hide4" then
				named = 1
			elseif pid == "PID_E006_Hide5" then
				named = 1
			elseif pid == "PID_E006_Hide6" then
				named = 1
			elseif pid == "PID_E006_Hide7" then
				named = 1
			elseif pid == "PID_E006_Hide8" then
				named = 1
			end
			if named == 1 then
				pidS = unit

				unitcount = unitcount + 1
			end

		end
	end
	return unitcount,unitScount,pidS
end

function _u30d7_30ec_30a4_30e4_30fc_8ecd_4e00_822c_5175_5224_5b9a(pid)
	local named = 1

	if StringContains(pid,"PID_残像")  then
		named = 0
	elseif StringContains(pid,"PID_召喚_")  then
		named = 0
	end

	return named
end

function _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
	local unit = UnitGetByPos( bx, bz )
	local pid = UnitGetPID( unit )
	local pidS = "無"

	if ( not ( unit == nil ) )  then
		local stock = UnitGetHpStock(unit)
		local force = UnitGetForce(unit)
		local named = 0

		if pid == g_pid_boss then
			named = 1
		elseif pid == "PID_E006_Hide1" then
			named = 1
		elseif pid == "PID_E006_Hide2" then
			named = 1
		elseif pid == "PID_E006_Hide3" then
			named = 1
		elseif pid == "PID_E006_Hide4" then
			named = 1
		elseif pid == "PID_E006_Hide5" then
			named = 1
		elseif pid == "PID_E006_Hide6" then
			named = 1
		elseif pid == "PID_E006_Hide7" then
			named = 1
		elseif pid == "PID_E006_Hide8" then
			named = 1
		elseif force == FORCE_PLAYER then
			named = _u30d7_30ec_30a4_30e4_30fc_8ecd_4e00_822c_5175_5224_5b9a(pid)
	    end
		if StringContains(pid,"召喚異形兵")  then
			unitScount = unitScount + 1
		end
		if named ~= 1 then
			unitcount = unitcount + 1
			pidS = unit
		end
	end
	return unitcount,unitScount,pidS
end

function _u5cf6_5d29_6b7b_4ea1_51e6_7406(bx, bz,unitcount,unitScount,breakP)
	local unit = UnitGetByPos( bx, bz )

	if ( not ( unit == nil ) )  then
		local pid = UnitGetPID( unit )
		local stock = UnitGetHpStock(unit)

		if pid ~= g_pid_boss then
			if  stock >= 1 then
				if pid == "PID_E006_Hide8" then
					UnitSetPrivateSkill( g_pid_boss, "SID_殺戮者" )
				elseif pid == "PID_E006_Hide1" then
					UnitSetPrivateSkill( g_pid_boss, "SID_金蓮" )
				elseif pid == "PID_E006_Hide2" then
					UnitSetPrivateSkill( g_pid_boss, "SID_華炎" )
				elseif pid == "PID_E006_Hide3" then
					UnitSetPrivateSkill( g_pid_boss, "SID_太陽" )
				elseif pid == "PID_E006_Hide4" then
					UnitSetPrivateSkill( g_pid_boss, "SID_月光" )
				elseif pid == "PID_E006_Hide5" then
					UnitSetPrivateSkill( g_pid_boss, "SID_虚空" )
				elseif pid == "PID_E006_Hide6" then
					UnitSetPrivateSkill( g_pid_boss, "SID_大樹" )
				elseif pid == "PID_E006_Hide7" then
					UnitSetPrivateSkill( g_pid_boss, "SID_砂陣" )
	            end
				UnitSetHpStock(unit, 0)
			end
			if StringContains(pid,"召喚異形兵")  then

				unitScount = unitScount + 1
			end
			UnitDie( unit )
			WaitTime( 0.5 )
			unitcount = unitcount + 1

			if breakP == 99 then
				if unitcount == 1 then
					MapOverlapSetOne(bx, bz, "TID_紋章氣")
					if	VariableGet( "紋章氣_済" )  == 0 then
						VariableSet( "紋章氣_済", 1 )
					end
				elseif unitcount == 2 then
					MapOverlapSetOne(bx, bz, "TID_紋章氣")
					if	VariableGet( "紋章氣_済" )  == 0 then
						VariableSet( "紋章氣_済", 1 )
					end
				end
				if	VariableGet( "紋章氣_済" )  == 1 then
					VariableSet( "紋章氣_X", bx )
					VariableSet( "紋章氣_Z", bz )
					VariableSet( "紋章氣_済", 2 )
				end
			end
		end
	end
	return unitcount,unitScount
end

function _u5438_53ce___56de_5fa9(unitcount,unitScount)

	if unitcount > 0 then
		local debstr = "◆◆◆死亡数：特定死亡" .. tostring( unitcount ) .. ":" .. tostring( unitScount ) .. "◆◆◆"
		Log(debstr)

		local maxHp = UnitGetCapability(g_pid_boss, CAPABILITY_HP, false)
		local hp = UnitGetHp(g_pid_boss)
		local unit = UnitGetPID(g_pid_boss)
		local x = UnitGetX(unit)
		local z = UnitGetZ(unit)
		CursorSetPos(x, z)
		MapCameraWait()

		if ( maxHp - hp ) > 0 then
			debstr = "◆HP回復：" .. tostring( unitcount )
			Log(debstr)
			hp = hp + unitcount*5
			if ( maxHp - hp ) > 0 then
				UnitSetHp(g_pid_boss, hp)
			else
				UnitSetHp(g_pid_boss, maxHp)
			end
		end
	end

	if unitScount > 2 then

		local stock = UnitGetHpStock(g_pid_boss)
		if  stock < 3 then
			stock = stock + 1
			UnitSetHpStock(g_pid_boss, stock)
			debstr = "◆ストック追加：" .. tostring( stock )
			Log(debstr)
		end
	end
end

local g_AbsorbArea1 = {0,  15,22, 14,23,15,23,16,23, 13,22,14,22,16,22,17,22 ,11,21,12,21,13,21,14,21,15,21,16,21,17,21,18,21, 	12,20,13,20,14,20,15,20,16,20 ,14,19,15,19}
local g_AbsorbArea2 = {0,  10,28, 8,30,9,30,10,30,11,30,12,30,13,30,14,30,	7,29,8,29,9,29,10,29,11,29,12,29,13,29, 7,28,8,28,9,28,11,28,12,28,  7,27,8,27,9,27,10,27,11,27,12,27, 10,26,11,26, 10,25 }
local g_AbsorbArea3 = {0,  20,28, 16,30,17,30,18,30,19,30,20,30,21,30,22,30,  17,29,18,29,19,29,20,29,21,29,22,29,  18,28,19,28,21,28,22,28,  18,27,19,27,20,27,21,27,22,27,  19,26,20,26,21,26, 20,25,21,25	}

local g_RushArea10 = {0,  17,27,18,27,19,27,20,27, 17,26,18,26,19,26,20,26,21,26, 17,25,18,25,19,25,20,25,21,25,	}

function _u5438_53ce_4e88_544a()
	local absorpSize
	local debstr
	local x
	local z

	local unitcount1 = 0
	local unitcount2 = 0
	local unitcount3 = 0

	absorpSize = math.floor(#g_AbsorbArea1 / 2)
	for i = 1,  absorpSize do
		x = g_AbsorbArea1[i*2]
		z = g_AbsorbArea1[i*2+1]

		local unit = UnitGetByPos( x, z )
		if ( not ( unit == nil ) )  then
			unitcount1 = unitcount1 + 1
		end
	end

	absorpSize = math.floor(#g_AbsorbArea2 / 2)
	for i = 1,  absorpSize do
		x = g_AbsorbArea2[i*2]
		z = g_AbsorbArea2[i*2+1]

		local unit = UnitGetByPos( x, z )
		if ( not ( unit == nil ) )  then
			unitcount2 = unitcount2 + 1
		end
	end

	absorpSize = math.floor(#g_AbsorbArea3 / 2)
	for i = 1,  absorpSize do
		x = g_AbsorbArea3[i*2]
		z = g_AbsorbArea3[i*2+1]

		local unit = UnitGetByPos( x, z )
		if ( not ( unit == nil ) )  then
			unitcount3 = unitcount3 + 1
		end
	end

	if unitcount1 >= unitcount2 then
		if unitcount1 >= unitcount3 then
			absorpNum = 1
		else
			if unitcount2 >= unitcount3 then
				absorpNum = 2
			else
				absorpNum = 3
			end
		end
	else
		if unitcount2 >= unitcount3 then
			absorpNum = 2
		else
			absorpNum = 3
		end
	end

	VariableSet( g_key_Absorp_Number, absorpNum )

	if		absorpNum == 1 then
		EffectCreate("吸収即死範囲_下" , g_AbsorbArea1[1*2], g_AbsorbArea1[1*2+1] )

	elseif	absorpNum == 2 then
		EffectCreate("吸収即死範囲_左" , g_AbsorbArea2[1*2], g_AbsorbArea2[1*2+1] )

	elseif	absorpNum == 3 then
		EffectCreate("吸収即死範囲_右" , g_AbsorbArea3[1*2], g_AbsorbArea3[1*2+1] )

	end
end

function _u914d_7f6e_7d0b_7ae0_6c23(pid,mcount)

	bx = UnitGetX( pid )
	bz = UnitGetZ( pid )
	if mcount == 0 then
		MapOverlapSetOne(bx, bz, "TID_紋章氣")
		if	VariableGet( "紋章氣_済" )  == 0 then
			VariableSet( "紋章氣_済", 1 )
		end
	elseif mcount == 1 then
		MapOverlapSetOne(bx, bz, "TID_紋章氣")
		if	VariableGet( "紋章氣_済" )  == 0 then
			VariableSet( "紋章氣_済", 1 )
		end
	end
	if	VariableGet( "紋章氣_済" )  == 1 then
		VariableSet( "紋章氣_X", bx )
		VariableSet( "紋章氣_Z", bz )
		VariableSet( "紋章氣_済", 2 )
	end
	mcount = mcount + 1
	return mcount
end

function _u7bc4_56f2_5438_53ce()

	local absorpNum = VariableGet( g_key_Absorp_Number )
	local absorpSize
	local boss = UnitGetPID(g_pid_boss)
	local x = UnitGetX(boss)
	local z = UnitGetZ(boss)
	local i
	local n
	local bossdir

	local unitScount = 0
	local unitcount = 0
	local pid = "無"
	local pidtbl = {}
	local pidtbl2 = {}

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()
	if absorpNum == 1 then
		x = g_AbsorbArea1[1*2]
		z = g_AbsorbArea1[1*2+1]
		EffectDelete("吸収即死範囲_下" , x, z)
		WaitTime( 1.0 )

	elseif	absorpNum == 2 then
		x = g_AbsorbArea2[1*2]
		z = g_AbsorbArea2[1*2+1]
		EffectDelete("吸収即死範囲_左" , x, z)
		WaitTime( 1.0 )

	elseif	absorpNum == 3 then
		x = g_AbsorbArea3[1*2]
		z = g_AbsorbArea3[1*2+1]
		EffectDelete("吸収即死範囲_右" , x, z)
		WaitTime( 1.0 )
	end

	UnitRotation( g_pid_boss, g_BossAbsorpD2[absorpNum] )
	UnitMoveWait()
	WaitTime( 1.0 )
	UnitPlayAnim(g_pid_boss, UNIT_ANIM_EVENT3)
	WaitTime( 1.0 )
	if absorpNum == 1 then
		x = UnitGetX(boss)+1
		z = UnitGetZ(boss)+1
		EffectPlay( "吸収攻撃_発動", x, z,g_BossAbsorpD[absorpNum] )
	elseif	absorpNum == 2 then
		x = UnitGetX(boss)+1
		z = UnitGetZ(boss)+1
		EffectPlay( "吸収攻撃_発動", x, z,g_BossAbsorpD[absorpNum] )
	elseif	absorpNum == 3 then
		x = UnitGetX(boss)+1
		z = UnitGetZ(boss)+1
		EffectPlay( "吸収攻撃_発動", x, z,g_BossAbsorpD[absorpNum] )
	end

	UnitMoveWait()

	if absorpNum == 1 then
		x = g_AbsorbArea1[1*2]
		z = g_AbsorbArea1[1*2+1]
		CursorSetPos(x, z)
		MapCameraWait()
		WaitTime( 1.0 )

		absorpSize = math.floor(#g_AbsorbArea1 / 2)
		for i = 1,  absorpSize do
			x = g_AbsorbArea1[i*2]
			z = g_AbsorbArea1[i*2+1]
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(x, z,unitcount,unitScount,99)
			if pid ~= "無" then
				pidtbl[unitcount] = pid
			end
		end
		for i = 1,  absorpSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_AbsorbArea1[i*2], g_AbsorbArea1[i*2+1],unitcount,unitScount,99)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	absorpNum == 2 then
		x = g_AbsorbArea2[1*2]
		z = g_AbsorbArea2[1*2+1]
		CursorSetPos(x, z)
		MapCameraWait()
		WaitTime( 1.0 )

		absorpSize = math.floor(#g_AbsorbArea2 / 2)
		for i = 1,  absorpSize do
			x = g_AbsorbArea2[i*2]
			z = g_AbsorbArea2[i*2+1]
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(x, z,unitcount,unitScount,99)
			if pid ~= "無" then
				pidtbl[unitcount] = pid
			end
		end
		for i = 1,  absorpSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_AbsorbArea2[i*2], g_AbsorbArea2[i*2+1],unitcount,unitScount,99)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	absorpNum == 3 then
		x = g_AbsorbArea3[1*2]
		z = g_AbsorbArea3[1*2+1]
		CursorSetPos(x, z)
		MapCameraWait()
		WaitTime( 1.0 )

		absorpSize = math.floor(#g_AbsorbArea3 / 2)
		for i = 1,  absorpSize do
			x = g_AbsorbArea3[i*2]
			z = g_AbsorbArea3[i*2+1]
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(x, z,unitcount,unitScount,99)
			if pid ~= "無" then
				pidtbl[unitcount] = pid
			end
		end
		for i = 1,  absorpSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_AbsorbArea3[i*2], g_AbsorbArea3[i*2+1],unitcount,unitScount,99)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	end

	if unitcount > 0 then

		local mcount = 0

		if #pidtbl > 0 then
			local debstr = "◆◆一括死亡名無しリスト◆◆"
			Log(debstr)

			table.sort(pidtbl)
			local name1 = "無"
			for i = 1 , #pidtbl do
				name2 = pidtbl[i]
				if name1 ~= name2 then
					UnitDieWithoutEvent( pidtbl[i] )
					debstr = "◆◆unitID:" .. tostring( i ) .. "◆◆" .. tostring( pidtbl[i] )
					Log(debstr)
					mcount = _u914d_7f6e_7d0b_7ae0_6c23(pidtbl[i],mcount)
					name1 = pidtbl[i]
				end
			end
		end
		WaitTime( 0.5 )
		if #pidtbl2 > 0 then
			local debstr = "◆◆一括死亡ネームドリスト◆◆"
			Log(debstr)
			for i = 1 , #pidtbl2 do
				debstr = "◆◆unitID:" .. tostring( i ) .. "◆◆" .. tostring( pidtbl2[i] )
				Log(debstr)
				mcount = _u914d_7f6e_7d0b_7ae0_6c23(pidtbl2[i],mcount)
				UnitDie( pidtbl2[i] )
				WaitTime( 0.5 )
			end
		end
		local gover = VariableGet( "敗北" )
		if gover ~= 1 then
			WaitTime( 0.5 )

			CursorSetPos_FromPid(g_pid_boss)
			MapCameraWait()

			EffectPlay( "吸収攻撃", UnitGetX(boss)+1, UnitGetZ(boss)+1,g_BossAbsorpD[absorpNum] )
			WaitTime( 2.5 )
			_u5438_53ce___56de_5fa9(unitcount,unitScount)
		end
	end

	if	VariableGet( "紋章氣_済" )  == 2 then
		local gover = VariableGet( "敗北" )
		if gover ~= 1 then
			local mx = VariableGet( "紋章氣_X" )
			local mz = VariableGet( "紋章氣_Z" )
			CursorSetPos(mx, mz)
			MapCameraWait()
			WaitTime( 1.0 )
			CursorAnimeCreate( mx, mz )

			Talk( "MID_EV5" )
			CursorAnimeDelete()
		end
		VariableSet( "紋章氣_済", 3 )
	end

end

local g_RushArea1 = {0,  6,6, 6,8, 7,8, 5,7,6,7,7,7, 6,9	}
local g_RushArea2 = {0,  8,10,9,10, 8,11,9,11, 8,12,9,12,10,12,11,12,13,12, 9,13,10,13,11,13,12,13,13,13,14,13,15,13  ,11,14,12,14,13,14,14,14	 ,14,15}
local g_RushArea3 = {0,  24,10, 24,9,25,9,26,9, 24,8,25,8,26,8,27,8, 25,7,26,7 ,26,6	}
local g_RushArea4 = {0,  27,22,28,22,29,22, 27,21,28,21,29,21, 27,20,28,20,29,20, 27,19,28,19,29,19, 27,18,28,18,29,18	}
local g_RushArea5 = {0,  15,24,16,24,17,24,18,24,19,24, 6,23,7,23,9,23,10,23,11,23,12,23,13,23,14,23,15,23,16,23,17,23,18,23,19,23,	6,22,7,22,8,22,9,22,10,22,11,22,12,22,13,22,14,22,15,22,16,22,17,22,18,22,  6,21,7,21,8,21,9,21,10,21,11,21,12,21,13,21,14,21,15,21 }
local g_RushArea6 = {0,  13,27,	11,26,12,26,13,26, 10,25,11,25,12,25,13,25,  11,24,12,24 }
local g_RushArea7 = {0,  3,20,4,20,5,20, 3,19,4,19,5,19, 3,18,4,18 	}

local g_RushArea8 = {0,  15,13,16,13,17,13, 15,12,16,12,17,12, 15,11,16,11,17,11,  16,10,17,10	}
local g_RushArea9 = {0,  14,24,15,24,16,24, 14,23,15,23,16,23, 14,22,15,22,16,22, 14,21,15,21,16,21, 14,20,15,20,16,20, 14,19,15,19, 	}

local g_RushArea10 = {0,  17,27,18,27,19,27,20,27, 17,26,18,26,19,26,20,26,21,26, 17,25,18,25,19,25,20,25,21,25,	}

function _u7a81_9032_4e88_544a()

	local rushSize
	local debstr
	local x
	local z

	UnitPlayAnim(g_pid_boss, UNIT_ANIM_DANCE)

	local rushNum = VariableGet( g_key_Rush_Number )

	if	rushNum == 1 then
		rushSize = math.floor(#g_RushArea1 / 2)

		Log(debstr)

		MapRangeAddBegin()
			for i = 1,  rushSize do
				local x = g_RushArea1[i*2]
				local z = g_RushArea1[i*2+1]

				MapRangeAdd( x, z )
			end
		MapRangeAddEnd()
		_u5d29_843d_7bc4_56f2___8868_793a( 15, 5, 1 )
		Tutorial( "TUTID_イル突進" )
		WaitTime( 2.0 )

		bP = 2
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 2 then
		rushSize = math.floor(#g_RushArea2 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea2[i*2]
				local z = g_RushArea2[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 4, 9, 2 )

		bP = 3
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 3 then
		rushSize = math.floor(#g_RushArea3 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea3[i*2]
				local z = g_RushArea3[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 16, 15, 3 )
		WaitTime( 2.0 )
		bP = 4
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 4 then
		rushSize = math.floor(#g_RushArea4 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea4[i*2]
				local z = g_RushArea4[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 28, 6, 4 )
		WaitTime( 2.0 )
		bP = 6
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 5 then
		rushSize = math.floor(#g_RushArea5 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea5[i*2]
				local z = g_RushArea5[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 28, 24, 6 )
		bP = 5
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 6 then
		rushSize = math.floor(#g_RushArea6 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea6[i*2]
				local z = g_RushArea6[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 3, 20, 5 )
		bP = 7
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 7 then
		rushSize = math.floor(#g_RushArea7 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea7[i*2]
				local z = g_RushArea7[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 4, 9, 2 )
		bP = 5
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 8 then
		rushSize = math.floor(#g_RushArea8 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea8[i*2]
				local z = g_RushArea8[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 15, 5, 1 )
		WaitTime( 1.0 )
		Tutorial( "TUTID_イル突進" )
		bP = 3
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 9 then
		rushSize = math.floor(#g_RushArea9 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea9[i*2]
				local z = g_RushArea9[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 16, 15, 3 )
		bP = 7
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )

	elseif	rushNum == 10 then
		rushSize = math.floor(#g_RushArea10 / 2)
		MapRangeAddBegin()

			for i = 1,  rushSize do
				local x = g_RushArea10[i*2]
				local z = g_RushArea10[i*2+1]
				MapRangeAdd( x, z )
			end

		MapRangeAddEnd()

		_u5d29_843d_7bc4_56f2___8868_793a( 28, 24, 6 )
		bP = 7
		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_IDLE)
		WaitTime( 1.0 )
	end
end

function _u5d29_843d_7bc4_56f2___8868_793a( x, z, breakAreaNum )

	EffectCreate("即死攻撃範囲_エリア" .. breakAreaNum, x, z )

end

function _u5d29_843d_7bc4_56f2___975e_8868_793a( x, z, breakAreaNum )

	EffectDelete("即死攻撃範囲_エリア" .. breakAreaNum, x, z)

end

function _u5cf6_5d29_7a81_9032()

	_u5cf6_5d29_5168_6ec5()

	local rushNum = VariableGet( g_key_Rush_Number )
	local bosX
	local bosZ

	local boss = UnitGetPID(g_pid_boss)
	local x = UnitGetX(boss)
	local z = UnitGetZ(boss)
	local rushSize
	local i

	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )

	BattleSetAttack( g_pid_boss, "IID_イル_突進" )

		if	rushNum == 1 then
			rushSize = math.floor(#g_RushArea1 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea1[i*2]
				local bz = g_RushArea1[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 2
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

		elseif	rushNum == 2 then
			rushSize = math.floor(#g_RushArea2 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea2[i*2]
				local bz = g_RushArea2[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 3
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 4, 9, 2 )

		elseif	rushNum == 3 then
			rushSize = math.floor(#g_RushArea3 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea3[i*2]
				local bz = g_RushArea3[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 4
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 16, 15, 3 )

		elseif	rushNum == 4 then
			rushSize = math.floor(#g_RushArea4 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea4[i*2]
				local bz = g_RushArea4[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 6
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 28, 6, 4 )

		elseif	rushNum == 5 then
			rushSize = math.floor(#g_RushArea5 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea5[i*2]
				local bz = g_RushArea5[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 5
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 28, 24, 6 )

		elseif	rushNum == 6 then
			rushSize = math.floor(#g_RushArea6 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea6[i*2]
				local bz = g_RushArea6[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 7
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 3, 20, 5 )

		elseif	rushNum == 7 then
			rushSize = math.floor(#g_RushArea7 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea7[i*2]
				local bz = g_RushArea7[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 5
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 4, 9, 2 )

		elseif	rushNum == 8 then
			rushSize = math.floor(#g_RushArea8 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea8[i*2]
				local bz = g_RushArea8[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"
				Log(debstr)
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 3
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 15, 5, 1 )

		elseif	rushNum == 9 then
			rushSize = math.floor(#g_RushArea9 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea9[i*2]
				local bz = g_RushArea9[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"
				Log(debstr)
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 7
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 16, 15, 3 )

		elseif	rushNum == 10 then
			rushSize = math.floor(#g_RushArea10 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea10[i*2]
				local bz = g_RushArea10[i*2+1]

				debstr = "▼突進座標:(" .. tostring( bx ) .. "," .. tostring( bz ) .. ")▼"

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					BattleAddTarget( unit )
				end
			end

			i = 7
			bosX = g_BossPos[i*2]
			bosZ = g_BossPos[i*2+1]

			_u5d29_843d_7bc4_56f2___975e_8868_793a( 28, 24, 6 )

		end

	BattleStart( x, z )

	UnitTranslation(boss, bosX, bosZ)
	UnitMoveWait()
	WaitTime( 2.0 )

	MapHistoryMindDone()

end

function _u7a81_9032_30c0_30e1_30fc_30b8_5168_4f53()
	local rN = VariableGet( g_key_Rush_Number )

	if	rN == 1 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea1 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea1[i*2]
				local bz = g_RushArea1[i*2+1]

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 2 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea2 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea2[i*2]
				local bz = g_RushArea2[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 3 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea3 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea3[i*2]
				local bz = g_RushArea3[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 4 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea4 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea4[i*2]
				local bz = g_RushArea4[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 5 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea5 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea5[i*2]
				local bz = g_RushArea5[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 6 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea6 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea6[i*2]
				local bz = g_RushArea6[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 7 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea7 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea7[i*2]
				local bz = g_RushArea7[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 8 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea8 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea8[i*2]
				local bz = g_RushArea8[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 9 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea9 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea9[i*2]
				local bz = g_RushArea9[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	elseif	rN == 10 then
		MapDamageBegin();
			local rushSize = math.floor(#g_RushArea10 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea10[i*2]
				local bz = g_RushArea10[i*2+1]
				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(g_Rush_Damage, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();
	end
end

function _u5cf6_5d29_6b7b_4ea1_5168_4f53(bx, bz,unitcount,unitScount,bP)
	local pid = "無"
	local pidtbl = {}
	local pidtbl2 = {}

	if	bP == 1 then
		local breakSize = math.floor(#g_BreakArea1 / 2)
		VariableSet(g_key_area1, 1)
		TerrainSetBegin()
			Log("名無しを一括死亡")
			for i = 1,  breakSize do
				local bx = g_BreakArea1[i*2]
				local bz = g_BreakArea1[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,bP)
				if pid ~= "無" then
					pidtbl[unitcount] = pid
				end
			end
		TerrainSetEnd()
		for i = 1,  breakSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_BreakArea1[i*2], g_BreakArea1[i*2+1],unitcount,unitScount,bP)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	bP == 2 then
		local breakSize = math.floor(#g_BreakArea2 / 2)
		VariableSet(g_key_area2, 1)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea2[i*2]
				local bz = g_BreakArea2[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,bP)
				if pid ~= "無" then
					pidtbl[unitcount] = pid
				end
			end
		TerrainSetEnd()
		for i = 1,  breakSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_BreakArea2[i*2], g_BreakArea2[i*2+1],unitcount,unitScount,bP)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	bP == 3 then
		local breakSize = math.floor(#g_BreakArea3 / 2)
		VariableSet(g_key_area3, 1)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea3[i*2]
				local bz = g_BreakArea3[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,bP)
				if pid ~= "無" then
					pidtbl[unitcount] = pid
				end
			end
		TerrainSetEnd()
		for i = 1,  breakSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_BreakArea3[i*2], g_BreakArea3[i*2+1],unitcount,unitScount,bP)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	bP == 4 then
		local breakSize = math.floor(#g_BreakArea4 / 2)
		VariableSet(g_key_area4, 1)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea4[i*2]
				local bz = g_BreakArea4[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,bP)
				if pid ~= "無" then
					pidtbl[unitcount] = pid
				end
			end
		TerrainSetEnd()
		for i = 1,  breakSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_BreakArea4[i*2], g_BreakArea4[i*2+1],unitcount,unitScount,bP)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	bP == 5 then
		local breakSize = math.floor(#g_BreakArea5 / 2)
		VariableSet(g_key_area5, 1)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea5[i*2]
				local bz = g_BreakArea5[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,bP)
				if pid ~= "無" then
					pidtbl[unitcount] = pid
				end
			end
		TerrainSetEnd()
		for i = 1,  breakSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_BreakArea5[i*2], g_BreakArea5[i*2+1],unitcount,unitScount,bP)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	elseif	bP == 6 then
		local breakSize = math.floor(#g_BreakArea6 / 2)
		VariableSet(g_key_area6, 1)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea6[i*2]
				local bz = g_BreakArea6[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,bP)
				if pid ~= "無" then
					pidtbl[unitcount] = pid
				end
			end
		TerrainSetEnd()
		for i = 1,  breakSize do
			unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_524d_4ed8(g_BreakArea6[i*2], g_BreakArea6[i*2+1],unitcount,unitScount,bP)
			if pid ~= "無" then
				table.insert(pidtbl2, pid)
			end
		end

	end

	if #pidtbl > 0 then
		table.sort(pidtbl)
		local name1 = "無"
		for i = 1 , #pidtbl do
			name2 = pidtbl[i]
			if name1 ~= name2 then
				UnitDieWithoutEvent( pidtbl[i] )
				debstr = "◆◆unitID:" .. tostring( i ) .. "◆◆" .. tostring( pidtbl[i] )
				Log(debstr)
				name1 = pidtbl[i]
			end
		end
	end
	WaitTime( 0.5 )
	if #pidtbl2 > 0 then
		for i = 1 , #pidtbl2 do
			debstr = "◆◆unitID:" .. tostring( i ) .. "◆◆" .. tostring( pidtbl2[i] )
			Log(debstr)
			UnitDie( pidtbl2[i] )
			WaitTime( 0.5 )
		end
	end

	return unitcount,unitScount
end

function _u5486_54ee_5168_6ec5_79fb_52d5()
	local bP = VariableGet( g_key_Break )
	local rN = VariableGet( g_key_Rush_Number )
	local unitcount = 0
	local unitScount = 0

	CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
	MapCameraWait()
	EffectDelete("即死攻撃範囲_エリア" .. bP, g_Hhani[bP*2], g_Hhani[bP*2+1])

	MapRangeClear()
	WaitTime( 1.0 )

	UnitPlayAnim(g_pid_boss, UNIT_ANIM_EVENT4)
	WaitTime( 1.0 )
	EffectPlay( "崩壊_開始", g_BossPos[bP*2]+1, g_BossPos[bP*2+1]+1 )
	WaitTime( 0.3 )
	EventStateObject(g_HhaO[bP*2], g_HhaO[bP*2+1], 1 )

	WaitTime( 2.0 )
	unitcount,unitScount = _u5cf6_5d29_6b7b_4ea1_5168_4f53(bx, bz,unitcount,unitScount,bP)

	local gover = VariableGet( "敗北" )
	if gover ~= 1 then
		if unitcount > 0 then
			CursorSetPos_FromPid(g_pid_boss)
			MapCameraWait()

			WaitTime( 2.0 )

			EffectPlay( "崩壊_吸収", g_BossPos[bP*2]+1, g_BossPos[bP*2+1]+1 )
			WaitTime( 3.0 )
		end

		local saki = g_Rush2Saki[rN]

		SoundPostEvent("SE_DLC_IL_MOVE")
		UnitTranslation(g_pid_boss, g_BossPos[saki*2], g_BossPos[saki*2+1])
		UnitMoveWait()

		_u7a81_9032_30c0_30e1_30fc_30b8_5168_4f53()

		CursorSetPos(g_Hhani[bP*2], g_Hhani[bP*2+1])
		MapCameraWait()

		MapObjectAction(g_HhaO[bP*2], g_HhaO[bP*2+1], MAP_ACTION_DONE)
		WaitTime( 2.0 )
		FadeOut(FADE_NORMAL)

		WaitTime( 1.0 )

		FadeWait()
		EventStateObject(g_HhaO[bP*2], g_HhaO[bP*2+1], 2 )

		FadeInAndWait( FADE_FAST )
	end

	if	bP == 1 then

		if gover ~= 1 then
			WaitTime( 1.0 )
			Talk( "MID_EV4" )
		end

	end
	if gover ~= 1 then
		_u5438_53ce___56de_5fa9(unitcount,unitScount)
	end
end

function _u5cf6_5d29_5168_6ec5()
	local breakSize
	local i
	local unitcount = 0
	local unitScount = 0
	local pid

	local boss = UnitGetPID(g_pid_boss)
	local x = UnitGetX(boss)
	local z = UnitGetZ(boss)
	local rushSize

	local breakP = VariableGet( g_key_Break )

	if	breakP == 1 then
		CursorSetPos(15, 3)
		MapCameraWait()
		_u5d29_843d_7bc4_56f2___975e_8868_793a( 15, 5, 1 )
		MapRangeClear()

		UnitPlayAnim(g_pid_boss, UNIT_ANIM_EVENT4)
		EventStateObject(15, 3, 1 )
		WaitTime( 2.0 )

		breakSize = math.floor(#g_BreakArea1 / 2)
		VariableSet(g_key_area1, 1)

		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea1[i*2]
				local bz = g_BreakArea1[i*2+1]
				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
			end
		TerrainSetEnd()

		EventStateObject(15, 3, 2 )

		i = 2
		bosX = g_BossPos[i*2]
		bosZ = g_BossPos[i*2+1]
		UnitTranslation(boss, bosX, bosZ)

		FadeOut(FADE_SLOW)
		WaitTime( 1.0 )

		FadeWait()
		MapObjectAction(g_HhaR[bP*2], g_HhaR[bP*2+1], MAP_ACTION_DONE)

		CursorSetPos(4, 9)
		MapCameraWait()
		FadeInAndWait( FADE_FAST )
		UnitMoveWait()

		MapDamageBegin();
			rushSize = math.floor(#g_RushArea1 / 2)
			for i = 1,  rushSize do
				local bx = g_RushArea1[i*2]
				local bz = g_RushArea1[i*2+1]

				local unit = UnitGetByPos( bx, bz )
				if ( not ( unit == nil ) ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then
					local damage = math.max(30, 0);
					MapDamageAdd(unit, damage)
				end
			end
		MapDamageEnd();

		local gover = VariableGet( "敗北" )
		if gover ~= 1 then
			WaitTime( 2.0 )

			CursorSetPos(15, 3)
			MapCameraWait()
			Talk( "MID_EV4" )
		end

	elseif	breakP == 2 then

		CursorSetPos(4, 9)
		MapCameraWait()

		breakSize = math.floor(#g_BreakArea2 / 2)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea2[i*2]
				local bz = g_BreakArea2[i*2+1]

				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
			end
		TerrainSetEnd()

		VariableSet(g_key_area2, 1)

	elseif	breakP == 3 then
		CursorSetPos(16, 15)
		MapCameraWait()

		breakSize = math.floor(#g_BreakArea3 / 2)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea3[i*2]
				local bz = g_BreakArea3[i*2+1]

				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
			end

		TerrainSetEnd()

		VariableSet(g_key_area3, 1)

	elseif	breakP == 4 then

		CursorSetPos(28, 6)
		MapCameraWait()

		breakSize = math.floor(#g_BreakArea4 / 2)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea4[i*2]
				local bz = g_BreakArea4[i*2+1]

				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
			end

		TerrainSetEnd()

		VariableSet(g_key_area4, 1)

	elseif	breakP == 5 then

		CursorSetPos(4, 22)
		MapCameraWait()

		breakSize = math.floor(#g_BreakArea5 / 2)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea5[i*2]
				local bz = g_BreakArea5[i*2+1]

				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
			end

		TerrainSetEnd()

		VariableSet(g_key_area5, 1)

	elseif	breakP == 6 then

		CursorSetPos(28, 24)
		MapCameraWait()

		breakSize = math.floor(#g_BreakArea6 / 2)
		TerrainSetBegin()
			for i = 1,  breakSize do
				local bx = g_BreakArea6[i*2]
				local bz = g_BreakArea6[i*2+1]

				TerrainSet( bx, bz, "TID_海" )
				unitcount,unitScount,pid = _u4e00_62ec_6b7b_4ea1_540d_7121_3057(bx, bz,unitcount,unitScount,breakP)
			end

		TerrainSetEnd()

		VariableSet(g_key_area6, 1)
	end
	_u5438_53ce___56de_5fa9(unitcount,unitScount)
end

function _u6700_7d42_5cf6_7ba1_7406_9752()

	local turn = MapGetTurn()
	local countD
	local chkturn = 0

	local bossLast = UnitGetByPos(14,25)
	if bossLast ~= nil then
		local pidLast = UnitGetPID( bossLast )
		if pidLast == g_pid_boss then
			UnitClearPrivateSkill(g_pid_boss, "SID_受けるダメージ-50")
		end
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then

		local sTurn = VariableGet( g_key_turn_Island7 ) + 4
		if sTurn < turn then
			VariableSet( g_key_turn_Island7 ,turn)

			VariableSet( g_key_turn_Summon ,turn)
			VariableSet( g_key_turn_Bress1 ,turn+1)
			VariableSet( g_key_turn_Absorp ,turn+2)
			VariableSet( g_key_turn_Bress2 ,turn+4)
		end
	elseif DifficultyGet() == DIFFICULTY_HARD then
		if VariableGet( g_key_HL_area5 ) == 1 then
			if turn == 15 then
				chkturn = 1
			end
		else
			if turn == 21 then
				chkturn = 1
			end
		end

		if chkturn == 1 then
			VariableSet( g_key_Summon_Number ,0)

			VariableSet( g_key_turn_Island7 ,turn)

			VariableSet( g_key_turn_Summon ,turn)
			VariableSet( g_key_turn_Bress1 ,turn+1)
			VariableSet( g_key_turn_Absorp ,turn+2)
			VariableSet( g_key_turn_Bress2 ,turn+4)
		end

		local sTurn = VariableGet( g_key_turn_Island7 ) + 4
		if sTurn < turn then
			VariableSet( g_key_turn_Island7 ,turn)

			VariableSet( g_key_turn_Summon ,turn)
			VariableSet( g_key_turn_Bress1 ,turn+1)
			VariableSet( g_key_turn_Absorp ,turn+2)
			VariableSet( g_key_turn_Bress2 ,turn+4)
		end

	else
		if VariableGet( g_key_HL_area5 ) == 1 then
			if turn == 15 then
				chkturn = 1
			end
		else
			if turn == 22 then
				chkturn = 1
			end
		end

		if chkturn == 1 then
			VariableSet( g_key_Summon_Number ,0)

			VariableSet( g_key_turn_Island7 ,turn)

			VariableSet( g_key_turn_Summon ,turn)
			VariableSet( g_key_turn_Bress1 ,turn+1)
			VariableSet( g_key_turn_Absorp ,turn+2)

		end

		local sTurn = VariableGet( g_key_turn_Island7 ) + 3
		if sTurn < turn then
			VariableSet( g_key_turn_Island7 ,turn)

			VariableSet( g_key_turn_Summon ,turn)
			VariableSet( g_key_turn_Bress1 ,turn+1)
			VariableSet( g_key_turn_Absorp ,turn+2)

		end
	end

	local turnH  = VariableGet( g_key_turn_Summon ) + 1
	local turnS  = VariableGet( g_key_turn_Summon )
	local turnB1 = VariableGet( g_key_turn_Bress1 )
	local turnB2 = VariableGet( g_key_turn_Bress2 )

	if turn == turnS then
		local sumnum = VariableGet( g_key_Summon_Number )

		if sumnum  % 3 == 0 then
			_u53ec_559a_6e26_4f5c_6210("Enemy_Area7a")

		elseif sumnum  % 3 == 1 then
			_u53ec_559a_6e26_4f5c_6210("Enemy_Area7b")

		elseif sumnum  % 3 == 2 then
			_u53ec_559a_6e26_4f5c_6210("Enemy_Area7c")
		end
	end

	if turn == turnH then
		MapRangeClear()

		local sumnum = VariableGet( g_key_Summon_Number )

		if sumnum  % 3 == 0 then
			_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area7a")

		elseif sumnum  % 3 == 1 then
			_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area7b")

		elseif sumnum  % 3 == 2 then
			_u53ec_559a_6e26_6d88_53bb_3068_914d_7f6e("Enemy_Area7c")

		end
		sumnum = sumnum + 1
		VariableSet( g_key_Summon_Number ,sumnum)

	end

	if (turn == turnB1) or (turn == turnB2) then

		_u30d6_30ec_30b9_691c_7d22_4e88_544a()

	end

end

function _u6700_7d42_5cf6_7ba1_7406_8d64()
	local turn = MapGetTurn()
	local turnB1= VariableGet( g_key_turn_Bress1 )
	local turnB2= VariableGet( g_key_turn_Bress2 )
	local turnA = VariableGet( g_key_turn_Absorp )
	local turnH = VariableGet( g_key_turn_Absorp ) + 1

	if (turn == turnB1) or (turn == turnB2) then

	end
	if turn == turnA then
		_u5438_53ce_4e88_544a()
	end
	if turn == turnH then
		_u7bc4_56f2_5438_53ce()
	end

end

function _u30f4_30a7_30ed_30cb_30ab_7ba1_7406()

	if AiGetActive( "PID_E006_Hide3" ) == true then
		if VariableGet( "ヴェロニカ召喚カウント" )  == 0 then
			CursorSetPos_FromPid( "PID_E006_Hide3" )
			EventEngageSummon( "PID_E006_Hide3" )
			Dispos( "Enemy_Area6S", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP + DISPOS_FLAG_NOT_FORCED )
			Yield()
			WaitTime( 2.0 )
			VariableSet( "ヴェロニカ召喚カウント", 1 )
			UnitClearStatus( "PID_E006_Hide3", UNIT_STATUS_MOVE_NOT_ALLOW )

		end
	end

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	BackgroundColorSet(1, 1, 1)

		FadeInAndWait(0)
		Talk( "MID_BT2" )
		FadeOut(FADE_NORMAL, 1, 1, 1)
		FadeWait()

		PuppetDemo("E006", "MID_ED1")

	BackgroundColorSet(0, 0, 0)

end

function GameOver()

	Log("GameOver");

end
