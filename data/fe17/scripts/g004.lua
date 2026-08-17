Include("Common")
Include("Common_P0")

g_animSetOrg		= "オリジナルの杖アニメ設定"
g_StartupFirstTime	= "初回スタートアップ"
g_battleStart		= "進撃開始"

g_pid_lueur			= "PID_リュール"

g_pid_boss				= "PID_G004_セネリオ"
g_pid_boss_moveDown		= "PID_G004_セネリオ_移動－１"
g_pid_bossLuna			= "PID_G004_セネリオ_ルナ"
g_pid_bossLuna_moveDown	= "PID_G004_セネリオ_ルナ_移動－１"

g_key_areaEntry		= "エリア進入_済"
g_key_senerioActive	= "セネリオ_アクティブ_済"
g_key_smokeFirst	= "煙イベント初回_済"

g_key_battleTalk_senerio_lueur	= "戦闘会話_セネリオ_リュール_済"
g_key_battleTalk_senerio_ike	= "戦闘会話_セネリオ_アイク_済"

g_map_height		= 32
g_map_width			= 25

g_bombDamage		= 10
g_per				= 10
g_maxOverlap		= 90

AREA_A = 1
AREA_B = 2
AREA_C = 3
AREA_D = 4

g_smokeDistOffset = {
	{ 5, 6, 4, 4 },
	{ 8, 9, 7, 7 },
	{ 8, 9, 7, 7 }
	}

g_rockInSpot = {
	{ 2, 10},
	{ 3,  4},
	{23, 24},
	{23, 16}
}

g_rockOutSpot = {
	{
		{ area = AREA_A, point = { 4, 20}, w = 2, h = 2, prob = 25 },
		{ area = AREA_A, point = { 5, 14}, w = 2, h = 3, prob = 25 },
		{ area = AREA_A, point = { 8, 11}, w = 2, h = 3, prob = 25 },
		{ area = AREA_A, point = {11, 16}, w = 3, h = 2, prob = 25 }
	},
	{
		{ area = AREA_B, point = {10,  6}, w = 2, h = 2, prob = 50 },
		{ area = AREA_B, point = {15,  2}, w = 3, h = 2, prob = 50 }
	},
	{
		{ area = AREA_C, point = {10, 25}, w = 3, h = 2, prob = 33 },
		{ area = AREA_C, point = {12, 21}, w = 2, h = 3, prob = 33 },
		{ area = AREA_C, point = {15, 18}, w = 3, h = 2, prob = 33 }
	},
	{
		{ area = AREA_D, point = {13, 11}, w = 2, h = 3, prob = 50 },
		{ area = AREA_D, point = {15,  9}, w = 3, h = 3, prob = 50 }
	}
}

g_smokeList = {
	{ x= 3, z=11, w= 8, h=11 },
	{ x= 8, z= 2, w= 6, h= 9 },
	{ x= 9, z=20, w=10, h= 8 },
	{ x=11, z= 9, w=13, h=10 }
}

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_G004_WIN" )

	_uS_t_a_r_t_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_セネリオ" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

	g_bombDamage = VariableGet( "火山弾ダメージ" )

	if VariableGet( g_StartupFirstTime ) == 1 then
		local config_org = ConfigGetSupportScene()
		if config_org == CONFIG_ANIM_ON then
			VariableSet( g_animSetOrg, config_org )
			ConfigSetSupportScene( CONFIG_ANIM_PLAYER_TURN )
		end

		VariableSet( g_StartupFirstTime, 0 )
	end

end

function _u5909_6570_767b_9332()
	VariableEntry( g_key_areaEntry,					0 )
	VariableEntry( g_key_senerioActive,				0 )
	VariableEntry( g_key_smokeFirst,				0 )
	VariableEntry( g_key_battleTalk_senerio_lueur,	0 )
	VariableEntry( g_key_battleTalk_senerio_ike,	0 )
	VariableEntry( "火山弾ダメージ",				g_bombDamage )

	VariableEntry( g_animSetOrg,					-1 )
	VariableEntry( g_StartupFirstTime,				1 )
	VariableEntry( g_battleStart,					0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )
	EventEntryTurn( _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u7159,		2, -1, FORCE_PLAYER )
	EventEntryTurn( _u706b_5c71_5f3e,	1, -1, FORCE_ENEMY )

	EventEntryArea( EmptyFunction, 5, 12, 16, 15, FORCE_PLAYER, g_key_areaEntry )

	EventEntryTurn( _u5897_63f4_ff12_30bf_30fc_30f3,		2,	2,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff14_30bf_30fc_30f3,		4,	4,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff16_30bf_30fc_30f3,		6,	6,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff18_30bf_30fc_30f3,		8,	8,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff11_ff10_30bf_30fc_30f3,		10,	10,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff11_ff12_30bf_30fc_30f3,		12,	12,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff11_ff14_30bf_30fc_30f3,		14,	14,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff11_ff16_30bf_30fc_30f3,		16,	16,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4_ff11_ff18_30bf_30fc_30f3_4ee5_964d,	18,	-1,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )

	EventEntryBattleAfter(EmptyFunction, "", FORCE_ALL, g_pid_boss,					FORCE_ENEMY, true, g_key_senerioActive)
	EventEntryBattleAfter(EmptyFunction, "", FORCE_ALL, g_pid_boss_moveDown,		FORCE_ENEMY, true, g_key_senerioActive)
	EventEntryBattleAfter(EmptyFunction, "", FORCE_ALL, g_pid_bossLuna,				FORCE_ENEMY, true, g_key_senerioActive)
	EventEntryBattleAfter(EmptyFunction, "", FORCE_ALL, g_pid_bossLuna_moveDown,	FORCE_ENEMY, true, g_key_senerioActive)

	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_boss,				FORCE_ENEMY, true, g_key_battleTalk_senerio_lueur )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_boss_moveDown,		FORCE_ENEMY, true, g_key_battleTalk_senerio_lueur )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_bossLuna,			FORCE_ENEMY, true, g_key_battleTalk_senerio_lueur )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_bossLuna_moveDown,	FORCE_ENEMY, true, g_key_battleTalk_senerio_lueur )

	EventEntryBattleTalk( _u30a2_30a4_30af_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_boss,				FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30af_3068_6226_95d8 )
	EventEntryBattleTalk( _u30a2_30a4_30af_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_boss_moveDown,		FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30af_3068_6226_95d8 )
	EventEntryBattleTalk( _u30a2_30a4_30af_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_bossLuna,			FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30af_3068_6226_95d8 )
	EventEntryBattleTalk( _u30a2_30a4_30af_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_bossLuna_moveDown,	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30af_3068_6226_95d8 )

	EventEntryTbox(_u5b9d_7bb1_5165_624b,  3, 18, "IID_レスキュー")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 16, 27, "IID_2000G")

end

function Cleanup()

	Log("Cleanup");

	local config_org = VariableGet( g_animSetOrg )
	if ( VariableGet( g_battleStart ) == 0 ) and ( config_org ~= -1 ) and ( ConfigGetSupportScene() == CONFIG_ANIM_PLAYER_TURN ) then
		Dialog( "MID_TUT_NAVI_G004_ADVICE_END" )
		ConfigSetSupportScene( config_org )
	end

	_uC_l_e_a_n_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_セネリオ" )

end

function Opening()

	Log("Opening");

	PuppetDemo("G004", "MID_OP1")
	FadeInAndWait(FADE_NORMAL)
	Movie("Kengen16")
	SkipEscape()
	FadeOutAndWait(FADE_NORMAL)
	PuppetDemo("G004", "MID_OP2")

end

function MapOpening()

	Log("MapOpening");

	local addDamage = ( UnitGetLevel( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() ) * 0.5 )
	g_bombDamage = g_bombDamage + addDamage

	if		_u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb()		then
		g_bombDamage = g_bombDamage * 0.6
	elseif	_u30e2_30fc_30c9_306f_30cf_30fc_30c9()		then

	elseif	_u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af()	then
		g_bombDamage = g_bombDamage * 1.2
	end

	g_bombDamage = g_bombDamage - ( g_bombDamage % 1 )
	VariableSet( "火山弾ダメージ", g_bombDamage )

	if VariableGet( g_animSetOrg ) ~= -1 then
		Dialog( "MID_TUT_NAVI_G004_ADVICE_START" )
	end

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("G004", "MID_ED1")

	_u795e_7adc_306e_7ae0___7d0b_7ae0_58eb_52a0_5165( "GID_セネリオ" )

	if GodUnitExists("GID_アイク") then
		PuppetDemo("G004", "MID_ED2")
	end

	FadeInAndWait(FADE_FAST)
	Tutorial("TUTID_紋章士セネリオ")

	local config_org = VariableGet( g_animSetOrg )
	if ( config_org ~= -1 ) and ( ConfigGetSupportScene() == CONFIG_ANIM_PLAYER_TURN ) then

		Dialog( "MID_TUT_NAVI_G004_ADVICE_END" )
		ConfigSetSupportScene( config_org )
		VariableSet( g_animSetOrg, -1 )

	end

end

function _u30dc_30b9_306e_P_I_D_3092_53d6_5f97()

	if UnitExistOnMap( g_pid_boss ) then
		return g_pid_boss

	if UnitExistOnMap( g_pid_boss_moveDown ) then
		return g_pid_boss_moveDown

	elseif UnitExistOnMap( g_pid_bossLuna ) then
		return g_pid_bossLuna

	elseif UnitExistOnMap( g_pid_bossLuna_moveDown ) then
		return g_pid_bossLuna_moveDown

	end

	return ""

end

function EmptyFunction()
end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	VariableSet( g_battleStart, 1 )

	local distOrg = CursorGetDistanceMode()

			CursorSetPos_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
			Talk( "MID_EV1" )

			CursorAnimeCreate_DistanceModeNear( g_rockInSpot[AREA_A][1], g_rockInSpot[AREA_A][2] )
			CursorAnimeDelete()

			_u706b_5c71_5f3e_51e6_7406( AREA_A, {{ spotID = 2, unitList = {} }} )

			WaitTime( 1.0 )

			Talk( "MID_EV2" )

			Tutorial( "TUTID_火山弾２" )

	CursorSetDistanceMode( distOrg )

end

function _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9()
	CursorAnimeCreate_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	WinRule()
	CursorAnimeDelete()
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4()

	if ( VariableGet( g_key_areaEntry ) == 0 ) and ( VariableGet( g_key_senerioActive ) == 0 ) then
		return true
	end

	return false

end

function _u5897_63f4_ff12_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement1_1" )
	_u5897_63f4( "Reinforcement1_2" )
end

function _u5897_63f4_ff14_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement2_1" )
	_u5897_63f4( "Reinforcement2_2" )
end

function _u5897_63f4_ff16_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement3_1" )
	_u5897_63f4( "Reinforcement3_2" )
end

function _u5897_63f4_ff18_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement4_1" )
	_u5897_63f4( "Reinforcement4_2" )
end

function _u5897_63f4_ff11_ff10_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement5_1" )
	_u5897_63f4( "Reinforcement5_2" )
	_u5897_63f4( "Reinforcement5_3" )
	_u5897_63f4( "Reinforcement5_4" )
end

function _u5897_63f4_ff11_ff12_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement6_1" )
	_u5897_63f4( "Reinforcement6_2" )
end

function _u5897_63f4_ff11_ff14_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement7_1" )
	_u5897_63f4( "Reinforcement7_2" )
end

function _u5897_63f4_ff11_ff16_30bf_30fc_30f3()
	_u5897_63f4( "Reinforcement8_1" )
	_u5897_63f4( "Reinforcement8_2" )
end

function _u5897_63f4_ff11_ff18_30bf_30fc_30f3_4ee5_964d()
	_u5897_63f4( "Reinforcement9_1" )
	_u5897_63f4( "Reinforcement9_2" )
	_u5897_63f4( "Reinforcement9_3" )
	_u5897_63f4( "Reinforcement9_4" )
end

function _u5897_63f4( dispos )
	Dispos( dispos, DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )
end

function _u706b_5c71_5f3e()

	local distOrg = CursorGetDistanceMode()

	for areaID = 1, 4 do
		local selectedSpotList = _u706b_5c71_5f3e_30a8_30ea_30a2_9078_51fa( areaID )
		if #selectedSpotList > 0 then
			_u706b_5c71_5f3e_51e6_7406( areaID, selectedSpotList )
		end
	end

	CursorSetDistanceMode( distOrg )

end

function _u706b_5c71_5f3e_30a8_30ea_30a2_9078_51fa( areaID )

	local tempList = {}

	for spotID, spot in pairs( g_rockOutSpot[areaID] ) do

		local unitList = {}
		for z = spot.point[2], spot.point[2] + spot.h - 1 do
			for x = spot.point[1], spot.point[1] + spot.w - 1 do

				local unit = UnitGetByPos( x, z )
				if unit ~= nil then
					unitList[ #unitList + 1 ] = unit
				end

			end
		end

		if ( #unitList > 0 ) then
			tempList[ #tempList + 1 ] = { spotID = spotID, unitList = unitList }
		end

	end

	return tempList

end

function _u706b_5c71_5f3e_51e6_7406( areaID, selectedSpotList )

	if #selectedSpotList == 0 then
		return
	end

	_u706b_5c71_5f3e_5674_51fa_6f14_51fa( areaID )

	local x = 0
	local z = 0
	for k, v in pairs( selectedSpotList ) do
		local spot = g_rockOutSpot[ areaID ][ v.spotID ]
		x = x + ( spot.point[1] + (spot.w-1) * 0.5 )
		z = z + ( spot.point[2] + (spot.h-1) * 0.5 )
	end
	x = x / #selectedSpotList
	z = z / #selectedSpotList
	CursorSetPos( x, z )
	MapCameraWait()

	for k, v in pairs( selectedSpotList ) do
		local spot = g_rockOutSpot[ areaID ][ v.spotID ]
		_u706b_5c71_5f3e_843d_4e0b_6f14_51fa( spot )
	end
	EffectWait()

	MapDamageBegin()
	for k, v in pairs( selectedSpotList ) do
		if ( #v.unitList > 0 ) then
			_u706b_5c71_5f3e_30c0_30e1_30fc_30b8_51e6_7406( v.unitList )
		end
	end
	MapDamageEnd()
	WaitTime( 1.0 )

end

function _u706b_5c71_5f3e_5674_51fa_6f14_51fa( areaID )

	local p = g_rockInSpot[areaID]

	CursorSetPos( p[1], p[2] )
	CursorSetDistanceMode( CURSOR_DISTANCE_NEAR )
	MapCameraWait()

	EffectPlay( "火山弾_噴出_G004", p[1], p[2] )

		local unit = UnitGetByPos( p[1], p[2] )
		if unit ~= nil then
			MapDamageBegin()

				MapDamageAdd(unit, g_bombDamage)

			MapDamageEnd()
		end

	EffectWait()

end

function _u706b_5c71_5f3e_843d_4e0b_6f14_51fa( spot )

	local p = {
		spot.point[1] + (spot.w-1) * 0.5,
		spot.point[2] + (spot.h-1) * 0.5
	}

	local deg = 0
	if ( spot.area == AREA_C ) or ( spot.area == AREA_D ) then
		deg = 180
	end

	EffectPlay( "火山弾_G004", p[1], p[2], deg )

end

function _u706b_5c71_5f3e_30c0_30e1_30fc_30b8_51e6_7406( unitList )

	for k, unit in pairs( unitList ) do
		MapDamageAdd(unit, g_bombDamage)
	end

end

function _u7159()

	local smokeMap = _u7159_30de_30c3_30d7_306e_53d6_5f97()

	smokeMap = _u7159_914d_7f6e_5834_6240_306e_9078_5b9a( smokeMap )
	smokeMap = _u7159_3092_9593_5f15_304f_51e6_7406( smokeMap )

	local distOrg = CursorGetDistanceMode()

	CursorSetPos( 11, 14 )
	CursorSetDistanceScale( 1.9 )
	CursorSetDistanceMode( CURSOR_DISTANCE_FAR )
	MapCameraWait()

		for areaID = 1, 4 do
			EffectPlay( "黒煙噴出", g_rockInSpot[areaID][1], g_rockInSpot[areaID][2] )
		end
		WaitTime(2.0)

		local put = { false, false, false, false }
		for areaID = 1, 4 do
			put[areaID] = _u7159_306e_914d_7f6e( areaID, smokeMap )
		end
		WaitTime(2.0)

		if ( ( put[1] or put[2] or put[3] or put[4] ) and ( VariableGet( g_key_smokeFirst ) == 0 ) ) then
			Talk( "MID_EV3" )
			Tutorial( "TUTID_黒煙" )
			VariableSet( g_key_smokeFirst, 1 )
		end

	CursorSetDistanceScale( 1.0 )
	CursorSetDistanceMode( distOrg )

end

function _u7159_30de_30c3_30d7_306e_53d6_5f97()

	local map = {}

	for z = 1, g_map_height - 2 do
		for x = 1, g_map_width - 2 do

			map[ #map + 1 ] = ( MapOverlapGet( x, z ) == "TID_煙_G004" )

		end
	end

	return map

end

function _u7159_914d_7f6e_5834_6240_306e_9078_5b9a( smokeMap )

	for areaID = 1, 4 do

		local point = g_smokeList[areaID]

		for z = point.z, point.z + point.h - 1 do
			for x = point.x, point.x + point.w - 1 do

				local dist = _u4e8c_70b9_9593_8ddd_96e2( x, z, g_rockInSpot[areaID][1], g_rockInSpot[areaID][2] )
				if dist < Min( MapGetTurn(), 32 ) + g_smokeDistOffset[DifficultyGet()+1][areaID] then

					local cost = TerrainGetMoveCost( x, z )
					if ( ( cost == "COST_平地" ) or ( cost == "COST_林" ) or ( cost == "COST_浅瀬" ) )
						and ( TerrainGet( x, z ) ~= "TID_火山弾跡" )
						and ( RandomGet( 100 ) < g_per ) then

						local key = ( g_map_width - 2 ) * ( z - 1 ) + ( x - 1 ) + 1
						smokeMap[ key ] = true

					end

				end

			end
		end

	end

	return smokeMap

end

function _u7159_3092_9593_5f15_304f_51e6_7406( smokeMap )

	local count = 0

	for index = 1, #smokeMap do

		if smokeMap[index] then
			count = count + 1
		end

	end

	local countN = 0
	if count > g_maxOverlap then

		local per = g_maxOverlap / count * 100

		for index = 1, #smokeMap do

			if smokeMap[index] then
				if ( RandomGet( 100 ) < per ) and ( countN < g_maxOverlap ) then
					smokeMap[index] = true
					countN = countN + 1

				else
					smokeMap[index] = false

				end
			end

		end

	end

	return smokeMap

end

function _u7159_306e_914d_7f6e( areaID, smokeMap )

	local none = true

		MapOverlapSetBegin()

		local point = g_smokeList[areaID]

		for z = point.z, point.z + point.h - 1 do
			for x = point.x, point.x + point.w - 1 do

				local key = ( g_map_width - 2 ) * ( z - 1 ) + ( x - 1 ) + 1

				if smokeMap[ key ] then
					if ( MapOverlapGet( x, z ) ~= "TID_煙_G004" ) and ( MapOverlapGet( x, z ) ~= "TID_紋章氣" ) then
						MapOverlapSet( x, z, "TID_煙_G004" )
						none = false
					end

				else
					if ( MapOverlapGet( x, z ) ~= "TID_無し" ) and ( MapOverlapGet( x, z ) ~= "TID_紋章氣" ) then
						MapOverlapSet( x, z, "TID_無し" )
					end

				end

			end
		end

		MapOverlapSetEnd()

	return not none

end

function _u30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT2" )

	if _uc_o_n_d_i_t_i_o_n___30a2_30a4_30af_3068_6226_95d8() then
		_u30a2_30a4_30af_3068_6226_95d8()
	end

end

function _uc_o_n_d_i_t_i_o_n___30a2_30a4_30af_3068_6226_95d8()

	if VariableGet( g_key_battleTalk_senerio_ike ) == 1 then
		return false
	end

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end

	return ( god == "GID_アイク" )

end

function _u30a2_30a4_30af_3068_6226_95d8()

	Talk( "MID_BT1" )

	VariableSet( g_key_battleTalk_senerio_ike, 1 )

end
