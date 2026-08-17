Include("Common")
g_pid_lueur = "PID_リュール"

g_key_area = "橋落とし_済"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_リーフ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S010_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry(g_key_area, 0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryArea(_u6a4b_843d_3068_3057, 20, 1, 28, 26, FORCE_PLAYER, g_key_area)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u5897_63f4_ff11, 5, 6, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff11, 8, 9, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff11,12,13, FORCE_PLAYER);

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then
		EventEntryTurn(_u5897_63f4_ff11, 3, 5, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff11, 6, 8, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff11,10,12, FORCE_PLAYER);

	else
		EventEntryTurn(_u5897_63f4_ff11, 3, 4, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff11, 7, 8, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff11,11,12, FORCE_PLAYER);
	end

	EventEntryBattleTalk(Talk, "PID_S010_リーフ", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_リーフ_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S010_リーフ", FORCE_ENEMY, "PID_アイビー",			FORCE_PLAYER, true, "戦闘前会話_リーフ_アイビー_済", "MID_BT2")

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_リーフ" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S010", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end
function _u958b_59cb_76f4_5f8c()

	CursorAnimeCreate_FromPid( "PID_S010_リーフ")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

end

function EmptyFunction()
end

function _u6a4b_843d_3068_3057()

	CursorSetPos(9, 8)
	MapCameraWait()

	Talk( "MID_EV2" )

	EventBrokenObject(10, 7)

	TerrainSetBegin()
	TerrainSet( 8, 7, "TID_浅瀬" )
	TerrainSet( 9, 7, "TID_浅瀬" )
	TerrainSet(10, 7, "TID_浅瀬" )
	TerrainSet( 8, 8, "TID_浅瀬" )
	TerrainSet( 9, 8, "TID_浅瀬" )
	TerrainSet(10, 8, "TID_浅瀬" )
	TerrainSet( 8, 9, "TID_浅瀬" )
	TerrainSet( 9, 9, "TID_浅瀬" )
	TerrainSet(10, 9, "TID_浅瀬" )
	TerrainSetEnd()

	VariableSet(g_key_area, 1)

	index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		AiSetSequence(index, AI_ORDER_CAUSE, "AI_AC_Everytime")
		index = ForceUnitGetNext(index)
	end

end

function _u5897_63f4_ff11()

	Dispos( "Enemy_Reinforcement", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S010", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "リーフ", "S010" )

end

function GameOver()

	Log("GameOver")

end
