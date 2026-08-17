Include("Common")
g_pid_lueur = "PID_リュール"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_ミカヤ" )

	WinRuleSetDestroyBoss( true )
	EventEntryBreakdownEnemy(VariableSet, 12,	23, "防衛エリア_済",	"敗北", 1);

	WinRuleSetMID( "MID_RULE_S011_WIN" )
	LoseRuleSetMID( "MID_RULE_S011_LOSE" )

	_u30a4_30d9_30f3_30c8_767b_9332()
end

function _u5909_6570_767b_9332()
	VariableEntry(g_key_atk, 0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_S011_ミカヤ", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_ミカヤ_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S011_ミカヤ", FORCE_ENEMY, "PID_ユナカ",		FORCE_PLAYER, true, "戦闘前会話_ミカヤ_ユナカ_済", "MID_BT2")

	if DifficultyGet() == DIFFICULTY_NORMAL then

		EventEntryTurn(_u5897_63f4_ff11, 4, 4, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff12, 6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_6681, 9, 9, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff13,11,11, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff13,13,14, FORCE_PLAYER)

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then

		EventEntryTurn(_u5897_63f4_ff11, 3, 4, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff12, 6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_6681, 8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff13,10,10, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff13,12,20, FORCE_PLAYER)

	else

		EventEntryTurn(_u5897_63f4_ff11, 3, 3, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff12, 5, 5, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_6681, 8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff13,10,10, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff13,12,20, FORCE_PLAYER)

	end

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_ミカヤ" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S011", "MID_OP1")
end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()

	CursorAnimeCreate_FromPid( "PID_S011_ミカヤ")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

end

function _u5897_63f4_ff11()
	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_ff12()
	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_ff13()
	Dispos("Enemy_Reinforcement3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_6681()
	CursorAnimeCreate_FromPid( "PID_S011_ミカヤ")
	Talk("MID_EV2")
	CursorAnimeDelete()

	Dispos("Enemy_Reinforcement4", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	FadeInAndWait(FADE_NORMAL)
	PuppetDemo("S011", "MID_ED1" )
	FadeOutAndWait(FADE_NORMAL)

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "ミカヤ", "S011" )

end

function GameOver()

	Log("GameOver")

end
