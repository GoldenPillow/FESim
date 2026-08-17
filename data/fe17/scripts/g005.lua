Include("Common")
Include("Common_P0")
Include("G005_Gimmick")

g_noEXP_turn					= 25

g_key_enter_upward_area			= "マップ上進入_済"
g_key_reinforcement_upwardArea	= "増援_上方進入直後_済"

g_key_battleTalk_camilla_lueur	= "戦闘会話_カミラ_リュール_済"
g_key_battleTalk_camilla_kamui	= "戦闘会話_カミラ_カムイ_済"

g_key_camillaAttackedFar		= "カミラ被遠距離攻撃"
g_key_camillaActiveRun			= "カミラ隊起動"
g_key_reinforcementCamillaAttackedFar	= "増援_カミラ被遠距離攻撃後_済"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_カミラ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_G005_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_enter_center_area, 		0 )
	VariableEntry( g_key_enter_upward_area, 		0 )
	VariableEntry( g_key_reinforcement_upwardArea,	0 )

	VariableEntry( g_key_battleTalk_camilla_lueur,	0 )
	VariableEntry( g_key_battleTalk_camilla_kamui,	0 )

	VariableEntry( g_key_camillaAttackedFar,		0 )
	VariableEntry( g_key_camillaActiveRun,			0 )
	VariableEntry( g_key_reinforcementCamillaAttackedFar, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( _u9032_6483_958b_59cb_76f4_5f8c,			 1,  1, FORCE_PLAYER )
	EventEntryTurn( _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u7adc_8108___30cf_30fc_30c9_4ee5_4e0b,		 2, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___7adc_8108___30cf_30fc_30c9_4ee5_4e0b )
	EventEntryTurn( _u7adc_8108___30eb_30ca_30c6_30a3_30c3_30af,		 2, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___7adc_8108___30eb_30ca_30c6_30a3_30c3_30af )

	EventEntryTurn( _u5897_63f4,					 3, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4 )
	EventEntryTurn( _u5897_63f4___ff14_30bf_30fc_30f3_3081,		 4,  4, FORCE_PLAYER )
	EventEntryTurn( _u5897_63f4___ff19_30bf_30fc_30f3_3081,		 9,  9, FORCE_PLAYER )
	EventEntryTurn( _u5897_63f4___4e0a_65b9_9032_5165_76f4_5f8c,		-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4___4e0a_65b9_9032_5165_76f4_5f8c )

	EventEntryArea( _u30de_30c3_30d7_4e2d_592e_9032_5165,	 1,  9, 29, 25, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30de_30c3_30d7_4e2d_592e_9032_5165 )
	EventEntryArea( _u30de_30c3_30d7_4e0a_65b9_9032_5165,	 1, 17, 29, 25, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30de_30c3_30d7_4e0a_65b9_9032_5165 )

	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	g_pid_lueur,	FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, g_key_battleTalk_camilla_lueur )
	EventEntryBattleTalk( _u30ab_30e0_30a4_3068_6226_95d8,		"",				FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30ab_30e0_30a4_3068_6226_95d8 )

	EventEntryBattleBefore(VariableSet, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30ab_30df_30e9_304c_9060_8ddd_96e2_653b_6483_3055_308c_305f, g_key_camillaAttackedFar, 1 )
	EventEntryTurn( _u5897_63f4___30ab_30df_30e9_975e_9060_8ddd_96e2_653b_6483_5f8c,	-1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4___30ab_30df_30e9_975e_9060_8ddd_96e2_653b_6483_5f8c )

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_カミラ" )

end

function Opening()

	Log("Opening")

	PuppetDemo("G005", "MID_OP1")
	FadeInAndWait(FADE_NORMAL)
	Movie("Kengen17")
	SkipEscape()
	FadeOutAndWait(FADE_NORMAL)
	PuppetDemo("G005", "MID_OP2")

end

function MapOpening()

	Log("MapOpening")

end

function EmptyFunction()
end

function _u9032_6483_958b_59cb_76f4_5f8c()

	CursorSetPos_FromPid( g_pid_boss )

	Talk( "MID_EV1" )

	_u7adc_8108_767a_52d5( 8, 8, 7.5, 7.5, false )

	Talk( "MID_EV2" )

end

function _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9()
	CursorAnimeCreate_FromPid( g_pid_boss )
	WinRule()
	CursorAnimeDelete()
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4()

	if _u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb() then
		return ( MapGetTurn() % 4 == 0 )

	else
		return ( MapGetTurn() % 3 == 0 )

	end

end

function _u5897_63f4()

	if		VariableGet( g_key_enter_center_area ) == 0 then
		if ( MapGetTurn() < g_noEXP_turn ) then
			_u5897_63f4___1()

		else
			_u5897_63f4___1___n_o_E_X_P()

		end

	else
		if ( MapGetTurn() < g_noEXP_turn ) then
			_u5897_63f4___2()

		else
			_u5897_63f4___2___n_o_E_X_P()

		end

	end

end

function _u5897_63f4___1()

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	if DifficultyGet() > DIFFICULTY_NORMAL then
		Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )
	end

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4___1___n_o_E_X_P()

	Dispos( "Reinforcement1_1_noEXP", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	if DifficultyGet() > DIFFICULTY_NORMAL then
		Dispos( "Reinforcement1_2_noEXP", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )
	end

	Dispos( "Reinforcement1_3_noEXP", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4___2()

	Dispos( "Reinforcement4_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	if DifficultyGet() > DIFFICULTY_NORMAL then
		Dispos( "Reinforcement4_2", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )
	end

	Dispos( "Reinforcement4_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4___2___n_o_E_X_P()

	Dispos( "Reinforcement4_1_noEXP", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	if DifficultyGet() > DIFFICULTY_NORMAL then
		Dispos( "Reinforcement4_2_noEXP", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )
	end

	Dispos( "Reinforcement4_3_noEXP", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4___ff14_30bf_30fc_30f3_3081()

	Dispos( "Reinforcement2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _u5897_63f4___ff19_30bf_30fc_30f3_3081()

	Dispos( "Reinforcement3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4___4e0a_65b9_9032_5165_76f4_5f8c()

	if ( VariableGet( g_key_reinforcement_upwardArea ) == 1 ) then
		return false
	end

	if ( VariableGet( g_key_enter_upward_area ) == 0 ) then
		return false
	end

	if _u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb() or _u30e2_30fc_30c9_306f_30cf_30fc_30c9() then
		return ( MapGetTurn() % 2 == 0 )
	else
		return true
	end

end

function _u5897_63f4___4e0a_65b9_9032_5165_76f4_5f8c()

	Dispos( "Reinforcement5_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement5_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_reinforcement_upwardArea, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30de_30c3_30d7_4e2d_592e_9032_5165()

	return VariableGet( g_key_enter_center_area ) == 0

end

function _u30de_30c3_30d7_4e2d_592e_9032_5165()

	if _uz_4ee5_4e0a_306e_30a8_30ea_30a2_306b_n_4eba_4ee5_4e0a_9032_5165( 9, 3 ) then
		VariableSet( g_key_enter_center_area, 1 )
	end

end

function _uc_o_n_d_i_t_i_o_n___30de_30c3_30d7_4e0a_65b9_9032_5165()

	return VariableGet( g_key_enter_upward_area ) == 0

end

function _u30de_30c3_30d7_4e0a_65b9_9032_5165()

	if _uz_4ee5_4e0a_306e_30a8_30ea_30a2_306b_n_4eba_4ee5_4e0a_9032_5165( 17, 3 ) then
		VariableSet( g_key_enter_upward_area, 1 )
	end

end

function _uz_4ee5_4e0a_306e_30a8_30ea_30a2_306b_n_4eba_4ee5_4e0a_9032_5165( z, n )

	local counter = 0
	local playerNum = 0

	local index = ForceUnitGetFirst( FORCE_PLAYER )
	while ( index ~= nil ) do

		if ( UnitGetZ( index ) >= z ) then
			counter = counter + 1
		end

		playerNum = playerNum + 1
		index = ForceUnitGetNext( index )
	end

	return ( ( counter >= n ) or ( counter >= playerNum ) )

end

function _u30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT2" )

	if _uc_o_n_d_i_t_i_o_n___30ab_30e0_30a4_3068_6226_95d8() then
		_u30ab_30e0_30a4_3068_6226_95d8()
	end

end

function _uc_o_n_d_i_t_i_o_n___30ab_30e0_30a4_3068_6226_95d8()

	if VariableGet( g_key_battleTalk_camilla_kamui ) == 1 then
		return false
	end

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end

	return ( god == "GID_カムイ" )

end

function _u30ab_30e0_30a4_3068_6226_95d8()

	Talk( "MID_BT1" )

	VariableSet( g_key_battleTalk_camilla_kamui, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30ab_30df_30e9_304c_9060_8ddd_96e2_653b_6483_3055_308c_305f()

	if VariableGet( g_key_camillaAttackedFar ) == 1 then
		return false
	end

	if _u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af() == false then
		return false
	end

	if AiGetActive( g_pid_boss ) == true then
		return false
	end

	local unit = MindGetUnit()
	local x = UnitGetX( unit )
	local z = UnitGetZ( unit )
	local camillaX = UnitGetX( g_pid_boss )
	local camillaZ = UnitGetZ( g_pid_boss )

	return ( _u4e8c_70b9_9593_8ddd_96e2( x, z, camillaX, camillaZ ) > 8 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4___30ab_30df_30e9_975e_9060_8ddd_96e2_653b_6483_5f8c()

	if VariableGet( g_key_reinforcementCamillaAttackedFar ) == 0 then

		if _u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af() == false then
			return false
		end

		return ( VariableGet( g_key_camillaAttackedFar ) == 1 )

	elseif VariableGet( g_key_reinforcementCamillaAttackedFar ) == 1 then

		return ( VariableGet( g_key_camillaActiveRun ) == 0 )

	end
end

function _u5897_63f4___30ab_30df_30e9_975e_9060_8ddd_96e2_653b_6483_5f8c()

	if VariableGet( g_key_reinforcementCamillaAttackedFar ) == 0 then

		Dispos( "Reinforcement6", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )

		VariableSet( g_key_reinforcementCamillaAttackedFar, 1 )

	elseif VariableGet( g_key_reinforcementCamillaAttackedFar ) == 1 then

		VariableSet( g_key_camillaActiveRun, 1 )

	end

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("G005", "MID_ED1")

	_u795e_7adc_306e_7ae0___7d0b_7ae0_58eb_52a0_5165( "GID_カミラ" )

	if GodUnitExists("GID_カムイ") then
		PuppetDemo("G005", "MID_ED2")
	end

	FadeInAndWait(FADE_FAST)
	Tutorial("TUTID_紋章士カミラ")

end

function GameOver()

	Log("GameOver")

end
