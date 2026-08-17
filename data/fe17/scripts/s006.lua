Include("Common")
g_pid_lueur					= "PID_リュール"
g_pid_byleth				= "PID_S006_ベレト"

g_key_battled				= "戦闘開始_ベレト周辺"
g_key_entryArea				= "エリア進入_済"
g_key_changedAI				= "AI変更_済"
g_key_changedAI2			= "AI変更2_済"
g_key_changedAI2_Permssn	= "AI変更2_許可"
g_key_byleth_on_inmovable	= "ベレト不動設定"
g_key_byleth_off_inmovable	= "ベレト不動解除"

g_CrystalMaxNum				= 19
g_key_CrystalBrokenNum		= "破壊クリスタル数"

g_key_battleTalk_byleth_lueur		= "戦闘前会話_ベレト_リュール_済"
g_key_battleTalk_byleth_holtencia	= "戦闘前会話_ベレト_オルテンシア_済"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_ベレト" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S006_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry( g_key_battled,				0 )
	VariableEntry( g_key_entryArea,				0 )
	VariableEntry( g_key_changedAI,				0 )
	VariableEntry( g_key_changedAI2,			0 )
	VariableEntry( g_key_changedAI2_Permssn,	0 )
	VariableEntry( g_key_CrystalBrokenNum,		0 )
	VariableEntry( g_key_byleth_on_inmovable,	0 )
	VariableEntry( g_key_byleth_off_inmovable,	0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryTurn(_u5897_63f4,		 7,	 7,	FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4,		 9,	 9,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_30cf_30fc_30c9_4ee5_4e0a)
	EventEntryTurn(_u7121_9650_5897_63f4,	11,	-1,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4_30eb_30ca_4ee5_4e0a)

	EventEntryBattleBefore(EmptyFunction, "", FORCE_PLAYER, "PID_S006_幻影兵_マスターモンク_ベレト側近",	FORCE_ENEMY, true, g_key_battled)
	EventEntryBattleBefore(EmptyFunction, "", FORCE_PLAYER, "PID_S006_幻影兵_スナイパー_ベレト側近",	FORCE_ENEMY, true, g_key_battled)
	EventEntryBattleBefore(EmptyFunction, "", FORCE_PLAYER, "PID_S006_幻影兵_エーデルガルト",	FORCE_ENEMY, true, g_key_battled)
	EventEntryBattleBefore(EmptyFunction, "", FORCE_PLAYER, "PID_S006_幻影兵_ディミトリ",		FORCE_ENEMY, true, g_key_battled)
	EventEntryBattleBefore(EmptyFunction, "", FORCE_PLAYER, "PID_S006_幻影兵_クロード",			FORCE_ENEMY, true, g_key_battled)

	EventEntryBattleTalk(Talk, g_pid_byleth, FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, g_key_battleTalk_byleth_lueur,		"MID_BT1")
	EventEntryBattleTalk(Talk, g_pid_byleth, FORCE_ENEMY, "PID_オルテンシア",	FORCE_PLAYER, true, g_key_battleTalk_byleth_holtencia,	"MID_BT2")

	EventEntryArea(EmptyFunction,  1, 1, 19, 3, FORCE_PLAYER, g_key_entryArea)
	EventEntryArea(EmptyFunction,  1, 4,  3, 7, FORCE_PLAYER, g_key_entryArea)
	EventEntryArea(EmptyFunction,  4, 4,  4, 4, FORCE_PLAYER, g_key_entryArea)
	EventEntryArea(EmptyFunction, 17, 4, 19, 7, FORCE_PLAYER, g_key_entryArea)
	EventEntryArea(EmptyFunction,  7, 4, 13, 5, FORCE_PLAYER, g_key_entryArea)
	EventEntryTurnEnd(_uA_I_5909_66f4,	-1, -1,		FORCE_ENEMY,	_uc_o_n_d_i_t_i_o_n___A_I_5909_66f4)
	EventEntryTurnEnd(_uA_I_5909_66f4,	 7,  7,		FORCE_ENEMY)

	EventEntryTurnAfter(_u30d9_30ec_30c8_4e0d_52d5_8a2d_5b9a, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30d9_30ec_30c8_4e0d_52d5_8a2d_5b9a)
	EventEntryTurnEnd(	_u30d9_30ec_30c8_4e0d_52d5_89e3_9664, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30d9_30ec_30c8_4e0d_52d5_89e3_9664)

	EventEntryTurn(VariableSet,	-1, -1,		FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___A_I_5909_66f4_2___8a31_53ef, g_key_changedAI2_Permssn, 1)
	EventEntryTurnEnd(_uA_I_5909_66f4_2,	-1, -1,		FORCE_ENEMY,	_uc_o_n_d_i_t_i_o_n___A_I_5909_66f4_2)

	EventEntryDestroy(_u6c34_6676_7834_58ca,  3, 24)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  5, 24)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 15, 24)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 17, 24)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  7, 23)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 13, 23)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  4, 20)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 16, 20)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  3, 19)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  4, 18)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 16, 18)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 17, 17)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  4, 16)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 16, 16)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  4, 14)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 16, 14)
	EventEntryDestroy(_u6c34_6676_7834_58ca,  4, 12)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 16, 12)
	EventEntryDestroy(_u6c34_6676_7834_58ca, 16,  9)

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_ベレト" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S006", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()

	CursorSetPos_FromPid( g_pid_byleth )
	Talk( "MID_EV1" )

	CursorSetPos( 4, 20 )
	MapCameraWait()

	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 3, 19)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 4, 18)
	MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", 4, 20)
	WaitTime( 2.0 )

	Talk( "MID_EV2" )

	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")
	MapObjectDelete("Eff_Cursor03")

	Dialog( "MID_TUT_NAVI_S006_RULE" )

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_30cf_30fc_30c9_4ee5_4e0a()
	if _u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb() then
		return false
	end

	return true
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_30eb_30ca_4ee5_4e0a()
	if _u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb() or _u30e2_30fc_30c9_306f_30cf_30fc_30c9() then
		return false
	end

	local turn = MapGetTurn()
	if ( turn % 2 ) == 1 then
		return true
	end

	return false
end

function _u5897_63f4()

	Dispos("Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u7121_9650_5897_63f4()

	Dispos("Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u6c34_6676_7834_58ca()

	Dialog( "MID_TUT_NAVI_S006_BREAK" )

	local num = VariableGet( g_key_CrystalBrokenNum )
	num = num + 1
	VariableSet( g_key_CrystalBrokenNum, num )

	if ( num == g_CrystalMaxNum ) then
		_u6c34_6676_5168_7834_58ca()
	end

end

function _u6c34_6676_5168_7834_58ca()

	local index = ForceUnitGetFirst( FORCE_ENEMY )
	while index ~= nil do

		if _uA_I_5909_66f4___653b_6483( index ) then

			local pid = UnitGetPID( index )

			if		( pid == g_pid_byleth ) then
				AiSetSequence(g_pid_byleth, AI_ORDER_ATTACK, "AI_AT_AttackToEngageDance", "1,1")

			elseif	( pid == "PID_S006_幻影兵_マスターモンク_ベレト側近" ) then
				AiSetSequence(pid, AI_ORDER_ATTACK, "AI_AT_RodWarp", "1,1")

			end

		end

		index = ForceUnitGetNext(index)

	end

end

function _uc_o_n_d_i_t_i_o_n___A_I_5909_66f4()
	if VariableGet( g_key_changedAI ) == 1 then
		return false
	end

	if		( VariableGet( g_key_entryArea ) == 1 )
		or	( VariableGet( g_key_battled ) == 1 )
		or	( VariableGet( g_key_battleTalk_byleth_lueur ) == 1 )
		or	( VariableGet( g_key_battleTalk_byleth_holtencia ) == 1 ) then
		return true
	end

	return false
end

function _uA_I_5909_66f4()

	if UnitExistOnMap( g_pid_byleth ) then
		AiSetSequence(g_pid_byleth, AI_ORDER_ATTACK, "AI_AT_EngageDance", "1,1")
		AiSetActive(g_pid_byleth, true)
	end

	_uA_I_5909_66f4___5730_5f62_7834_58ca( "PID_S006_幻影兵_エーデルガルト" )
	_uA_I_5909_66f4___5730_5f62_7834_58ca( "PID_S006_幻影兵_ディミトリ" )
	_uA_I_5909_66f4___5730_5f62_7834_58ca( "PID_S006_幻影兵_クロード" )

	local unit = ForceUnitGetFirst(FORCE_ENEMY)
	while unit ~= nil do

		local pid = UnitGetPID( unit )

		if ( pid == "PID_S006_幻影兵_マスターモンク_ベレト側近" ) then
			AiSetSequence(unit, AI_ORDER_ATTACK, "AI_AT_RodWarpFarZ")
			AiSetActive(unit, true)

		elseif ( pid == "PID_S006_幻影兵_スナイパー_ベレト側近" ) then
			_uA_I_5909_66f4___5730_5f62_7834_58ca( unit )

		end

		unit = ForceUnitGetNext(unit)
	end

	VariableSet( g_key_changedAI, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30d9_30ec_30c8_4e0d_52d5_8a2d_5b9a()
	if	( VariableGet( g_key_byleth_on_inmovable ) == 1 ) then
		return false
	end

	if ( VariableGet( g_key_changedAI ) == 1 ) then
		return true
	end

	return false
end

function _u30d9_30ec_30c8_4e0d_52d5_8a2d_5b9a()
	_u30b9_30ad_30eb_88c5_5099( g_pid_byleth, "SID_不動_隠蔽" )
	VariableSet( g_key_byleth_on_inmovable, 1 )
end

function _uc_o_n_d_i_t_i_o_n___30d9_30ec_30c8_4e0d_52d5_89e3_9664()
	if ( VariableGet( g_key_byleth_off_inmovable ) == 1 ) then
		return false
	end

	if ( VariableGet( g_key_byleth_on_inmovable ) == 1 ) then
		return true
	end

	return false
end

function _u30d9_30ec_30c8_4e0d_52d5_89e3_9664()
	_u30b9_30ad_30eb_89e3_9664( g_pid_byleth, "SID_不動_隠蔽" )
	VariableSet( g_key_byleth_off_inmovable, 1 )
end

function _uc_o_n_d_i_t_i_o_n___A_I_5909_66f4_2___8a31_53ef()
	if ( VariableGet( g_key_changedAI2 ) == 0 )
		and ( VariableGet( g_key_changedAI ) == 1 ) then
			return true
	end

	return false
end

function _uc_o_n_d_i_t_i_o_n___A_I_5909_66f4_2()
	if VariableGet( g_key_changedAI2 ) == 1 then
		return false
	end

	if VariableGet( g_key_changedAI2_Permssn ) == 1 then
		return true
	end

	return false
end

function _uA_I_5909_66f4_2()

	_uA_I_5909_66f4___5730_5f62_7834_58ca( g_pid_byleth )

	local unit = ForceUnitGetFirst(FORCE_ENEMY)
	while unit ~= nil do

		local pid = UnitGetPID( unit )

		if ( pid == "PID_S006_幻影兵_マスターモンク_ベレト側近" ) then
			if _uA_I_5909_66f4___5730_5f62_7834_58ca( unit ) then
				AiSetSequence(unit, AI_ORDER_ATTACK, "AI_AT_RodWarpFarZ")
			end

		end

		unit = ForceUnitGetNext(unit)
	end

	VariableSet( g_key_changedAI2, 1 )

end

function _uA_I_5909_66f4___5730_5f62_7834_58ca( unit )
	if UnitExistOnMap( unit ) then
		UnitClearStatus(unit, UNIT_STATUS_MOVE_NOT_ALLOW)
		UnitClearStatus(unit, UNIT_STATUS_DONT_POS_CHANGE)
		AiSetSequence(unit, AI_ORDER_ATTACK,	"AI_AT_Null")
		AiSetSequence(unit, AI_ORDER_MOVE,		"AI_MV_TerrainDestroy")
		AiSetActive(unit, true)
		return true
	end

	return false
end

function _uA_I_5909_66f4___653b_6483( unit )
	if UnitExistOnMap( unit ) then
		AiSetSequence(unit, AI_ORDER_ATTACK,	"AI_AT_Attack")
		AiSetSequence(unit, AI_ORDER_MOVE,		"AI_MV_NearestEnemy")
		return true
	end

	return false
end

function MapEnding()

	Log("MapEnding")

	local brokenNum = VariableGet( g_key_CrystalBrokenNum )
	local message = ""

	if brokenNum <= 3 then
		MessSetArgument( 0, "MIID_Talisman" )
		MessSetArgument( 1, "MIID_Medicine" )
		Dialog( "MID_TUT_NAVI_S006_REWARD1" )
		ItemGain(nil, "IID_魔よけ")
		ItemGain(nil, "IID_特効薬")

	elseif brokenNum <= 10 then
		MessSetArgument( 0, "MIID_Talisman" )
		Dialog( "MID_TUT_NAVI_S006_REWARD2" )
		ItemGain(nil, "IID_魔よけ")

	else
		Dialog( "MID_TUT_NAVI_S006_REWARD3" )

	end

end

function Ending()

	Log("Ending")

	PuppetDemo("S006", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "ベレト", "S006" )

end

function GameOver()

	Log("GameOver")

end
