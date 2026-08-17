Include("Common")
g_pid_lueur = "PID_リュール"

g_key_atk = "全突撃_済"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_リン" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S004_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry(g_key_atk, 0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryTurn(_u30ea_30f3_79fb_52d5_958b_59cb_4e88_544a, 7, 7, FORCE_PLAYER)
	EventEntryTurn(_u30ea_30f3_79fb_52d5_958b_59cb, 7, 7, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4, -1, -1, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_S004_リン", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_リン_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S004_リン", FORCE_ENEMY, "PID_アイビー",	FORCE_PLAYER, true, "戦闘前会話_リン_アイビー_済", "MID_BT2")
	EventEntryBattleTalk(Talk, "PID_S004_リン", FORCE_ENEMY, "PID_オルテンシア",	FORCE_PLAYER, true, "戦闘前会話_リン_オルテンシア_済", "MID_BT3")

	EventEntryBattleBefore(_u30ea_30f3_653b_6483, "PID_S004_リン", FORCE_ENEMY, "", FORCE_PLAYER, true, "戦闘前実行済み")

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_リン" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S004", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()

	CursorAnimeCreate_FromPid("PID_S004_リン")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

	CursorSetPos_FromPid( "PID_S004_幻影兵_トリオル" )
	CursorAnimeCreate( 16, 17, "W3H2" )

	Talk("MID_EV2")

	CursorAnimeDelete()

end

function _u30ea_30f3_79fb_52d5_958b_59cb_4e88_544a()

	CursorAnimeCreate_FromPid("PID_S004_リン")
	Talk("MID_EV3")
	CursorAnimeDelete()

	AiSetSequence("PID_S004_リン", AI_ORDER_CAUSE, "AI_AC_Everytime")
end
function _u30ea_30f3_79fb_52d5_958b_59cb()
	UnitClearStatus("PID_S004_リン", UNIT_STATUS_MOVE_NOT_ALLOW)
	AiSetSequence("PID_S004_リン", AI_ORDER_ATTACK, "AI_AT_EngageVision", "2,2")
end

function EmptyFunction()
end

function _u5168_7a81_6483()

	if VariableGet( g_key_atk ) < 1 then

		VariableSet(g_key_atk, 1)

	end

end

function _u30ea_30f3_653b_6483()
	VariableSet(g_key_atk, 1)
end

function _u5897_63f4()

	if VariableGet( g_key_atk ) == 1 then
		index = ForceUnitGetFirst(FORCE_ENEMY)
		while index ~= nil do
			AiSetSequence(index, AI_ORDER_CAUSE, "AI_AC_Everytime")
			UnitClearStatus(UnitGetPID(index), UNIT_STATUS_MOVE_NOT_ALLOW)
			index = ForceUnitGetNext(index)
		end
		if UnitExistOnMap("PID_S004_幻影兵_クドカ") then
			Dispos( "Enemy_Reinforcement1", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end
		if UnitExistOnMap("PID_S004_幻影兵_マラル") then
			Dispos( "Enemy_Reinforcement2", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end
		if UnitExistOnMap("PID_S004_幻影兵_トリオル") then
			Dispos( "Enemy_Reinforcement3", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end
		if UnitExistOnMap("PID_S004_幻影兵_ブラクル") then
			Dispos( "Enemy_Reinforcement4", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end
		if UnitExistOnMap("PID_S004_幻影兵_カブル") then
			Dispos( "Enemy_Reinforcement5", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end
		if UnitExistOnMap("PID_S004_幻影兵_チャン") then
			Dispos( "Enemy_Reinforcement6", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end

		VariableSet(g_key_atk, 2)
	end
end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S004", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "リン", "S004" )

end

function GameOver()

	Log("GameOver")

end
