Include("Common")
g_pid_lueur = "PID_リュール"

g_key_trsr_active			= "エリアイベント_宝物庫前全アクティブ化_済"
g_key_pltn4_active			= "エリアイベント_ボス部屋手前全アクティブ化_済"

g_key_pltn4_action			= "小隊４_行動開始_済"
g_key_reinforcementCounter	= "増援出現カウンター"
g_key_reinforcement_appear	= "増援出現_済"
g_Key_bossActive_Lunatic	= "ボス行動開始"

g_key_destroyWall			= "壁破壊_済"

g_key_tutorial_hpstock = "チュートリアル_ＨＰストック_済"
g_key_tutorial_hpstock_permission = "チュートリアル_ＨＰストック_再生許可"

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_M005_WIN" )

	_u30a4_30d9_30f3_30c8_767b_9332()
	_u5909_6570_767b_9332()

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u52dd_5229_6761_4ef6___6575_5c06_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER, condition_true, "PID_M005_Irc_ボス" )

	EventEntryTurnAfter(_u6249_30c1_30e5_30fc_30c8_30ea_30a2_30eb, 1, 1, FORCE_PLAYER)

	EventEntryTurn(_u76d7_8cca___884c_52d5_958b_59cb, 1, 1, FORCE_ENEMY)

	EventEntryTurn(_u5b9d_7269_5eab_524d_A_I_5909_66f4___30bd_30fc_30c9_30d5_30a1_30a4_30bf_30fc_505c_6b62, 4, 4, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30ce_30fc_30de_30eb_304b)
	EventEntryTurn(_u5b9d_7269_5eab_524d_A_I_5909_66f4___30bd_30fc_30c9_30d5_30a1_30a4_30bf_30fc_505c_6b62, 3, 3, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30ce_30fc_30de_30eb_4ee5_4e0a_304b)

	EventEntryTurn(_u5b9d_7269_5eab_524d_A_I_5909_66f4___5168_30a2_30af_30c6_30a3_30d6_5316, 5, 5, FORCE_ENEMY)

	EventEntryArea(_u30a8_30ea_30a2___5b9d_7269_5eab_9032_5165, 1, 14, 5, 25, FORCE_PLAYER, g_key_trsr_active)

	EventEntryTurnEnd( VariableSet, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30dc_30b9_884c_52d5_958b_59cb, g_Key_bossActive_Lunatic, 1 )

	EventEntryArea(_u30dc_30b9_90e8_5c4b_624b_524d_5c0f_968a_30a2_30af_30c6_30a3_30d6_5316, 8, 12, 18, 25, FORCE_PLAYER, g_key_pltn4_active)

	EventEntryTurn(_u5897_63f4_51fa_73fe, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_51fa_73fe)

	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M005_Irc_pltn4_ランスアーマー",		FORCE_ENEMY, true, g_key_pltn4_action)
	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M005_Irc_pltn4_アクスファイター",		FORCE_ENEMY, true, g_key_pltn4_action)
	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M005_Irc_pltn4_アーチャー",			FORCE_ENEMY, true, g_key_pltn4_action)
	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M005_Irc_pltn4_マージ",				FORCE_ENEMY, true, g_key_pltn4_action)

	EventEntryBattleAfter( VariableSet, "", FORCE_PLAYER, "PID_M005_Irc_ボス", FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___ff28_ff30_30b9_30c8_30c3_30af___518d_751f_8a31_53ef, g_key_tutorial_hpstock_permission, 1 )
	EventEntryFixed( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___ff28_ff30_30b9_30c8_30c3_30af, "", FORCE_ALL, _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___ff28_ff30_30b9_30c8_30c3_30af )

	EventEntryBattleTalk(Talk, g_pid_lueur,			FORCE_PLAYER, "PID_M005_Irc_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_リュール_済", 		"MID_BT4")
	EventEntryBattleTalk(Talk, "PID_アルフレッド",	FORCE_PLAYER, "PID_M005_Irc_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_アルフレッド_済", 	"MID_BT2")
	EventEntryBattleTalk(Talk, "PID_セリーヌ",		FORCE_PLAYER, "PID_M005_Irc_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_セリーヌ_済", 		"MID_BT3")
	EventEntryBattleTalk(Talk, "",					FORCE_PLAYER, "PID_M005_Irc_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_済", 				"MID_BT1")
	EventEntryDie(Talk, "PID_M005_Irc_ボス", FORCE_ENEMY, condition_true, "MID_BT5")

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 2, 23, "IID_アーマーキラー")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 4, 24, "IID_アイスロック")

	EventEntryDestroy(_u7389_5ea7_5de6_58c1_7834_58ca, 6, 20, 7, 21)

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___ff28_ff30_30b9_30c8_30c3_30af___518d_751f_8a31_53ef()
	if VariableGet( g_key_tutorial_hpstock ) == 1 then
		do return false end
	end

	if VariableGet( g_key_tutorial_hpstock_permission ) == 0 then
		do return true end
	end

	do return false end
end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___ff28_ff30_30b9_30c8_30c3_30af()
	if VariableGet( g_key_tutorial_hpstock ) == 1 then
		do return false end
	end

	if VariableGet( g_key_tutorial_hpstock_permission ) == 1 then
		do return true end
	end

	do return false end
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___ff28_ff30_30b9_30c8_30c3_30af()

	Talk( "MID_EV5" )

	Tutorial( "TUTID_HPストック" )

	VariableSet( g_key_tutorial_hpstock, 1 )
end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_reinforcement_appear, 0 )

	if _u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb() or _u30e2_30fc_30c9_306f_30cf_30fc_30c9() then
		VariableEntry( g_key_reinforcementCounter, 2 )
	else
		VariableEntry( g_key_reinforcementCounter, 1 )
	end

	VariableEntry( g_key_tutorial_hpstock, 0 )
	VariableEntry( g_key_tutorial_hpstock_permission, 0 )
	VariableEntry( g_Key_bossActive_Lunatic, 0 )
	VariableEntry( g_key_destroyWall, 0 )

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M005", "MID_OP1")

	Movie("Scene08")
	SkipEscape()

	PuppetDemo("M005", "MID_OP3")
	PuppetDemo("M005", "MID_OP4")

end

function MapOpening()

	Log("MapOpening")

	Talk("MID_OP5")

	CursorSetPos(13, 24)
	MapCameraWait()

	Talk("MID_OP6")

	UnitMovePos("PID_セピア",	13, 25, MOVE_FLAG_ESCAPE)
	UnitMoveWait()
	if UnitExistOnMap("PID_セピア") then
		UnitDelete("PID_セピア")
	end

	WaitTime(0.5)

	UnitMovePos("PID_M005_Irc_ボス", 13, 24)
	UnitMovePosFromPos(11, 25, 12, 24)
	UnitMovePosFromPos(15, 25, 14, 24)
	UnitMoveWait()

	UnitRotation("PID_M005_Irc_ボス", ROTATE_DOWN)
	UnitRotation(UnitGetByPos(12, 24), ROTATE_DOWN)
	UnitRotation(UnitGetByPos(14, 24), ROTATE_DOWN)
	UnitMoveWait()

	WaitTime(0.5)

	CursorSetPos_FromPid( g_pid_lueur )

end

function _u6249_30c1_30e5_30fc_30c8_30ea_30a2_30eb()

	MapCameraWait()

	CursorSetPos(13, 11)
	MapCameraWait()

	CursorAnimeCreate( 12, 11, "W3H1" )
	Talk( "MID_EV1" )
	CursorAnimeDelete()

	Tutorial( "TUTID_扉" )

end

function _uc_o_n_d_i_t_i_o_n___30ce_30fc_30de_30eb_304b()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		do return true end
	end

	do return false end

end

function _uc_o_n_d_i_t_i_o_n___30ce_30fc_30de_30eb_4ee5_4e0a_304b()

	if DifficultyGet() > DIFFICULTY_NORMAL then
		do return true end
	end

	do return false end

end

function _u76d7_8cca___884c_52d5_958b_59cb()

	if not UnitExistOnMap( "PID_M005_シーフ" ) then
		do return end
	end

	CursorSetPos(3, 23)
	MapCameraWait()

	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 2, 23)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 4, 24)
	WaitTime( 2.0 )
	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")

	CursorSetPos_FromPid( "PID_M005_シーフ" )
	Talk("MID_EV2")

	CursorSetPos_FromPid( g_pid_lueur )
	Talk("MID_EV3")

	Tutorial( "TUTID_宝箱" )

end

function _u30a8_30ea_30a2___5b9d_7269_5eab_9032_5165()

	if VariableGet( "破壊_6_20" ) == 0 then

		CursorSetPos(6, 21)
		MapCameraWait()

		MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 6, 20)
		MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 6, 21)
		MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 7, 20)
		MapObjectCreate("Eff_Cursor04", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 7, 21)
		WaitTime( 2.0 )
		MapObjectDelete("Eff_Cursor01")
		MapObjectDelete("Eff_Cursor02")
		MapObjectDelete("Eff_Cursor03")
		MapObjectDelete("Eff_Cursor04")

		CursorSetPos_FromPid( g_pid_lueur )
		Talk( "MID_EV4" )

		Tutorial( "TUTID_地形破壊" )

	end

	_u5b9d_7269_5eab_524d_A_I_5909_66f4___5168_30a2_30af_30c6_30a3_30d6_5316()

end

function _u5b9d_7269_5eab_524d_A_I_5909_66f4___30bd_30fc_30c9_30d5_30a1_30a4_30bf_30fc_505c_6b62()

	local pid = "PID_M005_Irc_trsr_ソードファイター"
	if UnitExistOnMap( pid ) then

		local value = VariableGet( g_key_trsr_active )
		if value == 0 then

			_u5b9d_7269_5eab_524d_30bd_30fc_30c9_30d5_30a1_30a4_30bf_30fc_A_I_5909_66f4()

			AiSetActiveAll(FORCE_ENEMY, pid, false)

		end

	end
end

function _u5b9d_7269_5eab_524d_A_I_5909_66f4___5168_30a2_30af_30c6_30a3_30d6_5316()

	local pid = "PID_M005_Irc_trsr_ランスアーマー"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

	pid = "PID_M005_Irc_trsr_アクスファイター"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

	pid = "PID_M005_Irc_trsr_ソードファイター"
	if UnitExistOnMap( pid ) then
		_u5b9d_7269_5eab_524d_30bd_30fc_30c9_30d5_30a1_30a4_30bf_30fc_A_I_5909_66f4()
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

	pid = "PID_M005_Irc_trsr_アーチャー"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

end

function _u5b9d_7269_5eab_524d_30bd_30fc_30c9_30d5_30a1_30a4_30bf_30fc_A_I_5909_66f4()
	pid = "PID_M005_Irc_trsr_ソードファイター"
	if UnitExistOnMap( pid ) then
		AiSetSequence(pid, AI_ORDER_CAUSE, "AI_AC_TurnAttackRange", "5")
		AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_WeakEnemy")
	end
end

function _u7389_5ea7_5de6_58c1_7834_58ca()

	_u30dc_30b9_90e8_5c4b_624b_524d_5c0f_968a_30a2_30af_30c6_30a3_30d6_5316()

	VariableSet( g_key_destroyWall, 1 )
end

function _u30dc_30b9_90e8_5c4b_624b_524d_5c0f_968a_30a2_30af_30c6_30a3_30d6_5316()

	local pid = "PID_M005_Irc_pltn4_ランスアーマー"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

	pid = "PID_M005_Irc_pltn4_アクスファイター"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

	pid = "PID_M005_Irc_pltn4_アーチャー"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

	pid = "PID_M005_Irc_pltn4_マージ"
	if UnitExistOnMap( pid ) then
		AiSetActiveAll(FORCE_ENEMY, pid, true)
	end

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_51fa_73fe()

	local value = VariableGet( g_key_reinforcement_appear )
	if value == 1 then
		do return false end
	end

	if ( VariableGet( g_key_pltn4_action ) == 0 ) and ( VariableGet( g_key_destroyWall ) == 0 ) then
		do return false end
	end

	value = VariableGet( g_key_reinforcementCounter )
	value = value - 1
	VariableSet( g_key_reinforcementCounter, value )

	if value == 0 then
		do return true end
	else
		do return false end
	end

end

function _u5897_63f4_51fa_73fe()

	Dispos( "Reinforcement1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement0", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_reinforcement_appear, 1 )

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___30dc_30b9_884c_52d5_958b_59cb()

	if not _u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af() then
		do return false end
	end

	if VariableGet( g_Key_bossActive_Lunatic ) == 1 then
		do return false end
	end

	local unit = ForceUnitGetFirst(FORCE_ENEMY)
	while unit ~= nil do

		if ( AiGetBandNo( unit ) == 1 ) and AiGetActive( unit ) then
			do return true end
		end

		unit = ForceUnitGetNext(unit)
	end

	do return false end

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
