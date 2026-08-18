Include("Common")

g_pid_lueur				= "PID_リュール"
g_pid_banditRing		= "PID_S015_異形兵_蛮族_指輪"
g_key_banditRing_dead	= "指輪蛮族_撃破_済"
g_key_recapture			= "指輪奪還_済"
g_key_phase				= "フェイズ調整_済"
g_key_active			= "ボス周辺行動開始"
g_key_activeCounter		= "ボス周辺行動開始カウンター"

function Startup()

	Log("Startup")

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

	if ( VariableGet( g_key_recapture ) == 0 ) then
		WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
		WinRuleSetMID( "MID_RULE_S015_WIN" )
		LoseRuleSetMID( "MID_RULE_S015_LOSE" )
	end

	VariableSet( "G_置換_MIID_H_PromiseRing",	1 )

end

function Cleanup()

	Log("Cleanup")

	VariableSet( "G_置換_MIID_H_PromiseRing",	0 )

end

function Opening()

	Log("Opening")

	FadeInAndWait( FADE_NORMAL )
	PuppetDemo("S015", "MID_OP1")
	FadeOutAndWait( FADE_NORMAL )

end

function MapOpening()

	Log("MapOpening")

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_banditRing_dead, 0 )
	VariableEntry( g_key_recapture, 0 )
	VariableEntry( g_key_phase, 0 )
	VariableEntry( g_key_active, 0 )
	VariableEntry( g_key_activeCounter, 2 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryDie(EmptyFunction, g_pid_banditRing, FORCE_ENEMY, g_key_banditRing_dead)

	EventEntryBattleAfter(_u6307_8f2a_596a_9084, g_pid_banditRing, FORCE_ENEMY, "", FORCE_PLAYER, false, _uc_o_n_d_i_t_i_o_n___6307_8f2a_596a_9084)

	EventEntryBattleAfter(VariableSet, "", FORCE_PLAYER, g_pid_banditRing, FORCE_ENEMY, false, _uc_o_n_d_i_t_i_o_n___5f37_5236_6575_30d5_30a7_30a4_30ba_7d42_4e86, "行動後フェイズ終了", 1)
	EventEntryFixed(_u6307_8f2a_596a_9084, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6307_8f2a_596a_9084)

	EventEntryTurnAfter(_u6307_8f2a_596a_9084___30d5_30a7_30a4_30ba_51e6_7406_306a_3057, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6307_8f2a_596a_9084)

	EventEntryEscape(_u6307_8f2a_6301_3061_9003_3052, 13, 27, g_pid_banditRing, _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_9003_3052)
	EventEntryEscape(_u6307_8f2a_6301_3061_9003_3052, 14, 27, g_pid_banditRing, _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_9003_3052)
	EventEntryEscape(_u6307_8f2a_6301_3061_9003_3052, 15, 27, g_pid_banditRing, _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_9003_3052)

	EventEntryTurn(_u30d5_30a7_30a4_30ba_8abf_6574, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30d5_30a7_30a4_30ba_8abf_6574)

	EventEntryTurn(VariableSet, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30dc_30b9_5468_8fba_884c_52d5_958b_59cb_30ab_30a6_30f3_30bf_30fc, g_key_active, 1)

	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, "PID_S015_異形兵_蛮族_指輪",	FORCE_ENEMY, true, "戦闘前会話_指輪蛮族_済",		"MID_EV2")
	EventEntryBattleTalk(Talk, g_pid_lueur,	FORCE_PLAYER, "PID_S015_異形兵_ボス",		FORCE_ENEMY, true, "戦闘前会話_ボス_リュール_済",	"MID_BT2")
	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, "PID_S015_異形兵_ボス",		FORCE_ENEMY, true, "戦闘前会話_ボス_済",			"MID_BT1")

	EventEntryDie(Talk, "PID_S015_異形兵_ボス", FORCE_ENEMY, "死亡会話_ボス_済", "MID_BT3")

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___5f37_5236_6575_30d5_30a7_30a4_30ba_7d42_4e86()

	if VariableGet( g_key_banditRing_dead ) == 1 then
		do return true end
	end

end

function _uc_o_n_d_i_t_i_o_n___6307_8f2a_596a_9084()

	if VariableGet( g_key_recapture ) == 1 then
		do return false end
	end

	if VariableGet( g_key_banditRing_dead ) == 1 then
		do return true end
	end

	do return false end

end

function _u6307_8f2a_596a_9084()

	_u6307_8f2a_596a_9084___30d5_30a7_30a4_30ba_51e6_7406_306a_3057()

	VariableSet( "敵軍フェイズスキップ", 1 )
	VariableSet( "行動後フェイズ終了", 1 )

end

function _u6307_8f2a_596a_9084___30d5_30a7_30a4_30ba_51e6_7406_306a_3057()

	local _x = CursorGetX()
	local _z = CursorGetZ()

		Dialog( "MID_TUT_NAVI_S015_GET" )

		CursorSetPos( 5, 22 )
		MapCameraWait()
		Dispos( "Reinforcement1_1", DISPOS_FLAG_NONE )
		Yield()
		WaitTime(0.5)

		CursorSetPos( 23, 22 )
		MapCameraWait()
		Dispos( "Reinforcement1_2", DISPOS_FLAG_NONE )
		Yield()
		WaitTime(0.5)

		Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)

		Talk( "MID_EV1" )

		CursorSetPos_FromPid( g_pid_lueur )
		MapCameraWait()

		WinRuleSetEnemyNumberLessThanOrEqualTo(0)
		WinRuleSetMID( "MID_RULE_ANNIHILATE" )
		LoseRuleSetMID( "MID_RULE_COMMON_LOSE" )
		WinRule()

	CursorSetPos( _x, _z )
	MapCameraWait()

	VariableSet( g_key_recapture, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30d5_30a7_30a4_30ba_8abf_6574()

	if VariableGet( g_key_phase ) == 1 then
		do return false end
	end

	if VariableGet( g_key_recapture ) == 1 then
		do return true end
	end

	do return false end

end

function _u30d5_30a7_30a4_30ba_8abf_6574()

	VariableSet( "行動後フェイズ終了", 0 )
	VariableSet( "敵軍フェイズスキップ", 0 )

	VariableSet( g_key_phase, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30dc_30b9_5468_8fba_884c_52d5_958b_59cb_30ab_30a6_30f3_30bf_30fc()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return false end
	end

	if VariableGet( g_key_active ) == 1 then
		do return false end
	end

	if VariableGet( g_key_phase ) == 0 then
		do return false end
	end

	local counter = VariableGet( g_key_activeCounter )
	if counter <= 0 then
		do return true end
	end

	counter = counter - 1
	VariableSet( g_key_activeCounter, counter )

end

function _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_9003_3052()
	if VariableGet( g_key_recapture ) == 1 then
		do return false end
	end

	do return true end
end

function _u6307_8f2a_6301_3061_9003_3052()
	Talk( "MID_EV3" )
	VariableSet( "敗北", 1 )
end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	VariableSet( "G_置換_MIID_H_PromiseRing",	0 )

	FadeInAndWait( FADE_NORMAL )
		PuppetDemo("S015", "MID_ED1")
		Tutorial( "TUTID_約束の指輪" )
		Dialog( "MID_TUT_NAVI_S015_ENGAGERING" )
		UnitReliancePermitAPlus()
	FadeOutAndWait( FADE_NORMAL )

end

function GameOver()

	Log("GameOver")

end
