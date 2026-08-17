Include("Common")

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss(true)
	WinRuleSetMID( "MID_RULE_M018_WIN" )

	_u30a4_30d9_30f3_30c8_767b_9332();

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 6, 20, "IID_はやての羽");
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 27, 11, "IID_チェンジプルフ");

	EventEntryTurn(_u706b_708e_7832_53f0_30c1_30e5_30fc_30c8_30ea_30a2_30eb, 1, 1, FORCE_PLAYER, "火炎砲台チュートリアル_済");
	EventEntryTurn(_u30ea_30f3_30c7_30f3_306e_3072_3068_3053_3068, 1, 1, FORCE_PLAYER, "リンデンのひとこと_済");
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u5b9d_3092_72d9_3046_30b7_30fc_30d5, 2, 2, FORCE_PLAYER, "宝を狙うシーフ_済");

	EventEntryTurn(_u5897_63f4_ff16_30bf_30fc_30f3_76ee, 6, 6, FORCE_PLAYER);

	EventEntryTalk(_u30ea_30f3_30c7_30f3_52a0_5165___30ea_30e5_30fc_30eb,"PID_リュール",FORCE_PLAYER, "PID_リンデン", FORCE_ENEMY, true, "リンデン会話_リュール_済")

	EventEntryTalk(_u30ea_30f3_30c7_30f3_52a0_5165___30a2_30a4_30d3_30fc,"PID_アイビー",FORCE_PLAYER, "PID_リンデン", FORCE_ENEMY, true, "リンデン会話_アイビー_済")

	EventEntryTalk(_u30ea_30f3_30c7_30f3_52a0_5165___30aa_30eb_30c6_30f3_30b7_30a2,"PID_オルテンシア",FORCE_PLAYER, "PID_リンデン", FORCE_ENEMY, true, "リンデン会話_オルテンシア_済")

	EventEntryBattleTalk(Talk, "PID_リンデン",FORCE_PLAYER, "PID_M018_イルシオン兵_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_リンデン_済",		"MID_BT6");
	EventEntryBattleTalk(Talk, "",FORCE_PLAYER, "PID_M018_イルシオン兵_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_済","MID_BT3");
	EventEntryDie(Talk, "PID_M018_イルシオン兵_ボス", FORCE_ENEMY, "死亡セリフ_ボス_済", "MID_BT7");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_リンデン", FORCE_ENEMY, true, "戦闘前会話_リンデン_済", "MID_BT1");
	EventEntryDie(EmptyFunction, "PID_リンデン", FORCE_ALL, "S_リンデン_死亡_済")

end

function _u5b9d_3092_72d9_3046_30b7_30fc_30d5()

	CursorSetPos_FromPid("PID_M018_シーフ")
	WaitTime(1.0)

	Talk("MID_EV4");

	CursorAnimeCreate(4, 1);
	CursorAnimeDelete()
	WaitTime(1.0)

end

function _u30ea_30f3_30c7_30f3_306e_3072_3068_3053_3068()
	CursorSetPos(26, 14);
	MapCameraWait();
	Talk("MID_OP3");
end

function _u706b_708e_7832_53f0_30c1_30e5_30fc_30c8_30ea_30a2_30eb()
	CursorAnimeCreate(15, 13);
	Talk("MID_OP4");
	CursorAnimeDelete()

	Tutorial( "TUTID_火炎砲台" );
end

function Cleanup()

	Log("Cleanup");

end

function Opening()
	Log("Opening");
	PuppetDemo("M018", "MID_OP1")
	PuppetDemo("M018", "MID_OP2")
end

function MapOpening()

	Log("MapOpening");

	_u30b9_30ad_30eb_88c5_5099( "PID_リンデン", "SID_死亡会話存在敵" )

end

function _u30ea_30f3_30c7_30f3_52a0_5165___30ea_30e5_30fc_30eb()
	Talk("MID_TK1");
	_u30ea_30f3_30c7_30f3_52a0_5165();
end

function _u30ea_30f3_30c7_30f3_4f1a_8a71___30ea_30e5_30fc_30eb()
	Talk("MID_TK4");
end

function _u30ea_30f3_30c7_30f3_52a0_5165___30a2_30a4_30d3_30fc()
	Talk("MID_TK2");
	_u30ea_30f3_30c7_30f3_52a0_5165();
end

function _u30ea_30f3_30c7_30f3_4f1a_8a71___30a2_30a4_30d3_30fc()
	Talk("MID_TK5");
end

function _u30ea_30f3_30c7_30f3_52a0_5165___30aa_30eb_30c6_30f3_30b7_30a2()
	Talk("MID_TK3");
	_u30ea_30f3_30c7_30f3_52a0_5165();
end

function _u30ea_30f3_30c7_30f3_4f1a_8a71___30aa_30eb_30c6_30f3_30b7_30a2()
	Talk("MID_TK6");
end

function _u30ea_30f3_30c7_30f3_52a0_5165()
	pid = "PID_リンデン";
	if UnitExistOnMap( pid ) then
		UnitJoin( pid );

		_u30b9_30ad_30eb_89e3_9664( "PID_リンデン", "SID_死亡会話存在敵" )
	end
end

function _u5897_63f4_ff16_30bf_30fc_30f3_76ee()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return false
	end

	Dispos("Enemy_Reinforcement0", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end

function EmptyFunction()
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
