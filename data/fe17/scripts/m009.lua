Include("Common")
g_pid_lueur = "PID_リュール";

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_M009_WIN" )

	VariableEntry( "砦到着_カゲツ_済", 0 );
	VariableEntry( "砦到着_ゼルコバ_済", 0 );

	_u30a4_30d9_30f3_30c8_767b_9332()

	_u30d5_30e9_30b0_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "アイビー_行動開始_済", 0 )
	VariableEntry( "アイビーアクティブ_済", 0 )
	VariableEntry( "アクスナイト_交戦開始_済", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_PLAYER);
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u30bf_30fc_30f3_ff15___7dd1_8ecd_A_I_8a2d_5b9a, 5, 5, FORCE_ALLY);

	EventEntryTurnAfter(_u6575_ff11_30bf_30fc_30f3_3081_30a4_30d9_30f3_30c8, 1, 1, FORCE_ENEMY, "敵１ターンめイベント_済")
	EventEntryTurn(_u7826_5230_7740___30ab_30b2_30c4, -1, -1, FORCE_PLAYER, _u5224_5b9a___7826_5230_7740___30ab_30b2_30c4 )
	EventEntryTurn(_u7826_5230_7740___30bc_30eb_30b3_30d0, -1, -1, FORCE_PLAYER, _u5224_5b9a___7826_5230_7740___30bc_30eb_30b3_30d0 )

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M009_アイビー", FORCE_ENEMY, true, "戦闘前会話_アイビー_済", "MID_BT1")
	EventEntryDie(Talk, "PID_M009_アイビー", FORCE_ENEMY, condition_true, "MID_BT2")

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M009_ゼルコバ", FORCE_ENEMY, true, "戦闘前会話_ゼルコバ_済", "MID_BT3")
	EventEntryDie(Talk, "PID_M009_ゼルコバ", FORCE_ENEMY, condition_true, "MID_BT4")

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M009_カゲツ", FORCE_ENEMY, true, "戦闘前会話_カゲツ_済", "MID_BT5")
	EventEntryDie(Talk, "PID_M009_カゲツ", FORCE_ENEMY, condition_true, "MID_BT6")

	EventEntryBattleTalk(Talk, "", FORCE_ENEMY, "PID_ジェーデ", FORCE_ALLY, true, "戦闘前会話_ジェーデ_済", "MID_BT7");

	EventEntryTalk(_u30b8_30a7_30fc_30c7_52a0_5165___30ea_30e5_30fc_30eb,		g_pid_lueur,		FORCE_PLAYER, "PID_ジェーデ", FORCE_ALLY,	true, "ジェーデ会話_リュール_済")
	EventEntryTalk(_u30b8_30a7_30fc_30c7_52a0_5165___30c7_30a3_30a2_30de_30f3_30c9,	"PID_ディアマンド", FORCE_PLAYER, "PID_ジェーデ", FORCE_ALLY,	true, "ジェーデ会話_ディアマンド_済")

	EventEntryTalk(Talk,						g_pid_lueur,		FORCE_PLAYER, "PID_ジェーデ", FORCE_PLAYER, true, "ジェーデ会話_リュール_済",		"MID_TK1")
	EventEntryTalk(Talk,						"PID_ディアマンド",	FORCE_PLAYER, "PID_ジェーデ", FORCE_PLAYER, true, "ジェーデ会話_ディアマンド_済",	"MID_TK3")

	EventEntryDie(EmptyFunction, "PID_ジェーデ", FORCE_ALL, "S_死亡セリフ_ジェーデ_済")

	EventEntryPickup(_u30a2_30a4_30d3_30fc___884c_52d5_958b_59cb, "PID_M009_アイビー", "アイビー_行動開始_済");
	EventEntryBattleBefore(_u30a2_30af_30b9_30ca_30a4_30c8___4ea4_6226_958b_59cb, "PID_M009_イルシオン兵_アクスナイト",FORCE_ENEMY, "", FORCE_ALL,	true, "アクスナイト_交戦開始_済");
	EventEntryTurn( _u30a2_30a4_30d3_30fc_30a2_30af_30c6_30a3_30d6, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30d3_30fc_30a2_30af_30c6_30a3_30d6 )

	EventEntryBattleBefore(_u30ab_30b2_30c4___6226_95d8_958b_59cb, "PID_M009_カゲツ",FORCE_ENEMY, "", FORCE_ALL);

	EventEntryBattleBefore(_u30bc_30eb_30b3_30d0___6226_95d8_958b_59cb, "PID_M009_ゼルコバ",FORCE_ENEMY, "", FORCE_ALL);
end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	PuppetDemo("M009", "MID_OP1")

	FadeInAndWait(FADE_NORMAL)
		Movie("S13")
		SkipEscape()

		Movie("Scene14")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

end

function MapOpening()

	Log("MapOpening");

	CursorSetPos_FromPid_DistanceModeNear(g_pid_lueur);
	FadeWait();

	Talk("MID_OP3");

end

function EmptyFunction()
end

function _u30a2_30a4_30d3_30fc___884c_52d5_958b_59cb()

	AiSetActive("PID_M009_ゼルコバ", true)
	AiSetActive("PID_M009_カゲツ", true)
	AiSetActive("M009_異形兵_シーフ_1", true)
	AiSetActive("M009_異形兵_シーフ_2", true)
	AiSetActive("M009_異形兵_ソードファイター_1", true)
	AiSetActive("M009_異形兵_ソードファイター_2", true)

end

function _u30ab_30b2_30c4___6226_95d8_958b_59cb()

	if DifficultyGet() == DIFFICULTY_NORMAL
		or DifficultyGet() == DIFFICULTY_HARD then
			do return false end
	end

	AiSetSequence("PID_M009_イルシオン兵_ランスアーマー隊", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_M009_イルシオン兵_ランスアーマー隊", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M009_イルシオン兵_ランスアーマー隊", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

end

function _u30bc_30eb_30b3_30d0___6226_95d8_958b_59cb()

	if DifficultyGet() == DIFFICULTY_NORMAL
		or DifficultyGet() == DIFFICULTY_HARD then
			do return false end
	end

	AiSetSequence("PID_M009_イルシオン兵_アクスアーマー隊", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_M009_イルシオン兵_アクスアーマー隊", AI_ORDER_CAUSE, "AI_AC_Everytime")
	AiSetSequence("PID_M009_イルシオン兵_アクスアーマー隊", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

end

function _u30a2_30af_30b9_30ca_30a4_30c8___4ea4_6226_958b_59cb()
end

function _uc_o_n_d_i_t_i_o_n___30a2_30a4_30d3_30fc_30a2_30af_30c6_30a3_30d6()

	if VariableGet( "アイビーアクティブ_済" ) == 1 then
		do return false end
	end

	if VariableGet( "アクスナイト_交戦開始_済" ) == 1 then
		do return true end
	end

	do return false end

end

function _u30a2_30a4_30d3_30fc_30a2_30af_30c6_30a3_30d6()

	VariableSet( "アイビーアクティブ_済", 1 )

end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	MapCameraWait()

	CursorSetPos_FromPid("PID_ジェーデ");
	Talk("MID_OP4");

	Tutorial("TUTID_会話")

end

function _u6575_ff11_30bf_30fc_30f3_3081_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid("PID_M009_アイビー")

	Talk("MID_EV1")

end

function _u30b8_30a7_30fc_30c7_52a0_5165___30ea_30e5_30fc_30eb()
	Talk("MID_TK1");
	_u30b8_30a7_30fc_30c7_52a0_5165();
end

function _u30b8_30a7_30fc_30c7_52a0_5165___30c7_30a3_30a2_30de_30f3_30c9()
	Talk("MID_TK2");
	_u30b8_30a7_30fc_30c7_52a0_5165();
end

function _u30b8_30a7_30fc_30c7_52a0_5165()
	pid = "PID_ジェーデ";
	if UnitExistOnMap( pid ) then
		UnitJoin( pid )
	end
end

function _u7826_5230_7740___30ab_30b2_30c4()
	CursorSetPos_FromPid( "PID_M009_カゲツ" );
	Talk( "MID_EV14" );

	Dispos("Enemy_Kagetsu_Fort", DISPOS_FLAG_NONE)
	Yield()
	WaitTime(0.5);

	AiSetSequence("PID_M009_カゲツ", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_M009_カゲツ", AI_ORDER_CAUSE, "AI_AC_AttackRange")
	AiSetSequence("PID_M009_カゲツ", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

	AiSetActive("PID_M009_カゲツ", false)

	VariableSet( "砦到着_カゲツ_済", 1 );

	if VariableGet( "アイビー_行動開始_済" ) == 1 then

	AiSetActive("PID_M009_カゲツ", true)
	AiSetActive("M009_異形兵_ソードファイター_1", true)
	AiSetActive("M009_異形兵_ソードファイター_2", true)
	end
end

function _u5224_5b9a___7826_5230_7740___30ab_30b2_30c4()
	pid = "PID_M009_カゲツ"
	x = 15
	z = 16

	if VariableGet( "砦到着_カゲツ_済" ) == 1 then
		do return false end
	end

	if not UnitExistOnMap( pid ) then
		do return false end
	end

	do return _u6307_5b9a_5ea7_6a19_306b_3044_308b_304b_5224_5b9a(pid, x, z) end
end

function _u7826_5230_7740___30bc_30eb_30b3_30d0()
	CursorSetPos_FromPid( "PID_M009_ゼルコバ" );
	Talk( "MID_EV15" );

	Dispos("Enemy_Zelkova_Fort", DISPOS_FLAG_NONE)
	Yield()
	WaitTime(0.5);

	AiSetSequence("PID_M009_ゼルコバ", AI_ORDER_ATTACK, "AI_AT_Attack")
	AiSetSequence("PID_M009_ゼルコバ", AI_ORDER_CAUSE, "AI_AC_AttackRange")
	AiSetSequence("PID_M009_ゼルコバ", AI_ORDER_MOVE, "AI_MV_WeakEnemy")

	AiSetActive("PID_M009_ゼルコバ", false)

	VariableSet( "砦到着_ゼルコバ_済", 1 );

	if VariableGet( "アイビー_行動開始_済" ) == 1 then

	AiSetActive("PID_M009_ゼルコバ", true)
	AiSetActive("M009_異形兵_シーフ_1", true)
	AiSetActive("M009_異形兵_シーフ_2", true)
	end
end

function _u5224_5b9a___7826_5230_7740___30bc_30eb_30b3_30d0()
	pid = "PID_M009_ゼルコバ"
	x = 15
	z = 2

	if VariableGet( "砦到着_ゼルコバ_済" ) == 1 then
		do return false end
	end

	if not UnitExistOnMap( pid ) then
		do return false end
	end

	do return _u6307_5b9a_5ea7_6a19_306b_3044_308b_304b_5224_5b9a(pid, x, z) end
end

function _u6307_5b9a_5ea7_6a19_306b_3044_308b_304b_5224_5b9a(pid, x, z)
	_x = UnitGetX(pid)
	_z = UnitGetZ(pid)

	if ( _x == x ) and ( _z == z ) then
		do return true end
	else
		do return false end
	end
end

function _u30bf_30fc_30f3_ff15___7dd1_8ecd_A_I_8a2d_5b9a()

	AiSetSequence("PID_ジェーデ", AI_ORDER_MOVE, "AI_MV_Position", "pos(12, 9)");
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
