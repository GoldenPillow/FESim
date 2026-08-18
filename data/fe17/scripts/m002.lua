Include("Common")

g_pid_lueur						= "PID_リュール"
g_pid_rumiere					= "PID_M002_ルミエル"

g_key_tutorial_break			= "チュートリアル_ブレイク_済"
g_key_die_axefighter			= "アクスファイター_イベント_撃破_済"
g_key_battled_axefighter		= "アクスファイター戦闘後_済"
g_key_rumiere_run				= "ルミエル行動開始_済"
g_key_rumiere_Defeat1st			= "ルミエル撃破一回目_済"

g_key_tutorial_monk				= "チュートリアル_モンク_済"
g_key_tutorial_magic			= "チュートリアル_魔法_済"
g_key_tutorial_attackRange		= "チュートリアル_危険範囲_済"

g_key_battleTalk_lueur1			= "戦闘前会話_リュール_前半戦_済"
g_key_battleTalk_lueur2			= "戦闘前会話_リュール_後半戦_済"
g_key_battleTalk_clan			= "戦闘前会話_クラン_ルミエル_済"
g_key_battleTalk_fran			= "戦闘前会話_フラン_ルミエル_済"
g_key_battleTalk_vandre			= "戦闘前会話_ヴァンドレ_ルミエル_済"
g_key_battled_vandre2			= "ヴァンドレと戦闘_後半戦_済"

g_key_battleAfter_rumiere		= "ルミエルから攻撃後死亡_済"
g_key_enemyDelete				= "残った敵の削除_済"
g_key_end_battle1				= "一回戦終了"
g_key_start_battle2				= "二回戦開始"
g_key_tutorial_emblemPowerSpot	= "チュートリアル_紋章氣マス_済"
g_key_rumiere_runned			= "ルミエル出撃イベント_済"
g_key_rumiere_fixed				= "ルミエル待機後イベント_済"
g_key_rumiere_defeat			= "撃破会話_ルミエル_済"

function Startup()

	Log("Startup")

	VariableSet( "禁止_輸送隊", 2 )
	VariableSet( "禁止_チェインアタック", 1 )

	WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
	WinRuleSetMID( "MID_RULE_M002_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry( g_key_tutorial_break,			0 )
	VariableEntry( g_key_die_axefighter,			0 )
	VariableEntry( g_key_battled_axefighter,		0 )
	VariableEntry( g_key_rumiere_run,				0 )
	VariableEntry( g_key_rumiere_Defeat1st,			0 )

	VariableEntry( g_key_tutorial_monk,				0 )
	VariableEntry( g_key_tutorial_magic,			0 )
	VariableEntry( g_key_tutorial_attackRange,		0 )

	VariableEntry( g_key_battleTalk_lueur1,			0 )
	VariableEntry( g_key_battleTalk_lueur2,			0 )
	VariableEntry( g_key_battleTalk_clan,			0 )
	VariableEntry( g_key_battleTalk_fran,			0 )
	VariableEntry( g_key_battleTalk_vandre,			0 )
	VariableEntry( g_key_battled_vandre2,			0 )

	VariableEntry( g_key_battleAfter_rumiere,		0 )
	VariableEntry( g_key_enemyDelete,				0 )
	VariableEntry( g_key_end_battle1,				0 )
	VariableEntry( g_key_start_battle2,				0 )

	VariableEntry( g_key_tutorial_emblemPowerSpot,	0 )

	VariableEntry( g_key_rumiere_runned,			0 )
	VariableEntry( g_key_rumiere_fixed,				0 )
	VariableEntry( g_key_rumiere_defeat,			0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u30a8_30f3_30b2_30fc_30b8_30ab_30a6_30f3_30c8_4e0a_66f8_304d, 1, 1, FORCE_PLAYER)

	EventEntryTurnAfter(_u30bf_30fc_30f3_5f8c___5c04_7a0b_30c1_30e5_30fc_30c8_30ea_30a2_30eb, 1, 1, FORCE_PLAYER)

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30d6_30ec_30a4_30af,	"",				_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30d6_30ec_30a4_30af	)
	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30e2_30f3_30af,		"PID_フラン",	g_key_tutorial_monk)
	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___9b54_6cd5,		"PID_クラン",	g_key_tutorial_magic)

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___5371_967a_7bc4_56f2,	"",				_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___5371_967a_7bc4_56f2	)

	EventEntryDie(EmptyFunction, "PID_M002_幻影兵_アクスファイター_イベント", FORCE_ENEMY, g_key_die_axefighter)
	EventEntryBattleAfter(_u30a2_30af_30b9_30d5_30a1_30a4_30bf_30fc_6226_95d8_5f8c, g_pid_lueur, FORCE_PLAYER, "PID_M002_幻影兵_アクスファイター_イベント", FORCE_ENEMY, false, _uc_o_n_d_i_t_i_o_n___30a2_30af_30b9_30d5_30a1_30a4_30bf_30fc_6226_95d8_5f8c)

	EventEntryTurn(_u30eb_30df_30a8_30eb_79fb_52d5_7981_6b62_89e3_9664, 2, 2, FORCE_PLAYER)
	EventEntryTurnAfter(_u30eb_30df_30a8_30eb_884c_52d5_958b_59cb, 2, 2, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_884c_52d5_958b_59cb)

	EventEntryDie(VariableSet, g_pid_rumiere, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_6483_7834_4e00_56de_76ee, g_key_rumiere_Defeat1st, 1)

	EventEntryBattleAfter(_u30eb_30df_30a8_30eb_304b_3089_653b_6483_5f8c_6b7b_4ea1, g_pid_rumiere, FORCE_ENEMY, "", FORCE_PLAYER, false, _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_304b_3089_653b_6483_5f8c_6b7b_4ea1)
	EventEntryTurnEnd(_u4e00_56de_6226_7d42_4e86_304b_3089_4e8c_56de_6226_958b_59cb, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___4e00_56de_6226_7d42_4e86)

	EventEntryFixed(_u4e00_56de_6226_7d42_4e86, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___4e00_56de_6226_7d42_4e86)
	EventEntryTurn(_u4e8c_56de_6226_958b_59cb, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___4e8c_56de_6226_958b_59cb)

	EventEntryTurnAfter(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_6c23_30de_30b9, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_6c23_30de_30b9)

	EventEntryTurnAfter(_u30eb_30df_30a8_30eb_51fa_6483_30a4_30d9_30f3_30c8, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_51fa_6483_30a4_30d9_30f3_30c8)
	EventEntryFixed(_u30eb_30df_30a8_30eb_5f85_6a5f_5f8c_30a4_30d9_30f3_30c8, g_pid_rumiere, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_5f85_6a5f_5f8c_30a4_30d9_30f3_30c8)

	EventEntryBattleTalk(_u6226_95d8_524d_30a4_30d9_30f3_30c8___30ea_30e5_30fc_30eb,	g_pid_lueur,		FORCE_PLAYER,	g_pid_rumiere, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_30a4_30d9_30f3_30c8___30ea_30e5_30fc_30eb)
	EventEntryBattleTalk(_u6226_95d8_524d_30a4_30d9_30f3_30c8___30f4_30a1_30f3_30c9_30ec,	"PID_ヴァンドレ",	FORCE_PLAYER,	g_pid_rumiere, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_30a4_30d9_30f3_30c8___30f4_30a1_30f3_30c9_30ec)
	EventEntryBattleTalk(Talk,						"PID_クラン",		FORCE_PLAYER,	g_pid_rumiere, FORCE_ENEMY, true, g_key_battleTalk_clan, "MID_BT4")
	EventEntryBattleTalk(Talk,						"PID_フラン",		FORCE_PLAYER,	g_pid_rumiere, FORCE_ENEMY, true, g_key_battleTalk_fran, "MID_BT5")

	EventEntryDie(_u30eb_30df_30a8_30eb_6483_7834_30a4_30d9_30f3_30c8, g_pid_rumiere, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_6483_7834_30a4_30d9_30f3_30c8)

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M002", "MID_OP1")
	PuppetDemo("M002", "MID_OP2")
	PuppetDemo("M002", "MID_OP3")

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait(FADE_FAST)

	CursorSetPos(6, 3)

	UnitSetEngageCount(g_pid_lueur, 6)

	FadeInAndWait(FADE_FAST)

	Dispos("EnemyIllusion", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
	Yield()
	WaitTime(1.0)

	PuppetDemo("M002", "MID_OP4")

	UnitTransfer(g_pid_rumiere, FORCE_ENEMY)

	CursorAnimeCreate_FromPid( "PID_M002_ルミエル" )
		WinRule()
	CursorAnimeDelete()
end

function _u30a8_30f3_30b2_30fc_30b8_30ab_30a6_30f3_30c8_4e0a_66f8_304d()
	UnitSetEngageCount( g_pid_lueur, 6 )
end

function _u30bf_30fc_30f3_5f8c___5c04_7a0b_30c1_30e5_30fc_30c8_30ea_30a2_30eb()

	CursorAnimeCreate_FromPid("PID_M002_幻影兵_アーチャー_イベント")
	Talk("MID_EV1")
	CursorAnimeDelete()
	Tutorial( "TUTID_射程" )

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30d6_30ec_30a4_30af()

	if VariableGet( g_key_tutorial_break ) == 1 then
		do return false end
	end

	if VariableGet( g_key_start_battle2 ) == 1 then
		do return false end
	end

	local pid = UnitGetPID(MindGetUnit())
	if not ( ( pid == g_pid_lueur ) or ( pid == "PID_ヴァンドレ" ) ) then
		do return false end
	end

	pid = "PID_M002_幻影兵_アクスファイター_イベント"
	if UnitExistOnMap( pid ) then
		do return true end
	end

	do return false end
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30d6_30ec_30a4_30af()

	CursorAnimeCreate_FromPid( "PID_M002_幻影兵_アクスファイター_イベント" )
	Talk("MID_EV2")
	CursorAnimeDelete()
	Tutorial( "TUTID_ブレイク" )

	VariableSet( g_key_tutorial_break, 1 )

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30e2_30f3_30af()
	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()

	Talk( "MID_EV4" )

	Tutorial( "TUTID_杖" )
	Tutorial( "TUTID_気功スタイル" )

	if VariableGet( g_key_tutorial_magic ) == 0 then
		_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7adc_65cf_30b9_30bf_30a4_30eb()
	end
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___9b54_6cd5()
	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()

	Talk( "MID_EV5" )

	Tutorial( "TUTID_魔法" )
	Tutorial( "TUTID_魔法スタイル" )

	if VariableGet( g_key_tutorial_monk ) == 0 then
		_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7adc_65cf_30b9_30bf_30a4_30eb()
	end
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7adc_65cf_30b9_30bf_30a4_30eb()
	Tutorial( "TUTID_竜族スタイル" )
end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___5371_967a_7bc4_56f2()
	if VariableGet( g_key_start_battle2 ) == 0 then
		do return false end
	end

	if VariableGet( g_key_tutorial_attackRange ) == 1 then
		do return false end
	end

	do return true end
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___5371_967a_7bc4_56f2()

	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()

	Tutorial( "TUTID_危険範囲" )

	VariableSet( g_key_tutorial_attackRange, 1 )

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___30a2_30af_30b9_30d5_30a1_30a4_30bf_30fc_6226_95d8_5f8c()
	if ( VariableGet( g_key_battled_axefighter ) == 1 ) then
		do return false end
	end

	if ( VariableGet( g_key_die_axefighter ) == 1 ) then
		do return false end
	end

	local unit = ForceUnitGetFirst(FORCE_PLAYER)
	while unit ~= nil do
		if ( not ( UnitGetPID( unit ) == g_pid_lueur ) ) and ( not UnitIsStatus( unit, UNIT_STATUS_FIXED ) ) then
			do return true end
		end
		unit = ForceUnitGetNext( unit )
	end

	do return false end
end

function _u30a2_30af_30b9_30d5_30a1_30a4_30bf_30fc_6226_95d8_5f8c()
	Talk( "MID_EV3" )
	VariableSet( g_key_battled_axefighter, 1 )
end

function _u30eb_30df_30a8_30eb_79fb_52d5_7981_6b62_89e3_9664()
	if VariableGet( g_key_end_battle1 ) == 0 then
		UnitClearStatus( g_pid_rumiere, UNIT_STATUS_MOVE_NOT_ALLOW )
	end
end

function _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_884c_52d5_958b_59cb()
	if VariableGet( g_key_rumiere_run ) == 1 then
		do return false end
	end

	if ( VariableGet( g_key_battleTalk_lueur1 ) == 1 )
		or ( VariableGet( g_key_battleTalk_vandre ) == 1 )
		or ( VariableGet( g_key_battleTalk_clan ) == 1 )
		or ( VariableGet( g_key_battleTalk_fran ) == 1 ) then

		do return false end

	end

	do return true end
end

function _u30eb_30df_30a8_30eb_884c_52d5_958b_59cb()
	CursorSetPos_FromPid( g_pid_rumiere )
	Talk( "MID_EV6" )
	VariableSet( g_key_rumiere_run, 1 )
end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_30a4_30d9_30f3_30c8___30ea_30e5_30fc_30eb()
	if ( VariableGet( g_key_start_battle2 ) == 0 ) and ( VariableGet( g_key_battleTalk_lueur1 ) == 0 )  then
		do return true end
	end

	if ( VariableGet( g_key_start_battle2 ) == 1 ) and ( VariableGet( g_key_battleTalk_lueur2 ) == 0 )  then
		do return true end
	end

	do return false end
end

function _u6226_95d8_524d_30a4_30d9_30f3_30c8___30ea_30e5_30fc_30eb()
	if ( VariableGet( g_key_start_battle2 ) == 0 ) then
		Talk("MID_BT1")
		VariableSet( g_key_battleTalk_lueur1, 1 )
	else
		Talk("MID_BT2")
		VariableSet( g_key_battleTalk_lueur2, 1 )
		_u30eb_30df_30a8_30eb_306e_A_I_5909_66f4()
	end
end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_30a4_30d9_30f3_30c8___30f4_30a1_30f3_30c9_30ec()
	if ( VariableGet( g_key_battleTalk_vandre ) == 0 ) then
		do return true end
	end

	if ( VariableGet( g_key_start_battle2 ) == 1 )
			and ( VariableGet( g_key_battled_vandre2 ) == 0 )
			and ( UnitGetPID( MindGetUnit() ) == g_pid_rumiere ) then
		do return true end
	end

	do return false end
end

function _u6226_95d8_524d_30a4_30d9_30f3_30c8___30f4_30a1_30f3_30c9_30ec()

	if ( VariableGet( g_key_battleTalk_vandre ) == 0 ) then
		Talk( "MID_BT3" )
		VariableSet( g_key_battleTalk_vandre, 1 )
	end

	if ( VariableGet( g_key_start_battle2 ) == 1 ) and ( UnitGetPID( MindGetUnit() ) == g_pid_rumiere ) then
		VariableSet( g_key_battled_vandre2, 1 )
		_u30eb_30df_30a8_30eb_306e_A_I_5909_66f4()
	end
end

function _u30eb_30df_30a8_30eb_306e_A_I_5909_66f4()
	if (  VariableGet( g_key_battled_vandre2 ) == 0 ) then

		AiSetSequence(g_pid_rumiere, AI_ORDER_ATTACK, "AI_AT_Person", "PID_ヴァンドレ")

	elseif ( VariableGet( g_key_battleTalk_lueur2 ) == 0 ) then

		AiSetSequence(g_pid_rumiere, AI_ORDER_ATTACK, "AI_AT_Person", "PID_リュール")

	else

		AiSetSequence(g_pid_rumiere, AI_ORDER_ATTACK, "AI_AT_ExcludePerson", "PID_ヴァンドレ")

	end
end

function _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_6483_7834_4e00_56de_76ee()
	if VariableGet( g_key_rumiere_Defeat1st ) == 1 then
		do return false end
	end

	do return true end
end

function _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_304b_3089_653b_6483_5f8c_6b7b_4ea1()
	if VariableGet( g_key_battleAfter_rumiere ) == 1 then
		do return false end
	end

	if VariableGet( g_key_end_battle1 ) == 1 then
		do return false end
	end

	if VariableGet( g_key_rumiere_Defeat1st ) == 1 then
		do return true end
	end

	do return false end
end

function _u30eb_30df_30a8_30eb_304b_3089_653b_6483_5f8c_6b7b_4ea1()
	VariableSet( "行動後フェイズ終了", 1 )
	VariableSet( g_key_battleAfter_rumiere, 1 )
end

function _uc_o_n_d_i_t_i_o_n___6b8b_3063_305f_6575_306e_524a_9664_3068_30eb_30df_30a8_30eb_306e_30b3_30e1_30f3_30c8()
	if VariableGet( g_key_enemyDelete ) == 1 then
		do return false end
	end

	if VariableGet( g_key_battleAfter_rumiere ) == 1 then
		do return true end
	end

	do return false end
end

function _u6b8b_3063_305f_6575_306e_524a_9664_3068_30eb_30df_30a8_30eb_306e_30b3_30e1_30f3_30c8()

	local x = CursorGetX()
	local z = CursorGetZ()

	local list = {}
	local index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		if not ( UnitGetPID( index ) == g_pid_rumiere ) then
			list[ #list + 1 ] = index
		end
		index = ForceUnitGetNext(index)
	end

	if ( #list > 0 ) then
		for index = 1, #list do
			CursorSetPos_FromPid( list[index] )
			UnitDie( list[index] )
			WaitTime( 0.5 )
		end

		CursorSetPos( x, z )
		MapCameraWait()
	end

	Talk("MID_EV7")

	VariableSet( "行動後フェイズ終了", 0 )
	VariableSet( g_key_enemyDelete, 1 )

end

function _u4e00_56de_6226_7d42_4e86_304b_3089_4e8c_56de_6226_958b_59cb()
	_u4e00_56de_6226_7d42_4e86()
	_u4e8c_56de_6226_958b_59cb()
end

function _uc_o_n_d_i_t_i_o_n___4e00_56de_6226_7d42_4e86()
	if VariableGet( g_key_end_battle1 ) == 1 then
		do return false end
	end

	if VariableGet( g_key_rumiere_Defeat1st ) == 1 then
		do return true end
	end

	do return false end
end

function _u4e00_56de_6226_7d42_4e86()

	_u6b8b_3063_305f_6575_306e_524a_9664_3068_30eb_30df_30a8_30eb_306e_30b3_30e1_30f3_30c8()

	VariableSet( "自軍フェイズスキップ", 1 )
	VariableSet( "敵軍フェイズスキップ", 1 )
	VariableSet( "行動後フェイズ終了", 1 )

	FadeOutAndWait(FADE_NORMAL)

	UnitDelete( g_pid_rumiere )

	_u81ea_8ecd_30d1_30e9_30e1_30fc_30bf_521d_671f_5316(g_pid_lueur,		6, 3)
	_u81ea_8ecd_30d1_30e9_30e1_30fc_30bf_521d_671f_5316("PID_ヴァンドレ",	6, 2)
	_u81ea_8ecd_30d1_30e9_30e1_30fc_30bf_521d_671f_5316("PID_クラン",		7, 2)
	_u81ea_8ecd_30d1_30e9_30e1_30fc_30bf_521d_671f_5316("PID_フラン",		5, 2)

	Dispos( "Enemy2", DISPOS_FLAG_NONE )
	Yield()

	_u30b9_30ad_30eb_88c5_5099( g_pid_rumiere, "SID_相手の必殺０" )

	CursorSetPos( 6, 2 )
	MapCameraWait()

	VariableSet( g_key_end_battle1, 1 )

end

function _u81ea_8ecd_30d1_30e9_30e1_30fc_30bf_521d_671f_5316( pid, x, z )

	UnitSetPos(pid, x, z)
	UnitResetParam(pid)
	UnitRotation(pid, ROTATE_UP)

end

function _uc_o_n_d_i_t_i_o_n___4e8c_56de_6226_958b_59cb()
	if VariableGet( g_key_start_battle2 ) == 1 then
		do return false end
	end

	if VariableGet( g_key_end_battle1 ) == 1 then
		do return true end
	end

	do return false end
end

function _u4e8c_56de_6226_958b_59cb()

	VariableSet( "自軍フェイズスキップ", 0 )
	VariableSet( "敵軍フェイズスキップ", 0 )
	VariableSet( "行動後フェイズ終了", 0 )

	UnitSetEngageCount(g_pid_lueur, 0)

	FadeInAndWait(FADE_NORMAL)

	WaitTime(0.5)
	CursorSetPos( 6, 14 )
	MapCameraWait()

	Talk("MID_EV8")

	FadeOutAndWait(FADE_FAST)

			PuppetDemo("M002", "MID_EV8_2")
			Movie("Kengen01")
			SkipEscape()

			UnitCreateGodUnit(g_pid_rumiere, "GID_M002_シグルド")
			UnitSetEngageCount(g_pid_rumiere, 7)

			MapOverlapSetOne(8, 4, "TID_紋章氣")

	FadeInAndWait(FADE_NORMAL)

	Talk("MID_EV9")

	FadeInAndWait(FADE_NORMAL)

	Dispos( "EnemyIllusion2_3", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime(0.5)
	Dispos( "EnemyIllusion2_2", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime(0.5)
	Dispos( "EnemyIllusion2_1", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime(0.5)

	Talk("MID_EV10")

	VariableSet( g_key_start_battle2, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_6c23_30de_30b9()
	if VariableGet( g_key_start_battle2 ) == 0 then
		do return false end
	end

	if VariableGet( g_key_tutorial_emblemPowerSpot ) == 0 then
		do return true end
	end

	do return false end
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_6c23_30de_30b9()

	CursorAnimeCreate( 8, 4 )

	Tutorial( "TUTID_紋章氣" )

	CursorAnimeDelete()

	VariableSet( g_key_tutorial_emblemPowerSpot, 1 )
end

function _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_51fa_6483_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_start_battle2 ) == 0 then
		do return false end
	end

	if VariableGet( g_key_rumiere_runned ) == 1 then
		do return false end
	end

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do

		local x = UnitGetX(index)
		local z = UnitGetZ(index)

		if ( x >= 1 ) and ( z >= 8 ) and ( x <= 11 ) and ( z <= 14 ) then
			do return true end
		elseif ( x >= 2 ) and ( x <= 10 ) and ( z == 7 ) then
			do return true end
		elseif ( x >= 3 ) and ( x <= 9 ) and ( z == 6 ) then
			do return true end
		end

		index = ForceUnitGetNext(index)

	end

	do return false end

end

function _u30eb_30df_30a8_30eb_51fa_6483_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid(g_pid_rumiere)
	Talk("MID_EV11")

	UnitSetEngaging(g_pid_rumiere, true)

	VariableSet( g_key_rumiere_runned, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_5f85_6a5f_5f8c_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_rumiere_fixed ) == 1 then
		do return false end
	end

	if VariableGet( g_key_start_battle2 ) == 0 then
		do return false end
	end

	do return true end

end

function _u30eb_30df_30a8_30eb_5f85_6a5f_5f8c_30a4_30d9_30f3_30c8()
	Talk( "MID_EV12" )
	_u30b9_30ad_30eb_89e3_9664( g_pid_rumiere, "SID_相手の必殺０" )
	VariableSet( g_key_rumiere_fixed, 1 )
end

function _uc_o_n_d_i_t_i_o_n___30eb_30df_30a8_30eb_6483_7834_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_rumiere_defeat ) == 1 then
		do return false end
	end

	if VariableGet( g_key_start_battle2 ) == 0 then
		do return false end
	end

	do return true end

end

function _u30eb_30df_30a8_30eb_6483_7834_30a4_30d9_30f3_30c8()
	Talk( "MID_BT6" )
	VariableSet( "勝利", 1 )
	VariableSet( g_key_rumiere_defeat, 1 )
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
