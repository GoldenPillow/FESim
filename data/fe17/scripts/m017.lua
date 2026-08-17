Include("Common")
Include("Common_E")

g_pid_lueur = "PID_リュール"
g_key_runaways = "暴走_初回"

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss(true)
	WinRuleSetMID( "MID_RULE_M017_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( "増援_戦闘後増援_済", 0 )
	VariableEntry( g_key_runaways, 0 )

	E_BattleTalk_VariableEntry()

end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryBattleAfter(EmptyFunction, "", FORCE_PLAYER, "PID_M017_セピア", FORCE_ENEMY, true, "戦闘後イベント_済")

	EventEntryBattleTalk(Talk, g_pid_lueur, FORCE_PLAYER, "PID_M017_ヴェイル", FORCE_ENEMY, true, "戦闘前会話_ヴェイル_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M017_ヴェイル", FORCE_ENEMY, true, "戦闘前会話_ヴェイル_済", "MID_BT2")
	EventEntryReviveBefore(	_u30f4_30a7_30a4_30eb_66b4_8d70_524d, "PID_M017_ヴェイル", FORCE_ENEMY, "ヴェイル暴走前_済" )
	EventEntryReviveAfter(	_u30f4_30a7_30a4_30eb_66b4_8d70_5f8c, "PID_M017_ヴェイル", FORCE_ENEMY, "ヴェイル暴走後_済" )
	EventEntryDie(Talk, "PID_M017_ヴェイル", FORCE_ENEMY, condition_true, "MID_BT3")

	E_BattleTalkEntry_Sepia( "PID_M017_セピア" )
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M017_セピア", FORCE_ENEMY, true, "戦闘前会話_セピア_済", "MID_BT4")
	EventEntryReviveBefore(	_u30bb_30d4_30a2_66b4_8d70_524d, "PID_M017_セピア", FORCE_ENEMY, "セピア暴走前_済" )
	EventEntryReviveAfter(	_u30bb_30d4_30a2_66b4_8d70_5f8c, "PID_M017_セピア", FORCE_ENEMY, "セピア暴走後_済" )
	EventEntryDie(Talk, "PID_M017_セピア", FORCE_ENEMY, condition_true, "MID_BT5")

	E_BattleTalkEntry_Gris( "PID_M017_グリ" )
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M017_グリ", FORCE_ENEMY, true, "戦闘前会話_グリ_済", "MID_BT6")
	EventEntryDie(Talk, "PID_M017_グリ", FORCE_ENEMY, condition_true, "MID_BT7")

	E_BattleTalkEntry_Marron( "PID_M017_マロン" )
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M017_マロン", FORCE_ENEMY, true, "戦闘前会話_マロン_済", "MID_BT8")
	EventEntryDie(Talk, "PID_M017_マロン", FORCE_ENEMY, condition_true, "MID_BT9")

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M017_モーヴ", FORCE_ENEMY, true, "戦闘前会話_モーヴ_済", "MID_BT10")
	EventEntryDie(Talk, "PID_M017_モーヴ", FORCE_ENEMY, condition_true, "MID_BT11")

	EventEntryBattleTalk(Talk, "PID_アイビー",		FORCE_PLAYER, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, true, "戦闘前会話_ハイアシンス_アイビー_済",		"MID_BT12")
	EventEntryBattleTalk(Talk, "PID_オルテンシア",	FORCE_PLAYER, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, true, "戦闘前会話_ハイアシンス_オルテンシア_済",	"MID_BT13")
	EventEntryBattleTalk(Talk, "",					FORCE_PLAYER, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, true, "戦闘前会話_ハイアシンス_済",				"MID_BT14")
	EventEntryReviveBefore(	_u30cf_30a4_30a2_30b7_30f3_30b9_66b4_8d70_524d, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, "ハイアシンス暴走前_済" )
	EventEntryReviveAfter(	_u30cf_30a4_30a2_30b7_30f3_30b9_66b4_8d70_5f8c, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, "ハイアシンス暴走後_済" )
	EventEntryDie(Talk, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, condition_true, "MID_BT15")

	EventEntryBattleAfter(_u30b0_30ea___A_I_5909_66f4, "PID_M017_グリ", FORCE_ENEMY, "", FORCE_PLAYER, false)

	EventEntryBattleAfter(_u30de_30ed_30f3___A_I_5909_66f4, "PID_M017_マロン", FORCE_ENEMY, "", FORCE_PLAYER, false)

	EventEntryBattleAfter(_u7570_5f62_5175___30cf_30a4_30a2_30b7_30f3_30b9___A_I_5909_66f4, "PID_M017_異形兵_ハイアシンス", FORCE_ENEMY, "", FORCE_PLAYER, false)

	EventEntryBattleAfter(_u30f4_30a7_30a4_30eb___A_I_5909_66f4, "PID_M017_ヴェイル", FORCE_ENEMY, "", FORCE_PLAYER, false)
end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M017", "MID_OP1")

	Movie("Scene19")
	SkipEscape()

	PuppetDemo("M017", "MID_OP2")

	Movie("Scene20")
	SkipEscape()
end

function MapOpening()

	Log("MapOpening")

	FadeWait()

	CursorSetPos_FromPid( "PID_M017_異形兵_ハイアシンス" )

	Talk("MID_EV1")

	CursorSetPos_FromPid( g_pid_lueur )

end

function EmptyFunction()

end

function _u30b0_30ea___A_I_5909_66f4()

	AiSetSequence("PID_M017_グリ", AI_ORDER_ATTACK, "AI_AT_Attack")

end

function _u30de_30ed_30f3___A_I_5909_66f4()

	AiSetSequence("PID_M017_マロン", AI_ORDER_ATTACK, "AI_AT_Attack")

end

function _u7570_5f62_5175___30cf_30a4_30a2_30b7_30f3_30b9___A_I_5909_66f4()

	AiSetSequence("PID_M017_異形兵_ハイアシンス", AI_ORDER_ATTACK, "AI_AT_Attack")

end

function _u30f4_30a7_30a4_30eb___A_I_5909_66f4()

	AiSetSequence("PID_M017_ヴェイル", AI_ORDER_ATTACK, "AI_AT_Attack")

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4()

	if VariableGet( "増援_戦闘後増援_済" ) == 1 then
		return false
	end

	if VariableGet( "戦闘後イベント_済" ) == 1 then
		return true
	end

	return false

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_1()

	Dispos("Reinforcement1_1", DISPOS_FLAG_FOCUS)
	Yield()

	CursorSetPos( 2, 16 )
	WaitTime(0.5)

	Dispos("Reinforcement1_2", DISPOS_FLAG_FOCUS)
	Yield()

	CursorSetPos( 16, 16 )
	WaitTime(0.5)

	VariableSet( "増援_戦闘後増援_済", 1 )

end

function _u30f4_30a7_30a4_30eb_66b4_8d70_524d()
	CursorSetPos_FromPid( "PID_M017_ヴェイル" )
	Talk("MID_EV2")
end

function _u30f4_30a7_30a4_30eb_66b4_8d70_5f8c()
	Talk("MID_EV3")
	_u521d_56de_66b4_8d70_30a4_30d9_30f3_30c8()
end

function _u30bb_30d4_30a2_66b4_8d70_524d()
	CursorSetPos_FromPid( "PID_M017_セピア" )
	Talk("MID_EV4")
end

function _u30bb_30d4_30a2_66b4_8d70_5f8c()
	Talk("MID_EV5")
	_u521d_56de_66b4_8d70_30a4_30d9_30f3_30c8()
end

function _u30cf_30a4_30a2_30b7_30f3_30b9_66b4_8d70_524d()
	CursorSetPos_FromPid( "PID_M017_異形兵_ハイアシンス" )
	Talk("MID_EV6")
end

function _u30cf_30a4_30a2_30b7_30f3_30b9_66b4_8d70_5f8c()
	Talk("MID_EV7")
	_u521d_56de_66b4_8d70_30a4_30d9_30f3_30c8()
end

function _u521d_56de_66b4_8d70_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_runaways ) == 0 then

		Talk( "MID_EV8" )

		VariableSet( g_key_runaways, 1 )
	end

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
