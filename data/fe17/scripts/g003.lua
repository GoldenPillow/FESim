Include("Common")
Include("Common_P0")
Include("G003_Gimmick")

g_pid_boss		= "PID_G003_ヴェロニカ"
g_pid_bossN		= "PID_G003_ヴェロニカ_ノーマル"

g_Width			= 31
g_Height		= 28

g_FadeTime		= 0.25

g_JumpTime = 0.5

g_CameraSpeed = 1.5

g_Key_SkyCastle_Moved	= "飛空城の移動_済"

g_Key_Switch_Talk		= "起動盤_初回限定_会話イベント_済"

g_LeftUnitList = {}

g_RightUnitList = {}

g_JumpUnitList = {}

g_OverlapList = {}

function Startup()

	Log("Startup");

	_uS_t_a_r_t_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_ヴェロニカ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_G003_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function Cleanup()

	Log("Cleanup");

	_uC_l_e_a_n_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_ヴェロニカ" )

end

function Opening()

	Log("Opening");

	PuppetDemo("G003", "MID_OP1")
	FadeInAndWait(FADE_NORMAL)
		Movie("Kengen19")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)
	PuppetDemo("G003", "MID_OP2")

end

function MapOpening()

	Log("MapOpening");

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("G003", "MID_ED1")

	_u795e_7adc_306e_7ae0___7d0b_7ae0_58eb_52a0_5165( "GID_ヴェロニカ" )

	FadeInAndWait(FADE_FAST)
	Tutorial("TUTID_紋章士ヴェロニカ")

end

function GameOver()

	Log("GameOver");

end

function _u5909_6570_767b_9332()

	VariableEntry( g_Key_SkyCastle_Moved, 0 )

	VariableEntry( "起動盤_初回限定_会話イベント_済", 0 )

	VariableEntry( "ヴェロニカ召喚1_済", 0 )
	VariableEntry( "エリア1進入_済", 0 )

	VariableEntry( "ヴェロニカ召喚2_済", 0 )
	VariableEntry( "エリア2進入_済", 0 )

	VariableEntry( "島移動後増援_済", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER )

	EventEntryTurn( _u5473_65b9_958b_59cb_76f4_5f8c, 1, 1,  FORCE_PLAYER)

	EventEntryArea( _u8d77_52d5_76e4___5de6___4f5c_52d5, 11, 18, 11, 18, FORCE_PLAYER, "起動盤_初回限定_会話イベント_済" )
	EventEntryArea( _u8d77_52d5_76e4___53f3___4f5c_52d5, 24, 21, 24, 21, FORCE_PLAYER, "起動盤_初回限定_会話イベント_済" )

	EventEntryArea( _u5de6_53f3_306e_98db_7a7a_57ce___79fb_52d5, 11, 18, 11, 18, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5168_3066_306e_30b9_30a4_30c3_30c1_3092_62bc_4e0b )
	EventEntryArea( _u5de6_53f3_306e_98db_7a7a_57ce___79fb_52d5, 24, 21, 24, 21, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5168_3066_306e_30b9_30a4_30c3_30c1_3092_62bc_4e0b )

	EventEntryArea( EmptyFunction, 5, 16, 13, 26, FORCE_PLAYER, "エリア1進入_済" )
	EventEntryTurn( _u30f4_30a7_30ed_30cb_30ab_53ec_559a_1, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30f4_30a7_30ed_30cb_30ab_53ec_559a_1 )

	EventEntryArea( EmptyFunction, 19, 14, 29, 26, FORCE_PLAYER, "エリア2進入_済" )
	EventEntryTurn( _u30f4_30a7_30ed_30cb_30ab_53ec_559a_2, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30f4_30a7_30ed_30cb_30ab_53ec_559a_2 )

	EventEntryTurn( _u5cf6_79fb_52d5_5f8c_5897_63f4, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5cf6_79fb_52d5_5f8c_5897_63f4 )

	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	"PID_リュール",	FORCE_PLAYER, g_pid_boss,	FORCE_ENEMY, true, "戦闘前会話_ヴェロニカ_リュール_済" )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	"PID_リュール",	FORCE_PLAYER, g_pid_bossN,	FORCE_ENEMY, true, "戦闘前会話_ヴェロニカ_リュール_済" )
	EventEntryBattleTalk( _u30a2_30f3_30ca_3068_6226_95d8,		"PID_アンナ",	FORCE_PLAYER, g_pid_boss,	FORCE_ENEMY, true, "戦闘前会話_ヴェロニカ_アンナ_済" )
	EventEntryBattleTalk( _u30a2_30f3_30ca_3068_6226_95d8,		"PID_アンナ",	FORCE_PLAYER, g_pid_bossN,	FORCE_ENEMY, true, "戦闘前会話_ヴェロニカ_アンナ_済" )

end

function _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9()
	CursorAnimeCreate_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	WinRule()
	CursorAnimeDelete()
end

function _u30dc_30b9_306e_P_I_D_3092_53d6_5f97()

	if UnitExistOnMap( g_pid_boss ) then
		return g_pid_boss

	elseif UnitExistOnMap( g_pid_bossN ) then
		return g_pid_bossN

	end

	return ""

end

function _u8d77_52d5_76e4___5de6___4f5c_52d5()

	if _uc_o_n_d_i_t_i_o_n___5168_3066_306e_30b9_30a4_30c3_30c1_3092_62bc_4e0b() then

		VariableSet( "起動盤_初回限定_会話イベント_済", 1 )

	else

		_u8d77_52d5_76e4___521d_56de_9650_5b9a___4f1a_8a71_30a4_30d9_30f3_30c8___5b9f_884c( 24, 21 )

	end
end

function _u8d77_52d5_76e4___53f3___4f5c_52d5()

	if _uc_o_n_d_i_t_i_o_n___5168_3066_306e_30b9_30a4_30c3_30c1_3092_62bc_4e0b() then

		VariableSet( "起動盤_初回限定_会話イベント_済", 1 )

	else

		_u8d77_52d5_76e4___521d_56de_9650_5b9a___4f1a_8a71_30a4_30d9_30f3_30c8___5b9f_884c( 11, 18 )

	end
end

function _u8d77_52d5_76e4___521d_56de_9650_5b9a___4f1a_8a71_30a4_30d9_30f3_30c8___5b9f_884c( x, z )

	WaitTime( 0.5 )

	Talk("MID_EV5")

	VariableSet( "起動盤_初回限定_会話イベント_済", 1 )

	CursorSetPos( x, z )
	MapCameraWait()

	CursorAnimeCreate( x, z )

	Talk("MID_EV6")

	CursorAnimeDelete()

	WaitTime( 0.5 )

	local unitX = UnitGetX( MindGetUnit() )
	local unitZ = UnitGetZ( MindGetUnit() )

	CursorSetPos( unitX, unitZ )
	MapCameraWait()

end

function _uc_o_n_d_i_t_i_o_n___5168_3066_306e_30b9_30a4_30c3_30c1_3092_62bc_4e0b()

	if VariableGet( g_Key_SkyCastle_Moved ) == 0 then

		local isLeftSwitch = false
		local isRightSwitch = false

		local leftUnit = UnitGetByPos( 11, 18 )

		if leftUnit ~= nil then
			if UnitGetForce( leftUnit ) == FORCE_PLAYER then
				isLeftSwitch = true

			end
		end

		local rightUnit = UnitGetByPos( 24, 21 )

		if rightUnit ~= nil then
			if UnitGetForce( rightUnit ) == FORCE_PLAYER then
				isRightSwitch = true

			end
		end

		if isLeftSwitch and isRightSwitch then
			return true

		end
	end

	return false
end

function _u5de6_53f3_306e_98db_7a7a_57ce___79fb_52d5()

	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )

	CursorSetPos( 16, 17 )
	MapCameraWait()

	InitList( g_OverlapList )

	_u914d_7f6e_5730_5f62___5217_6319( g_LeftSkyCastle, g_OverlapList, g_VecX )
	_u914d_7f6e_5730_5f62___5217_6319( g_RightSkyCastle, g_OverlapList, -g_VecX )

	_u30d5_30a7_30fc_30c9_30a2_30a6_30c8( FADE_FAST, g_FadeTime )

	_u914d_7f6e_5730_5f62___6d88_53bb( g_OverlapList )

	_u30d5_30a7_30fc_30c9_30a4_30f3( FADE_FAST )

	Talk("MID_EV7")

	_u98db_7a7a_57ce___79fb_52d5_30a4_30d9_30f3_30c8()

	_u30d5_30a7_30fc_30c9_30a2_30a6_30c8( FADE_FAST, g_FadeTime )

	_u914d_7f6e_5730_5f62___518d_914d_7f6e( g_OverlapList )

	_u30d5_30a7_30fc_30c9_30a4_30f3( FADE_FAST )

	local x = UnitGetX( MindGetUnit() )
	local z = UnitGetZ( MindGetUnit() )

	CursorSetPos( x, z )
	MapCameraWait()

	VariableSet( g_Key_SkyCastle_Moved, 1 )

	Talk("MID_EV8")

	WaitTime( 1.0 )

end

function _u914d_7f6e_5730_5f62___5217_6319( skyCastle, overlapList, vecX )

	for pointer = 1, #skyCastle do

		local x = skyCastle[pointer].x
		local z = skyCastle[pointer].z

		local overlap = MapOverlapGet( x, z )

		if ( overlap ~= "TID_無し" ) then

			local overlapInfo = {}

			overlapInfo.prevX = x
			overlapInfo.prevZ = z
			overlapInfo.nextX = x + vecX
			overlapInfo.nextZ = z
			overlapInfo.overlap = overlap

			overlapList[#overlapList + 1] = overlapInfo

		end
	end
end

function _u914d_7f6e_5730_5f62___6d88_53bb( overlapList )

	MapOverlapSetBegin()

	for pointer = 1, #overlapList do

		local x = overlapList[pointer].prevX
		local z = overlapList[pointer].prevZ
		local overlap = overlapList[pointer].overlap

		if ( overlap == "TID_紋章氣" ) then

			MapOverlapRemove(x, z)

		else

			MapOverlapSet(x, z, "TID_無し")

		end
	end

	MapOverlapSetEnd()

end

function _u914d_7f6e_5730_5f62___518d_914d_7f6e( overlapList )

	MapOverlapSetBegin()

	for pointer = 1, #overlapList do

		local x = overlapList[pointer].nextX
		local z = overlapList[pointer].nextZ
		local overlap = overlapList[pointer].overlap

		MapOverlapSet(x, z, overlap)

	end

	MapOverlapSetEnd()

end

function _u30d5_30a7_30fc_30c9_30a2_30a6_30c8( speed, time )

	if #g_OverlapList > 0 then

		FadeOutAndWait( speed )
		WaitTime( time )

	end
end

function _u30d5_30a7_30fc_30c9_30a4_30f3( speed )

	if #g_OverlapList > 0 then

		FadeInAndWait( speed )

	end
end

function _u98db_7a7a_57ce___79fb_52d5_30a4_30d9_30f3_30c8()

	WaitTime( 0.25 )

	local leftSkyCastle = Copy( g_LeftSkyCastle )
	SortInAsc( leftSkyCastle )

	local rightSkyCastle = Copy( g_RightSkyCastle )
	SortInDesc( rightSkyCastle )

	InitList( g_JumpUnitList )

	_u6d6e_5cf6_3068_79fb_52d5_3059_308b_30e6_30cb_30c3_30c8___5217_6319( leftSkyCastle, g_LeftUnitList )
	_u8df3_8e8d_3059_308b_30e6_30cb_30c3_30c8___5217_6319( leftSkyCastle, g_LeftUnitList, g_VecX )

	_u6d6e_5cf6_3068_79fb_52d5_3059_308b_30e6_30cb_30c3_30c8___5217_6319( rightSkyCastle, g_RightUnitList )
	_u8df3_8e8d_3059_308b_30e6_30cb_30c3_30c8___5217_6319( rightSkyCastle, g_RightUnitList, -g_VecX )

	_u30e6_30cb_30c3_30c8_304c_79fb_52d5_3059_308b_524d_306e_4f4d_7f6e_3092_4fdd_5b58( g_LeftUnitList )
	_u30e6_30cb_30c3_30c8_304c_79fb_52d5_3059_308b_524d_306e_4f4d_7f6e_3092_4fdd_5b58( g_RightUnitList )
	_u30e6_30cb_30c3_30c8_304c_79fb_52d5_3059_308b_524d_306e_4f4d_7f6e_3092_4fdd_5b58( g_JumpUnitList )

	_u6d6e_5cf6_3068_79fb_52d5_3059_308b_30e6_30cb_30c3_30c8___79fb_52d5( g_LeftUnitList, g_VecX )

	_u6d6e_5cf6_3068_79fb_52d5_3059_308b_30e6_30cb_30c3_30c8___79fb_52d5( g_RightUnitList, -g_VecX )

	_u98db_7a7a_57ce___79fb_52d5_524d_30a8_30d5_30a7_30af_30c8___518d_751f()

	_u98db_7a7a_57ce___79fb_52d5_30a2_30cb_30e1___518d_751f( 11, 17, 11 + g_VecX )

	_u98db_7a7a_57ce___79fb_52d5_30a2_30cb_30e1___518d_751f( 24, 20, 24 - g_VecX )

	_u98db_7a7a_57ce___79fb_52d5_5f8c_30a8_30d5_30a7_30af_30c8___518d_751f()

	_u98db_7a7a_57ce___79fb_52d5_30a2_30cb_30e1___5f85_6a5f()

	UnitMoveWait()

	_u6d6e_5cf6_306e_5730_5f62___66f4_65b0( leftSkyCastle, g_VecX )

	_u6d6e_5cf6_306e_5730_5f62___66f4_65b0( rightSkyCastle, -g_VecX )

	WaitTime( 0.5 )

	_u8df3_8e8d_3059_308b_30e6_30cb_30c3_30c8___8df3_8e8d()

	UnitMoveWait()

	WaitTime( 0.5 )

end

function _u6d6e_5cf6_3068_79fb_52d5_3059_308b_30e6_30cb_30c3_30c8___5217_6319( skyCastle, unitList )

	InitList( unitList )

	for pointer = 1, #skyCastle do

		local x = skyCastle[pointer].x
		local z = skyCastle[pointer].z
		local unit = UnitGetByPos( x, z )

		if unit ~= nil then
			if ( UnitGetMoveCost( unit ) ~= "COST_飛行" ) then
				if Contains( unitList, unit ) == false then
					unitList[#unitList + 1] = unit
				end
			end
		end
	end
end

function _u8df3_8e8d_3059_308b_30e6_30cb_30c3_30c8___5217_6319( skyCastle, moveUnitList, vecX )

	for pointer = 1, #skyCastle do

		local x = skyCastle[pointer].x + vecX
		local z = skyCastle[pointer].z
		local terrain = skyCastle[pointer].terrain

		if terrain == "TID_廃墟" then

			local jumpUnit = UnitGetByPos( x, z )

			if jumpUnit ~= nil then

				if Contains( moveUnitList, jumpUnit ) == false then

					if Contains( g_JumpUnitList, jumpUnit ) == false then

						g_JumpUnitList[#g_JumpUnitList + 1] = jumpUnit
					end
				end
			end
		end
	end

	for pointer = 1, #moveUnitList do

		local moveUnit = moveUnitList[pointer]

		local x = UnitGetX( moveUnit ) + vecX
		local z = UnitGetZ( moveUnit )

		local jumpUnit = UnitGetByPos( x, z )

		if jumpUnit ~= nil then

			if Contains( moveUnitList, jumpUnit ) == false then

				if Contains( g_JumpUnitList, jumpUnit ) == false then

					g_JumpUnitList[#g_JumpUnitList + 1] = jumpUnit

				end
			end
		end
	end
end

function _u30e6_30cb_30c3_30c8_304c_79fb_52d5_3059_308b_524d_306e_4f4d_7f6e_3092_4fdd_5b58( unitList )

	MapHistoryPositionListBegin()

	for pointer = 1, #unitList do

		local unit = unitList[pointer]

		if unit ~= nil then
			MapHistoryPositionList( unit )
		end
	end

	MapHistoryPositionListEnd()
end

function _u6d6e_5cf6_3068_79fb_52d5_3059_308b_30e6_30cb_30c3_30c8___79fb_52d5( unitList, vecX )

	for pointer = 1, #unitList do

		local unit = unitList[pointer]

		local x = UnitGetX( unitList[pointer] ) + vecX
		local z = UnitGetZ( unitList[pointer] )

		UnitSyncSkyCastle( unit, x, z )
	end
end

function _u8df3_8e8d_3059_308b_30e6_30cb_30c3_30c8___8df3_8e8d()

	for pointer = 1, #g_JumpUnitList do

		local unit = g_JumpUnitList[pointer]

		UnitJumpPos( unit, -1, -1, g_JumpTime )

	end
end

function _u98db_7a7a_57ce___79fb_52d5_524d_30a8_30d5_30a7_30af_30c8___518d_751f()

	EffectPlay( "起動盤_移動前", 0, 0 )
	EffectWait()

end

function _u98db_7a7a_57ce___79fb_52d5_5f8c_30a8_30d5_30a7_30af_30c8___518d_751f()

	WaitTime( 3.5 )
	EffectPlay( "起動盤_移動後", 0 ,0 )
	EffectWait()

end

function _u98db_7a7a_57ce___79fb_52d5_30a2_30cb_30e1___518d_751f( x, z, movedX )

	MapObjectActionMoveNoWait( x, z, movedX, z, MAP_ACTION_DONE )

end

function _u98db_7a7a_57ce___79fb_52d5_30a2_30cb_30e1___5f85_6a5f()

	while EventIsPlayingSkyCastle() do
		coroutine.yield(true)
	end
end

function InitList( list )

	for i in pairs (list) do
		list[i] = nil

	end
end

function Contains( list, element )

	for pointer = 1, #list do
		if list[pointer] == element then
			return true

		end
	end

	return false
end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	if UnitExistOnMap( "PID_G000_幻影兵_マージカノン" ) then
		local x = UnitGetX( "PID_G000_幻影兵_マージカノン" )
		local z = UnitGetZ( "PID_G000_幻影兵_マージカノン" )

		CursorSetPos( x, z )
		MapCameraWait()

		CursorAnimeCreate( x, z )
			Tutorial( "TUTID_敵マージカノン_G003" )
		CursorAnimeDelete()
	end

	CursorSetPos( 15, 22 )
	MapCameraWait()

	Talk( "MID_EV2" )

	CursorAnimeCreate( 24, 21 )
	CursorAnimeCreate( 11, 18 )
	Talk("MID_EV3")
	CursorAnimeDelete()

	CursorSetPos_FromPid( "PID_リュール" )
	Talk("MID_EV4")

end

function _u5473_65b9_958b_59cb_76f4_5f8c()

	CursorSetPos_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	Talk( "MID_EV1" )

	local orgConfig = ConfigGetBattleScene()
	ConfigSetBattleScene(CONFIG_ANIM_ON)
	EventEngageSummon( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	ConfigSetBattleScene(orgConfig)

	Dispos( "Reinforcement1", DISPOS_FLAG_FOCUS + DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 1.0 )

end

function _u30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT1" )

end

function _u30a2_30f3_30ca_3068_6226_95d8()

	Talk( "MID_BT2" )

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___30f4_30a7_30ed_30cb_30ab_53ec_559a_1()

	if VariableGet( "ヴェロニカ召喚1_済" ) == 1 then
		return false
	end

	if VariableGet( g_Key_SkyCastle_Moved ) == 1 then
		return false
	end

	if VariableGet( "エリア1進入_済" ) == 1 then
		return true
	else
		return false
	end

end

function _u30f4_30a7_30ed_30cb_30ab_53ec_559a_1()

	local orgConfig = ConfigGetBattleScene()
	ConfigSetBattleScene(CONFIG_ANIM_ON)
	EventEngageSummon( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	ConfigSetBattleScene(orgConfig)

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS + DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 1.0 )
	VariableSet( "ヴェロニカ召喚1_済", 1 )

end

function _uc_o_n_d_i_t_i_o_n___30f4_30a7_30ed_30cb_30ab_53ec_559a_2()

	if VariableGet( "ヴェロニカ召喚2_済" ) == 1 then
		return false
	end

	if VariableGet( g_Key_SkyCastle_Moved ) == 1 then
		return false
	end

	if VariableGet( "エリア2進入_済" ) == 1 then
		return true
	else
		return false
	end

end

function _u30f4_30a7_30ed_30cb_30ab_53ec_559a_2()

	local orgConfig = ConfigGetBattleScene()
	ConfigSetBattleScene(CONFIG_ANIM_ON)
	EventEngageSummon( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	ConfigSetBattleScene(orgConfig)

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS + DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 1.0 )
	VariableSet( "ヴェロニカ召喚2_済", 1 )

end

function _uc_o_n_d_i_t_i_o_n___5cf6_79fb_52d5_5f8c_5897_63f4()

	if VariableGet( "島移動後増援_済" ) == 1 then
		return false
	end

	return VariableGet( g_Key_SkyCastle_Moved )

end

function _u5cf6_79fb_52d5_5f8c_5897_63f4()

	local orgConfig = ConfigGetBattleScene()
	ConfigSetBattleScene(CONFIG_ANIM_ON)
		EventEngageSummon( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	ConfigSetBattleScene(orgConfig)

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS + DISPOS_FLAG_FORCED + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 1.0 )

	VariableSet( "島移動後増援_済", 1 )

end
