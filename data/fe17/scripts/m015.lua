Include("Common")

g_pid_lueur				= "PID_リュール"
g_key_tutorial_dance	= "チュートリアル_踊り_済"
g_key_tutorial_kamui	= "チュートリアル_カムイ_済"
g_key_talk_seadas		= "会話イベント_セアダス加入_済"
g_key_reinforcement2_count = "増援２_カウンター"

function Startup()

	Log("Startup")

	WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
	WinRuleSetMID( "MID_RULE_M015_WIN" )
	LoseRuleSetMID( "MID_RULE_M015_LOSE" )

	_u5909_6570_767b_9332()
	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( "増援_エリア侵入0_済", 0 )
	VariableEntry( "増援_エリア侵入1_済", 0 )
	VariableEntry( "増援_戦闘後増援_Lunatic_済", 0 )

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry( g_key_tutorial_dance, 0 )
	VariableEntry( g_key_tutorial_kamui, 0 )
	VariableEntry( g_key_talk_seadas, 0 )
	VariableEntry( g_key_reinforcement2_count, 2 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryTalk(_u30bb_30a2_30c0_30b9_52a0_5165, g_pid_lueur, FORCE_PLAYER, "PID_セアダス", FORCE_ALLY, true, g_key_talk_seadas)

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___8e0a_308a,	"",	_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___8e0a_308a)
	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ab_30e0_30a4,	"PID_セアダス",	_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ab_30e0_30a4)

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 17, 6, "IID_魔よけ")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 17, 8, "IID_力のしずく")

	EventEntryDie(_u30bb_30a2_30c0_30b9_6b7b_4ea1, "PID_セアダス", FORCE_ALL)

	EventEntryEscape(_u96e2_8131_30a4_30d9_30f3_30c8_ff11, 4, 1, "PID_セアダス", _uc_o_n_d_i_t_i_o_n___96e2_8131_30a4_30d9_30f3_30c8_ff11)
	EventEntryEscape(_u96e2_8131_30a4_30d9_30f3_30c8_ff11, 5, 1, "PID_セアダス", _uc_o_n_d_i_t_i_o_n___96e2_8131_30a4_30d9_30f3_30c8_ff11)

	EventEntryEscape(_u96e2_8131_30a4_30d9_30f3_30c8_ff12, 23, 1, "PID_セアダス", _uc_o_n_d_i_t_i_o_n___96e2_8131_30a4_30d9_30f3_30c8_ff12)
	EventEntryEscape(_u96e2_8131_30a4_30d9_30f3_30c8_ff12, 24, 1, "PID_セアダス", _uc_o_n_d_i_t_i_o_n___96e2_8131_30a4_30d9_30f3_30c8_ff12)

	EventEntryArea(EmptyFunction, 17, 8, 18, 13, FORCE_PLAYER, "エリアイベント0_済")
	EventEntryArea(EmptyFunction, 21, 8, 26, 16, FORCE_PLAYER, "エリアイベント0_済")
	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M015_異形兵_アクスファイター_増援フラグ", FORCE_ENEMY, true, "戦闘後イベント_Lunatic_済")
	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M015_異形兵_マージ_増援フラグ", FORCE_ENEMY, true, "戦闘後イベント_Lunatic_済")
	EventEntryTurn(_u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_0, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_4fb5_5165_0)
	EventEntryTurn(_u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_1, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_4fb5_5165_1)
	EventEntryTurn(_u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_3, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4___L_u_n_a_t_i_c)

	EventEntryDoor(_u51fa_53e3_306e_6249_3092_6d88_3059, 23, 7, 24, 7)

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	Movie("Scene18")
	SkipEscape()

	PuppetDemo("M015", "MID_OP2")

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait( FADE_FAST )
	EventActionObject( 4, 0, MAP_ACTION_DONE )

	_u30ea_30e5_30fc_30eb_9054_5165_5834()

	Talk("MID_OP3")

	CursorSetPos_FromPid("PID_セアダス")

	Talk("MID_OP4")

	CursorSetPos_FromPid(g_pid_lueur)

end

function _u51fa_53e3_306e_6249_3092_6d88_3059()

	EventActionObject(23, 1, MAP_ACTION_DONE)

end

function _u30ea_30e5_30fc_30eb_9054_5165_5834()

	CursorSetPos_FromPid_DistanceModeNear( g_pid_lueur )
	FadeIn(FADE_NORMAL)
	WaitTime(0.1)

	UnitMoveWait()
	FadeWait()

end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid("PID_セアダス")
	PlayFieldBgm(FORCE_PLAYER)
	Talk("MID_OP5")

	CursorSetPos( 4, 3 )
	MapCameraWait()

	CursorAnimeCreate( 4, 1, "W2H1")
	CursorAnimeDelete()

	Dialog( "MID_TUT_NAVI_M015_ESCAPE" )

	CursorSetPos_FromPid( g_pid_lueur )

end

function _u30bb_30a2_30c0_30b9_52a0_5165()

	Talk("MID_EV1")

	Movie("Kengen10")
	SkipEscape()

	FadeInAndWait(FADE_FAST)

	UnitCreateGodUnit("PID_セアダス", "GID_カムイ")
	UnitSetEngageCount("PID_セアダス", 7)

	Talk("MID_EV2")

	pid = "PID_セアダス"
	if UnitExistOnMap( pid ) then
		UnitJoin( pid )
	end

	WaitTime( 1.0 )

	_u9589_3058_3066_3044_308b_6249_3092_958b_3051_308b()

	CursorSetPos( 3, 0 )
	MapCameraWait()

	EventActionObject( 4, 0, MAP_ACTION_IDLE )
	WaitTime( 2.0 )

	TerrainSetBegin()
	TerrainSet( 4, 0, "TID_扉" )
	TerrainSet( 5, 0, "TID_扉" )
	TerrainSetEnd()

	Talk( "MID_EV3" )

	CursorSetPos( 5, 17 )
	MapCameraWait()

	CursorAnimeCreate( 7, 15, "W1H2")
	Talk( "MID_EV4" )
	CursorAnimeDelete()

end

function _u9589_3058_3066_3044_308b_6249_3092_958b_3051_308b()

	if		VariableGet( "扉_7_9" ) == 0 then

		CursorSetPos( 4, 11 )
		MapCameraWait()

		if VariableGet( "扉_7_9" ) == 0 then
			EventOpenDoor( 7, 9)
		end

		WaitTime(0.5)

	end

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___8e0a_308a()

	if ( UnitGetPID( MindGetUnit()) == "PID_セアダス" ) then
		return false
	end

	if ( VariableGet( g_key_tutorial_dance ) == 1 ) then
		return false
	end

	if ( VariableGet( g_key_talk_seadas ) == 1 ) then
		return true
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___8e0a_308a()

	CursorSetPos_FromPid(MindGetUnit())

	Talk("MID_EV5")

	Tutorial( "TUTID_踊り" )

	VariableSet( g_key_tutorial_dance, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ab_30e0_30a4()

	if ( VariableGet( g_key_tutorial_kamui ) == 1 ) then
		return false
	end

	if ( VariableGet( g_key_talk_seadas ) == 1 ) then
		return true
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ab_30e0_30a4___7634_6c17()

	CursorSetPos( 5, 10)
	MapCameraWait()

	CursorAnimeCreate( 5, 9, "W2H3" )
	CursorAnimeDelete()

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ab_30e0_30a4()

	if MapOverlapGet(5, 11) == "TID_瘴気_永続"
		or MapOverlapGet(5, 10) == "TID_瘴気_永続"
			or MapOverlapGet(5, 9) == "TID_瘴気_永続"
				or MapOverlapGet(6, 10) == "TID_瘴気_永続"
					or MapOverlapGet(6, 9) == "TID_瘴気_永続"  then

						_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ab_30e0_30a4___7634_6c17()

							end

	Talk( "MID_EV6" )

	Tutorial( "TUTID_紋章士カムイ" )

	VariableSet( g_key_tutorial_kamui, 1 )

end

function _u30bb_30a2_30c0_30b9_6b7b_4ea1()

	VariableSet( "敗北", 1 )

end

function _uc_o_n_d_i_t_i_o_n___96e2_8131_30a4_30d9_30f3_30c8_ff11()
	if VariableGet( g_key_talk_seadas ) == 1 then
		return false
	end

	return true
end

function _u96e2_8131_30a4_30d9_30f3_30c8_ff11()

end

function _uc_o_n_d_i_t_i_o_n___96e2_8131_30a4_30d9_30f3_30c8_ff12()
	if VariableGet( g_key_talk_seadas ) == 0 then
		return false
	end

	return true

end

function _u96e2_8131_30a4_30d9_30f3_30c8_ff12()
	Talk( "MID_EV7" )
	VariableSet( "勝利", 1 )
end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_4fb5_5165_0()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return false
	end

	if VariableGet( "増援_エリア侵入0_済" ) == 1 then
		return false
	end

	if VariableGet( "エリアイベント0_済" ) == 1 then
		return true
	end

	return false

end

function EmptyFunction()

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_0()

	CursorSetPos( 4, 10 )

	WaitTime(0.5)

	Dispos("Enemy_Reinforcement0", DISPOS_FLAG_FORCED)
	Yield()

	WaitTime(0.5)

	VariableSet( "増援_エリア侵入0_済", 1 )

	CursorSetPos( 4, 8 )

	CursorSetPos_FromPid("PID_リュール")

	Talk("MID_EV8")

	WaitTime(0.5)

end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_4fb5_5165_1()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return false
	end

	if VariableGet( "増援_エリア侵入1_済" ) == 1 then
		return false
	end

	if VariableGet( "エリアイベント0_済" ) == 0 then
		return false
	end

	local counter = VariableGet( g_key_reinforcement2_count )
	counter = counter - 1
	VariableSet( g_key_reinforcement2_count, counter )

	if counter == 0 then
		return true
	end

	return false

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_1()

	CursorSetPos( 4, 10 )

	WaitTime(0.5)

	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FORCED)
	Yield()

	WaitTime(0.5)

	VariableSet( "増援_エリア侵入1_済", 1 )

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4___L_u_n_a_t_i_c()

	if DifficultyGet() == DIFFICULTY_NORMAL
		or DifficultyGet() == DIFFICULTY_HARD then
			return false
	end

	if VariableGet( "増援_戦闘後増援_Lunatic_済" ) == 1 then
		return false
	end

	if VariableGet( "戦闘後イベント_Lunatic_済" ) == 1 then
		return true
	end

	return false

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_3()

	CursorSetPos( 4, 10 )

	WaitTime(0.5)

	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FORCED)
	Yield()

	WaitTime(0.5)

	VariableSet( "増援_戦闘後増援_Lunatic_済", 1 )

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
