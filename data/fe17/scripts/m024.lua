Include("Common")

g_pid_lueur = "PID_リュール"

g_avalanche_distance = 10
g_key_avalanche_turn = "雪崩ターン"
g_key_avalanche_index = "雪崩リストインデックス"

g_avalanche_lanelist = { 2, 1, 3 }

g_avalanche_area = {
	{ Z0=3,		Z1=7 },
	{ Z0=11,	Z1=15 },
	{ Z0=19,	Z1=23 }
	}

g_map_width = 32

function Startup()

	Log("Startup")

	WinRuleSetEnemyNumberLessThanOrEqualTo( -1 )

	if ( DifficultyGet() == DIFFICULTY_NORMAL ) then
		WinRuleSetLimitTurn(-20)
		WinRuleSetMID( "MID_RULE_M024_WIN", 20 )
		LoseRuleSetMID( "MID_RULE_M024_LOSE", 20 )

	else
		WinRuleSetLimitTurn(-15)
		WinRuleSetMID( "MID_RULE_M024_WIN", 15 )
		LoseRuleSetMID( "MID_RULE_M024_LOSE", 15 )

	end

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( g_key_avalanche_turn, 0 )
	VariableEntry( g_key_avalanche_index, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9752_ff11_30bf_30fc_30f3_76f4_524d, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6___M_0_2_4, 1, 1, FORCE_PLAYER)

	EventEntryTurn( _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___96ea_5d29, 2, -1, FORCE_PLAYER )

	EventEntryTurn(_u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff11,  2,  2, FORCE_PLAYER)
	EventEntryTurn(_u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff12,  4,  4, FORCE_PLAYER)
	EventEntryTurn(_u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff13,  6,  6, FORCE_PLAYER)
	EventEntryTurn(_u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff14,  8,  8, FORCE_PLAYER)
	EventEntryTurn(_u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff15, 10, 10, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30ce_30fc_30de_30eb_4ee5_4e0a_304b)
	EventEntryTurn(_u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff16, 12, 12, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, g_pid_lueur,		FORCE_PLAYER, "PID_M024_リュール", FORCE_ENEMY, true, "戦闘前会話_黒リュール_ヴェイル_済",	"MID_BT2")
	EventEntryBattleTalk(Talk, "PID_ヴェイル",	FORCE_PLAYER, "PID_M024_リュール", FORCE_ENEMY, true, "戦闘前会話_黒リュール_リュール_済",	"MID_BT3")
	EventEntryBattleTalk(Talk, "",				FORCE_PLAYER, "PID_M024_リュール", FORCE_ENEMY, true, "戦闘前会話_黒リュール_済",			"MID_BT1")
	EventEntryDie(Talk, "PID_M024_リュール", FORCE_ENEMY, "撃破セリフ_黒リュール_済", "MID_BT4")

	EventEntryBattleAfter(_u9ed2_30ea_30e5_30fc_30eb_6483_7834_5f8c, "", FORCE_PLAYER, "PID_M024_リュール", FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___9ed2_30ea_30e5_30fc_30eb_6483_7834_5f8c)
	EventEntryFixed(_u9ed2_30ea_30e5_30fc_30eb_6483_7834_5f8c, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___9ed2_30ea_30e5_30fc_30eb_6483_7834_5f8c)

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M024", "MID_OP1")
	PuppetDemo("M024", "MID_OP2")
	PuppetDemo("M024", "MID_OP3")

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait( FADE_FAST )
	EffectCreate( "邪竜紋_準備", 30, 13 )
	FadeInAndWait( FADE_FAST )

end

function _u52dd_5229_6761_4ef6___M_0_2_4()
	CursorAnimeCreate_FromPid( "PID_M024_リュール" )
	WinRule()
	CursorAnimeDelete()

	Tutorial( "TUTID_ターン制限" )
end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___96ea_5d29()

	local turn = VariableGet( g_key_avalanche_turn )
	turn = ( turn + 1 ) % 2

	if turn == 0 then

		CursorSetPos(30, 13)
		MapCameraWait()

		EffectPlay( "邪竜紋_発動", 30, 13 )
		EffectDelete( "邪竜紋_準備", 30, 13 )
		WaitTime( 1.5 )

		_u96ea_5d29_767a_751f()

		_u96ea_5d29_8b66_544a()

	else

		CursorSetPos(30, 13)
		MapCameraWait()

		EffectCreate( "邪竜紋_準備", 30, 13 )
		WaitTime( 1.5 )

	end

	VariableSet( g_key_avalanche_turn, turn )

end

function _u9752_ff11_30bf_30fc_30f3_76f4_524d()

	CursorSetPos_FromPid( "PID_M024_リュール" )
	PlayFieldBgm(FORCE_PLAYER)
	Talk("MID_EV1")

	EffectPlay( "邪竜紋_発動", 30, 13 )
	EffectDelete( "邪竜紋_準備", 30, 13 )
	WaitTime( 1.5 )

	_u96ea_5d29_767a_751f()

	CursorSetPos_FromPid( g_pid_lueur )
	Talk("MID_EV2")

	_u96ea_5d29_8b66_544a()

	CursorSetPos_FromPid( g_pid_lueur )
	Talk("MID_EV3")

	Tutorial( "TUTID_雪崩" )

end

function _u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff11()
	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)
end

function _u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff12()
	Dispos( "Reinforcement2_1", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement2_2", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement2_3", DISPOS_FLAG_FOCUS )
	Yield()
end

function _u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff13()
	Dispos( "Reinforcement3_1", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement3_2", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement3_3", DISPOS_FLAG_FOCUS )
	Yield()
end

function _u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff14()
	Dispos( "Reinforcement4_1", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement4_2", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement4_3", DISPOS_FLAG_FOCUS )
	Yield()
end

function _uc_o_n_d_i_t_i_o_n___30ce_30fc_30de_30eb_4ee5_4e0a_304b()

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return true
	end

	return false
end

function _u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff15()
	Dispos( "Reinforcement5_1", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement5_2", DISPOS_FLAG_FOCUS )
	Yield()
end

function _u9752_30bf_30fc_30f3_76f4_524d___5897_63f4_ff16()
	Dispos( "Reinforcement6_1", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement6_2", DISPOS_FLAG_FOCUS )
	Yield()
end

function _uc_o_n_d_i_t_i_o_n___9ed2_30ea_30e5_30fc_30eb_6483_7834_5f8c()

	if VariableGet( "撃破セリフ_黒リュール_済" ) == 1 then
		return true
	end

	return false
end

function _u9ed2_30ea_30e5_30fc_30eb_6483_7834_5f8c()

	VariableSet( "勝利", 1 )

end

function MapEnding()

	Log("MapEnding")

	CursorSetPos( 30, 13 )
	MapCameraWait()

	EventBrokenObject( 30, 13 )
	WaitTime( 2.0 )

end

function Ending()

	Log("Ending")

end

function GameOver()

	Log("GameOver")

end

function _u4e2d_5fc3_70b9_3092_7b97_51fa( table_unit )

	local x = 0
	local z = 0
	local count = 0
	local center_x = nil
	local center_z = nil

	if ( #table_unit > 0 ) then
			for i=1, #table_unit do
					local t = table_unit[i]
					x = ( x + t.X )
					z = ( z + t.Z )
					count = count + 1
			end

			center_x = math.floor(x/count + 0.5)
			center_z = math.floor(z/count + 0.5)
	end

	return center_x, center_z

end

function _u30e6_30cb_30c3_30c8_30c6_30fc_30d6_30eb_306e_4f5c_6210()

	local lane = _u96ea_5d29_30ec_30fc_30f3_53d6_5f97()
	local area = g_avalanche_area[lane]

	local table_unit = {}

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do

		local _z = UnitGetZ(index)

		if ( area.Z0 <= _z ) and ( _z <= area.Z1 ) then
			table_unit[ #table_unit + 1 ] = { UNIT=index, X=UnitGetX(index), Z=_z }
		end

		index = ForceUnitGetNext(index)

	end

	return table_unit
end

function _u98db_884c_30e6_30cb_30c3_30c8_304b(pid)
	if ( UnitGetMoveCost( pid ) == "COST_飛行" ) then
		return true
	else
		return false
	end
end

function _u96ea_5d29_8b66_544a()

	_u8b66_544a_4eee_6f14_51fa()
	_u96ea_5d29_8b66_544a___30e1_30c3_30bb_30fc_30b8()

end

function _u96ea_5d29_767a_751f()

	_u96ea_5d29_6f14_51fa()

	local table_unit = _u30e6_30cb_30c3_30c8_30c6_30fc_30d6_30eb_306e_4f5c_6210()

	if ( #table_unit > 0 ) then

		local center_x, center_z = _u4e2d_5fc3_70b9_3092_7b97_51fa( table_unit )
		CursorSetPos( center_x, center_z )
		MapCameraWait()

		if ( #table_unit > 1 ) then
			table.sort( table_unit,
						function( a, b )
							return ( a.X < b.X )
						end
						)
		end

		for i=1, #table_unit do

				local t = table_unit[i]
				local xOffset = 0

				for j=1, g_avalanche_distance do

					if ( TerrainGetMoveCost( t.X + xOffset, t.Z ) == "COST_空" ) then
						break
					end

					local _xOffset = xOffset - 1

					if ( t.X + _xOffset < 1 ) then
						break
					end

					local unit = UnitGetByPos( t.X + _xOffset, t.Z )
					if ( unit ~= nil ) then
						break
					end

					if ( not _u98db_884c_30e6_30cb_30c3_30c8_304b( t.UNIT ) ) and ( TerrainGetMoveCost( t.X + _xOffset, t.Z ) == "COST_空" ) then
						break
					end

					if ( MapOverlapGet( t.X + _xOffset, t.Z ) == "TID_ブロック" ) then
						break
					end

					xOffset = _xOffset

				end

				if ( xOffset ~= 0 ) then
					UnitMovePos( t.UNIT, t.X + xOffset, t.Z, MOVE_FLAG_NONE )
				end

		end

		UnitMoveWait()

		for i=1, #table_unit do
			UnitRotation( table_unit[i].UNIT, ROTATE_RIGHT )
		end
		UnitMoveWait()

		MapCameraWait()

	end

	_u30bb_30c8_30ea_756a_53f7_66f4_65b0()

end

function _u96ea_5d29_8b66_544a___30e1_30c3_30bb_30fc_30b8()
	local lane = _u96ea_5d29_30ec_30fc_30f3_53d6_5f97()

	if		lane == 1 then
		Dialog( "MID_TUT_NAVI_M024_WARNING1" )

	elseif	lane == 2 then
		Dialog( "MID_TUT_NAVI_M024_WARNING2" )

	elseif	lane == 3 then
		Dialog( "MID_TUT_NAVI_M024_WARNING3" )

	end

end

function _u96ea_5d29_767a_751f___30e1_30c3_30bb_30fc_30b8()
	local lane = _u96ea_5d29_30ec_30fc_30f3_53d6_5f97()

end

function _u96ea_5d29_30ec_30fc_30f3_53d6_5f97()

	local laneIndex = VariableGet( g_key_avalanche_index )
	local lane = g_avalanche_lanelist[ laneIndex + 1 ]

	return lane

end

function _u30bb_30c8_30ea_756a_53f7_66f4_65b0()
	local laneIndex = VariableGet( g_key_avalanche_index )
	laneIndex = ( laneIndex + 1 ) % #g_avalanche_lanelist
	VariableSet( g_key_avalanche_index, laneIndex )
end

function _u8b66_544a_4eee_6f14_51fa()

	local lane = _u96ea_5d29_30ec_30fc_30f3_53d6_5f97()
	local area = g_avalanche_area[lane]

	CursorSetPos( 25, ( area.Z0 + area.Z1 ) / 2 )
	MapCameraWait()

	MapRangeAddBegin()
		for _z = area.Z0, area.Z1 do
			for _x=0, g_map_width-1 do
				if TerrainGet( _x, _z ) ~= "TID_岩" then
					MapRangeAdd( _x, _z )
				end
			end
		end
	MapRangeAddEnd()

	WaitTime( 1.0 )

end

function _u96ea_5d29_6f14_51fa()

	local lane = _u96ea_5d29_30ec_30fc_30f3_53d6_5f97()
	local area = g_avalanche_area[lane]

	CursorSetPos( g_map_width - 1, ( area.Z0 + area.Z1 ) / 2 )
	CursorSetDistanceMode( CURSOR_DISTANCE_NEAR )
	MapCameraWait()
	CursorSetPos( 1, ( area.Z0 + area.Z1 ) / 2, 13 )

	MapRangeClear()

	EffectPlay( "雪崩", g_map_width - 1, ( area.Z0 + area.Z1 ) / 2  )

	EffectWait()
	MapCameraWait()

end
