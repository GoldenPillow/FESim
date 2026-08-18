Include("Common")
Include("Common_E")

g_pid_boss = "PID_E004_Boss"
g_pid_hide = "PID_E004_Hide"

g_animSetBtlOrg = "オリジナルの戦闘アニメ設定"
g_animSetRodOrg = "オリジナルの杖アニメ設定"
g_StartupFirstTime = "初回スタートアップ"
g_battleStart = "進撃開始"

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_E004_WIN" )
	LoseRuleSetMID( "MID_RULE_DLC_LOSE" )

	_u30a4_30d9_30f3_30c8_767b_9332()
	_u30d5_30e9_30b0_767b_9332()

	if VariableGet( g_StartupFirstTime ) == 1 then

		local config_org = ConfigGetBattleScene()
		if config_org == CONFIG_ANIM_ON then
			VariableSet( g_animSetBtlOrg, config_org )
			ConfigSetBattleScene( CONFIG_ANIM_PLAYER_UNIT )
		end

		local config_org2 = ConfigGetSupportScene()
		if config_org2 == CONFIG_ANIM_ON then
			VariableSet( g_animSetRodOrg, config_org2 )
			ConfigSetSupportScene( CONFIG_ANIM_PLAYER_UNIT )
		end

		VariableSet( g_StartupFirstTime, 0 )
	end
end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "殺害数カウント", 0 )
	VariableEntry( g_animSetBtlOrg, -1 )
	VariableEntry( g_animSetRodOrg, -1 )
	VariableEntry( g_StartupFirstTime, 1 )
	VariableEntry( g_battleStart, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( GodSaveEquipE,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )

		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff11,  2, 2, FORCE_PLAYER)
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff12,  3, 3, FORCE_PLAYER)
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff11,  4, 4, FORCE_PLAYER)
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff11,  6, 6, FORCE_PLAYER)
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff12,  7, 7, FORCE_PLAYER)

		EventEntryTurn(_u30a2_30a4_30d3_30fc_5897_63f4_547c_3073_306b_884c_304f,  3, 3, FORCE_PLAYER)
		EventEntryTurn(_u8d64_5897_63f4_7279_5225,  5, 5, FORCE_PLAYER)
		EventEntryTurn(_u30a2_30a4_30d3_30fc_30d7_30ec_30a4_30e4_30fc_3078,  8, 8, FORCE_PLAYER)

		EventEntryTurn(_u8d64_5897_63f4_5de6_4e2d,  7, 7, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_LUNATIC then
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff11,  7, 7, FORCE_PLAYER)
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0a_ff12,  8, 8, FORCE_PLAYER)

	end

	if DifficultyGet() ~= DIFFICULTY_NORMAL then
		EventEntryTurn(_u8d64_5897_63f4_5de6_4e0b,  8, 10, FORCE_PLAYER)
	end

		EventEntryTurn(_u30df_30b9_30c6_30a3_30e9_9032_8ecd_958b_59cb,  4, 4, FORCE_PLAYER)

		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0a_ff12,  3, 3, FORCE_PLAYER)
		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0a_ff11,  4, 4, FORCE_PLAYER)
		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0b  ,  4, 4, FORCE_PLAYER)
		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0a_ff12,  5, 5, FORCE_PLAYER)
		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0a_ff11,  6, 6, FORCE_PLAYER)

		EventEntryTurn(_u30df_30b9_30c6_30a3_30e9_30d7_30ec_30a4_30e4_30fc_3078,  6, 6, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_LUNATIC then

		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0b  ,  2, 2, FORCE_PLAYER)

		EventEntryTurn(_u9ec4_5897_63f4_53f3_4e0b  ,  8, 8, FORCE_PLAYER)
	end

	if DifficultyGet() ~= DIFFICULTY_NORMAL then
		EventEntryTurn(_u9ec4_5897_63f4_4e0a,  8, 10, FORCE_PLAYER)
	end

	EventEntryBattleTalk(Talk, "PID_ミスティラ", FORCE_PLAYER, g_pid_hide, FORCE_ALLY, true, "戦闘前会話_裏_ミスティラ_済", "MID_BT11");
	EventEntryBattleTalk(Talk, "PID_フォガート", FORCE_PLAYER, g_pid_hide, FORCE_ALLY, true, "戦闘前会話_裏_フォガート_済", "MID_BT12");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_hide, FORCE_ALLY, true, "戦闘前会話_裏_リュール_済", "MID_BT13");
	EventEntryBattleTalk(Talk, "PID_メリン", FORCE_PLAYER, g_pid_hide, FORCE_ALLY, true, "戦闘前会話_裏_メリン_済", "MID_BT14");
	EventEntryBattleTalk(Talk, "PID_パネトネ", FORCE_PLAYER, g_pid_hide, FORCE_ALLY, true, "戦闘前会話_裏_パネトネ_済", "MID_BT15");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide, FORCE_ALLY, true, "戦闘前会話_裏_済", "MID_BT3");
	EventEntryDie(Talk, g_pid_hide, FORCE_ALLY, condition_true, "MID_BT4");

	EventEntryBattleTalk(Talk, "PID_アイビー", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_アイビー_済", "MID_BT5");
	EventEntryBattleTalk(Talk, "PID_オルテンシア", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_オルテンシア_済", "MID_BT6");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_リュール_済", "MID_BT7");
	EventEntryBattleTalk(Talk, "PID_ゼルコバ", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_ゼルコバ_済", "MID_BT8");
	EventEntryBattleTalk(Talk, "PID_カゲツ", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_カゲツ_済", "MID_BT9");
	EventEntryBattleTalk(Talk, "PID_リンデン", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_リンデン_済", "MID_BT10");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT1");
	EventEntryDie(Talk, g_pid_boss, FORCE_ENEMY, condition_true, "MID_BT2");

	EventEntryDie(_u6b7b_4ea1_6570_30ab_30a6_30f3_30c8, "", FORCE_ENEMY, condition_true)
	EventEntryDie(_u6b7b_4ea1_6570_30ab_30a6_30f3_30c8, "", FORCE_ALLY, condition_true)

	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E004_イル", FORCE_PLAYER, FORCE_ALL )
	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E004_エル", FORCE_PLAYER, FORCE_ALL )

end

function Cleanup()

	Log("Cleanup");

	local changeBtl = false
	local config_org = VariableGet( g_animSetBtlOrg )
	if ( config_org ~= -1 ) and ( ConfigGetBattleScene() == CONFIG_ANIM_PLAYER_UNIT ) then
		changeBtl = true
	end

	local changeRod = false
	local config_org2 = VariableGet( g_animSetRodOrg )
	if ( config_org2 ~= -1 ) and ( ConfigGetSupportScene() == CONFIG_ANIM_PLAYER_UNIT ) then
		changeRod = 1
	end

	if ( VariableGet( g_battleStart ) == 0 ) and ( changeBtl or changeRod ) then
		Dialog( "MID_TUT_NAVI_E004_ADVICE_END" )
		if changeBtl then
			ConfigSetBattleScene( config_org )
		end
		if changeRod then
			ConfigSetSupportScene( config_org2 )
		end
	end

end

function Opening()

	Log("Opening");

	PlayChapterTitle("E004")
	Yield()
	FadeOut(0)

	Movie("Narration04")
	SkipEscape()

	PuppetDemo("E004", "MID_OP2")
	PuppetDemo("E004", "MID_OP3")
	PuppetDemo("E004", "MID_OP4")

	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()
end

function MapOpening()

	Log("MapOpening");

	if ( VariableGet( g_animSetBtlOrg ) ~= -1 ) or ( VariableGet( g_animSetRodOrg ) ~= -1 ) then
		Dialog( "MID_TUT_NAVI_E004_ADVICE_START" )
	end

	GodLoadEquipE()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( "E004" )

end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	VariableSet( g_battleStart, 1 )

	CursorSetPos_FromPid( "PID_E004_エル" )

	Talk( "MID_EV1" )

	Tutorial( "TUTID_混戦" )

	CursorSetPos_FromPid( g_pid_boss )

	local x = UnitGetX( g_pid_boss )
	local z = UnitGetZ( g_pid_boss )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)
	WaitTime( 2.0 )

	CursorSetPos_FromPid( g_pid_hide )

	x = UnitGetX( g_pid_hide )
	z = UnitGetZ( g_pid_hide )
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)
	WaitTime( 2.0 )

	CursorSetPos_FromPid( "PID_リュール" )

	WinRule()

	MapObjectDelete( "Eff_Cursor01" )
	MapObjectDelete( "Eff_Cursor02" )

end

function _u5473_65b9_6b7b_4ea1()
	VariableSet( "敗北", 1 )
end

function condition_true()
	do return true end
end

function _u6b7b_4ea1_6570_30ab_30a6_30f3_30c8()

	if MindGetForce() == FORCE_PLAYER then
		VariableInc("殺害数カウント", 0, 30)

	else
		local target = MindGetTargetUnit()
		if target ~= nil then
			if UnitGetForce( target ) == FORCE_PLAYER then
				VariableInc("殺害数カウント", 0, 30)

			end

		end

	end
end

function _u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(unit)
	if UnitExistOnMap( unit ) then
		UnitClearStatus(unit, UNIT_STATUS_MOVE_NOT_ALLOW)
	end
end

function _u30a2_30a4_30d3_30fc_5897_63f4_547c_3073_306b_884c_304f()
	if UnitExistOnMap("PID_E004_Boss") then
		local pid = "PID_E004_Boss"
		Talk( "MID_EV2" )
		UnitClearStatus(pid, UNIT_STATUS_MOVE_NOT_ALLOW)

		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 1,16 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 1,12 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 1,14 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 2,15 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 3,14 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 3,12 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 2,13 ))
	end
end

function _u8d64_5897_63f4_7279_5225()
	local pid = "PID_E004_Boss"
	if UnitExistOnMap("PID_E004_Boss") then

		if DifficultyGet() == DIFFICULTY_LUNATIC then
			AiSetSequence(pid, AI_ORDER_ATTACK, "AI_AT_EngageAttack","1,1")
			AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_Hero", "")
		else
			AiSetSequence(pid, AI_ORDER_ATTACK, "AI_AT_EngageAttack","2,2")
			AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_WeakEnemy", "")
		end

		Talk( "MID_EV4" )
		Dispos("Enemy_ReinforcementRS", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u30df_30b9_30c6_30a3_30e9_9032_8ecd_958b_59cb()
	if UnitExistOnMap("PID_E004_Hide") then
		if UnitExistOnMap("PID_E004_Boss") then
			Talk( "MID_EV3" )
		end

		UnitClearStatus("PID_E004_Hide", UNIT_STATUS_MOVE_NOT_ALLOW)

		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 29,20 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 30,20 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 30,21 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 30,18 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 29,18 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 29,19 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 28,19 ))
		_u7121_79fb_52d5_30d5_30e9_30b0_6d88_3059(UnitGetByPos( 30,17 ))

	end

end

function _u30df_30b9_30c6_30a3_30e9_30d7_30ec_30a4_30e4_30fc_3078()
	if UnitExistOnMap("PID_E004_Hide") then

		AiSetSequence("PID_E004_Hide", AI_ORDER_MOVE, "AI_MV_Force", "FORCE_PLAYER")
		AiSetSequence("PID_E004_Hide", AI_ORDER_ATTACK, "AI_AT_Force", "FORCE_PLAYER")
	end
end

function _u30a2_30a4_30d3_30fc_30d7_30ec_30a4_30e4_30fc_3078()
	if UnitExistOnMap("PID_E004_Boss") then
		AiSetSequence("PID_E004_Boss", AI_ORDER_MOVE, "AI_MV_Person", "PID_リュール")
	end
end

function _u8d64_5897_63f4_5de6_4e0a_ff11()
	if UnitExistOnMap("PID_E004_Boss") then
		Dispos("Enemy_ReinforcementR1", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u8d64_5897_63f4_5de6_4e0a_ff12()
	if UnitExistOnMap("PID_E004_Boss") then
		Dispos("Enemy_ReinforcementR2", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u8d64_5897_63f4_5de6_4e2d()
	if UnitExistOnMap("PID_E004_Boss") then
		Dispos("Enemy_ReinforcementR3", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u8d64_5897_63f4_5de6_4e0b()
	if UnitExistOnMap("PID_E004_Boss") then
		Dispos("Enemy_ReinforcementR4", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u9ec4_5897_63f4_53f3_4e0b()
	if UnitExistOnMap("PID_E004_Hide") then
		Dispos("Enemy_ReinforcementY1", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u9ec4_5897_63f4_53f3_4e0a_ff11()
	if UnitExistOnMap("PID_E004_Hide") then
		Dispos("Enemy_ReinforcementY2", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u9ec4_5897_63f4_53f3_4e0a_ff12()
	if UnitExistOnMap("PID_E004_Hide") then
		Dispos("Enemy_ReinforcementY3", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function _u9ec4_5897_63f4_4e0a()
	if UnitExistOnMap("PID_E004_Hide") then
		Dispos("Enemy_ReinforcementY4", DISPOS_FLAG_FOCUS)
		Yield()
		WaitTime(0.5)
	end
end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	if VariableGet( "殺害数カウント" ) >= 30 then
		VariableSet( "G_実績_E004勝利回数達成", 1 )

	end

	Log("Ending");

	PuppetDemo("E004", "MID_ED1")
	PuppetDemo("E004", "MID_ED2")
	PuppetDemo("E004", "MID_ED3")
	PuppetDemo("E004", "MID_ED4")

	local change = 0
	local config_org = VariableGet( g_animSetBtlOrg )

	if ( config_org ~= -1 ) and ( ConfigGetBattleScene() == CONFIG_ANIM_PLAYER_UNIT ) then
		ConfigSetBattleScene( config_org )
		change = 1
	end

	local config_org2 = VariableGet( g_animSetRodOrg )
	if ( config_org2 ~= -1 ) and ( ConfigGetSupportScene() == CONFIG_ANIM_PLAYER_UNIT ) then
		ConfigSetSupportScene( config_org2 )
		change = 1
	end

	if change == 1 then
		Dialog( "MID_TUT_NAVI_E004_ADVICE_END" )
		VariableSet( g_animSetBtlOrg, -1 )
		VariableSet( g_animSetRodOrg, -1 )
	end

end

function GameOver()

	Log("GameOver");

end
