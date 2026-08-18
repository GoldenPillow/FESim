Include("Common")
g_pid_lueur					= "PID_リュール"

g_key_tutorial_smash1		= "チュートリアル_スマッシュ１_済"
g_key_tutorial_smash2		= "チュートリアル_スマッシュ２_済"
g_key_smash_target_unit		= "スマッシュターゲット_ユニット"
g_key_smash_target_unit_x	= "スマッシュターゲット_ユニット_X"
g_key_smash_target_unit_z	= "スマッシュターゲット_ユニット_Z"

g_key_holtensia_act			= "オルテンシア行動開始"

g_key_battle_holtencia		= "戦闘前会話_オルテンシア_リュール_済"

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_M007_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry( g_key_tutorial_smash1, 0 )
	VariableEntry( g_key_tutorial_smash2, 0 )
	VariableEntry( g_key_smash_target_unit, -1 )
	VariableEntry( g_key_smash_target_unit_x, -1 )
	VariableEntry( g_key_smash_target_unit_z, -1 )
	VariableEntry( g_key_battle_holtencia, 0 )

	VariableEntry( g_key_holtensia_act, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1, FORCE_PLAYER )
	EventEntryTurn( _u52dd_5229_6761_4ef6___6575_5c06_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER, condition_true, "PID_M007_オルテンシア" )

	EventEntryTurnAfter( _u30eb_30ad_30ca_95c7_30b7_30f3_30af_30ed_30a4_30d9_30f3_30c8, 1, 1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30ad_30ca_95c7_30b7_30f3_30af_30ed_30a4_30d9_30f3_30c8 )

	EventEntryPickup( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11, "PID_スタルーク",	_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11 )
	EventEntryPickup( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11, "PID_ラピス",		_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11 )
	EventEntryPickup( _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11, "PID_シトリニカ",	_uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11 )

	EventEntryBattleBefore(EmptyFunction, "PID_ラピス", FORCE_PLAYER, "", FORCE_ENEMY, false, _uc_o_n_d_i_t_i_o_n___30e9_30d4_30b9_304c_8ab0_304b_306b_653b_6483)
	EventEntryFixed(_u30e9_30d4_30b9_304c_8ab0_304b_3092_30d6_30ec_30a4_30af, "PID_ラピス", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30e9_30d4_30b9_304c_8ab0_304b_3092_30d6_30ec_30a4_30af)

	EventEntryTurn( _u30aa_30eb_30c6_30f3_30b7_30a2_968a_A_I_30a2_30af_30c6_30a3_30d6, -1, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30aa_30eb_30c6_30f3_30b7_30a2_968a_A_I_30a2_30af_30c6_30a3_30d6 )

	EventEntryBattleTalk(Talk, g_pid_lueur, FORCE_PLAYER, "PID_M007_ロサード", FORCE_ENEMY, true, "戦闘前会話_ロサード_リュール_済",	"MID_BT5")
	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, "PID_M007_ロサード", FORCE_ENEMY, true, "戦闘前会話_ロサード_済",				"MID_BT4")
	EventEntryDie(Talk, "PID_M007_ロサード", FORCE_ENEMY, condition_true, "MID_BT6")

	EventEntryBattleTalk(Talk, g_pid_lueur, FORCE_PLAYER, "PID_M007_ゴルドマリー", FORCE_ENEMY, true, "戦闘前会話_ゴルドマリー_リュール_済",	"MID_BT8")
	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, "PID_M007_ゴルドマリー", FORCE_ENEMY, true, "戦闘前会話_ゴルドマリー_済",				"MID_BT7")
	EventEntryDie(Talk, "PID_M007_ゴルドマリー", FORCE_ENEMY, condition_true, "MID_BT9")

	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71___30aa_30eb_30c6_30f3_30b7_30a2___30ea_30e5_30fc_30eb, g_pid_lueur, FORCE_PLAYER, "PID_M007_オルテンシア", FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71___30aa_30eb_30c6_30f3_30b7_30a2___30ea_30e5_30fc_30eb)
	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, "PID_M007_オルテンシア", FORCE_ENEMY, true, "戦闘前会話_オルテンシア_済",				"MID_BT1")
	EventEntryReviveAfter(_u30eb_30ad_30ca_95c7_30b7_30f3_30af_30ed_30a4_30d9_30f3_30c8, "PID_M007_オルテンシア", FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30eb_30ad_30ca_95c7_30b7_30f3_30af_30ed_30a4_30d9_30f3_30c8)
	EventEntryDie(Talk, "PID_M007_オルテンシア", FORCE_ENEMY, condition_true, "MID_BT3")

end

function Cleanup()

	Log("Cleanup")

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_524d_4f1a_8a71___30aa_30eb_30c6_30f3_30b7_30a2___30ea_30e5_30fc_30eb()
	if VariableGet( g_key_battle_holtencia ) == 1 then
		do return false end
	end

	if ( MapGetTurn() > 1 ) or ( MapGetPhase() == FORCE_ENEMY ) then
		do return true end
	end

	do return false end
end

function _u6226_95d8_524d_4f1a_8a71___30aa_30eb_30c6_30f3_30b7_30a2___30ea_30e5_30fc_30eb()
	Talk( "MID_BT2" )
	VariableSet( g_key_battle_holtencia, 1 )
end

function Opening()

	Log("Opening")

	Movie("Scene10")
	SkipEscape()

	PuppetDemo("M007", "MID_OP1")
	PuppetDemo("M007", "MID_OP2")

	Movie("Scene11")
	SkipEscape()

	PuppetDemo("M007", "MID_OP2_2")

end

function MapOpening()

	Log("MapOpening")

end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid("PID_スタルーク")
	Talk("MID_EV1")
	_u30b9_30bf_30eb_30fc_30af_968a_52a0_5165()

	local x = UnitGetX( "PID_M007_ロサード" ) + UnitGetX( "PID_M007_ゴルドマリー" )
	local z = UnitGetZ( "PID_M007_ロサード" ) + UnitGetZ( "PID_M007_ゴルドマリー" )
	CursorSetPos( math.floor( x / 2 ), math.floor( z / 2 ) )
	MapCameraWait()

	Talk( "MID_EV6" )

end

function _u30b9_30bf_30eb_30fc_30af_968a_52a0_5165()

	UnitJoin( "PID_スタルーク", "PID_シトリニカ", "PID_ラピス" )
	WaitTime(0.5)
end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11()

	if VariableGet( g_key_tutorial_smash1 ) == 1 then
		do return false end
	end

	if UnitExistOnMap( "PID_ラピス" ) then
		do return true end
	end

	do return false end

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30b9_30de_30c3_30b7_30e5_ff11()

	Talk( "MID_EV4" )

	Tutorial("TUTID_スマッシュ")

	VariableSet( g_key_tutorial_smash1, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30e9_30d4_30b9_304c_8ab0_304b_306b_653b_6483()

	if VariableGet( g_key_tutorial_smash2 ) == 1 then
		do return false end
	end

	if UnitHasWholeSkill( "PID_ラピス", "SID_スマッシュ" ) then

		local unit = MindGetTargetUnit()
		local x = UnitGetX( unit );
		local z = UnitGetZ( unit );
		VariableSet( g_key_smash_target_unit, unit )
		VariableSet( g_key_smash_target_unit_x, x )
		VariableSet( g_key_smash_target_unit_z, z )

	end

	do return false end

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___30e9_30d4_30b9_304c_8ab0_304b_3092_30d6_30ec_30a4_30af()

	if VariableGet( g_key_tutorial_smash2 ) == 1 then
		do return false end
	end

	local unit = VariableGet( g_key_smash_target_unit )
	local x = VariableGet( g_key_smash_target_unit_x )
	local z = VariableGet( g_key_smash_target_unit_z )

	VariableSet( g_key_smash_target_unit, -1 )
	VariableSet( g_key_smash_target_unit_x, -1 )
	VariableSet( g_key_smash_target_unit_z, -1 )

	if unit == -1 then
		do return false end
	end

	if not UnitExistOnMap( unit ) then
		do return false end
	end

	if ( x == UnitGetX( unit ) ) and ( z == UnitGetZ( unit ) ) then
		do return false end
	end

	do return true end

end

function _u30e9_30d4_30b9_304c_8ab0_304b_3092_30d6_30ec_30a4_30af()

	Talk( "MID_EV5" )

	VariableSet( g_key_tutorial_smash2, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30eb_30ad_30ca_95c7_30b7_30f3_30af_30ed_30a4_30d9_30f3_30c8()
	if UnitGetGodUnit( "PID_M007_オルテンシア" ) == nil then
		do return true end
	end

	do return false end
end

function _u30eb_30ad_30ca_95c7_30b7_30f3_30af_30ed_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid("PID_M007_オルテンシア")

	Movie("Scene12")
	SkipEscape()

	UnitCreateGodUnit("PID_M007_オルテンシア", "GID_M007_敵ルキナ")
	UnitSetItemEquip( "PID_M007_オルテンシア", "IID_ルキナ_ノーブルレイピア" )

	Tutorial("TUTID_闇シンクロ")

	Talk( "MID_EV7" )

end

function _uc_o_n_d_i_t_i_o_n___30aa_30eb_30c6_30f3_30b7_30a2_968a_A_I_30a2_30af_30c6_30a3_30d6()
	if VariableGet( g_key_holtensia_act ) == 1 then
		do return false end
	end

	local Hol_x = UnitGetX( "PID_M007_オルテンシア" )
	local Hol_z = UnitGetZ( "PID_M007_オルテンシア" )

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do

		local x = UnitGetX( index )
		local z = UnitGetZ( index )

		if ( _u4e8c_70b9_9593_8ddd_96e2( Hol_x, Hol_z, x, z ) <= 6 ) then
			do return true end
		end

		index = ForceUnitGetNext(index)

	end

	do return false end

end

function _u30aa_30eb_30c6_30f3_30b7_30a2_968a_A_I_30a2_30af_30c6_30a3_30d6()
	VariableSet( g_key_holtensia_act, 1 )
end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

end

function GameOver()

	Log("GameOver")

end
