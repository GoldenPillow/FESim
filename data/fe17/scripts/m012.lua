Include("Common")
g_pid_lueur = "PID_リュール"

g_key_reinforcement1 = "増援１_済"
g_key_reinforcement2 = "増援２_済"
g_key_reinforcement3 = "増援３_済"

function Startup()

	Log("Startup")

	WinRuleSetMID( "MID_RULE_M012_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_reinforcement1, 0 )
	VariableEntry( g_key_reinforcement2, 0 )
	VariableEntry( g_key_reinforcement3, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u81ea_8ecd_30bf_30fc_30f3_524d___81ea_8b66_56e3_4ef2_9593_5165_308a, 1, 1, FORCE_PLAYER)

	EventEntryTurn( _u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER )

	EventEntryPickup(_u30d4_30c3_30af_30a2_30c3_30d7___30d1_30f3_30c9_30ed, "PID_パンドロ", "ピックアップ_パンドロ_済")

	EventEntryTurn(_u5897_63f4_ff11, 4, 4, FORCE_ALLY, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11___30ce_30fc_30de_30eb)
	EventEntryTurn(_u5897_63f4_ff12, 5, 5, FORCE_ALLY, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12___30ce_30fc_30de_30eb)
	EventEntryTurn(_u5897_63f4_ff13, 7, 7, FORCE_ALLY, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff13___30ce_30fc_30de_30eb)

	EventEntryTurn(_u5897_63f4_ff11, 3, 3, FORCE_ALLY, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11)
	EventEntryTurn(_u5897_63f4_ff12, 4, 4, FORCE_ALLY, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12)
	EventEntryTurn(_u5897_63f4_ff13, 6, 6, FORCE_ALLY, _uc_o_n_d_i_t_i_o_n___5897_63f4_ff13)

	EventEntryDie(EmptyFunction, "PID_M012_村人Ａ", FORCE_ALLY, "S_M012_村人Ａ_死亡")
	EventEntryDie(EmptyFunction, "PID_M012_村人Ｂ", FORCE_ALLY, "S_M012_村人Ｂ_死亡")
	EventEntryDie(EmptyFunction, "PID_M012_村人Ｃ", FORCE_ALLY, "S_M012_村人Ｃ_死亡")
end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M012", "MID_OP1")
	PuppetDemo("M012", "MID_OP2")

	Movie("Scene17")
	SkipEscape()

	PuppetDemo("M012", "MID_OP2_2")
	PuppetDemo("M012", "MID_OP3")

end

function MapOpening()

	Log("MapOpening")

end

function _u81ea_8ecd_30bf_30fc_30f3_524d___81ea_8b66_56e3_4ef2_9593_5165_308a()

	CursorSetPos_FromPid( "PID_M012_村人Ａ" )

	SoundPostEvent(Env_Evt_Solum_Desert_Start)
	PlayFieldBgm(FORCE_PLAYER)

	if UnitExistOnMap( "PID_M012_村人Ａ" ) then
		MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", UnitGetX( "PID_M012_村人Ａ" ), UnitGetZ( "PID_M012_村人Ａ" ))
	end
	if UnitExistOnMap( "PID_M012_村人Ｂ" ) then
		MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", UnitGetX( "PID_M012_村人Ｂ" ), UnitGetZ( "PID_M012_村人Ｂ" ))
	end
	if UnitExistOnMap( "PID_M012_村人Ｃ" ) then
		MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", UnitGetX( "PID_M012_村人Ｃ" ), UnitGetZ( "PID_M012_村人Ｃ" ))
	end
	WaitTime( 2.0 )

	Talk("MID_EV1")

	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")
	MapObjectDelete("Eff_Cursor03")

	Dialog( "MID_TUT_NAVI_M012_RESCUE" )

	CursorSetPos_FromPid("PID_フォガート")

	Talk("MID_EV2")

	Tutorial( "TUTID_流砂" )

	UnitJoin( "PID_フォガート", "PID_パンドロ", "PID_ボネ" )
	WaitTime(0.5)

	CursorSetPos_FromPid(g_pid_lueur)

end

function _u30d4_30c3_30af_30a2_30c3_30d7___30d1_30f3_30c9_30ed()
	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()
	Talk( "MID_EV3" )
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11___30ce_30fc_30de_30eb()
	if VariableGet( g_key_reinforcement1 ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return true
	end

	return false
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11()
	if VariableGet( g_key_reinforcement1 ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return true
	end

	return false
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

	if DifficultyGet() > DIFFICULTY_NORMAL then
		Dispos( "Reinforcement1_4", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )
	end

	VariableSet( g_key_reinforcement1, 1 )
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12___30ce_30fc_30de_30eb()
	if VariableGet( g_key_reinforcement2 ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return true
	end

	return false
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12()
	if VariableGet( g_key_reinforcement2 ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return true
	end

	return false
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

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff13___30ce_30fc_30de_30eb()
	if VariableGet( g_key_reinforcement3 ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return true
	end

	return false
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff13()
	if VariableGet( g_key_reinforcement3 ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return true
	end

	return false
end

function _u5897_63f4_ff13()
	Dispos( "Reinforcement3_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement3_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_reinforcement3, 1 )
end

function EmptyFunction()
end

function MapEnding()

	Log("MapEnding")

	_u304a_793c_54c1_53d6_5f97()

end

function _u304a_793c_54c1_53d6_5f97()

	SkipEscape()

end

function Ending()

	Log("Ending")

end

function GameOver()

	Log("GameOver")

end
