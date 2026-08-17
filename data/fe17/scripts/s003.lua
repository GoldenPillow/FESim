Include("Common")
g_pid_lueur = "PID_リュール"

g_key_lucina_act = "ルキナ初回行動_済"
g_key_reinforcement1 = "増援１_済"
g_key_reinforcement2 = "増援２_済"
g_key_reinforcement2_count = "増援２_カウンター"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_ルキナ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S003_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry( g_key_reinforcement1, 0 )
	VariableEntry( g_key_reinforcement2, 0 )
	VariableEntry( g_key_reinforcement2_count, 2 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryBattleAfter(EmptyFunction, "PID_S003_ルキナ", FORCE_ENEMY, "", FORCE_ALL, true, g_key_lucina_act)

	EventEntryBattleTalk(Talk, "PID_S003_ルキナ", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_ルキナ_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S003_ルキナ", FORCE_ENEMY, "PID_アルフレッド",	FORCE_PLAYER, true, "戦闘前会話_ルキナ_アルフレッド_済", "MID_BT2")

	EventEntryTurn(_u306f_3058_307e_308a_30a4_30d9_30f3_30c8, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4_ff11, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11)
	EventEntryTurn(_u5897_63f4_ff12, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12)

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_ルキナ" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S003", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function EmptyFunction()
end

function _u306f_3058_307e_308a_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid( "PID_S003_ルキナ" )
	Talk( "MID_EV1" )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11()

	if VariableGet( g_key_reinforcement1 ) == 1 then
		return false
	end

	if VariableGet( g_key_lucina_act ) == 1 then
		return true
	end

	return 	false

end

function _u5897_63f4_ff11()

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement1_4", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_reinforcement1, 1 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12()

	if VariableGet( g_key_reinforcement2 ) == 1 then
		return false
	end

	if VariableGet( g_key_reinforcement1 ) == 0 then
		return false
	end

	local counter = VariableGet( g_key_reinforcement2_count )
	counter = counter - 1
	VariableSet( g_key_reinforcement2_count, counter )

	if counter == 0 then
		return true
	end

	return 	false

end

function _u5897_63f4_ff12()

	Dispos( "Reinforcement2_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement2_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_reinforcement2, 1 )

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S003", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "ルキナ", "S003" )

end

function GameOver()

	Log("GameOver")

end
