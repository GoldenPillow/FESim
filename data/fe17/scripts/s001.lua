Include("Common")
g_pid_lueur = "PID_リュール"

g_key_join_jean			= "S_ジャン加入会話_済"
g_key_villager_all_dead	= "S_村人が全員死んだ"
g_key_villager_dead		= "S_村人が死んだ"
g_key_jean_dead			= "S_ジャン_死亡"
g_key_house_destroy		= "S_手前民家破壊_済"

function Startup()

	Log("Startup")
	WinRuleSetMID( "MID_RULE_S001_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function Cleanup()

	Log("Cleanup");

end

function _u5909_6570_767b_9332()
	VariableEntry( g_key_join_jean, 0 )
	VariableEntry( g_key_villager_all_dead, 0 )
	VariableEntry( g_key_villager_dead, 0 )
	VariableEntry( g_key_jean_dead, 0 )
	VariableEntry( g_key_house_destroy, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( _u9752_8ecd_ff11_30bf_30fc_30f3_958b_59cb_76f4_524d, 1, 1, FORCE_PLAYER )
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryTalk( _u30b8_30e3_30f3_52a0_5165_4f1a_8a71, g_pid_lueur, FORCE_PLAYER, "PID_ジャン", FORCE_ALLY, true, g_key_join_jean )

	EventEntryVisit( _u6c11_5bb6_8a2a_554f_ff11,  3, 5, "民家訪問１_済" )
	EventEntryDestroy(_u6c11_5bb6_7834_58ca___S_0_0_1_624b_524d, 3, 5, 3, 5, 2, 6, 4, 7)
	EventEntryVisit( _u6c11_5bb6_8a2a_554f_ff12, 19, 2, "民家訪問２_済" )
	EventEntryDestroy(_u6c11_5bb6_7834_58ca, 19, 2, 19, 2, 18, 3, 20, 4)

	EventEntryBattleTalk( Talk, "PID_S001_異形兵_ボス",	FORCE_ENEMY,	"",						FORCE_ALL,		true,	"戦闘前会話_ボス_済",			"MID_BT3" )

	EventEntryBattleTalk( Talk, "",						FORCE_ENEMY,	"PID_ジャン",			FORCE_ALLY,		false,	"戦闘前会話_敵_ジャン_済",		"MID_BT1" )
	EventEntryBattleTalk( Talk, "",						FORCE_ENEMY,	"PID_S001_ジャン_父親",	FORCE_ALLY,		false,	"戦闘前会話_敵_ジャン父親_済",	"MID_BT2" )

	EventEntryDie( Talk,			"PID_S001_異形兵_ボス",	FORCE_ENEMY,	condition_true,		"MID_BT4" )
	EventEntryDie( _u30b8_30e3_30f3_6b7b_4ea1,		"PID_ジャン",			FORCE_ALL,		g_key_jean_dead )
	EventEntryDie( _u30b8_30e3_30f3_7236_89aa_6b7b_4ea1,	"PID_S001_ジャン_父親",	FORCE_ALLY,		condition_true )
	EventEntryDie( _u6751_4eba_6b7b_4ea1,		"",						FORCE_ALLY,		_uc_o_n_d_i_t_i_o_n___6751_4eba_6b7b_4ea1 )

end

function Opening()

	Log("Opening")

	FadeInAndWait(FADE_NORMAL)
		PuppetDemo( "S001", "MID_OP1" )
	FadeOutAndWait(FADE_NORMAL)

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait(FADE_FAST)

	CursorSetPos(8, 10)
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()

	_u4e00_65e6_9000_907f()

	FadeInAndWait(FADE_FAST)

	Talk( "MID_OP2" )

	CursorSetPos(4, 3)
	WaitTime(0.2)
	_u5165_5834_6f14_51fa()
	MapCameraWait()

	Talk( "MID_OP3" )

end

function _u4e00_65e6_9000_907f()
	UnitSetPosFromPos( 3, 2,	3, 1 )
	UnitSetPosFromPos( 4, 2,	4, 1 )
	UnitSetPosFromPos( 5, 2,	5, 1 )
	UnitSetPosFromPos( 6, 2,	6, 1 )
	UnitSetPosFromPos( 3, 3,	3, 2 )
	UnitSetPosFromPos( 4, 3,	4, 2 )
	UnitSetPosFromPos( 5, 3,	5, 2 )
end

function _u5165_5834_6f14_51fa()
	UnitMovePosFromPos( 3, 2,	3, 3 )
	UnitMovePosFromPos( 4, 2,	4, 3 )
	UnitMovePosFromPos( 5, 2,	5, 3 )
	UnitMovePosFromPos( 3, 1,	3, 2 )
	UnitMovePosFromPos( 4, 1,	4, 2 )
	UnitMovePosFromPos( 5, 1,	5, 2 )
	UnitMovePosFromPos( 6, 1,	6, 2 )

	UnitMoveWait()
end

function _u9752_8ecd_ff11_30bf_30fc_30f3_958b_59cb_76f4_524d()

	CursorSetPos_FromPid( "PID_S001_ジャン_父親" )

	Talk( "MID_EV1" )

	Dispos( "Jean", DISPOS_FLAG_NONE )
	Yield()
	UnitRotation("PID_S001_ジャン_父親", ROTATE_LEFT)

	Talk( "MID_EV2" )

	UnitMovePos("PID_S001_ジャン_父親", 11, 13, MOVE_FLAG_NONE)
	UnitMovePos("PID_ジャン", 9, 12, MOVE_FLAG_NONE)
	UnitMoveWait()
	UnitRotation("PID_S001_ジャン_父親", ROTATE_RIGHT)
	UnitRotation("PID_ジャン", ROTATE_DOWN)

	Tutorial("TUTID_会話")

end

function _u6c11_5bb6_8a2a_554f_ff11()
	Talk( "MID_EV3" )
	ItemGain( MindGetUnit(), "IID_守備の薬" )
end

function _u6c11_5bb6_7834_58ca___S_0_0_1_624b_524d(x1, z1, x2, z2)
	TerrainSetBegin()
	for z = z1, z2 do
		for x = x1, x2 do
			TerrainSet( x, z, "TID_廃墟" )
		end
	end
	TerrainSetEnd()

	WaitTime( 1.0 )

	VariableSet( g_key_house_destroy, 1 )
end

function _u6c11_5bb6_8a2a_554f_ff12()
	local unit = MindGetUnit()
	local pid = UnitGetPID( unit )

	if pid == "PID_ジャン" then
		Talk( "MID_EV4_2" )
	else
		Talk( "MID_EV4" )
	end

	ItemGain( MindGetUnit(), "IID_力のしずく" )
end

function _u30b8_30e3_30f3_52a0_5165_4f1a_8a71()
	Talk( "MID_EV5" )

	local pid = "PID_ジャン"
	if UnitExistOnMap( pid ) then
		UnitJoin( pid )
	end

	WaitTime( 1.0 )

end

function _u30b8_30e3_30f3_6b7b_4ea1()
	if _uc_o_n_d_i_t_i_o_n___6751_4eba_6b7b_4ea1() then
		_u6751_4eba_6b7b_4ea1()
	end
end

function _u30b8_30e3_30f3_7236_89aa_6b7b_4ea1()
	Talk( "MID_BT6" )

	if _uc_o_n_d_i_t_i_o_n___6751_4eba_6b7b_4ea1() then
		_u6751_4eba_6b7b_4ea1()
	end
end

function _uc_o_n_d_i_t_i_o_n___6751_4eba_6b7b_4ea1()
	if VariableGet( g_key_villager_dead ) == 1 then
		do return false end
	end

	do return true end
end

function _u6751_4eba_6b7b_4ea1()
	VariableSet( g_key_villager_dead, 1 )
end

function MapEnding()

	Log("MapEnding")

	local count = 0
	local index = ForceUnitGetFirst(FORCE_ALLY)
	while index ~= nil do
		count = count + 1
		index = ForceUnitGetNext(index)
	end

	if count == 0 then
		VariableSet( g_key_villager_all_dead, 1 )
	end

	if VariableGet( g_key_villager_dead ) == 0 then
		Talk( "MID_ED1" )
		ItemGain(nil, "IID_サージ")
		ItemGain(nil, "IID_聖水")

	elseif VariableGet( g_key_villager_all_dead ) == 0 then
		Talk( "MID_ED2" )
		ItemGain(nil, "IID_サージ")

	else
		Talk( "MID_ED3" )

	end

end

function Ending()

	Log("Ending");

end

function GameOver()

	Log("GameOver");

end
