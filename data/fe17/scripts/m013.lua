Include("Common")
g_pid_lueur = "PID_リュール";

g_key_turn_count = "増援_章カウント"

g_key_visit_1	= "訪問_1_済"
g_key_visit_2	= "訪問_2_済"
g_key_visit_3	= "訪問_3_済"

g_key_house1destroy			= "S_民家１破壊_済"
g_key_house2destroy			= "S_民家２破壊_済"
g_key_house3destroy			= "S_民家３破壊_済"

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss(true)
	WinRuleSetMID( "MID_RULE_M013_WIN" )

	VariableEntry( g_key_turn_count, 0 )
	VariableEntry( g_key_visit_1, 0 )
	VariableEntry( g_key_visit_2, 0 )
	VariableEntry( g_key_visit_3, 0 )

	VariableEntry( g_key_house1destroy, 0 )
	VariableEntry( g_key_house2destroy, 0 )
	VariableEntry( g_key_house3destroy, 0 )

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_PLAYER);
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)
	EventEntryTurnAfter(_u6575_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_ENEMY);

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30a2_30a4_30af, "PID_ミスティラ", "チュートリアル_アイク済")

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M013_蛮族_お頭Ａ", FORCE_ENEMY, true, "戦闘前会話_蛮族_お頭Ａ_済", "MID_BT1");
	EventEntryDie(Talk, "PID_M013_蛮族_お頭Ａ", FORCE_ENEMY, "撃破セリフ_蛮族_お頭Ａ_済", "MID_BT2");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M013_蛮族_お頭Ｂ", FORCE_ENEMY, true, "戦闘前会話_蛮族_お頭Ｂ_済", "MID_BT3");
	EventEntryDie(Talk, "PID_M013_蛮族_お頭Ｂ", FORCE_ENEMY, "撃破セリフ_蛮族_お頭Ｂ_済", "MID_BT4");

	EventEntryVisit(_u8a2a_554f_30a4_30d9_30f3_30c8___1, 13, 14)
	EventEntryVisit(_u8a2a_554f_30a4_30d9_30f3_30c8___2,  2, 2)
	EventEntryVisit(_u8a2a_554f_30a4_30d9_30f3_30c8___3, 22, 6)

	EventEntryDestroy(_u6c11_5bb6_7834_58ca___30d5_30e9_30b0_30bb_30c3_30c8, 13, 14, 13, 14,		12, 15, 13, 16,		g_key_house1destroy)
	EventEntryDestroy(_u6c11_5bb6_7834_58ca___30d5_30e9_30b0_30bb_30c3_30c8,  2,  2,  2,  2,		 1,  3,  3,  4,		g_key_house2destroy)
	EventEntryDestroy(_u5965_6c11_5bb6_7834_58ca, 22,  6, 22,  6,		21,  7, 23,  8)

end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	OPEvent()
end

function OPEvent()

	PuppetDemo("M013", "MID_OP1")

	FadeInAndWait(FADE_SLOW);
		Movie("S15")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL);

	PuppetDemo("M013", "MID_OP2")
	PuppetDemo("M013", "MID_OP3")
	PuppetDemo("M013", "MID_OP4")

	FadeInAndWait(FADE_NORMAL)
		Movie("Kengen08")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

	PuppetDemo("M013", "MID_OP6")

end

function MapOpening()

	Log("MapOpening");

	UnitCreateGodUnit("PID_ミスティラ", "GID_アイク");
	UnitSetEngageCount("PID_ミスティラ", 7)

end

function _u5468_56de_30ab_30e1_30e9()

	FadeOutAndWait(FADE_NORMAL);

	CursorSetPos(5, 20);
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR);
	MapCameraWait();

	SkipEscape();

	FadeInAndWait(FADE_NORMAL);

	AroundCameraSetPos( 4,  4);
	AroundCameraSetPos(27,  3);
	AroundCameraSetPos(27, 20);
	AroundCameraSetPos(13, 20);
	AroundCameraSetPos(13, 12);
	AroundCameraSetPos( 5, 12);
	AroundCameraSetPos( 5, 20);

	FadeOutAndWait(FADE_NORMAL);
	CursorSetPos_FromPid(g_pid_lueur);
	FadeInAndWait(FADE_NORMAL);

end

function _u30ea_30e5_30fc_30eb_8ecd_5230_7740()

	UnitSetPosFromPos(2,21, 1,23)
	UnitSetPosFromPos(5,22,	3,23)
	UnitSetPosFromPos(4,21,	2,23)
	UnitSetPosFromPos(3,20,	2,22)
	UnitSetPosFromPos(2,19,	1,22)
	UnitSetPosFromPos(5,20,	4,23)
	UnitSetPosFromPos(4,19,	3,22)
	UnitSetPosFromPos(3,18,	2,20)

	CursorSetPos(5,20);
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR);
	MapCameraWait();

	FadeIn(FADE_NORMAL);
	WaitTime(0.1);

	UnitMovePosFromPos(1,23, 2,21)
	UnitMovePosFromPos(3,23, 5,22)
	UnitMovePosFromPos(2,23, 4,21)
	UnitMovePosFromPos(2,22, 3,20)
	UnitMovePosFromPos(1,22, 2,19)
	UnitMovePosFromPos(4,23, 5,20)
	UnitMovePosFromPos(3,22, 4,19)
	UnitMovePosFromPos(2,20, 3,18)
	UnitMoveWait();
end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid_DistanceModeNear("PID_M013_蛮族_お頭Ａ");
	Talk("MID_OP7");

	CursorAnimeCreate( 10, 16 )
	CursorAnimeDelete()
	UnitRotation(UnitGetByPos(10, 16), 13, 14)
	UnitMoveWait();
	Talk("MID_OP8");

	UnitMovePos("PID_ミスティラ", 10, 13, MOVE_FLAG_NONE);
	UnitMovePos("PID_パネトネ", 12, 13, MOVE_FLAG_NONE);
	UnitMovePos("PID_メリン", 11, 14, MOVE_FLAG_NONE);
	MapCameraWait();
	UnitMoveWait();

	UnitJoin( "PID_ミスティラ", "PID_メリン", "PID_パネトネ" )
	WaitTime(1.0)

	CursorSetPos_FromPid_DistanceModeNear(g_pid_lueur);

end

function _u6575_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid_DistanceModeNear("PID_M013_蛮族_お頭Ａ");
	MapCameraWait();

	Talk("MID_EV4");
end

function _u8a2a_554f_30a4_30d9_30f3_30c8___1()
	Talk("MID_EV1");
	ItemGain(MindGetUnit(), "IID_天使の衣")
end

function _u8a2a_554f_30a4_30d9_30f3_30c8___2()
	Talk("MID_EV2");
	ItemGain(MindGetUnit(), "IID_レスキュー")
end

function _u8a2a_554f_30a4_30d9_30f3_30c8___3()
	Talk("MID_EV3");
	ItemGain(MindGetUnit(), "IID_特効薬")
end

function _u5965_6c11_5bb6_7834_58ca()

	CursorSetPos_FromPid_DistanceModeNear("PID_M013_蛮族_お頭Ａ");
	MapCameraWait();

	Talk("MID_EV6");

	VariableSet( g_key_house3destroy, 1 )
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30a2_30a4_30af()
	CursorSetPos( 10, 9 )
	MapCameraWait()

	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W2H2", 8, 8)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W2H1", 12, 8)
	MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W2H2", 9, 10)
	MapObjectCreate("Eff_Cursor04", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W2H1", 12, 10)
	WaitTime( 2.0 )
	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")
	MapObjectDelete("Eff_Cursor03")
	MapObjectDelete("Eff_Cursor04")
	WaitTime( 1.0 )

	CursorSetPos_FromPid(MindGetUnit());
	MapCameraWait();
	Talk("MID_EV5");

	Tutorial( "TUTID_紋章士アイク" )

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
