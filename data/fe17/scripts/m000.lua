Include("Common")
g_pid_lueur				= "PID_M000_リュール"

g_key_attack			= "攻撃しよう_済"
g_key_go_closer			= "早く敵に近づこう_済"
g_key_go_attack			= "早く攻撃しよう_済"
g_key_engage			= "エンゲージしよう_済"
g_key_engage_attack		= "エンゲージ技使おう_済"
g_key_battle			= "戦闘前会話_リュール_ソンブル_済"

function Startup()

	Log("Startup")

	VariableSet( "禁止_持ち物", 2 )
	VariableSet( "禁止_直接ターゲット選択", 1 )
	VariableSet( "禁止_チェインアタック", 1 )
	VariableSet( "禁止_チェインガード", 1 )
	VariableSet( "禁止_ブレイク", 1 )
	VariableSet( "禁止_エンゲージキャンセル", 1 )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID("MID_RULE_M000_WIN")
	LoseRuleSetMID( "MID_RULE_COMMON_LOSE" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry(g_key_go_closer,			0)
	VariableEntry(g_key_attack,				0)
	VariableEntry(g_key_go_attack,			0)
	VariableEntry(g_key_engage,				0)
	VariableEntry(g_key_engage_attack,		0)
	VariableEntry(g_key_battle,				0)
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u30a8_30f3_30b2_30fc_30b8_30ab_30a6_30f3_30c8_4e0a_66f8_304d, 1, 1, FORCE_PLAYER)
	EventEntryTurnAfter(_u79fb_52d5_3057_3088_3046, 1, 1, FORCE_PLAYER)
	EventEntryUnitCommandPrepare(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30e6_30cb_30c3_30c8_30b3_30de_30f3_30c9, g_pid_lueur, "チュートリアル_ユニットコマンド_済")
	EventEntryTurn(_u30bf_30fc_30f3_4ea4_4ee3, 1, 1, FORCE_ENEMY)

	EventEntryTurnAfter(_u653b_6483_3057_3088_3046,				2, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___653b_6483_3057_3088_3046)
	EventEntryTurnAfter(_u65e9_304f_6575_306b_8fd1_3065_3053_3046,		2, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___65e9_304f_6575_306b_8fd1_3065_3053_3046)
	EventEntryTurnAfter(_u65e9_304f_653b_6483_3057_3088_3046,			3, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___65e9_304f_653b_6483_3057_3088_3046)

	EventEntryBattleTalk(_u6226_95d8_524d_4f1a_8a71___30ea_30e5_30fc_30eb___30bd_30f3_30d6_30eb, g_pid_lueur, FORCE_PLAYER, "PID_M000_ソンブル", FORCE_ENEMY, true, g_key_battle)

	EventEntryTurnAfter(_u30a8_30f3_30b2_30fc_30b8_3057_3088_3046,		3, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___30a8_30f3_30b2_30fc_30b8_3057_3088_3046 )
	EventEntryEngageBefore( _u30a8_30f3_30b2_30fc_30b8, g_pid_lueur, "エンゲージ_済" )

	EventEntryDie(Talk, "PID_M000_ソンブル", FORCE_ENEMY, condition_true, "MID_BT2")
end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	FadeInAndWait(FADE_SLOW)
		Movie("S02")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

end

function MapOpening()

	Log("MapOpening")

	UnitCreateGodUnit(g_pid_lueur, "GID_M000_マルス")
	UnitSetEngageCount(g_pid_lueur, 3)

	CursorSetPos(5, 4)
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()
	FadeWait()

	UnitMovePos(g_pid_lueur, 5, 4, MOVE_FLAG_NONE)
	UnitMoveWait()
	WaitTime(0.5)

	CursorSetPos_FromPid("PID_M000_ソンブル")
	MapCameraWait()
	WaitTime(0.5)
	Talk("MID_OP2")
	WaitTime(1.0)
	Talk("MID_OP3")

	CursorAnimeCreate_FromPid( "PID_M000_ソンブル" )
		WinRule()
	CursorAnimeDelete()
end

function _u30a8_30f3_30b2_30fc_30b8_30ab_30a6_30f3_30c8_4e0a_66f8_304d()
	UnitSetEngageCount(g_pid_lueur, 3)
end

function _u79fb_52d5_3057_3088_3046()
	Talk("MID_EV1")
	Tutorial("TUTID_移動")
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30e6_30cb_30c3_30c8_30b3_30de_30f3_30c9()
	Tutorial("TUTID_ユニットコマンド")
end

function _u30bf_30fc_30f3_4ea4_4ee3()
	CursorSetPos_FromPid_DistanceModeNear("PID_M000_ソンブル")
	Talk("MID_EV2")
	Tutorial("TUTID_フェイズチェンジ")
end

function _uc_o_n_d_i_t_i_o_n___65e9_304f_6575_306b_8fd1_3065_3053_3046()
	if VariableGet(g_key_go_closer) == 1 then
		do return false end
	end

	if VariableGet(g_key_attack) == 1 then
		do return false end
	end

	local distance = _u4e8c_70b9_9593_8ddd_96e2( UnitGetX( g_pid_lueur ), UnitGetZ( g_pid_lueur ), UnitGetX( "PID_M000_ソンブル" ), UnitGetZ( "PID_M000_ソンブル" ) )
	if distance > 5 then
		do return true end
	end

	do return false end
end

function _u65e9_304f_6575_306b_8fd1_3065_3053_3046()
	Talk("MID_EV5")
	VariableSet(g_key_go_closer, 1)
end

function _uc_o_n_d_i_t_i_o_n___653b_6483_3057_3088_3046()
	if VariableGet(g_key_attack) == 1 then
		do return false end
	end
	if VariableGet(g_key_battle) == 1 then
		do return false end
	end

	local distance = _u4e8c_70b9_9593_8ddd_96e2( UnitGetX( g_pid_lueur ), UnitGetZ( g_pid_lueur ), UnitGetX( "PID_M000_ソンブル" ), UnitGetZ( "PID_M000_ソンブル" ) )
	if distance <= 5 then
		do return true end
	end

	do return false end
end

function _u653b_6483_3057_3088_3046()
	Talk("MID_EV3")
	Tutorial("TUTID_攻撃")
	VariableSet(g_key_attack, 1)
end

function _uc_o_n_d_i_t_i_o_n___65e9_304f_653b_6483_3057_3088_3046()
	if VariableGet(g_key_go_attack) == 1 then
		do return false end
	end
	if VariableGet(g_key_battle) == 1 then
		do return false end
	end
	if VariableGet(g_key_attack) == 0 then
		do return false end
	end

	do return true end
end

function _u65e9_304f_653b_6483_3057_3088_3046()
	Talk("MID_EV6")
	VariableSet(g_key_go_attack, 1)
end

function _u6226_95d8_524d_4f1a_8a71___30ea_30e5_30fc_30eb___30bd_30f3_30d6_30eb()

	VariableSet(g_key_go_attack, 1)
	Talk("MID_BT1")

end

function _uc_o_n_d_i_t_i_o_n___30a8_30f3_30b2_30fc_30b8_3057_3088_3046()

	if VariableGet(g_key_engage) == 1 then
		do return false end
	end

	if ( UnitGetEngageCount( g_pid_lueur ) == 7 ) and ( not UnitIsStatus( g_pid_lueur, UNIT_STATUS_ENGAGING ) ) then
		do return true end
	end

	do return false end

end

function _u30a8_30f3_30b2_30fc_30b8_3057_3088_3046()

	Talk("MID_EV7")
	Tutorial("TUTID_エンゲージ")

	VariableSet( "禁止_攻撃", 1 )
	VariableSet( "禁止_待機", 1 )

	VariableSet(g_key_engage, 1)

end

function _u30a8_30f3_30b2_30fc_30b8()
	FadeOutAndWait(FADE_FAST)
	Movie("S03")
	UnitSetEngaging( g_pid_lueur, true )
	FadeInAndWait(FADE_FAST)

	_u30a8_30f3_30b2_30fc_30b8_6280_4f7f_304a_3046()
end

function _u30a8_30f3_30b2_30fc_30b8_6280_4f7f_304a_3046()

	UnitSetItemEquip(g_pid_lueur, "IID_マルス_ファルシオン")

	Talk( "MID_EV4" )
	Tutorial( "TUTID_エンゲージ技" )

	VariableSet(g_key_engage_attack, 1)

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("M000", "MID_ED1")

end

function GameOver()

	Log("GameOver")

end
