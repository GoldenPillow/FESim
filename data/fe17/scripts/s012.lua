Include("Common")
g_pid_lueur = "PID_リュール"
g_pid_roy = "PID_S012_ロイ"

function Startup()

	Log("Startup");

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_ロイ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S012_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()
end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_ロイ" )

end

function _u5909_6570_767b_9332()

	VariableEntry( "増援_戦闘後増援1_済", 0 )
	VariableEntry( "増援_戦闘後増援2_済", 0 )

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "幻影竜_行動開始_済", 0 )
	VariableEntry( g_key_notice_reinforcement, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u958b_6226, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_S012_ロイ", FORCE_ENEMY, g_pid_lueur,
	FORCE_PLAYER, true, "戦闘前会話_ロイ_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S012_ロイ", FORCE_ENEMY, "PID_ディアマンド",
	FORCE_PLAYER, true, "戦闘前会話_ロイ_ディアマンド_済", "MID_BT2")
	EventEntryBattleTalk(Talk, "PID_S012_ロイ", FORCE_ENEMY, "PID_スタルーク",
	FORCE_PLAYER, true, "戦闘前会話_ロイ_スタルーク_済", "MID_BT3")

	EventEntryTurn(_u5897_63f4_4e88_544a, 2, 2,  FORCE_PLAYER)

	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_S012_幻影兵_リリーナ",_u3000_F_O_R_C_E___E_N_E_M_Y, true, "戦闘後イベント1_済")
	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_S012_幻影兵_スナイパー_増援1",_u3000_F_O_R_C_E___E_N_E_M_Y, true, "戦闘後イベント2_済")

	EventEntryTurn(_u5897_63f4_ff13_30bf_30fc_30f3_76ee, 3, 3, FORCE_PLAYER);

	EventEntryTurn(_u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_1, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4_1)
	EventEntryTurn(_u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_2, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4_2)

	EventEntryPickup(_u5e7b_5f71_7adc___884c_52d5_958b_59cb, "PID_S012_幻影竜", "幻影竜_行動開始_済");
	EventEntryBattleBefore(_u30ed_30a4___6226_95d8_958b_59cb, "PID_S012_ロイ",FORCE_ENEMY, "", FORCE_ALL);

end

function EmptyFunction()

end

function _u958b_6226()

	CursorSetPos_FromPid( g_pid_roy )
	Talk( "MID_EV1" )

end

function _u30ed_30a4___6226_95d8_958b_59cb()

	if DifficultyGet() == DIFFICULTY_NORMAL
		or DifficultyGet() == DIFFICULTY_HARD then
			do return true end
	end

	AiSetSequence("PID_S012_幻影兵_ジェネラル_ロイ周辺", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_S012_幻影兵_ジェネラル_ロイ周辺", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_S012_幻影兵_ジェネラル_ロイ周辺", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

	AiSetSequence("PID_S012_幻影兵_ジェネラル_ロイ周辺2", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_S012_幻影兵_ジェネラル_ロイ周辺2", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_S012_幻影兵_ジェネラル_ロイ周辺2", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

	AiSetSequence("PID_S012_幻影兵_セイジ_ロイ周辺", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_S012_幻影兵_セイジ_ロイ周辺", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_S012_幻影兵_セイジ_ロイ周辺", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

	AiSetSequence("PID_S012_幻影兵_セイジ_ロイ周辺2", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_S012_幻影兵_セイジ_ロイ周辺2", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_S012_幻影兵_セイジ_ロイ周辺2", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

end

function _u5897_63f4_ff13_30bf_30fc_30f3_76ee()

	CursorSetPos(4, 7);

	Dispos("Reinforcement2_0", DISPOS_FLAG_FOCUS)

	WaitTime(0.5)

	CursorSetPos(22, 22);

	Dispos("Reinforcement2_1", DISPOS_FLAG_FOCUS)
	Yield()

	WaitTime(0.5)
end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4_1()

	if VariableGet( "増援_戦闘後増援1_済" ) == 1 then
		do return false end
	end

	if VariableGet( "戦闘後イベント1_済" ) == 1 then
		do return true end
	end

	do return false end

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4_2()

	if VariableGet( "増援_戦闘後増援2_済" ) == 1 then
		do return false end
	end

	if VariableGet( "戦闘後イベント2_済" ) == 1 then
		do return true end
	end

	do return false end

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_1()

	Dispos("Reinforcement0", DISPOS_FLAG_FOCUS)

	WaitTime(0.5)

	Dispos("Reinforcement0_1", DISPOS_FLAG_FOCUS)
	Yield()

	WaitTime(0.5)

	VariableSet( "増援_戦闘後増援1_済", 1 )

	if DifficultyGet() == DIFFICULTY_NORMAL
		or DifficultyGet() == DIFFICULTY_HARD then
			do return false end
	end

	Dispos("Reinforcement0_Lunatic", DISPOS_FLAG_FOCUS)
	Yield()

	VariableSet( "増援_戦闘後増援1_済", 1 )

	WaitTime(0.5)

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_2()

	Dispos("Reinforcement1_2", DISPOS_FLAG_FOCUS)

	WaitTime(0.5)

	Dispos("Reinforcement1_3", DISPOS_FLAG_FOCUS)

	WaitTime(0.5)

	Dispos("Reinforcement1_1", DISPOS_FLAG_FOCUS)

	WaitTime(0.5)

	Yield()

	VariableSet( "増援_戦闘後増援2_済", 1 )

	if DifficultyGet() == DIFFICULTY_NORMAL then
			do return false end
	end

	Dispos("Reinforcement1_0", DISPOS_FLAG_FOCUS)

	WaitTime(0.5)

	Yield()

	VariableSet( "増援_戦闘後増援2_済", 1 )

	WaitTime(0.5)

end

function _u5e7b_5f71_7adc___884c_52d5_958b_59cb()

	CursorSetPos_FromPid(g_pid_lueur)

	WaitTime(0.5)

	AiSetActive("S012_幻影兵_ドラゴンナイト_増援4", true)

end

function _u5897_63f4_4e88_544a()

	CursorSetPos_FromPid(g_pid_lueur)

	Talk("MID_EV2")

	WaitTime(0.5)
end

function Opening()

	Log("Opening")

	PuppetDemo("S012", "MID_OP1")
end

function MapOpening()

	Log("MapOpening")

end

function Ending()

	Log("Ending")

	FadeInAndWait(FADE_NORMAL)
	PuppetDemo("S012", "MID_ED1" )
	FadeOutAndWait(FADE_NORMAL)

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "ロイ", "S012" )

end

function GameOver()

	Log("GameOver");

end
