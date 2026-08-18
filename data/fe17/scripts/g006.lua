Include("Common")
Include("Common_P0")

g_pid_lueur						= "PID_リュール"
g_pid_bossA						= "PID_G006_クロム"
g_pid_bossA2					= "PID_G006_クロム_移動－１"
g_pid_bossB						= "PID_G006_ルフレ"
g_pid_bossB2					= "PID_G006_ルフレ_移動－１"

g_CrystalMaxNum					= 3
g_CrystalPos = {
	{  2, 15 },
	{ 13,  7 },
	{ 24, 15 }
}

g_key_SortieNum					= "戦闘開始時出撃人数"
g_key_BrokenCrystalNum			= "水晶破壊数"
g_key_FirstBrokenCrystal		= "水晶破壊_初回_済"
g_key_FirstResetCrystal			= "水晶リセット_初回_済"
g_key_puddleOn_Judge			= "水たまり配置_判定"
g_key_puddleOn					= "水たまり配置_済"
g_key_BrokenBarrier				= "魔法障壁解除_済"
g_key_ReinforcementBrokenBarrier= "障壁破壊後増援_済"

g_key_battleTalk_chrom_lueur	= "戦闘会話_クロム_リュール_済"
g_key_battleTalk_chrom_lucina	= "戦闘会話_クロム_ルキナ_済"
g_key_battleTalk_reflet_lueur	= "戦闘会話_ルフレ_リュール_済"
g_key_battleTalk_reflet_lucina	= "戦闘会話_ルフレ_ルキナ_済"

g_key_ChromDie					= "クロム死亡_済"
g_key_RobinDie					= "ルフレ死亡_済"

g_width		= 27
g_height	= 27
g_puddleMap = {
	0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,1,0,1,0,1,0,0,1,1,0,0,0,0,0,1,0,0,1,0,0,0,0,
	0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,1,0,0,0,0,0,0,
	0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,1,1,0,1,0,0,
	0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,1,0,1,0,0,0,
	0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,0,1,0,0,0,1,0,
	1,0,0,1,1,1,0,1,0,0,0,0,0,0,0,1,1,0,1,0,0,0,1,0,0,
	0,1,0,0,0,1,1,0,1,1,0,1,0,0,0,1,0,1,0,0,0,0,0,0,1,
	0,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,1,1,0,1,0,0,0,0,
	0,0,0,0,0,1,0,1,0,1,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,
	0,0,0,0,1,1,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0,0,0,
	0,0,0,1,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,0,0,
	0,0,0,1,0,0,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,0,0,0,0,
	0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
}

function Startup()

	Log("Startup");

	_uS_t_a_r_t_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_クロム" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_G006_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_SortieNum,					0 )
	VariableEntry( g_key_BrokenCrystalNum,			0 )
	VariableEntry( g_key_FirstBrokenCrystal,		0 )
	VariableEntry( g_key_FirstResetCrystal,			0 )
	VariableEntry( g_key_puddleOn_Judge,			0 )
	VariableEntry( g_key_puddleOn,					0 )
	VariableEntry( g_key_BrokenBarrier,				0 )
	VariableEntry( g_key_ReinforcementBrokenBarrier,0 )
	VariableEntry( g_key_ChromDie,					0 )
	VariableEntry( g_key_RobinDie,					0 )
	VariableEntry( g_key_battleTalk_chrom_lueur,	0 )
	VariableEntry( g_key_battleTalk_chrom_lucina,	0 )
	VariableEntry( g_key_battleTalk_reflet_lueur,	0 )
	VariableEntry( g_key_battleTalk_reflet_lucina,	0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryDestroy(_u6c34_6676___7834_58ca,		g_CrystalPos[1][1], g_CrystalPos[1][2])
	EventEntryDestroy(_u6c34_6676___7834_58ca,		g_CrystalPos[2][1], g_CrystalPos[2][2])
	EventEntryDestroy(_u6c34_6676___7834_58ca,		g_CrystalPos[3][1], g_CrystalPos[3][2])

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c,		 1,  1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9,	 1,  1, FORCE_PLAYER)
	EventEntryTurn(_u6c34_6676___30ea_30bb_30c3_30c8,		 2, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6c34_6676___30ea_30bb_30c3_30c8)

	EventEntryTurn(_u5897_63f4_ff14_30bf_30fc_30f3_3081,		 4,  4, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff14_30bf_30fc_30f3_3081)
	EventEntryTurn(_u5897_63f4_ff16_30bf_30fc_30f3_3081,		 6,  6, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff16_30bf_30fc_30f3_3081)

	EventEntryTurn(_u5897_63f4___30a8_30ea_30a2_5965,		 2, 50, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4___30a8_30ea_30a2_5965)

	EventEntryFixed(EmptyFunction, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30d7_30ec_30a4_30e4_30fc_8ecd_3070_3089_3064_304d_30c1_30a7_30c3_30af)
	EventEntryTurn(_u6c34_6d78_3057_30a4_30d9_30f3_30c8,		-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6c34_6d78_3057_30a4_30d9_30f3_30c8)

	EventEntryTurn(_u969c_58c1_7834_58ca_5f8c_5897_63f4,		-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___969c_58c1_7834_58ca_5f8c_5897_63f4)

	EventEntryDie(EmptyFunction,		"PID_G006_クロム",		FORCE_ENEMY, g_key_ChromDie)
	EventEntryDie(EmptyFunction,		"G006_クロム_移動－１",	FORCE_ENEMY, g_key_ChromDie)

	EventEntryDie(_u30af_30ed_30e0_30a8_30f3_30b2_6280_A_I_5909_66f4, "PID_G006_ルフレ",		FORCE_ENEMY, g_key_RobinDie)
	EventEntryDie(_u30af_30ed_30e0_30a8_30f3_30b2_6280_A_I_5909_66f4, "G006_ルフレ_移動－１",	FORCE_ENEMY, g_key_RobinDie)

	EventEntryBattleTalk( _u30af_30ed_30e0___30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_bossA,	FORCE_ENEMY, true, g_key_battleTalk_chrom_lueur )
	EventEntryBattleTalk( _u30af_30ed_30e0___30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_bossA2,	FORCE_ENEMY, true, g_key_battleTalk_chrom_lueur )
	EventEntryBattleTalk( _u30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_bossA,	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8 )
	EventEntryBattleTalk( _u30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_bossA2,	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8 )
	EventEntryBattleTalk( _u30eb_30d5_30ec___30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_bossB,	FORCE_ENEMY, true, g_key_battleTalk_reflet_lueur )
	EventEntryBattleTalk( _u30eb_30d5_30ec___30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_bossB2,	FORCE_ENEMY, true, g_key_battleTalk_reflet_lueur )
	EventEntryBattleTalk( _u30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_bossB,	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8 )
	EventEntryBattleTalk( _u30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_bossB2,	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8 )

end

function Cleanup()

	Log("Cleanup");

	_uC_l_e_a_n_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_クロム" )

end

function Opening()

	Log("Opening");

	PuppetDemo("G006", "MID_OP1")
	FadeInAndWait(FADE_NORMAL)
	Movie("Kengen18")
	SkipEscape()
	FadeOutAndWait(FADE_NORMAL)
	PuppetDemo("G006", "MID_OP2")

end

function MapOpening()

	Log("MapOpening");

	FadeOutAndWait( FADE_NORMAL )

	EffectCreate( "水晶障壁_ループ", 13, 15 )
	_u30af_30ed_30e0_3068_30eb_30d5_30ec_306e_30b9_30ad_30eb_8a2d_5b9a()

	FadeInAndWait( FADE_NORMAL )

end

function EmptyFunction()
end

function _u30af_30ed_30e0_306e_P_I_D_53d6_5f97()

	if UnitExistOnMap( g_pid_bossA2 ) then
		do return g_pid_bossA2 end

	end

	do return g_pid_bossA end

end

function _u30eb_30d5_30ec_306e_P_I_D_53d6_5f97()

	if UnitExistOnMap( g_pid_bossB2 ) then
		do return g_pid_bossB2 end

	end

	do return g_pid_bossB end

end

function _u9032_6483_958b_59cb_76f4_5f8c()

	CursorSetPos_FromPid( _u30af_30ed_30e0_306e_P_I_D_53d6_5f97() )

	Talk( "MID_EV1" )

	CursorSetPos( 13, 16 )
	MapCameraWait()
	WaitTime( 1.0 )
	Talk( "MID_EV2" )

	CursorAnimeCreate( g_CrystalPos[1][1], g_CrystalPos[1][2] )
	CursorAnimeDelete()

	CursorAnimeCreate( g_CrystalPos[3][1], g_CrystalPos[3][2] )
	CursorAnimeDelete()

	CursorAnimeCreate( g_CrystalPos[2][1], g_CrystalPos[2][2] )
	Talk( "MID_EV3" )
	CursorAnimeDelete()

	_u51fa_6483_4eba_6570_306e_30c1_30a7_30c3_30af()

end

function _u51fa_6483_4eba_6570_306e_30c1_30a7_30c3_30af()

	local count = 0
	local unit = ForceUnitGetFirst(FORCE_PLAYER)
	while unit ~= nil do
		count = count + 1
		unit = ForceUnitGetNext(unit)
	end

	VariableSet( g_key_SortieNum, count )

end

function _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9()

	CursorSetPos_FromPid( _u30af_30ed_30e0_306e_P_I_D_53d6_5f97() )

	local x = UnitGetX( _u30af_30ed_30e0_306e_P_I_D_53d6_5f97() )
	local z = UnitGetZ( _u30af_30ed_30e0_306e_P_I_D_53d6_5f97() )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)

	x = UnitGetX( _u30eb_30d5_30ec_306e_P_I_D_53d6_5f97() )
	z = UnitGetZ( _u30eb_30d5_30ec_306e_P_I_D_53d6_5f97() )
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)

	WaitTime( 2.0 )

	WinRule()

	MapObjectDelete( "Eff_Cursor01" )
	MapObjectDelete( "Eff_Cursor02" )

end

function _u6c34_6676___7834_58ca()

	local num = VariableGet( g_key_BrokenCrystalNum )
	num = num + 1
	VariableSet( g_key_BrokenCrystalNum, num )

	if ( num == g_CrystalMaxNum ) then
		_u6c34_6676___5168_7834_58ca()
	end

	if VariableGet( g_key_FirstBrokenCrystal ) == 0 then
		_u6c34_6676___521d_56de_7834_58ca_30a4_30d9_30f3_30c8()
	end

end

function _u6c34_6676___521d_56de_7834_58ca_30a4_30d9_30f3_30c8()
	CursorSetPos( 13, 15 )
	MapCameraWait()

	Talk( "MID_EV4" )

	VariableSet( g_key_FirstBrokenCrystal, 1 )
end

function _u6c34_6676___5168_7834_58ca()

	Talk( "MID_EV8" )

	_u9b54_6cd5_969c_58c1_89e3_9664()

	_u30af_30ed_30e0_3068_30eb_30d5_30ec_306e_30b9_30ad_30eb_89e3_9664()

	if VariableGet( g_key_puddleOn ) == 0 then
		_u6c34_6d78_3057_30a4_30d9_30f3_30c8()
	end

	VariableSet( g_key_BrokenBarrier, 1 )

end

function _u9b54_6cd5_969c_58c1_89e3_9664()

	CursorSetPos( 13, 15 )
	MapCameraWait()

	EffectPlay( "水晶障壁_破壊", 13, 15 )
	EffectDelete( "水晶障壁_ループ", 13, 15 )

	TerrainFill(	13, 15, "TID_床" )
	TerrainFill(	13, 18, "TID_床" )
	TerrainFill(	13, 20, "TID_防衛床" )

	TerrainSetBegin()
		TerrainSet(	 9,	21,	"TID_柱" )
		TerrainSet(	 9,	23,	"TID_柱" )
		TerrainSet(	17,	21,	"TID_柱" )
		TerrainSet(	17,	23,	"TID_柱" )
	TerrainSetEnd()

	Talk( "MID_EV9" )

end

function _u30af_30ed_30e0_3068_30eb_30d5_30ec_306e_30b9_30ad_30eb_8a2d_5b9a()

	_u30b9_30ad_30eb_88c5_5099( _u30af_30ed_30e0_306e_P_I_D_53d6_5f97(), "SID_ダメージ無効化" )
	_u30b9_30ad_30eb_88c5_5099( _u30eb_30d5_30ec_306e_P_I_D_53d6_5f97(), "SID_ダメージ無効化" )

end

function _u30af_30ed_30e0_3068_30eb_30d5_30ec_306e_30b9_30ad_30eb_89e3_9664()

	_u30b9_30ad_30eb_89e3_9664( _u30af_30ed_30e0_306e_P_I_D_53d6_5f97(), "SID_ダメージ無効化" )
	_u30b9_30ad_30eb_89e3_9664( _u30eb_30d5_30ec_306e_P_I_D_53d6_5f97(), "SID_ダメージ無効化" )

end

function _u6c34_6676_306e_6700_5927_H_P()
	if		_u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb() then
		do return 30 end

	elseif	_u30e2_30fc_30c9_306f_30cf_30fc_30c9() then
		do return 40 end

	elseif	_u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af() then
		do return 50 end

	end
end

function _uc_o_n_d_i_t_i_o_n___6c34_6676___30ea_30bb_30c3_30c8()

	if VariableGet( g_key_BrokenBarrier ) == 1 then
		do return false end
	end

	if VariableGet( g_key_SortieNum ) < 3 then
		do return false end
	end

	if		( VariableGet( "破壊_" .. tostring( g_CrystalPos[1][1] ) .. "_" .. tostring( g_CrystalPos[1][2] ) ) == 1 )
		or	( VariableGet( "破壊_" .. tostring( g_CrystalPos[2][1] ) .. "_" .. tostring( g_CrystalPos[2][2] ) ) == 1 )
		or	( VariableGet( "破壊_" .. tostring( g_CrystalPos[3][1] ) .. "_" .. tostring( g_CrystalPos[3][2] ) ) == 1 ) then

		do return true end
	end

	do return false end

end

function _u6c34_6676___30ea_30bb_30c3_30c8()

	_u6c34_6676___30ea_30bb_30c3_30c8_500b_5225( g_CrystalPos[1][1], g_CrystalPos[1][2] )
	_u6c34_6676___30ea_30bb_30c3_30c8_500b_5225( g_CrystalPos[2][1], g_CrystalPos[2][2] )
	_u6c34_6676___30ea_30bb_30c3_30c8_500b_5225( g_CrystalPos[3][1], g_CrystalPos[3][2] )

	if VariableGet( g_key_FirstResetCrystal ) == 0 then
		Talk( "MID_EV5" )

		VariableSet( g_key_FirstResetCrystal, 1 )
	end

	VariableSet( g_key_BrokenCrystalNum, 0 )

end

function _u6c34_6676___30ea_30bb_30c3_30c8_500b_5225( x, z )

	local _u7834_58ca_30d5_30e9_30b0	= "破壊_" .. tostring( x ) .. "_" .. tostring( z )
	local _uH_P_30d5_30e9_30b0		= "破壊_HP_" .. tostring( x ) .. "_" .. tostring( z )

	if VariableGet( _u7834_58ca_30d5_30e9_30b0 ) == 1 then
		CursorSetPos( x, z )
		MapCameraWait()

		EffectPlay( "水晶修復", x, z )
		WaitTime( 0.5 )
		EventStateObject( x, z, 0 )

		VariableSet( _u7834_58ca_30d5_30e9_30b0, 0 )
		VariableSet( _uH_P_30d5_30e9_30b0, _u6c34_6676_306e_6700_5927_H_P() )
		TerrainSetOne( x, z, "TID_水晶_味方破壊" )
		WaitTime( 1.0 )
	end

end

function _uc_o_n_d_i_t_i_o_n___30d7_30ec_30a4_30e4_30fc_8ecd_3070_3089_3064_304d_30c1_30a7_30c3_30af()

	if VariableGet( g_key_puddleOn ) == 1 then
		do return false end
	end

	local center_x, center_z = _u30d7_30ec_30a4_30e4_30fc_8ecd_306e_4e2d_5fc3_70b9_3092_7b97_51fa()

	local totalS = 0
	local count = 0

	local unit = ForceUnitGetFirst(FORCE_PLAYER)
	while unit ~= nil do

		local sx = math.abs( UnitGetX( unit ) - center_x )
		local sz = math.abs( UnitGetZ( unit ) - center_z )

		totalS = totalS + sx + sz
		count = count + 1

		unit = ForceUnitGetNext(unit)
	end

	local aveS = totalS / count

	if aveS >= 5 then
		VariableSet( g_key_puddleOn_Judge, 1 )
	end

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff14_30bf_30fc_30f3_3081()
	do return ( VariableGet( g_key_ReinforcementBrokenBarrier ) == 0 ) end
end

function _u5897_63f4_ff14_30bf_30fc_30f3_3081()

	_u5897_63f4( "Reinforcement1_1", DISPOS_FLAG_FOCUS )

end

function _uc_o_n_d_i_t_i_o_n___6c34_6d78_3057_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_puddleOn ) == 1 then
		do return false end
	end

	do return ( VariableGet( g_key_puddleOn_Judge ) == 1 ) end

end

function _u6c34_6d78_3057_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid_DistanceModeNear( _u30eb_30d5_30ec_306e_P_I_D_53d6_5f97() )
	Talk( "MID_EV6" )

	_u6c34_6d78_3057()

	CursorSetPos_FromPid( g_pid_lueur )
	Talk( "MID_EV7" )

	_u5897_63f4( "Reinforcement2_1", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement2_2", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement2_3", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement2_4", DISPOS_FLAG_FOCUS )

	VariableSet( g_key_puddleOn, 1 )

end

function _u6c34_6d78_3057()

	MapOverlapSetBegin()

	for z = 1, g_height-2 do
		for x = 1, g_width-2 do

			local key = x + ( z - 1 ) * ( g_width - 2 )

			if g_puddleMap[key] == 1 then
				MapOverlapSet(x, z, "TID_水溜まり_永続")
			end

		end
	end

	MapOverlapSetEnd()

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff16_30bf_30fc_30f3_3081()
	do return ( VariableGet( g_key_ReinforcementBrokenBarrier ) == 0 ) and ( DifficultyGet() > DIFFICULTY_NORMAL ) end
end

function _u5897_63f4_ff16_30bf_30fc_30f3_3081()

	_u5897_63f4( "Reinforcement3_1", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement3_2", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement3_3", DISPOS_FLAG_FOCUS )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4___30a8_30ea_30a2_5965()

	do return ( VariableGet( g_key_BrokenBarrier ) == 0 ) end

end

function _u5897_63f4___30a8_30ea_30a2_5965()

	local turn = MapGetTurn()
	local label = "Reinforcement_turn" .. tostring(turn)

	_u5897_63f4( label .. "L", DISPOS_FLAG_FOCUS )
	_u5897_63f4( label .. "R", DISPOS_FLAG_FOCUS )

end

function _uc_o_n_d_i_t_i_o_n___969c_58c1_7834_58ca_5f8c_5897_63f4()

	do return ( VariableGet( g_key_ReinforcementBrokenBarrier ) == 0 ) and ( VariableGet( g_key_BrokenBarrier ) == 1 ) end

end

function _u969c_58c1_7834_58ca_5f8c_5897_63f4()

	_u5897_63f4( "Reinforcement4_1", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement4_2", DISPOS_FLAG_FOCUS )
	_u5897_63f4( "Reinforcement4_3", DISPOS_FLAG_FOCUS )

	VariableSet( g_key_ReinforcementBrokenBarrier, 1 )

end

function _u30af_30ed_30e0_30a8_30f3_30b2_6280_A_I_5909_66f4()

	if VariableGet( g_key_ChromDie ) == 0 then

		if UnitExistOnMap("PID_G006_クロム") then
			AiSetSequence("PID_G006_クロム",			AI_ORDER_ATTACK, "AI_AT_Attack")
		end

		if UnitExistOnMap("PID_G006_クロム_移動－１") then
			AiSetSequence("PID_G006_クロム_移動－１",	AI_ORDER_ATTACK, "AI_AT_Attack")
		end

	end

end

function _u5897_63f4( dispos, disposFlag )

	Dispos( dispos, disposFlag )
	Yield()
	WaitTime( 0.5 )

end

function _u30af_30ed_30e0___30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT2" )

	if _uc_o_n_d_i_t_i_o_n___30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8() then
		_u30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8()
	end

end

function _uc_o_n_d_i_t_i_o_n___30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8()

	if VariableGet( g_key_battleTalk_chrom_lucina ) == 1 then
		do return false end
	end

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end

	do return ( god == "GID_ルキナ" ) end

end

function _u30af_30ed_30e0___30eb_30ad_30ca_3068_6226_95d8()

	Talk( "MID_BT1" )

	VariableSet( g_key_battleTalk_chrom_lucina, 1 )

end

function _u30eb_30d5_30ec___30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT4" )

	if _uc_o_n_d_i_t_i_o_n___30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8() then
		_u30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8()
	end

end

function _uc_o_n_d_i_t_i_o_n___30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8()

	if VariableGet( g_key_battleTalk_reflet_lucina ) == 1 then
		do return false end
	end

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end

	do return ( god == "GID_ルキナ" ) end

end

function _u30eb_30d5_30ec___30eb_30ad_30ca_3068_6226_95d8()

	Talk( "MID_BT3" )

	VariableSet( g_key_battleTalk_reflet_lucina, 1 )

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("G006", "MID_ED1")

	_u795e_7adc_306e_7ae0___7d0b_7ae0_58eb_52a0_5165( "GID_クロム" )

	if GodUnitExists("GID_ルキナ") then
		PuppetDemo("G006", "MID_ED2")
	end

	FadeInAndWait(FADE_FAST)
	Tutorial("TUTID_紋章士クロム")

end

function GameOver()

	Log("GameOver");

end
