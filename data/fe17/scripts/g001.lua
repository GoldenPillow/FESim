Include("Common")
Include("Common_P0")

g_pid_lueur			= "PID_リュール"
g_pid_boss			= "PID_G001_チキ"
g_pid_boss_doragon		= "PID_G001_チキ_竜化"
g_pid_bossB			= "PID_G001_チキ_特効無効"
g_pid_bossB_doragon		= "PID_G001_チキ_竜化_特効無効"

g_Width			= 32
g_Height		= 32

g_1stIceSheet	= "1"
g_2ndIceSheet	= "2"

g_IceSheetMap = {
	"W"," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," "," ",
	"#","#","#","#","#","#"," "," "," "," "," "," "," ","#","#","#","#","#","#","#"," "," "," "," "," "," "," "," "," "," ",
	"#","#","#","#","#","#"," "," "," "," "," "," "," ","#","#","#","#","#","#","#"," "," ","#","#","#","#","#","#","#"," ",
	"T"," "," "," ","T","#"," "," ","M","M"," "," "," ","#"," ","0"," ","0"," ","#"," "," ","#","#","#","#","#","#","#"," ",
	"1","1"," ","1","1","#"," "," ","M","M","M"," "," ","#"," ","0","T","0"," ","#"," "," ","#","2","2","2","2","2","#"," ",
	" ","1","1","1"," ","#"," "," "," ","M","M","M"," ","#"," ","0","0","0"," ","#"," "," ","#","2"," "," "," ","2","#"," ",
	" "," ","1"," "," ","#"," "," ","M","M","M","M"," ","#","#","#"," ","#","#","#"," "," ","#","2"," "," "," ","2","#"," ",
	" "," ","2"," "," ","#"," "," ","M","M","M"," "," ","#","#","#"," ","#","#","#"," "," ","#"," "," "," "," "," ","#"," ",
	"#","#","2","#","#","#"," "," ","M","M"," "," "," "," "," ","#","0","#"," "," "," "," ","#","#","#"," ","#","#","#"," ",
	"#","#","2","#","#","#"," "," "," "," "," "," "," ","#","#","#","0","#","#","#"," "," ","#","#","#","0","#","#","#"," ",
	" ","#","0","#"," "," "," "," "," "," "," "," "," ","#","#","#","1","#","#","#"," "," "," "," ","#","0","#"," "," "," ",
	" ","#","0","#","#","#","#","#","#","#","#","#","#","#","P","0","1"," ","P","#","#","#","#","#","#"," ","#","#","#"," ",
	" ","#"," ","#","#","#","#","#","#","#","#","#","#","#","0","0"," "," ","0","#","#","#","#","#","#"," ","#","#","#"," ",
	" ","#"," ","0","0"," ","1","1"," "," ","1","0","0","1","1","1"," ","0","0"," "," "," ","2","2","0","0"," "," ","#"," ",
	" ","#"," ","0","2","2","2","1","0","1","1","0","1","1"," "," "," ","0"," "," ","2","2","2","0","2","2","0","2","#"," ",
	" ","#","1","1"," "," "," ","0","0","1"," "," "," "," "," ","0"," "," "," ","0","0","0"," "," "," "," ","2"," ","#"," ",
	" ","#","#","#","#","#","#","#","#","#","#","#"," ","#","P","0","0"," ","P","#"," ","#","#","#","#","#","#","#","#"," ",
	" ","#","#","#","#","#","#","#","#","#","#","#"," ","#"," ","0","0"," "," ","#"," ","#","#","#","#","#","#","#","#"," ",
	" ","#","#","#","#","#","#","#","#","#","#","#"," ","#","P","0"," ","0","P","#"," ","#","#","#","#","#","#","#","#"," ",
	" "," "," "," "," "," ","#","#","#"," "," ","#"," ","#"," "," ","0","0"," ","#"," ","#"," "," ","#","#","#"," "," "," ",
	" "," "," "," "," ","#","#"," ","#","#"," ","#"," ","#","#"," ","2","2","#","#","0","#"," ","#","#"," ","#","#"," "," ",
	" "," "," ","D"," ","#"," "," "," ","#"," ","#"," ","#","#","0","0","0","#","#","0","#"," ","#"," "," "," ","#"," ","D",
	"W"," "," "," "," ","#","#"," ","#","#"," ","#","0","0","#"," "," "," ","#"," "," ","#"," ","#","#"," ","#","#"," "," ",
	"W"," "," "," "," "," ","#","#","#"," "," ","#","#"," ","#"," "," "," ","#"," ","#","#"," "," ","#","#","#"," "," ","M",
	" "," "," "," "," "," "," "," "," "," "," ","#","#"," ","#","0","0","0","#"," ","#","#"," "," "," "," "," "," ","M","M",
	" "," "," "," "," "," "," ","D"," "," "," "," ","#","#","#","2"," ","2","#","#","#"," "," "," "," ","D"," "," ","M","M",
	" "," "," "," "," "," "," "," "," "," "," "," ","#","#","#"," "," "," ","#","#","#"," "," "," "," "," "," "," ","M","M",
	" "," "," "," "," "," "," ","M","M"," "," "," ","#","#","#"," "," "," ","#","#","#"," "," "," "," "," "," "," ","M","M",
	" "," "," "," "," "," ","M","M","M"," "," "," "," "," "," ","0","0","0"," "," "," "," "," "," "," "," "," "," "," ","M",
	" "," "," "," "," "," ","M","M","M"," "," "," "," "," "," "," "," "," "," "," "," "," ","W","W"," "," "," "," ","M","M",
}

function Startup()

	Log("Startup");

	_uS_t_a_r_t_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_チキ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_G001_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()
end

function Cleanup()

	Log("Cleanup");

	_uC_l_e_a_n_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_チキ" )

end

function Opening()

	Log("Opening");

	PuppetDemo("G001", "MID_OP1")
	FadeInAndWait(FADE_NORMAL)
	Movie("Kengen14")
	SkipEscape()
	FadeOutAndWait(FADE_NORMAL)
	PuppetDemo("G001", "MID_OP2")

end

function MapOpening()

	Log("MapOpening");

	EffectCreate("魔法陣_G001",			17, 27)
	EffectCreate("魔法陣_G001",			 3, 27)

	if _uc_o_n_d_i_t_i_o_n___30a2_30a4_30c6_30e0_5165_624b() then
		EffectCreate("ドロップアイテム", 9, 25)
		TerrainSetOne(9, 25, "TID_謎の平地")
	end

	_u30c1_30ad_306e_30b9_30ad_30eb_8a2d_5b9a()

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("G001", "MID_ED1")

	_u795e_7adc_306e_7ae0___7d0b_7ae0_58eb_52a0_5165( "GID_チキ" )

	if GodUnitExists("GID_マルス") then
		PuppetDemo("G001", "MID_ED2")
	end

	FadeInAndWait(FADE_FAST)
	Tutorial("TUTID_紋章士チキ")

end

function GameOver()

	Log("GameOver");

end

function _u30dc_30b9_306e_P_I_D_3092_53d6_5f97()

	if UnitExistOnMap( g_pid_boss ) then
		do return g_pid_boss end
		end

	if UnitExistOnMap( g_pid_boss_doragon ) then
		do return g_pid_boss_doragon end

	elseif UnitExistOnMap( g_pid_bossB ) then
		do return g_pid_bossB end

	elseif UnitExistOnMap( g_pid_bossB_doragon ) then
		do return g_pid_bossB_doragon end

	end

	do return "" end

end

function EmptyFunction()
end

function _u5909_6570_767b_9332()
	VariableEntry("左のスイッチ_済", 0)
	VariableEntry("中央のスイッチ_済", 0)
	VariableEntry("戦闘前会話_チキ_マルス_済", 0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )
	EventEntryTurn( _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER )

	EventEntryArea(_u30a8_30ea_30a2___6c37_5e8a, 11, 1, 24, 11, FORCE_PLAYER, "氷床イベント_済" )

	EventEntryTurn(_u5897_63f4_ff11, 14, 14, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff12, 17, 17, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff13, 20, 20, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff14, 23, 23, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff15, 26, 26, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff16, 29, 29, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff17, 32, 32, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff18, 35, 35, FORCE_PLAYER)

	EventEntryArea(_u5de6_306e_30b9_30a4_30c3_30c1___4f5c_52d5, 3, 27, 3, 27, FORCE_PLAYER, "左のスイッチ_済")
	EventEntryArea(_u4e2d_592e_306e_30b9_30a4_30c3_30c1___4f5c_52d5, 17, 27, 17, 27, FORCE_PLAYER, "中央のスイッチ_済")

	EventEntryArea(_u30a2_30a4_30c6_30e0_5165_624b, 9, 25, 9, 25, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a2_30a4_30c6_30e0_5165_624b)

	EventEntryTbox(_u5b9d_7bb1_5165_624b,17, 26, "IID_2000G")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 1, 27, "IID_レスキュー")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 5, 27, "IID_ワープ")

	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, "PID_G001_チキ_竜化",	FORCE_ENEMY, true, "戦闘前会話_チキ_リュール_済" )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, "PID_G001_チキ",	FORCE_ENEMY, true, "戦闘前会話_チキ_リュール_済" )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, "PID_G001_チキ_竜化_特効無効",	FORCE_ENEMY, true, "戦闘前会話_チキ_リュール_済" )
	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, "PID_G001_チキ_特効無効",	FORCE_ENEMY, true, "戦闘前会話_チキ_リュール_済" )

	EventEntryBattleTalk( _u30de_30eb_30b9_3068_6226_95d8,		"",				FORCE_PLAYER, "PID_G001_チキ_竜化",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_3068_6226_95d8 )
	EventEntryBattleTalk( _u30de_30eb_30b9_3068_6226_95d8,		"",				FORCE_PLAYER, "PID_G001_チキ",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_3068_6226_95d8 )
	EventEntryBattleTalk( _u30de_30eb_30b9_3068_6226_95d8,		"",				FORCE_PLAYER, "PID_G001_チキ_竜化_特効無効",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_3068_6226_95d8 )
	EventEntryBattleTalk( _u30de_30eb_30b9_3068_6226_95d8,		"",				FORCE_PLAYER, "PID_G001_チキ_特効無効",	FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_3068_6226_95d8 )
end

function _u30c1_30ad_306e_30b9_30ad_30eb_8a2d_5b9a()

	if UnitExistOnMap( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() ) then
		_u30b9_30ad_30eb_88c5_5099( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97(), "SID_ダメージ無効化" )

	end
end

function _u30c1_30ad_306e_30b9_30ad_30eb_89e3_9664()

	if UnitExistOnMap( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() ) then
		_u30b9_30ad_30eb_89e3_9664( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97(), "SID_ダメージ無効化" )
	end
end

function _u6226_95d8_958b_59cb_76f4_5f8c()

		CursorSetPos_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
		Talk( "MID_EV1" )

		CursorAnimeCreate( 26, 22 )
		CursorAnimeCreate(  3, 22 )
		Talk("MID_EV2")
		CursorAnimeDelete()

		CursorAnimeCreate(  3, 27 )
		CursorAnimeCreate( 17, 27 )
		Talk("MID_EV3")

		Talk("MID_EV4")
		CursorAnimeDelete()

end

function _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9()
	CursorAnimeCreate_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	WinRule()
	CursorAnimeDelete()
end

function _u30a8_30ea_30a2___6c37_5e8a()

		CursorSetPos(18, 2)
		MapCameraWait()

		MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 16, 2)
		MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 17, 2)
		MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 18, 2)
		WaitTime( 2.0 )
		MapObjectDelete("Eff_Cursor01")
		MapObjectDelete("Eff_Cursor02")
		MapObjectDelete("Eff_Cursor03")

		Talk( "MID_EV5" )
		CursorSetPos_FromPid( "PID_リュール" )

	end

function _u5897_63f4_ff11()

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff12()

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff13()

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff14()

	Dispos( "Reinforcement1_4", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff15()

	Dispos( "Reinforcement1_5", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff16()

	Dispos( "Reinforcement1_6", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff17()

	Dispos( "Reinforcement1_7", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4_ff18()

	Dispos( "Reinforcement1_8", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u4e2d_592e_306e_30b9_30a4_30c3_30c1___4f5c_52d5()

	TerrainFill( 3, 25, "TID_床" )
	TerrainSetOne( 3, 27, "TID_魔法陣" )
	TerrainSetOne( 1, 27, "TID_宝箱" )
	TerrainSetOne( 5, 27, "TID_宝箱" )

	TerrainSetOne( 17, 27, "TID_床" )

	_u5de6_306e_90e8_5c4b_306e_6249___958b_653e()

	EffectDelete("魔法陣_G001", 17, 27)

	Talk("MID_EV6")

	WaitTime( 0.5 )

end

function _u5de6_306e_30b9_30a4_30c3_30c1___4f5c_52d5()

	TerrainFill( 26, 24, "TID_床" )

	TerrainSetOne( 3, 27, "TID_床" )

	_u30c1_30ad_306e_3044_308b_90e8_5c4b_306e_6249___958b_653e()

	EffectDelete("魔法陣_G001", 3, 27)

	Talk("MID_EV7")
	WaitTime( 0.5 )

	CursorSetPos_FromPid( _u30dc_30b9_306e_P_I_D_3092_53d6_5f97() )
	Talk("MID_EV8")

	local unit = UnitGetByPos( 26, 25 )
	if unit ~= nil then
		EffectPlay( "竜化_G1" , 26, 25 )
		WaitTime( 0.5 )
		UnitDelete( unit )
		Dispos( "TikiDragon", DISPOS_FLAG_FOCUS + DISPOS_FLAG_FORCED )

	else
		Log( "【Script】（26, 25）にユニットがいないため、チキを取得できなかった" )

	end

	WaitTime( 1.5 )

	local x = UnitGetX( MindGetUnit() )
	local z = UnitGetZ( MindGetUnit() )

	CursorSetPos( x, z )
	MapCameraWait()

end

function _u5de6_306e_90e8_5c4b_306e_6249___958b_653e()

	if VariableGet( "扉_3_22" ) == 0 then

		WaitTime( 0.5 )

		CursorSetDistanceMode( CURSOR_DISTANCE_FAR )

		CursorSetPos( 3, 22 )
		MapCameraWait()

		_u9b54_6cd5_306e_6249_3092_958b_304f( 3, 22 )

		CursorSetPos(17, 16)
		MapCameraWait()

		_u6c37_5e8a_51fa_73fe( g_1stIceSheet )

		WaitTime( 1.5 )

		local x = UnitGetX( MindGetUnit() )
		local z = UnitGetZ( MindGetUnit() )

		CursorSetPos( x, z )
		MapCameraWait()

	end
end

function _u30c1_30ad_306e_3044_308b_90e8_5c4b_306e_6249___958b_653e()

	if VariableGet( "扉_26_22" ) == 0 then

		WaitTime( 0.5 )

		CursorSetDistanceMode( CURSOR_DISTANCE_FAR )

		CursorSetPos( 26, 22 )
		MapCameraWait()

		_u9b54_6cd5_306e_6249_3092_958b_304f( 26, 22 )

		CursorSetPos(17, 16)
		MapCameraWait()

		_u6c37_5e8a_51fa_73fe( g_2ndIceSheet )

		WaitTime( 1.5 )

		local x = UnitGetX( MindGetUnit() )
		local z = UnitGetZ( MindGetUnit() )

		CursorSetPos( x, z )
		MapCameraWait()

		_u30c1_30ad_306e_30b9_30ad_30eb_89e3_9664()

	end
end

function _u9b54_6cd5_306e_6249_3092_958b_304f( x, z )

	EventActionObject( x, z, MAP_ACTION_DONE )

	WaitTime( 2.0 )

	TerrainSetBegin()
	TerrainSet( x, z, "TID_床" )
	TerrainSetEnd()

end

function _u6c37_5e8a_51fa_73fe( terrain )

	MapOverlapSetBegin()

	for z = 1, g_Height - 2 do
		for x = 1, g_Width - 2 do

			local key = x + ( z - 1 ) * ( g_Width - 2 )

			if g_IceSheetMap[key] == terrain then

				local reverseZ = g_Height - 1 - z

				MapOverlapSet(x, reverseZ, "TID_氷床_永続")

			end
		end
	end

	MapOverlapSetEnd()

end

function _uc_o_n_d_i_t_i_o_n___30a2_30a4_30c6_30e0_5165_624b()

	if MapIsRecollection() then
		do return false end
	end

	do return ( VariableGet( "G_所持_IID_シルバーカード" ) == 0 ) end

end

function _u30a2_30a4_30c6_30e0_5165_624b()

	ItemGain( MindGetUnit(), "IID_シルバーカード" )
	EffectDelete("ドロップアイテム", 9, 25)
	TerrainSetOne(9, 25, "TID_平地")

end

function _u30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT2" )

	if _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_3068_6226_95d8() then
		_u30de_30eb_30b9_3068_6226_95d8()
	end

end

function _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_3068_6226_95d8()

	if VariableGet( "戦闘前会話_チキ_マルス_済" ) == 1 then
		do return false end
	end

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end

	do return ( god == "GID_マルス" ) end

end

function _u30de_30eb_30b9_3068_6226_95d8()

	Talk( "MID_BT1" )

	VariableSet( "戦闘前会話_チキ_マルス_済", 1 )

end
