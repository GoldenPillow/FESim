Include("Common")
Include("Common_E")

g_pid_boss = "PID_E003_Boss"
g_pid_hide = "PID_E003_Hide"

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_E003_WIN" )
	LoseRuleSetMID( "MID_RULE_DLC_LOSE" )

	_u30a4_30d9_30f3_30c8_767b_9332()
	_u30d5_30e9_30b0_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "エリア1侵入カウント", 0 )
	VariableEntry( "エリア2侵入カウント", 0 )
	VariableEntry( "エリア3侵入カウント", 0 )

	VariableEntry( "エリア1_済", 0 )
	VariableEntry( "エリア2_済", 0 )
	VariableEntry( "エリア3_済", 0 )

	VariableEntry( "特殊召喚カウント", 0 )
	VariableEntry( "マージカノンアクティブ_済", 0 )

	VariableEntry( "ディアマンドアクティブ_済", 0 )
	VariableEntry( "スタルークアクティブ_済", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( GodSaveEquipE,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )

	EventEntryFixed( _u30de_30fc_30b8_30ab_30ce_30f3_30a2_30af_30c6_30a3_30d6,	"PID_E003_異形兵強_マージカノン", FORCE_ENEMY)

	EventEntryTurn(_u53ec_559a_7ba1_7406, -1, -1, FORCE_PLAYER)

	EventEntryArea(EmptyFunction, 1, 8, 19, 11, FORCE_PLAYER, "エリア1_済")
	EventEntryArea(EmptyFunction, 1,12, 19, 16, FORCE_PLAYER, "エリア2_済")
	EventEntryArea(EmptyFunction, 6,17, 14, 24, FORCE_PLAYER, "エリア3_済")
	EventEntryTurn(_u30a8_30ea_30a2_1_5897_63f4_7ba1_7406, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_1_4fb5_5165)
	EventEntryTurn(_u30a8_30ea_30a2_2_5897_63f4_7ba1_7406, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_2_4fb5_5165)
	EventEntryTurn(_u30a8_30ea_30a2_3_5897_63f4_7ba1_7406, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_3_4fb5_5165)

	EventEntryPickup( _u30c7_30a3_30a2_30de_30f3_30c9_30a2_30af_30c6_30a3_30d6,	g_pid_boss,  "ディアマンドアクティブ_済" )
	EventEntryPickup( _u30b9_30bf_30eb_30fc_30af_30a2_30af_30c6_30a3_30d6,	g_pid_hide,  "スタルークアクティブ_済" )

	EventEntryBattleTalk(Talk, "PID_ディアマンド", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ディアマンド_ボス_済", "MID_BT5");
	EventEntryBattleTalk(Talk, "PID_スタルーク", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_スタルーク_ボス_済", "MID_BT6");
	EventEntryBattleTalk(Talk, "PID_シトリニカ", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_シトリニカ_ボス_済", "MID_BT7");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_リュール_ボス_済", "MID_BT8");
	EventEntryBattleTalk(Talk, "PID_アンバー", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_アンバー_ボス_済", "MID_BT9");
	EventEntryBattleTalk(Talk, "PID_ジェーデ", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ジェーデ_ボス_済", "MID_BT10");
	EventEntryBattleTalk(Talk, "PID_ザフィーア", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ザフィーア_ボス_済", "MID_BT11");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT1");
	EventEntryDie(Talk, g_pid_boss, FORCE_ENEMY, condition_true, "MID_BT2");

	EventEntryBattleTalk(Talk, "PID_スタルーク", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_スタルーク_裏_済", "MID_BT12");
	EventEntryBattleTalk(Talk, "PID_ディアマンド", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_ディアマンド_裏_済", "MID_BT13");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_リュール_裏_済", "MID_BT14");
	EventEntryBattleTalk(Talk, "PID_ラピス", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_ラピス_裏_済", "MID_BT15");
	EventEntryBattleTalk(Talk, "PID_シトリニカ", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_シトリニカ_裏_済", "MID_BT16");
	EventEntryBattleTalk(Talk, "PID_ザフィーア", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_ザフィーア_裏_済", "MID_BT17");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_済", "MID_BT3");
	EventEntryDie(Talk, g_pid_hide, FORCE_ENEMY, condition_true, "MID_BT4");

	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E003_イル", FORCE_PLAYER, FORCE_ALL )
	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E003_エル", FORCE_PLAYER, FORCE_ALL )

end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	PlayChapterTitle("E003")
	Yield()
	FadeOut(0)

	Movie("Narration03")
	SkipEscape()

	PuppetDemo("E003", "MID_OP2")
	PuppetDemo("E003", "MID_OP3")

	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()
end

function MapOpening()

	Log("MapOpening");

	GodLoadEquipE()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( "E003" )

end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()
	Talk( "MID_EV1" )

	CursorSetPos(12,9)
	MapCameraWait()

	CursorAnimeCreate(12,9);
	WaitTime(1.0)

	Talk( "MID_EV2" )
	Tutorial( "TUTID_敵マージカノン_E003" )

	CursorAnimeDelete()
	WaitTime(1.0)

	_u52dd_5229_6761_4ef6___4e8c_4eba_306b_30d5_30a9_30fc_30ab_30b9()

end

function _u52dd_5229_6761_4ef6___4e8c_4eba_306b_30d5_30a9_30fc_30ab_30b9()

	CursorSetPos( 10, 21 )
	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )
	MapCameraWait()

	local x = UnitGetX( g_pid_boss )
	local z = UnitGetZ( g_pid_boss )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)

	x = UnitGetX( g_pid_hide )
	z = UnitGetZ( g_pid_hide )
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)

	WaitTime( 2.0 )

	WinRule()

	MapObjectDelete( "Eff_Cursor01" )
	MapObjectDelete( "Eff_Cursor02" )

end

function EmptyFunction()
end

function _u30de_30fc_30b8_30ab_30ce_30f3_30a2_30af_30c6_30a3_30d6()

	if VariableGet( "マージカノンアクティブ_済" )  == 0 then

		local unitA = UnitGetByPos(11, 23)
		local unitB = MindGetUnit()
		if unitA == unitB then
			CursorSetPos_FromPid("PID_E003_異形兵強_マージカノン")
			MapCameraWait()
			Talk( "MID_EV3" )
			VariableSet( "マージカノンアクティブ_済", 1 )
		end
	end
end

function _u30c7_30a3_30a2_30de_30f3_30c9_30a2_30af_30c6_30a3_30d6()
	if UnitExistOnMap( g_pid_boss ) then
		if AiGetActive( g_pid_boss ) == true then

			if VariableGet( "エリア3_済" ) == 0 then
				VariableSet( "エリア3_済" ,1)

				VariableSet( "エリア3侵入カウント" ,0)

				local index = ForceUnitGetFirst(FORCE_ENEMY)
				while index ~= nil do
					local pid = UnitGetPID(index)
					UnitClearStatus(pid, UNIT_STATUS_MOVE_NOT_ALLOW)

					AiSetSequence(pid, AI_ORDER_CAUSE, "AI_AC_Everytime")
					AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_WeakEnemy")
					index = ForceUnitGetNext(index)
				end
			end
			VariableSet( "ディアマンドアクティブ_済", 1 )
		end
	end
end

function _u30b9_30bf_30eb_30fc_30af_30a2_30af_30c6_30a3_30d6()
	if UnitExistOnMap( g_pid_hide ) then
		if AiGetActive( g_pid_hide ) == true then

			if VariableGet( "エリア2_済" ) == 0 then
				VariableSet( "エリア2_済" ,1)
			end
			VariableSet( "スタルークアクティブ_済", 1 )
		end
	end
end

function _u5473_65b9_6b7b_4ea1()
	VariableSet( "敗北", 1 )
end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_1_4fb5_5165()

	if VariableGet( "エリア1侵入カウント" ) == 2 then
		do return false end
	end

	if VariableGet( "エリア1_済" ) == 1 then
		do return true end
	end

	do return false end
end

function _u30a8_30ea_30a2_1_5897_63f4_7ba1_7406()
	local turn = MapGetTurn() + 1

	if DifficultyGet() == DIFFICULTY_LUNATIC then
		Dispos("Enemy_Reinforcement1L", DISPOS_FLAG_FOCUS)
		Dispos("Enemy_Reinforcement1R", DISPOS_FLAG_FOCUS)
	else
		if turn  % 2 == 1 then
			Dispos("Enemy_Reinforcement1L", DISPOS_FLAG_FOCUS)
		else
			Dispos("Enemy_Reinforcement1R", DISPOS_FLAG_FOCUS)
		end
	end
	Yield()
	WaitTime(0.5)
	VariableInc("エリア1侵入カウント", 0, 10)
end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_2_4fb5_5165()

	if VariableGet( "エリア2侵入カウント" ) == 2 then
		do return false end
	end

	if VariableGet( "エリア2_済" ) == 1 then
		do return true end
	end

	do return false end
end

function _u30a8_30ea_30a2_2_5897_63f4_7ba1_7406()
	local turn = MapGetTurn() + 1

	if DifficultyGet() == DIFFICULTY_LUNATIC then
		Dispos("Enemy_Reinforcement2R", DISPOS_FLAG_FOCUS)
		Dispos("Enemy_Reinforcement2L", DISPOS_FLAG_FOCUS)
	else
		if turn  % 2 == 1 then
			Dispos("Enemy_Reinforcement2R", DISPOS_FLAG_FOCUS)
		else
			Dispos("Enemy_Reinforcement2L", DISPOS_FLAG_FOCUS)
		end
	end
	Yield()
	WaitTime(0.5)
	VariableInc("エリア2侵入カウント", 0, 10)
end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_3_4fb5_5165()

	if VariableGet( "エリア3侵入カウント" ) == 2 then
		do return false end
	end

	if VariableGet( "エリア3_済" ) == 1 then
		do return true end
	end

	do return false end
end

function _u30a8_30ea_30a2_3_5897_63f4_7ba1_7406()
	Dispos("Enemy_Reinforcement3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
	VariableInc("エリア3侵入カウント", 0, 10)
end

function _u53ec_559a_7ba1_7406()
	if AiGetActive( "PID_E003_Boss" ) == true then
		if VariableGet( "特殊召喚カウント" )  == 0 then
			CursorSetPos_FromPid( "PID_E003_Boss" )
			MapCameraWait()
			Talk( "MID_EV4" )

			EventEngageSummon( "PID_E003_Boss" )
			Dispos( "Enemy_ReinforcementS", DISPOS_FLAG_FOCUS + DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
			Yield()
			WaitTime( 2.0 )
			VariableSet( "特殊召喚カウント", 1 )
		end
	end

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("E003", "MID_ED1")
	PuppetDemo("E003", "MID_ED2")
	PuppetDemo("E003", "MID_ED3")

end

function GameOver()

	Log("GameOver");

end
