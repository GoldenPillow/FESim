Include("Common")
Include("Common_E")

g_pid_boss = "PID_E002_Boss"
g_pid_hide = "PID_E002_Hide"

function Startup()

	Log("Startup");
	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_E002_WIN" )
	LoseRuleSetMID( "MID_RULE_DLC_LOSE" )

	_u30a4_30d9_30f3_30c8_767b_9332()
	_u30d5_30e9_30b0_767b_9332()
end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "セリーヌアクティブ_済", 0 )
	VariableEntry( "アルフレッドアクティブ_済", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( GodSaveEquipE,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )
	EventEntryTurn( Turn1Enemy,	1,  1, FORCE_ENEMY )

	EventEntryPickup( _u30a2_30eb_30d5_30ec_30c3_30c9_30a2_30af_30c6_30a3_30d6,	g_pid_boss,  "アルフレッドアクティブ_済" )
	EventEntryPickup( _u30bb_30ea_30fc_30cc_30a2_30af_30c6_30a3_30d6,	g_pid_hide,  "セリーヌアクティブ_済" )

	if DifficultyGet() ~= DIFFICULTY_NORMAL then
		EventEntryTurn(_u5897_63f4_5de6_4e0a,  3, 3, FORCE_PLAYER)
	end
	EventEntryTurn(_u5897_63f4_5de6_4e0a,  4, 4, FORCE_PLAYER)

	if DifficultyGet() ~= DIFFICULTY_NORMAL then
		EventEntryTurn(_u5897_63f4_4e0b,  6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a,  7, 7, FORCE_PLAYER)
	end

	EventEntryTurn(_u5897_63f4_4e0b,  8, 8, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_4e0a,  9, 9, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4_53f3_ff11, 10, 10, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_53f3_ff12, 11, 11, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_アルフレッド", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_アルフレッド_済", "MID_BT5");
	EventEntryBattleTalk(Talk, "PID_セリーヌ", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_セリーヌ_済", "MID_BT6");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_リュール_済", "MID_BT7");
	EventEntryBattleTalk(Talk, "PID_ブシュロン", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_ブシュロン_済", "MID_BT8");
	EventEntryBattleTalk(Talk, "PID_エーティエ", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_エーティエ_済", "MID_BT9");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT1");
	EventEntryDie(Talk, g_pid_boss, FORCE_ENEMY, condition_true, "MID_BT2");

	EventEntryBattleTalk(Talk, "PID_セリーヌ", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_セリーヌ_済", "MID_BT10");
	EventEntryBattleTalk(Talk, "PID_アルフレッド", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_アルフレッド_済", "MID_BT11");
	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_リュール_済", "MID_BT12");
	EventEntryBattleTalk(Talk, "PID_ルイ", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_ルイ_済", "MID_BT13");
	EventEntryBattleTalk(Talk, "PID_クロエ", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_クロエ_済", "MID_BT14");
	EventEntryBattleTalk(Talk, "PID_エーティエ", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_エーティエ_済", "MID_BT15");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide, FORCE_ENEMY, true, "戦闘前会話_裏_済", "MID_BT3");
	EventEntryDie(Talk, g_pid_hide, FORCE_ENEMY, condition_true, "MID_BT4");

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 17,  5, "IID_リブロー")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 14, 20, "IID_ナイトキラー")

	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E002_イル", FORCE_PLAYER, FORCE_ALL )
	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E002_エル", FORCE_PLAYER, FORCE_ALL )

end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	PlayChapterTitle("E002")
	Yield()
	FadeOut(0)

	Movie("Narration02")
	SkipEscape()

	PuppetDemo("E002", "MID_OP2")
	PuppetDemo("E002", "MID_OP3")

	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()

end

function MapOpening()

	Log("MapOpening");

	GodLoadEquipE()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( "E002" )

end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	CursorSetPos( 25, 10 )
	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )
	MapCameraWait()

	local x = UnitGetX( g_pid_boss )
	local z = UnitGetZ( g_pid_boss )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)

	x = UnitGetX( g_pid_hide )
	z = UnitGetZ( g_pid_hide )
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)

	WaitTime( 2.0 )

	Talk( "MID_EV1" )
	WinRule()

	MapObjectDelete( "Eff_Cursor01" )
	MapObjectDelete( "Eff_Cursor02" )

end
function Turn1Enemy()

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()
	Talk( "MID_EV2" )
end

function _u30a2_30eb_30d5_30ec_30c3_30c9_30a2_30af_30c6_30a3_30d6()
	if UnitExistOnMap( g_pid_boss ) then
		if AiGetActive( g_pid_boss ) == true then
			CursorSetPos_FromPid(g_pid_boss)
			MapCameraWait()
			Talk( "MID_EV4" )
			VariableSet( "アルフレッドアクティブ_済", 1 )
		end
	end
end

function _u30bb_30ea_30fc_30cc_30a2_30af_30c6_30a3_30d6()
	if UnitExistOnMap( g_pid_hide ) then
		if AiGetActive( g_pid_hide ) == true then
			CursorSetPos_FromPid(g_pid_hide)
			MapCameraWait()
			Talk( "MID_EV3" )
			VariableSet( "セリーヌアクティブ_済", 1 )
		end
	end
end

function _u5473_65b9_6b7b_4ea1()
	VariableSet( "敗北", 1 )
end

function _u5897_63f4_4e0b()
	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_53f3_ff11()
	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_53f3_ff12()
	Dispos("Enemy_Reinforcement2_2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_5de6_4e0a()
	Dispos("Enemy_Reinforcement3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_4e0a()
	Dispos("Enemy_Reinforcement4", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("E002", "MID_ED1")
	PuppetDemo("E002", "MID_ED2")
	PuppetDemo("E002", "MID_ED3")

end

function GameOver()

	Log("GameOver");

end
