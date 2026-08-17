Include("Common")
g_pid_lueur					= "PID_リュール"
g_pid_boss					= "PID_M006_ボス"

g_key_tutorial_search		= "チュートリアル_索敵_済"
g_key_tutorial_michaiah		= "チュートリアル_ミカヤ_済"
g_key_engage_michaiah		= "戦闘後会話_ミカヤエンゲージ_済"
g_key_tutorial_shine		= "チュートリアル_シャイン_済"

g_key_fixed_boss			= "待機後_ボス_済"

g_key_ringBandit_Die		= "指輪持ち蛮族死亡_済"
g_key_Boss_Die				= "ボス死亡_済"

function Startup()

	Log("Startup")

	WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
	WinRuleSetMID( "MID_RULE_M006_WIN" )
	LoseRuleSetMID( "MID_RULE_M006_LOSE" )

	_u5909_6570_767b_9332()

	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry( g_key_tutorial_search, 0 )
	VariableEntry( g_key_tutorial_michaiah, 0 )
	VariableEntry( g_key_tutorial_shine, 0 )
	VariableEntry( g_key_fixed_boss, 0 )
	VariableEntry( g_key_engage_michaiah, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6___6575_5c06_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER, condition_true, "PID_M006_ボス")

	EventEntryPickup( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d22_6575,		g_pid_lueur,	g_key_tutorial_search )
	EventEntryPickup( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d22_6575,		"PID_ユナカ",	_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d22_6575___30e6_30ca_30ab )
	EventEntryPickup( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30df_30ab_30e4,	"PID_ユナカ",	_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30df_30ab_30e4 )

	EventEntryEngageAfter(_u30a8_30f3_30b2_30fc_30b8_5f8c_306b_518d_751f, "PID_ユナカ",		g_key_tutorial_shine)

	EventEntryDie(_u30e6_30ca_30ab_6b7b_4ea1, "PID_ユナカ", FORCE_PLAYER, condition_true )

	EventEntryBattleTalk( Talk, "", FORCE_PLAYER, "PID_M006_蛮族_指輪持ち", FORCE_ENEMY, true, "戦闘前会話_指輪持ち_済", "MID_BT1")
	EventEntryDie(_u6307_8f2a_6301_3061_86ee_65cf_6b7b_4ea1, "PID_M006_蛮族_指輪持ち", FORCE_ENEMY, g_key_ringBandit_Die )
	EventEntryBattleAfter(_u6226_95d8_5f8c_4f1a_8a71___30df_30ab_30e4_30a8_30f3_30b2_30fc_30b8, "PID_M006_蛮族_指輪持ち", FORCE_ENEMY, "", FORCE_PLAYER, false, _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_4f1a_8a71___30df_30ab_30e4_30a8_30f3_30b2_30fc_30b8 )
	EventEntryFixed(_u6226_95d8_5f8c_4f1a_8a71___30df_30ab_30e4_30a8_30f3_30b2_30fc_30b8, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_4f1a_8a71___30df_30ab_30e4_30a8_30f3_30b2_30fc_30b8)

	EventEntryTurnAfter(_u6575_ff11_30bf_30fc_30f3___660e_304b_308a_3092_6d88_305b, 1, 1, FORCE_ENEMY)
	EventEntryTurnAfter(_u81ea_8ecd_ff12_30bf_30fc_30f3___660e_304b_308a_3092_706f_305b, 2, 2,  FORCE_PLAYER)

	EventEntryFixed(_u5f85_6a5f_5f8c___30dc_30b9, g_pid_boss, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___5f85_6a5f_5f8c___30dc_30b9)
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT3")
	EventEntryDie(_u30dc_30b9_6b7b_4ea1, g_pid_boss, FORCE_ENEMY, g_key_Boss_Die )

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M006", "MID_OP1")
	PuppetDemo("M006", "MID_OP2")
	PuppetDemo("M006", "MID_OP3")

end

function MapOpening()

	Log("MapOpening")

	UnitSetPos(g_pid_lueur, 22, 14)

	UnitSetPosFromPos( 19, 2,	21, 1 )
	UnitSetPosFromPos( 18, 2,	20, 1 )
	UnitSetPosFromPos( 17, 2,	19, 1 )
	UnitSetPosFromPos( 19, 3,	21, 2 )
	UnitSetPosFromPos( 18, 3,	20, 2 )
	UnitSetPosFromPos( 17, 3,	19, 2 )
	UnitSetPosFromPos( 16, 3,	18, 2 )
	UnitSetPosFromPos( 18, 4,	20, 3 )
	UnitSetPosFromPos( 17, 4,	19, 3 )

	CursorSetPos(17, 3)
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()
	FadeIn(FADE_NORMAL)
	WaitTime(0.1)

	UnitMovePosFromPos( 19, 3,	17, 4 )
	UnitMovePosFromPos( 20, 3,	18, 4 )
	UnitMovePosFromPos( 18, 2,	16, 3 )
	UnitMovePosFromPos( 19, 2,	17, 3 )
	UnitMovePosFromPos( 20, 2,	18, 3 )
	UnitMovePosFromPos( 21, 2,	19, 3 )
	UnitMovePosFromPos( 19, 1,	17, 2 )
	UnitMovePosFromPos( 20, 1,	18, 2 )
	UnitMovePosFromPos( 21, 1,	19, 2 )

	UnitMoveWait()
	FadeWait()
	WaitTime(1.5)
	CursorSetPos(19, 13)

	if UnitExistOnMap("PID_ユナカ") then
		UnitMovePos("PID_ユナカ", 20, 14, MOVE_FLAG_NONE)
	end
	if UnitExistOnMap(g_pid_lueur) then
		UnitMovePos(g_pid_lueur, 19, 14, MOVE_FLAG_NONE)
	end

	UnitMoveWait()
	MapCameraWait()

	UnitRotation(g_pid_lueur,	ROTATE_LEFT)
	UnitRotation("PID_ユナカ",	ROTATE_LEFT)
	UnitMoveWait()

	Talk("MID_EV1")

end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid(g_pid_lueur)

	Talk( "MID_EV5" )

	if UnitExistOnMap("PID_ユナカ") then
		UnitMovePos("PID_ユナカ", 19, 13, MOVE_FLAG_NONE)
	end
	UnitMoveWait()
	UnitRotation("PID_ユナカ",	ROTATE_LEFT)
	UnitMoveWait()

	WaitTime( 0.5 )

	pid = "PID_ユナカ"
	if UnitExistOnMap( pid ) then
		UnitJoin( pid )
	end

	WaitTime(0.5)

	Talk( "MID_EV5_2" )

	Tutorial( "TUTID_索敵" )

	local ringX = UnitGetX("PID_M006_蛮族_指輪持ち")
	local ringZ = UnitGetZ("PID_M006_蛮族_指輪持ち")
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", ringX, ringZ)
	WaitTime( 2.0 )

	Talk("MID_EV2")

	MapObjectDelete("Eff_Cursor01")

	Talk("MID_EV3")
	Talk("MID_EV4")
end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d22_6575___30e6_30ca_30ab()

	local value = VariableGet( g_key_engage_michaiah )
	if value == 1 then
		return false
	end

	value = VariableGet( g_key_tutorial_search )
	if value == 0 then
		return true
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d22_6575()

	MapCameraWait()

	Tutorial( "TUTID_毒" )
	Tutorial( "TUTID_隠密スタイル" )

	VariableSet( g_key_tutorial_search, 1 )

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_4f1a_8a71___30df_30ab_30e4_30a8_30f3_30b2_30fc_30b8()

	if VariableGet( g_key_ringBandit_Die ) == 0 then
		return false
	end

	if VariableGet( g_key_engage_michaiah ) == 0 then
		return true
	end

	return false
end

function _u6226_95d8_5f8c_4f1a_8a71___30df_30ab_30e4_30a8_30f3_30b2_30fc_30b8()

	Talk("MID_EV6")

	Movie("Kengen03")
	SkipEscape()
	FadeInAndWait( FADE_FAST )

	Talk("MID_EV7")
	Talk("MID_EV8")

	UnitCreateGodUnit("PID_ユナカ", "GID_ミカヤ")
	UnitSetEngageCount("PID_ユナカ", 7)

	VariableSet( g_key_engage_michaiah, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30df_30ab_30e4()

	local value = VariableGet( g_key_engage_michaiah )
	if value == 0 then
		return false
	end

	value = VariableGet( g_key_tutorial_michaiah )
	if value == 0 then
		return true
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30df_30ab_30e4()

	MapCameraWait()
	Talk( "MID_EV10" )

	Tutorial( "TUTID_紋章士ミカヤ" )

	VariableSet( g_key_tutorial_michaiah, 1 )

end

function _u30a8_30f3_30b2_30fc_30b8_5f8c_306b_518d_751f()

	Talk( "MID_EV11" )

end

function _u6575_ff11_30bf_30fc_30f3___660e_304b_308a_3092_6d88_305b()
	CursorSetPos_FromPid( g_pid_boss )
	Talk( "MID_EV9" )

	TerrainSetOne( 3, 15, "TID_篝火消" )
	WaitTime( 0.5 )

end

function _u81ea_8ecd_ff12_30bf_30fc_30f3___660e_304b_308a_3092_706f_305b()
	CursorSetPos_FromPid( g_pid_lueur )
	Talk( "MID_EV12" )
	Tutorial( "TUTID_篝火" )
end

function _uc_o_n_d_i_t_i_o_n___5f85_6a5f_5f8c___30dc_30b9()

	if DifficultyGet() < DIFFICULTY_LUNATIC then
		return false
	end

	if VariableGet( g_key_fixed_boss ) == 1 then
		return false
	end

	x = UnitGetX(g_pid_boss)
	z = UnitGetZ(g_pid_boss)

	if ( x == 1 ) and ( z == 11 ) then
		return true
	end

end

function _u5f85_6a5f_5f8c___30dc_30b9()

	AiSetSequence(g_pid_boss, AI_ORDER_CAUSE, "AI_AC_TurnAttackRange", "10")
	AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_WeakEnemy")
	AiSetBandNo(g_pid_boss, 1)
	AiSetActive(g_pid_boss, false)

	VariableSet( g_key_fixed_boss, 1 )

end

function _u6307_8f2a_6301_3061_86ee_65cf_6b7b_4ea1()
	Talk( "MID_BT2" )

	_u30b9_30ad_30eb_89e3_9664( g_pid_boss, "SID_死亡回避" )

	if VariableGet( g_key_Boss_Die ) == 1 then
		VariableSet( "勝利", 1 )
	end
end

function _u30dc_30b9_6b7b_4ea1()
	Talk( "MID_BT4" )

	if VariableGet( g_key_ringBandit_Die ) == 1 then
		VariableSet( "勝利", 1 )
	end
end

function _u30e6_30ca_30ab_6b7b_4ea1()
	VariableSet( "敗北", 1 )
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
