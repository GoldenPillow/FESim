Include("Common")

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_M008_WIN" )
	LoseRuleSetMID( "MID_RULE_M008_LOSE" )

	_u30d5_30e9_30b0_767b_9332()

	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "アイビー動くよイベント再生_済", 0 )
	VariableEntry( "臣下死亡", 0 )
	VariableEntry( "カゲツ死亡", 0 )
	VariableEntry( "ゼルコバ死亡", 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryBreakdownEnemy(VariableSet, 8,	19, "防衛エリア_8_19_済",	"敗北", 1)
	EventEntryBreakdownEnemy(VariableSet, 9,	19, "防衛エリア_9_19_済",	"敗北", 1)
	EventEntryBreakdownEnemy(VariableSet, 10,	19, "防衛エリア_10_19_済",	"敗北", 1)
	EventEntryBreakdownEnemy(VariableSet, 11,	19, "防衛エリア_11_19_済",	"敗北", 1)
	EventEntryBreakdownEnemy(VariableSet, 12,	19, "防衛エリア_12_19_済",	"敗北", 1)

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6___6575_5c06_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER, condition_true, "PID_M008_アイビー")
	EventEntryTurnAfter(_u5f13_7832_53f0_30c1_30e5_30fc_30c8_30ea_30a2_30eb, 2, 2,  FORCE_PLAYER)
	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ed_30a4, "PID_ディアマンド", "チュートリアル_ロイ_済")

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M008_カゲツ", FORCE_ENEMY, true, "戦闘前会話_カゲツ_済", "MID_BT6")
	EventEntryDie(_u30ab_30b2_30c4_6b7b_4ea1_30a4_30d9_30f3_30c8, "PID_M008_カゲツ", FORCE_ENEMY, "カゲツ死亡")

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M008_ゼルコバ", FORCE_ENEMY, true, "戦闘前会話_ゼルコバ_済", "MID_BT4")
	EventEntryDie(_u30bc_30eb_30b3_30d0_6b7b_4ea1_30a4_30d9_30f3_30c8, "PID_M008_ゼルコバ", FORCE_ENEMY, "ゼルコバ死亡")

	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, "PID_M008_アイビー", FORCE_ENEMY, true, "戦闘前会話_主人公VSアイビー_済", "MID_BT2")
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M008_アイビー", FORCE_ENEMY, true, "戦闘前会話_青軍VSアイビー_済", "MID_BT1")
	EventEntryDie(Talk, "PID_M008_アイビー", FORCE_ENEMY, condition_true, "MID_BT3")

	EventEntryTurn(_u30a2_30a4_30d3_30fc___3069_3093_3069_3093_5897_63f4, 2, 2, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff11, 2, 2, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff12, 3, 3, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff13, 4, 4, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff14, 5, 5, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff15, 7, 7, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4___N_o_r_m_a_l___ff11, 2, 2, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4___N_o_r_m_a_l___ff12, 3, 3, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4___N_o_r_m_a_l___ff13, 4, 4, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4___N_o_r_m_a_l___ff14, 5, 5, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4___L_u_n_a_t_i_c___ff16, 7, 7, FORCE_PLAYER)

	EventEntryTurnAfter(_u30a2_30a4_30d3_30fc___305d_308d_305d_308d_52d5_304f, -1, 7, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30d3_30fc_52d5_3051_308b_304b_30c1_30a7_30c3_30af)

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M008", "MID_OP1")

	FadeInAndWait(FADE_NORMAL)
		Movie("S11")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

	PuppetDemo("M008", "MID_OP2")
	PuppetDemo("M008", "MID_OP3")

	FadeInAndWait(FADE_NORMAL)
		Movie("Kengen04")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

	PuppetDemo("M008", "MID_OP4")

	FadeInAndWait(FADE_NORMAL)
		Movie("S12")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

	PuppetDemo("M008", "MID_OP5")

end

function MapOpening()

	Log("MapOpening")

	CursorSetPos(10, 17)
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()

	UnitSetEngageCount("PID_ディアマンド", 7)

end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	Dispos("Ally_Amber", DISPOS_FLAG_FOCUS)
	Yield()

	Talk("MID_EV1")

	UnitMovePos("PID_アンバー",  8, 16)
	UnitMoveWait()

	UnitJoin( "PID_ディアマンド", "PID_アンバー" )

	UnitRotation("PID_アンバー", ROTATE_DOWN)
	UnitMoveWait()

	WaitTime(1.0)

	CursorSetPos(10, 19)
	MapCameraWait()

	CursorAnimeCreate( 8, 19, "W5H1" )
	Talk("MID_EV2")
	CursorAnimeDelete()

end

function _u5f13_7832_53f0_30c1_30e5_30fc_30c8_30ea_30a2_30eb()

	CursorSetPos_FromPid("PID_リュール")
	Talk("MID_EV3")

	CursorAnimeCreate(10, 11)
	CursorAnimeDelete()

	Tutorial("TUTID_弓砲台")
end

function _u30a2_30a4_30d3_30fc___3069_3093_3069_3093_5897_63f4()

	CursorSetPos_FromPid("PID_M008_アイビー")
	Talk("MID_EV5")

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ed_30a4()

	Talk( "MID_EV4" )

	Tutorial("TUTID_紋章士ロイ")

end

function _u5897_63f4_ff11()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return false end
	end

	Dispos("Enemy_Reinforcement0", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4_ff12()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return false end
	end

	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	UnitMoveWait()

	UnitRotation("PID_M008_イルシオン兵_ソードペガサス_増援上向き", ROTATE_UP)
	UnitRotation("PID_M008_イルシオン兵_ソードペガサス_増援上向き2", ROTATE_UP)
	UnitMoveWait()

	WaitTime(0.5)

end

function _u5897_63f4_ff13()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return false end
	end

	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	Dispos("Enemy_Reinforcement2_1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4_ff14()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return false end
	end

	Dispos("Enemy_Reinforcement3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4_ff15()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return false end
	end

	Dispos("Enemy_Reinforcement4", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	Dispos("Enemy_Reinforcement4_1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4___N_o_r_m_a_l___ff11()

	Dispos("Enemy_Reinforcement0_Normal", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4___N_o_r_m_a_l___ff12()

	Dispos("Enemy_Reinforcement1_Normal", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4___N_o_r_m_a_l___ff13()

	Dispos("Enemy_Reinforcement2_Normal", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4___N_o_r_m_a_l___ff14()

	Dispos("Enemy_Reinforcement3_Normal", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4___L_u_n_a_t_i_c___ff16()

	if DifficultyGet() == DIFFICULTY_NORMAL
		or DifficultyGet() == DIFFICULTY_HARD then
			do return false end
	end

	Dispos("Enemy_Reinforcement６_Lunatic1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	Dispos("Enemy_Reinforcement６_Lunatic1_1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u30a2_30a4_30d3_30fc___305d_308d_305d_308d_52d5_304f()

	if(VariableGet( "戦闘前会話_主人公VSアイビー_済" ) == 0)
		and(VariableGet( "戦闘前会話_青軍VSアイビー_済" ) == 0)then

		CursorSetPos_FromPid("PID_M008_アイビー")
		Talk("MID_EV6")
	end

	index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		AiSetSequence(index, AI_ORDER_MOVE, "AI_MV_BreakDown")
		index = ForceUnitGetNext(index)
	end

	VariableSet( "アイビー動くよイベント再生_済", 1 )
end

function _uc_o_n_d_i_t_i_o_n___30a2_30a4_30d3_30fc_52d5_3051_308b_304b_30c1_30a7_30c3_30af()

	if VariableGet( "アイビー動くよイベント再生_済" ) == 1 then
		do return false end
	end

	if VariableGet( "臣下死亡" ) == 1 then
		do return true end
	end

	if MapGetTurn() >= 7 then
		do return true end
	end

	do return false end

end

function _u30ab_30b2_30c4_6b7b_4ea1_30a4_30d9_30f3_30c8()

	if VariableGet("ゼルコバ死亡") == 1 then
		VariableSet( "臣下死亡", 1 )
	end

	Talk("MID_BT7")

end

function _u30bc_30eb_30b3_30d0_6b7b_4ea1_30a4_30d9_30f3_30c8()

	if VariableGet("カゲツ死亡") == 1 then
		VariableSet( "臣下死亡", 1 )
	end

	Talk("MID_BT5")

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

end

function GameOver()

	Log("GameOver")

end
