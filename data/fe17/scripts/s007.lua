Include("Common")
g_pid_lueur		= "PID_リュール"
map_width		= 22
map_height		= 24

g_key_dragonPulse = "竜脈_済"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_カムイ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S007_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_dragonPulse, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryBattleTalk(Talk, "PID_S007_カムイ", FORCE_ENEMY, g_pid_lueur,		FORCE_PLAYER, true, "戦闘前会話_カムイ_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S007_カムイ", FORCE_ENEMY, "PID_セアダス",	FORCE_PLAYER, true, "戦闘前会話_カムイ_セアダス_済", "MID_BT2")

	EventEntryTurn(_u306f_3058_307e_308a_30a4_30d9_30f3_30c8, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4_ff11, 2, 2, FORCE_PLAYER)

	EventEntryTurnEnd(_u7adc_8108, 3, 3, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___7adc_8108)
	EventEntryTurnEnd(_u7adc_8108, 4, 4, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___7adc_8108___30ce_30fc_30de_30eb)
end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_カムイ" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S007", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait( FADE_FAST )

	FadeIn( FADE_FAST )

end

function _u306f_3058_307e_308a_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid( "PID_S007_カムイ" )

		Talk( "MID_EV1" )
		Talk( "MID_EV2" )

end

function _u5897_63f4_ff11()

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
	Yield()

end

function _uc_o_n_d_i_t_i_o_n___7adc_8108()

	if VariableGet( g_key_dragonPulse ) == 1 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___7adc_8108___30ce_30fc_30de_30eb()

	if VariableGet( g_key_dragonPulse ) == 1 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return true
	end

	return false

end

function _u7adc_8108()

	CursorSetPos_FromPid( "PID_S007_カムイ" )
	Talk( "MID_EV3" )

	CursorSetPos( 11, 12 )
	MapCameraWait()

	EffectPlay( "カムイ竜脈", 11, 12 )
	EffectWait()

	_u30de_30c3_30d7_5168_4f53_306e_5730_5f62_5909_5316( "TID_浅瀬", "TID_平地" )
	_u708e_4e0a_914d_7f6e()

	MapObjectAction( 11, 12, MAP_ACTION_DONE )
	MapMaterialSetFloat( "Terrain_Near", "Mt_Terrain_Bmap", "_RoughnessToWhite", 0 )
	MapMaterialSetFloat( "Terrain_Near", "Mt_Terrain_Combat", "_RoughnessToWhite", 0 )

	WaitTime( 1.0 )

	VariableSet( g_key_dragonPulse, 1 )

end

function _u30de_30c3_30d7_5168_4f53_306e_5730_5f62_5909_5316( fromTid, toTid )

	TerrainSetBegin()
	for x = 0, map_width-1 do
		for z = 0, map_height-1 do
			if TerrainGet(x, z) == fromTid then
				TerrainSet(x, z, toTid)
			end
		end
	end
	TerrainSetEnd()

end

function _u708e_4e0a_914d_7f6e()

	local fireList = {
		{  8,  1 },	{  9,  1 },	{ 10,  3 },	{ 11,  7 },
		{ 12,  9 },	{ 13, 10 },	{ 14, 10 },
		{  9, 11 },	{ 10, 11 },	{ 12, 12 },	{ 13, 12 },
		{  8, 13 },	{ 15, 13 },	{ 10, 14 },	{ 15, 15 },
		{  7, 16 },	{  5, 18 },	{  6, 18 },	{ 15, 18 },
		{ 17, 20 },	{ 18, 20 },	{  4, 22 },	{ 18, 22 }
	}

	MapOverlapSetBegin()
	for index in pairs( fireList ) do
		MapOverlapSet( fireList[index][1], fireList[index][2], "TID_炎上" )
	end
	MapOverlapSetEnd()

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S007", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "カムイ", "S007" )

end

function GameOver()

	Log("GameOver")

end
