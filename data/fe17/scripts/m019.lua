Include("Common")
Include("Common_E")

g_pid_lueur = "PID_リュール"
g_key_area = "モーヴアクティブ_済"

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss(true)
	WinRuleSetMID( "MID_RULE_M019_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function Cleanup()

	Log("Cleanup");

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry(g_key_area, 0)

	E_BattleTalk_VariableEntry()

end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurnAfter(_u9752_ff11_30bf_30fc_30f3_958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER);
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u5897_63f4_ff14, 6, 6, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff15, 4, 4, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff13,12,12, FORCE_PLAYER);

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then
		EventEntryTurn(_u5897_63f4_ff14, 4, 4, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff15, 3, 3, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff13,10,10, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff13,12,12, FORCE_PLAYER);

		EventEntryTurn(_u30e2_30fc_30f4_30a2_30af_30c6_30a3_30d6_5316,14,14, FORCE_PLAYER);
	else
		EventEntryTurn(_u5897_63f4_ff14, 4, 4, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff15, 3, 3, FORCE_PLAYER);
		EventEntryTurn(_u5897_63f4_ff13,10,10, FORCE_PLAYER);
	end

	EventEntryArea(_u30e2_30fc_30f4_30a2_30af_30c6_30a3_30d6_5316, 9, 7, 24, 16, FORCE_PLAYER, g_key_area)

	EventEntryVisit(_u6751_ff11_8a2a_554f_30a4_30d9_30f3_30c8, 10, 6,"村訪問１_済")
	EventEntryVisit(_u6751_ff12_8a2a_554f_30a4_30d9_30f3_30c8, 15, 20,"村訪問２_済")

	EventEntryTalk(_u30b6_30d5_30a3_30fc_30a2_4f1a_8a71, g_pid_lueur,			FORCE_PLAYER, "PID_ザフィーア", FORCE_ALLY, true, "ザフィーア会話_済",	"MID_TK1")
	EventEntryTalk(_u30b6_30d5_30a3_30fc_30a2_4f1a_8a71, "PID_ディアマンド",	FORCE_PLAYER, "PID_ザフィーア", FORCE_ALLY, true, "ザフィーア会話_済",	"MID_TK2")
	EventEntryTalk(_u30b6_30d5_30a3_30fc_30a2_4f1a_8a71, "PID_スタルーク",	FORCE_PLAYER, "PID_ザフィーア", FORCE_ALLY, true, "ザフィーア会話_済",	"MID_TK3")
	EventEntryDie(EmptyFunction, "PID_ザフィーア", FORCE_ALLY, "S_死亡セリフ_ザフィーア_済")

	E_BattleTalkEntry_Marron( "PID_M019_マロン" )
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M019_マロン", FORCE_ENEMY, true, "戦闘前会話_マロン_済", "MID_BT1");
	EventEntryDie(Talk, "PID_M019_マロン", FORCE_ENEMY, condition_true, "MID_BT3");
	EventEntryReviveAfter(	_u30de_30ed_30f3_66b4_8d70_5f8c, "PID_M019_マロン", FORCE_ENEMY, "マロン暴走後_済" )

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M019_モーヴ", FORCE_ENEMY, true, "戦闘前会話_モーヴ_済", "MID_BT4");
	EventEntryDie(Talk, "PID_M019_モーヴ", FORCE_ENEMY, condition_true, "MID_BT6");
	EventEntryReviveAfter(	_u30e2_30fc_30f4_66b4_8d70_5f8c, "PID_M019_モーヴ", FORCE_ENEMY, "モーヴ暴走後_済" )

end

function Opening()

	Log("Opening");

	PuppetDemo("M019", "MID_OP1")
	PuppetDemo("M019", "MID_OP2")
end

function MapOpening()

	Log("MapOpening");

	CursorSetPos_FromPid( "PID_M019_マロン" )
	Talk("MID_OP3")
	UnitMovePos("PID_M019_マロン",	22 ,11, MOVE_FLAG_NONE)
	UnitMovePos("PID_M019_モーヴ",	15 ,11, MOVE_FLAG_NONE)
	UnitMoveWait()
	UnitRotation( "PID_M019_マロン", ROTATE_DOWN_LEFT )
	UnitMoveWait()

end

function EmptyFunction()
end

function _u9752_ff11_30bf_30fc_30f3_958b_59cb_76f4_5f8c()

	CursorAnimeCreate(2,11)
	Talk( "MID_EV4" )
	CursorAnimeDelete()

	CursorAnimeCreate_FromPid("PID_ザフィーア")
	Talk( "MID_EV1" )
	CursorAnimeDelete()
end

function _u30b6_30d5_30a3_30fc_30a2_4f1a_8a71( mid )
	Talk(mid)

	pid = "PID_ザフィーア"
	if UnitExistOnMap( pid ) and ( UnitGetForce(pid) == FORCE_ALLY ) then
		UnitJoin( pid );
	end
end

function _u5897_63f4_ff13()

	Dispos( "Enemy_Reinforcement3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

end
function _u5897_63f4_ff14()

	Dispos( "Enemy_Reinforcement4", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

end
function _u5897_63f4_ff15()

	Dispos( "Enemy_Reinforcement5", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

end

function _u30e2_30fc_30f4_30a2_30af_30c6_30a3_30d6_5316()

	AiSetSequence("PID_M019_モーヴ", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M019_モーヴ", AI_ORDER_ATTACK, "AI_AT_RodRescue","1,1")

	UnitClearStatus("PID_M019_モーヴ", UNIT_STATUS_MOVE_NOT_ALLOW)

	VariableSet(g_key_area, 1)

end

function _u30e2_30fc_30f4_66b4_8d70_5f8c()
	CursorSetPos_FromPid( "PID_M019_モーヴ" )
	Yield()
	WaitTime(0.5)

	Talk("MID_BT8");

	UnitClearStatus("PID_M019_モーヴ", UNIT_STATUS_MOVE_NOT_ALLOW)

	AiSetSequence("PID_M019_モーヴ", AI_ORDER_ATTACK, "AI_AT_RodRescue","1,1")

end

function _u30de_30ed_30f3_66b4_8d70_5f8c()
	CursorSetPos_FromPid( "PID_M019_マロン" )
	Yield()
	WaitTime(0.5)

	Talk("MID_BT7");

	AiSetSequence( "PID_M019_マロン", AI_ORDER_ATTACK, "AI_AT_EngageAttack", "1, 1" )

	UnitSetItemEquip( "PID_M019_マロン", "IID_ロイ_封印の剣" )

	AiSetSequence("PID_M019_モーヴ", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M019_モーヴ", AI_ORDER_ATTACK, "AI_AT_RodRescue","1,1")
	VariableSet(g_key_area, 1)

end

function _u6751_ff11_8a2a_554f_30a4_30d9_30f3_30c8()
	Talk("MID_EV2");

	Dispos( "Enemy_Reinforcement1", DISPOS_FLAG_FORCED )
	Yield()
	WaitTime(0.5)

end
function _u6751_ff12_8a2a_554f_30a4_30d9_30f3_30c8()
	Talk("MID_EV3");

	Dispos( "Enemy_Reinforcement2", DISPOS_FLAG_FORCED )
	Yield()
	WaitTime(0.5)

end

function _u7634_6c17_914d_7f6e()

	MapOverlapSetBegin()
	for i = 8 , 23 do
		for j = 1 , 22 do
			MapOverlapSet(i, j, "TID_瘴気_永続")
		end
	end
	MapOverlapSetEnd()
end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	GodUnitSetEscape("GID_ロイ",	false)
	GodUnitSetEscape("GID_ミカヤ",	false)

	PuppetDemo("M019", "MID_ED1")
	PuppetDemo("M019", "MID_ED2")

end

function GameOver()

	Log("GameOver");

end
