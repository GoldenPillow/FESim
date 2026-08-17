Include("Common")
Include("Common_E")

g_pid_lueur = "PID_リュール";
g_key_area = "ボス部屋アクティブ_済"
g_key_bosszou = "ボス部屋増援_済"

emblem_effect = {

	{10, 13},
	{12, 13},
	{18, 13},
	{20, 13},

	{10, 14},
	{12, 14},
	{18, 14},
	{20, 14}

}

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss(true)
	WinRuleSetMID( "MID_RULE_M014_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry(g_key_area, 0)
	VariableEntry(g_key_bosszou, 0)

	E_BattleTalk_VariableEntry()

end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u53f3_76d7_8cca_767b_5834, 3, 3, FORCE_PLAYER);
		EventEntryTurn(_u5de6_76d7_8cca_767b_5834, 4, 4, FORCE_PLAYER);
		EventEntryTurn(_u9752_ff17_30bf_30fc_30f3_76f4_524d___5897_63f4, 8, 8, FORCE_PLAYER);
		EventEntryTurn(_u9752_ff11_ff12_30bf_30fc_30f3_76f4_524d___5897_63f4, 13, 13, FORCE_PLAYER);

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then

		EventEntryTurn(_u53f3_76d7_8cca_767b_5834, 2, 2, FORCE_PLAYER);
		EventEntryTurn(_u5de6_76d7_8cca_767b_5834, 2, 2, FORCE_PLAYER);
		EventEntryTurn(_u9752_ff17_30bf_30fc_30f3_76f4_524d___5897_63f4, 7, 7, FORCE_PLAYER);
		EventEntryTurn(_u9752_ff11_ff12_30bf_30fc_30f3_76f4_524d___5897_63f4, 12, 13, FORCE_PLAYER);

	else
		EventEntryTurn(_u53f3_76d7_8cca_767b_5834, 2, 2, FORCE_PLAYER);
		EventEntryTurn(_u5de6_76d7_8cca_767b_5834, 3, 3, FORCE_PLAYER);
		EventEntryTurn(_u9752_ff17_30bf_30fc_30f3_76f4_524d___5897_63f4, 7, 7, FORCE_PLAYER);
		EventEntryTurn(_u9752_ff11_ff12_30bf_30fc_30f3_76f4_524d___5897_63f4, 12, 12, FORCE_PLAYER);
	end

	EventEntryArea(_u30dc_30b9_90e8_5c4b_30a2_30af_30c6_30a3_30d6_5316, 10, 18, 20, 23, FORCE_PLAYER, g_key_area)
	EventEntryTurn(_u30dc_30b9_90e8_5c4b_5897_63f4, -1, -1, FORCE_PLAYER);

	EventEntryTbox(_u5b9d_7bb1_5165_624b,  3, 26, "IID_銀身の法")
	EventEntryTbox(_u5b9d_7bb1_5165_624b,  6, 26, "IID_ドラゴンキラー")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 24, 26, "IID_ブーツ")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 27, 26, "IID_光の弓")

	EventEntryBattleTalk(Talk, "PID_アイビー", FORCE_PLAYER, "PID_M014_オルテンシア", FORCE_ENEMY, true, "戦闘前会話_オルテンシア_アイビー_済", "MID_BT2");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M014_オルテンシア", FORCE_ENEMY, true, "戦闘前会話_オルテンシア_済", "MID_BT1");
	EventEntryReviveAfter(	_u30aa_30eb_30c6_30f3_30b7_30a2_66b4_8d70_5f8c, "PID_M014_オルテンシア", FORCE_ENEMY, "オルテンシア暴走後_済" )

	EventEntryDie(Talk, "PID_M014_オルテンシア", FORCE_ENEMY, condition_true, "MID_BT3");

	E_BattleTalkEntry_Sepia( "PID_M014_セピア" )
	EventEntryBattleTalk(Talk, g_pid_lueur, FORCE_PLAYER, "PID_M014_セピア", FORCE_ENEMY, true, "戦闘前会話_セピア_リュール_済", "MID_BT5");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M014_セピア", FORCE_ENEMY, true, "戦闘前会話_セピア_済", "MID_BT4");
	EventEntryDie(Talk, "PID_M014_セピア", FORCE_ENEMY, condition_true, "MID_BT6");

	E_BattleTalkEntry_Marron( "PID_M014_マロン" )
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M014_マロン", FORCE_ENEMY, true, "戦闘前会話_マロン_済", "MID_BT7");
	EventEntryDie(Talk, "PID_M014_マロン", FORCE_ENEMY, condition_true, "MID_BT8");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M014_モーヴ", FORCE_ENEMY, true, "戦闘前会話_モーヴ_済", "MID_BT9");
	EventEntryDie(Talk, "PID_M014_モーヴ", FORCE_ENEMY, condition_true, "MID_BT10");

end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	PuppetDemo("M014", "MID_OP1")
	PuppetDemo("M014", "MID_OP2")
	PuppetDemo("M014", "MID_OP3")
	PuppetDemo("M014", "MID_OP4")

end

function MapOpening()

	Log("MapOpening");
	UnitSetItemEquip( "PID_M014_オルテンシア", "IID_ベレト_ルーン" )

end

function _uM_a_p_O_p_e_n_i_n_g___30a4_30eb_30b7_30aa_30f3_5175_5165_5834()

	Dispos( "Enemy_OP2", DISPOS_FLAG_NONE )
	WaitTime(0.2)
	Dispos( "Enemy_OP3", DISPOS_FLAG_NONE )
	WaitTime(0.2)
	Dispos( "Enemy_OP4", DISPOS_FLAG_NONE )
	Yield();
	WaitTime(0.5)

	CursorSetPos( 5, 21 )
	MapCameraWait();

	Dispos( "Enemy_OP5", DISPOS_FLAG_NONE )
	WaitTime(0.2)
	Dispos( "Enemy_OP6", DISPOS_FLAG_NONE )
	Yield();
	WaitTime(0.5)

	CursorSetPos( 25, 21 )
	MapCameraWait();

	Dispos( "Enemy_OP7", DISPOS_FLAG_NONE )
	WaitTime(0.2)
	Dispos( "Enemy_OP8", DISPOS_FLAG_NONE )
	Yield();
	WaitTime(0.5)

	Dispos( "Enemy_OP9", DISPOS_FLAG_FOCUS )
	Yield();
	WaitTime(0.5)

	Dispos( "Enemy_OP10", DISPOS_FLAG_FOCUS )
	Yield();
	WaitTime(0.5)

end

function _uM_a_p_O_p_e_n_i_n_g___30b9_30d5_30a9_30ea_30a2_9023_884c()

	UnitMovePos("PID_スフォリア",  14, 28, MOVE_FLAG_ESCAPE);
	UnitMovePos("PID_M014_マロン", 13, 28, MOVE_FLAG_ESCAPE);

	UnitMoveWait();
	if UnitExistOnMap("PID_スフォリア") then
		UnitDelete("PID_スフォリア");
	end
	if UnitExistOnMap("PID_M014_マロン") then
		UnitDelete("PID_M014_マロン");
	end

	WaitTime(0.5);

end

function _u5468_56de_30ab_30e1_30e9()

	FadeOutAndWait(FADE_NORMAL);

	CursorSetPos(15, 7);
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR);
	MapCameraWait();

	SkipEscape();

	FadeInAndWait(FADE_NORMAL);

	AroundCameraSetPos(15, 13);
	AroundCameraSetPos( 5, 13);
	AroundCameraSetPos( 5, 25);
	AroundCameraSetPos(25, 25);
	AroundCameraSetPos(25,  7);
	AroundCameraSetPos(15,  7);

	FadeOutAndWait(FADE_NORMAL);
	CursorSetPos_FromPid(g_pid_lueur);
	FadeInAndWait(FADE_NORMAL);

end

function _u30ea_30e5_30fc_30eb_8ecd_5230_7740()

	UnitSetPosFromPos(17,4, 17,1);
	UnitSetPosFromPos(16,4, 16,1);
	UnitSetPosFromPos(14,4, 14,1);
	UnitSetPosFromPos(13,4, 13,1);
	UnitSetPosFromPos(17,5, 17,2);
	UnitSetPosFromPos(16,5, 16,2);
	UnitSetPosFromPos(14,5, 14,2);
	UnitSetPosFromPos(13,5, 13,2);
	UnitSetPosFromPos(16,6, 16,3);
	UnitSetPosFromPos(15,6, 15,3);
	UnitSetPosFromPos(14,6, 14,3);
	UnitSetPosFromPos(15,7, 15,4);

	CursorSetPos(15, 6);
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR);
	MapCameraWait();

	FadeIn(FADE_NORMAL);
	WaitTime(0.1);

	UnitMovePosFromPos(15,4, 15,7);
	UnitMovePosFromPos(14,3, 14,6);
	UnitMovePosFromPos(15,3, 15,6);
	UnitMovePosFromPos(16,3, 16,6);
	UnitMovePosFromPos(13,2, 13,5);
	UnitMovePosFromPos(14,2, 14,5);
	UnitMovePosFromPos(16,2, 16,5);
	UnitMovePosFromPos(17,2, 17,5);
	UnitMovePosFromPos(13,1, 13,4);
	UnitMovePosFromPos(14,1, 14,4);
	UnitMovePosFromPos(16,1, 16,4);
	UnitMovePosFromPos(17,1, 17,4);
	UnitMoveWait();
end

function _u30aa_30eb_30c6_30f3_30b7_30a2_66b4_8d70_5f8c()
	CursorSetPos_FromPid( "PID_M014_オルテンシア" )
	Yield()
	WaitTime(0.5)

	Talk( "MID_EV1" )
	UnitSetItemEquip( "PID_M014_オルテンシア", "IID_ベレト_天帝の覇剣" )

	Tutorial("TUTID_暴走")

	AiSetPriority("PID_M014_オルテンシア", 50)

	AiSetPriority("PID_M014_マロン", 100)
	AiSetPriority("PID_M014_モーヴ", 100)
	AiSetPriority("PID_M014_セピア", 100)
	AiSetPriority("PID_M014_イルシオン兵_ブレイブヒーロー", 100)
	AiSetPriority("PID_M014_イルシオン兵_ソードファイター", 100)
	AiSetPriority("PID_M014_イルシオン兵_ハイプリースト", 100)
	AiSetPriority("PID_M014_イルシオン兵_モンク", 100)
	AiSetPriority("PID_M014_イルシオン兵_ソードマスター", 100)

	AiSetSequence("PID_M014_オルテンシア", AI_ORDER_ATTACK, "AI_AT_EngageDance","1,1")

	AiSetSequence("PID_M014_イルシオン兵_ブレイブヒーロー", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_イルシオン兵_ソードファイター", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_イルシオン兵_ハイプリースト", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_イルシオン兵_モンク", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_イルシオン兵_ソードマスター", AI_ORDER_CAUSE, "AI_AC_Everytime")

	if	MapGetPhase() == FORCE_PLAYER then
		VariableSet( g_key_bosszou, 1 );
		Dispos( "Enemy_Reinforcement4", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)
	end
end

function _u30dc_30b9_90e8_5c4b_5897_63f4()

	if VariableGet( g_key_bosszou ) == 0 then
		if VariableGet( "オルテンシア暴走後_済" ) == 1 then
			VariableSet( g_key_bosszou, 1 );
			Dispos( "Enemy_Reinforcement4", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
		end
	end
end

function _u30dc_30b9_90e8_5c4b_30a2_30af_30c6_30a3_30d6_5316()

	UnitClearStatus("PID_M014_オルテンシア", UNIT_STATUS_MOVE_NOT_ALLOW)

	AiSetSequence("PID_M014_オルテンシア", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_セピア", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_マロン", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M014_モーヴ", AI_ORDER_CAUSE, "AI_AC_Everytime")

	VariableSet(g_key_area, 1)

end

function _u5de6_76d7_8cca_767b_5834()
	Dispos("Enemy01", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end

function _u53f3_76d7_8cca_767b_5834()
	Dispos("Enemy02", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end

function _u9752_ff17_30bf_30fc_30f3_76f4_524d___5897_63f4()

	Dispos( "Enemy_Reinforcement1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Enemy_Reinforcement2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

end

function _u9752_ff11_ff12_30bf_30fc_30f3_76f4_524d___5897_63f4()

	Dispos( "Enemy_Reinforcement3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

end

function GameOver()

	Log("GameOver");

end
