Include("Common")
Include("Common_E")

g_pid_lueur = "PID_リュール"
g_pid_boss = "PID_M020_グリ"

g_key_warp_first_event	= "グリ_ライナワープ初回_イベント_済"
g_key_warp_end			= "グリ_ライナワープ終了_済"
g_key_warp_end_event	= "グリ_ライナワープ終了イベント_済"

g_key_thief				= "盗賊登場_済"

g_last_warp_x			= 10
g_last_warp_z			= 25

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_M020_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry( g_key_warp_first_event, 0 )
	VariableEntry( g_key_warp_end, 0 )
	VariableEntry( g_key_warp_end_event, 0 )

	VariableEntry( g_key_thief, 0 )

	E_BattleTalk_VariableEntry()

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9752_8ecd_ff11_30bf_30fc_30f3_76f4_524d,				1,	1,	FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6,						1,	1,	FORCE_PLAYER )

	EventEntryTurn(_u76d7_8cca_767b_5834,						4,	4,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___76d7_8cca_767b_5834___30ce_30fc_30de_30eb)
	EventEntryTurn(_u76d7_8cca_767b_5834,						2,	2,	FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___76d7_8cca_767b_5834)

	EventEntryTbox(_u5b9d_7bb1_5165_624b,  1, 24, "IID_銀の大剣")
	EventEntryTbox(_u5b9d_7bb1_5165_624b,  3, 24, "IID_レスキュー")

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 17, 24, "IID_勇者の弓")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 19, 24, "IID_秘伝の書")

	E_BattleTalkEntry_Gris( g_pid_boss )
	EventEntryBattleTalk(Talk, g_pid_lueur,	FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_グリ_リュール_済",	"MID_BT2")
	EventEntryBattleTalk(Talk, "",			FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_グリ_済",			"MID_BT1")

	EventEntryReviveBefore(	_u30b0_30ea_66b4_8d70_524d, g_pid_boss, FORCE_ENEMY, "グリ暴走前_済" )
	EventEntryReviveAfter(	_u30b0_30ea_66b4_8d70_5f8c, g_pid_boss, FORCE_ENEMY, "グリ暴走後_済" )

	EventEntryDie(Talk, g_pid_boss, FORCE_ENEMY, condition_true, "MID_BT3")

	EventEntryFixed( _u30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_521d_56de_30a4_30d9_30f3_30c8,	g_pid_boss, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_521d_56de_30a4_30d9_30f3_30c8 )
	EventEntryFixed( _u30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_7d42_4e86_30a4_30d9_30f3_30c8,	g_pid_boss, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_7d42_4e86_30a4_30d9_30f3_30c8 )

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M020", "MID_OP1")
	PuppetDemo("M020", "MID_OP2")
	PuppetDemo("M020", "MID_OP3")

end

function MapOpening()

	Log("MapOpening")

	UnitSetItemEquip( g_pid_boss, "IID_セリカ_ライナロック" )

	AiSetRejectPower0Attack(g_pid_boss, false)
	_u30e9_30a4_30ca_30ef_30fc_30d7_56de_6570_8a2d_5b9a()

end

function _u30e9_30a4_30ca_30ef_30fc_30d7_56de_6570_8a2d_5b9a()

	if DifficultyGet() == DIFFICULTY_NORMAL then
		AiSetRerewarp( g_pid_boss, 2, g_last_warp_x, g_last_warp_z, g_key_warp_end )
	else
		AiSetRerewarp( g_pid_boss, 4, g_last_warp_x, g_last_warp_z, g_key_warp_end )
	end

end

function _u9752_8ecd_ff11_30bf_30fc_30f3_76f4_524d()

	CursorSetPos_FromPid( g_pid_boss )
	PlayFieldBgm(FORCE_PLAYER)
	Talk( "MID_EV1" )

	_u30b0_30ea_304c_30ef_30fc_30d7_3059_308b()

	CursorSetPos_FromPid( g_pid_lueur )
	Talk( "MID_EV2" )

end

function _uc_o_n_d_i_t_i_o_n___76d7_8cca_767b_5834___30ce_30fc_30de_30eb()

	if VariableGet( g_key_thief ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___76d7_8cca_767b_5834()

	if VariableGet( g_key_thief ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return true
	end

	return false

end

function _u76d7_8cca_767b_5834()

	Dispos( "Theif_1_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Theif_1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_thief, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_521d_56de_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_warp_first_event ) == 1 then
		return false
	end

	if VariableGet( g_key_warp_end_event ) == 1 then
		return false
	end

	if VariableGet( g_key_warp_end ) == 1 then
		return false
	end

	return true

end

function _u30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_521d_56de_30a4_30d9_30f3_30c8()

	Talk( "MID_EV3" )
	VariableSet( g_key_warp_first_event, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_7d42_4e86_30a4_30d9_30f3_30c8()

	if VariableGet( g_key_warp_end_event ) == 1 then
		return false
	end

	if VariableGet( g_key_warp_end ) == 1 then
		return true
	end

	return false

end

function _u30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_7d42_4e86_30a4_30d9_30f3_30c8()

	CursorSetPos_FromPid( g_pid_boss )

	Talk( "MID_EV4" )

	AiSetActive(g_pid_boss, false)
	AiSetBandNo(g_pid_boss, 1)
	AiSetSequence(g_pid_boss, AI_ORDER_ATTACK, "AI_AT_AttackCS", "")
	AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_WeakEnemy", "")

	VariableSet( g_key_warp_end_event, 1 )

end

function _u30b0_30ea_66b4_8d70_524d()
	CursorSetPos_FromPid( g_pid_boss )
	Talk( "MID_EV5" )
end

function _u30b0_30ea_66b4_8d70_5f8c()
	CursorSetPos_FromPid( g_pid_boss )
	Talk( "MID_EV6" )

	if VariableGet( g_key_warp_end_event ) == 0 then

		VariableSet( g_key_warp_end, 1 )

				EffectPlay( "ワープアウト_闇", UnitGetX( g_pid_boss ), UnitGetZ( g_pid_boss ) )
				WaitTime( 0.3 )

				UnitSetPos( g_pid_boss, 10, 1 )
				UnitMoveWait()

		CursorSetPos( g_last_warp_x, g_last_warp_z )
		WaitTime( 0.3 )
		MapCameraWait()

				UnitSetPos( g_pid_boss, g_last_warp_x, g_last_warp_z )
				UnitMoveWait()

				EffectPlay( "ワープイン_闇", UnitGetX( g_pid_boss ), UnitGetZ( g_pid_boss ) )
				WaitTime( 0.3 )

		_u30b0_30ea___30e9_30a4_30ca_30ef_30fc_30d7_7d42_4e86_30a4_30d9_30f3_30c8()

	end
end

function _u30b0_30ea_304c_30ef_30fc_30d7_3059_308b()

	local pos = AiGetRerewarpPosition( g_pid_boss )

	if pos ~= nil then

		EffectPlay( "ワープアウト_闇", UnitGetX( g_pid_boss ), UnitGetZ( g_pid_boss ) )
		WaitTime( 0.3 )

		UnitSetPos( g_pid_boss, pos["x"], pos["z"] )
		UnitMoveWait()
		WaitTime( 1.5 )

	else

		Warning( "エラー：グリの初回ワープ失敗" )

	end

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
