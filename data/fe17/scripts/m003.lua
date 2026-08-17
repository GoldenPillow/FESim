Include("Common")
g_pid_lueur = "PID_リュール"

function Startup()

	Log("Startup")

	WinRuleSetMID( "MID_RULE_M003_WIN" )

	VariableSet( "禁止_輸送隊", 2 )

	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurnAfter(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30a2_30a4_30c6_30e0_30c9_30ed_30c3_30d7, 1, 1, FORCE_PLAYER)

	EventEntryTurn(_u30bf_30fc_30f3___30d5_30a3_30ec_30cd_52e2_52a0_52e2, 2, 2, FORCE_PLAYER)

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30c1_30a7_30a4_30f3_30a2_30bf_30c3_30af,	"PID_ブシュロン", "チェインチュートリアル_済")
	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7279_52b9,				"PID_エーティエ", "特効チュートリアル_済")

	EventEntryBattleTalk(Talk, g_pid_lueur,	FORCE_PLAYER, "PID_M003_イルシオン兵_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_リュール_済",	"MID_BT2")
	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, "PID_M003_イルシオン兵_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_済",			"MID_BT1")
	EventEntryDie(Talk, "PID_M003_イルシオン兵_ボス", FORCE_ENEMY, conidtion_true, "MID_BT3")

	EventEntryTurn(VariableSet, -1, -1, FORCE_PLAYER, condition_true, "行動予約", PersonGetIndex(g_pid_lueur))
end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	FadeInAndWait(FADE_NORMAL)
		Movie("S07")
		SkipEscape()

	FadeOutAndWait(FADE_NORMAL)

	PuppetDemo("M003", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

	Dispos("OwnArmy", DISPOS_FLAG_NONE)

	CursorSetPos(9, 16)
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()

	FadeWait()

	AroundCameraSetPos(9, 3)

	FadeOutAndWait(FADE_FAST)
		SkipEscape()
		Movie("Scene05")
	FadeInAndWait(FADE_FAST)
	SoundPostEvent("Stop_BGM_Slow")

	Dispos("Lueur", DISPOS_FLAG_NONE)
	Yield()

	WaitTime( 1.0 )
	ModeSelect()

	WinRule()
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30a2_30a4_30c6_30e0_30c9_30ed_30c3_30d7()
	CursorAnimeCreate_FromPid("PID_M003_イルシオン兵_ボス")
	Tutorial( "TUTID_ドロップアイコン" )
	CursorAnimeDelete()

	Tutorial( "TUTID_Xヘルプ" )
end

function _u30bf_30fc_30f3___30d5_30a3_30ec_30cd_52e2_52a0_52e2()

	CursorSetPos_FromPid( g_pid_lueur )

	Talk("MID_EV1")
	Movie("S08")
	SkipEscape()

	Dispos("Filene", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	Talk("MID_EV2")

	UnitJoin( "PID_アルフレッド", "PID_エーティエ", "PID_ブシュロン" )

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30c1_30a7_30a4_30f3_30a2_30bf_30c3_30af(mid, message)
	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()

	Talk("MID_EV3")

	Tutorial( "TUTID_連携スタイル" )
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7279_52b9()
	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()

	Talk("MID_EV4")

	CursorAnimeCreate_FromPid("PID_M003_イルシオン兵_ランスペガサス_イベント")
	Talk("MID_EV5")
	CursorAnimeDelete()

	Tutorial( "TUTID_特効" )
end

function MapEnding()
	Log("MapEnding")

	CursorSetPos_FromPid(g_pid_lueue)

end

function Ending()

	Log("Ending")

	PuppetDemo("M003", "MID_ED1")

	Movie("Scene30")
	SkipEscape()

	FadeInAndWait(FADE_FAST)
		Movie("S09")
		SkipEscape()
	FadeOutAndWait(FADE_FAST)

	Movie("Scene06")
	SkipEscape()
end

function GameOver()

	Log("GameOver")

end
