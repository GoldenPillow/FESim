Include("Common")
g_pid_lueur = "PID_リュール"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_アイク" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S005_WIN" )

	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry(g_key_atk, 0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)
	EventEntryBattleTalk(Talk, "PID_S005_アイク", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_アイク_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S005_アイク", FORCE_ENEMY, "PID_ミスティラ",	FORCE_PLAYER, true, "戦闘前会話_アイク_ミスティラ_済", "MID_BT2")
	EventEntryBattleTalk(Talk, "PID_S005_アイク", FORCE_ENEMY, "PID_フォガート",	FORCE_PLAYER, true, "戦闘前会話_アイク_フォガート_済", "MID_BT3")

	EventEntryDestroy(_u62e0_70b9_7834_58ca, 8, 15, 12, 15)

	if DifficultyGet() == DIFFICULTY_NORMAL then

		EventEntryTurn(_u5897_63f4_ff14_30bf_30fc_30f3_76ee, 5, 5, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff15_30bf_30fc_30f3_76ee, 6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff17_30bf_30fc_30f3_76ee, 8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff18_30bf_30fc_30f3_76ee, 9, 9, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff11_ff12_4ee5_964d  ,12,13, FORCE_PLAYER)

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then

		EventEntryTurn(_u5897_63f4_ff14_30bf_30fc_30f3_76ee, 4, 4, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff15_30bf_30fc_30f3_76ee, 5, 5, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff16_30bf_30fc_30f3_76ee, 6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff17_30bf_30fc_30f3_76ee, 7, 7, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff18_30bf_30fc_30f3_76ee, 8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff11_ff12_4ee5_964d  ,11,20, FORCE_PLAYER)

	else

		EventEntryTurn(_u5897_63f4_ff14_30bf_30fc_30f3_76ee, 4, 4, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff15_30bf_30fc_30f3_76ee, 5, 5, FORCE_PLAYER)

		EventEntryTurn(_u5897_63f4_ff17_30bf_30fc_30f3_76ee, 7, 7, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff18_30bf_30fc_30f3_76ee, 8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_ff11_ff12_4ee5_964d  ,12,20, FORCE_PLAYER)

	end

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_アイク" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S005", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()

	CursorAnimeCreate_FromPid("PID_S005_アイク")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

end

function _u5897_63f4_ff13_30bf_30fc_30f3_76ee()

	Dispos("Enemy_ReinforcementD", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_ff14_30bf_30fc_30f3_76ee()

	Dispos("Enemy_ReinforcementD", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4_ff15_30bf_30fc_30f3_76ee()
	CursorAnimeCreate_FromPid("PID_S005_アイク")
	Talk("MID_EV2")
	CursorAnimeDelete()

	Dispos("Enemy_ReinforcementU", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4_ff16_30bf_30fc_30f3_76ee()
	Dispos("Enemy_ReinforcementU", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
	Dispos("Enemy_ReinforcementD", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_ff17_30bf_30fc_30f3_76ee()

	Dispos("Enemy_ReinforcementL", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_ff18_30bf_30fc_30f3_76ee()
	Dispos("Enemy_ReinforcementR", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u5897_63f4_ff11_ff12_4ee5_964d()
	Dispos("Enemy_ReinforcementU", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
	Dispos("Enemy_ReinforcementL", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	Dispos("Enemy_ReinforcementR", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u62e0_70b9_7834_58ca()

	TerrainSetBegin()
	TerrainSet( 9,11, "TID_平地" )
	TerrainSet(10,11, "TID_平地" )
	TerrainSet(11,11, "TID_平地" )

	TerrainSet( 8,12, "TID_平地" )
	TerrainSet( 9,12, "TID_平地" )
	TerrainSet(10,12, "TID_平地" )
	TerrainSet(11,12, "TID_平地" )
	TerrainSet(12,12, "TID_平地" )

	TerrainSet( 8,13, "TID_平地" )
	TerrainSet( 9,13, "TID_平地" )
	TerrainSet(10,13, "TID_平地" )
	TerrainSet(11,13, "TID_平地" )
	TerrainSet(12,13, "TID_平地" )

	TerrainSet( 8,14, "TID_平地" )
	TerrainSet( 9,14, "TID_平地" )
	TerrainSet(10,14, "TID_平地" )
	TerrainSet(11,14, "TID_平地" )
	TerrainSet(12,14, "TID_平地" )
	TerrainSetEnd()
end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S005", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "アイク", "S005" )

end

function GameOver()

	Log("GameOver")

end
