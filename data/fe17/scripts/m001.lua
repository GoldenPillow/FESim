Include("Common")
g_pid_lueur = "PID_リュール"
g_pid_boss = "PID_M001_異形兵_蛮族_ボス"

g_key_tutorial_recovery	= "チュートリアル_回復_済"
g_key_hitControl_lueur	= "命中補正設定_リュール_済"
g_key_hitControl_vandre	= "命中補正設定_ヴァンドレ_済"
g_key_marthSynchro		= "マルスとシンクロ_済"
g_key_tutorial_marth1	= "マルスの能力紹介_済"
g_key_tutorial_marth2	= "チュートリアル_紋章士マルス_済"

function Startup()

	Log("Startup")

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

	if VariableGet( g_key_tutorial_recovery ) == 0 then
		VariableSet( "禁止_持ち物", 2 )
		VariableSet( "禁止_交換", 2 )
	end

	VariableSet( "禁止_輸送隊", 2 )

	VariableSet( "禁止_チェインアタック", 1 )
	VariableSet( "禁止_チェインガード", 1 )
	VariableSet( "禁止_ブレイク", 1 )

	WinRuleSetEnemyNumberLessThanOrEqualTo( -1 )
	WinRuleSetMID( "MID_RULE_M001_WIN" )

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( g_key_tutorial_recovery,	0 )
	VariableEntry( "戦闘回数_リュール",		0 )
	VariableEntry( "戦闘回数_ヴァンドレ",	0 )

	VariableEntry( g_key_hitControl_lueur,	0 )
	VariableEntry( g_key_hitControl_vandre,	0 )

	VariableEntry( g_key_marthSynchro,		0 )
	VariableEntry( g_key_tutorial_marth1,	0 )
	VariableEntry( g_key_tutorial_marth2,	0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u30bf_30fc_30f3_ff11___6575_A_I_8a2d_5b9a,	1, 1, FORCE_ENEMY)
	EventEntryTurn(_u30bf_30fc_30f3_ff11___7dd1_8ecd_A_I_8a2d_5b9a,	1, 1, FORCE_ALLY)
	EventEntryTurn(_u30bf_30fc_30f3_ff12___6575_A_I_8a2d_5b9a,	2, 2, FORCE_ENEMY)
	EventEntryTurn(_u30bf_30fc_30f3_ff12___7dd1_8ecd_A_I_8a2d_5b9a,	2, 2, FORCE_ALLY)
	EventEntryTurn(_u30bf_30fc_30f3_ff13___6575_A_I_8a2d_5b9a,	3, 3, FORCE_ENEMY)

	EventEntryTurn(_u30ea_30e5_30fc_30eb_884c_52d5_4e88_7d04, -1, -1, FORCE_PLAYER)

	EventEntryBattleAfter(_u547d_4e2d_88dc_6b63___6226_95d8_30ab_30a6_30f3_30c8, g_pid_lueur,		FORCE_PLAYER, "", FORCE_ENEMY, true, g_key_hitControl_lueur,	g_pid_lueur,		g_key_hitControl_lueur, "戦闘回数_リュール")
	EventEntryBattleAfter(_u547d_4e2d_88dc_6b63___6226_95d8_30ab_30a6_30f3_30c8, "PID_ヴァンドレ",	FORCE_PLAYER, "", FORCE_ENEMY, true, g_key_hitControl_vandre,	"PID_ヴァンドレ",	g_key_hitControl_vandre, "戦闘回数_ヴァンドレ")
	EventEntryUnitCommandPrepare(_u547d_4e2d_88dc_6b63_8a2d_5b9a, g_pid_lueur,			g_key_hitControl_lueur,		g_pid_lueur,		g_key_hitControl_lueur)
	EventEntryUnitCommandPrepare(_u547d_4e2d_88dc_6b63_8a2d_5b9a, "PID_ヴァンドレ",	g_key_hitControl_vandre,	"PID_ヴァンドレ",	g_key_hitControl_vandre)
	EventEntryTurn(_u547d_4e2d_88dc_6b63_8a2d_5b9a, 1, 1, FORCE_ENEMY,		g_key_hitControl_lueur,		g_pid_lueur,		g_key_hitControl_lueur)
	EventEntryTurn(_u547d_4e2d_88dc_6b63_8a2d_5b9a, 1, 1, FORCE_ENEMY,		g_key_hitControl_vandre,	"PID_ヴァンドレ",	g_key_hitControl_vandre)
	EventEntryTurn(_u547d_4e2d_88dc_6b63_89e3_9664, 2, 2, FORCE_PLAYER,	g_key_hitControl_lueur,		g_pid_lueur)
	EventEntryTurn(_u547d_4e2d_88dc_6b63_89e3_9664, 2, 2, FORCE_PLAYER,	g_key_hitControl_vandre,	"PID_ヴァンドレ")

	EventEntryTurn(		_u30a4_30d9_30f3_30c8___79c1_3082_6226_3044_307e_3059,			1, 1, FORCE_PLAYER)
	EventEntryTurnAfter(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___5730_5f62_52b9_679c,		1, 1, FORCE_PLAYER)

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___6226_95d8_30b9_30bf_30a4_30eb, "PID_ヴァンドレ", "チュートリアル_戦闘スタイル_済")

	EventEntryTurnAfter(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___56de_5fa9,			2, 2, FORCE_PLAYER, g_key_tutorial_recovery)

	EventEntryTurnAfter(_u30a4_30d9_30f3_30c8___9003_3052_3088_3046, 1, 1, FORCE_ALLY, "ターン後イベント_逃げよう")
	EventEntryBattleTalk(Talk, "", FORCE_ENEMY, "PID_フラン", FORCE_ALLY, false, "戦闘前イベント_フラン済", "MID_EV6")
	EventEntryBattleTalk(Talk, "", FORCE_ENEMY, "PID_クラン", FORCE_ALLY, false, "戦闘前イベント_クラン済", "MID_EV8")

	EventEntryDie( _u30a4_30d9_30f3_30c8_524d_306b_6575_3092_5168_6ec5,	"", FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___30a4_30d9_30f3_30c8_524d_306b_6575_3092_5168_6ec5 )
	EventEntryTurnEnd(	_u30a4_30d9_30f3_30c8___30de_30eb_30b9_3068_30b7_30f3_30af_30ed,	-1, -1, FORCE_ENEMY,	_uc_o_n_d_i_t_i_o_n___30a4_30d9_30f3_30c8___30de_30eb_30b9_3068_30b7_30f3_30af_30ed)
	EventEntryTurnAfter(_u30de_30eb_30b9_306e_80fd_529b_7d39_4ecb,			-1, -1, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_306e_80fd_529b_7d39_4ecb)

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_58eb_30de_30eb_30b9, g_pid_lueur, _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_58eb_30de_30eb_30b9)

	EventEntryDie(VariableSet,			"", FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___52dd_5229_5224_5b9a, "勝利", 1)

end

function Cleanup()

	Log("Cleanup")

	_u30b9_30ad_30eb_89e3_9664( g_pid_lueur, "SID_必殺０" )
	_u30b9_30ad_30eb_89e3_9664( "PID_ヴァンドレ", "SID_必殺０" )

end

function Opening()
	Log("Opening")

	Movie("Scene01")
	SkipEscape()

	PuppetDemo("M001", "MID_OP2")
	PuppetDemo("M001", "MID_OP3")

	Movie("Scene02")
	SkipEscape()
end

function MapOpening()

	Log("MapOpening")

	CursorSetPos( 6, 4 )
	CursorSetDistanceMode( CURSOR_DISTANCE_NEAR )
	MapCameraWait()

end

function _u30ea_30e5_30fc_30eb_884c_52d5_4e88_7d04()
	VariableSet("行動予約", PersonGetIndex(g_pid_lueur))
end

function EmptyFunction()
end

function _u547d_4e2d_88dc_6b63___6226_95d8_30ab_30a6_30f3_30c8(pid, flag, count)
	VariableSet(flag, 0)

	if VariableIsExist(count) then
		local num = VariableGet(count)
		num = num + 1

		if ( num >= 2 ) then
			_u547d_4e2d_88dc_6b63_89e3_9664(pid)
			VariableSet(flag, 1)
		end

		VariableSet(count, num)
	end
end

function _u547d_4e2d_88dc_6b63_8a2d_5b9a(pid, flag)
	VariableSet(flag, 0)

	local sid_on = nil
	local sid_off = nil

	local x = UnitGetX(pid)
	local z = UnitGetZ(pid)
	local terrain = TerrainGet(x, z)

	if ( terrain == "TID_茂み" ) or ( terrain == "TID_林" ) then
		sid_on = "SID_相手の命中０"
		sid_off = "SID_相手の命中１００"
	else
		sid_on = "SID_相手の命中１００"
		sid_off = "SID_相手の命中０"
	end

	_u30b9_30ad_30eb_89e3_9664(pid, sid_off)
	_u30b9_30ad_30eb_88c5_5099(pid, sid_on)
end

function _u547d_4e2d_88dc_6b63_89e3_9664(pid)
	_u30b9_30ad_30eb_89e3_9664(pid, "SID_相手の命中０")
	_u30b9_30ad_30eb_89e3_9664(pid, "SID_相手の命中１００")
end

function _u30a4_30d9_30f3_30c8___79c1_3082_6226_3044_307e_3059()
	Dispos("Hero", DISPOS_FLAG_NONE)
	Yield()

	Talk("MID_EV1")

	local sid = "SID_相手の命中１００"
	_u30b9_30ad_30eb_88c5_5099(g_pid_lueur, sid)
	_u30b9_30ad_30eb_88c5_5099("PID_ヴァンドレ", sid)
	_u30b9_30ad_30eb_88c5_5099("PID_クラン", sid)
	_u30b9_30ad_30eb_88c5_5099("PID_フラン", sid)

	_u30b9_30ad_30eb_88c5_5099( g_pid_lueur, "SID_必殺０" )
	_u30b9_30ad_30eb_88c5_5099( "PID_ヴァンドレ", "SID_必殺０" )

	WinRule()
end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___5730_5f62_52b9_679c()

	Talk("MID_EV2")

	CursorSetPos( 7, 3 )
	MapCameraWait()

	CursorAnimeCreate( 6, 3, "W2H1" )
	Talk("MID_EV3")
	CursorAnimeDelete()

	Tutorial("TUTID_地形効果")

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___6226_95d8_30b9_30bf_30a4_30eb()
	CursorSetPos_FromPid(MindGetUnit())
	MapCameraWait()

	Tutorial( "TUTID_戦闘スタイル" )
	Tutorial( "TUTID_騎馬スタイル" )
end

function _u30bf_30fc_30f3_ff11___6575_A_I_8a2d_5b9a()
	if UnitExistOnMap(g_pid_boss) then
		AiSetSequence(g_pid_boss, AI_ORDER_ATTACK, "AI_AT_Person", "PID_フラン")
		AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_Person", "PID_フラン")
	end
end

function _u30bf_30fc_30f3_ff11___7dd1_8ecd_A_I_8a2d_5b9a()
	local pid = "PID_フラン"
	if UnitExistOnMap(pid) then
		AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_Position", "pos(6, 10)")
	end

	pid = "PID_クラン"
	if UnitExistOnMap(pid) then
		AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_Position", "pos(6, 9)")
	end
end

function _u30bf_30fc_30f3_ff12___6575_A_I_8a2d_5b9a()
	if UnitExistOnMap(g_pid_boss) then
		AiSetSequence(g_pid_boss, AI_ORDER_ATTACK, "AI_AT_Person", "PID_クラン")
		AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_Person", "PID_クラン")
	end
end

function _u30bf_30fc_30f3_ff12___7dd1_8ecd_A_I_8a2d_5b9a()
	local pid = "PID_フラン"
	if UnitExistOnMap(pid) then
		AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_Position", "pos(5, 12)")
	end

	pid = "PID_クラン"
	if UnitExistOnMap(pid) then
		AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_Position", "pos(6, 12)")
	end
end

function _u30bf_30fc_30f3_ff13___6575_A_I_8a2d_5b9a()

	if ( UnitGetByPos(6, 9) == nil ) and ( UnitGetByPos(6, 10) == nil ) and ( UnitGetByPos(6, 11) == nil ) then

	elseif ( UnitGetByPos(5, 8) == nil ) and ( UnitGetByPos(5, 9) == nil ) and ( UnitGetByPos(5, 10) == nil ) then

		if UnitExistOnMap(g_pid_boss) then
			AiSetSequence(g_pid_boss, AI_ORDER_ATTACK, "AI_AT_Null")
			AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_Position", "pos(5, 10)")
		end

	elseif ( UnitGetByPos(7, 8) == nil ) and ( UnitGetByPos(7, 9) == nil ) and ( UnitGetByPos(7, 10) == nil ) then

		if UnitExistOnMap(g_pid_boss) then
			AiSetSequence(g_pid_boss, AI_ORDER_ATTACK, "AI_AT_Null")
			AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_Position", "pos(7, 10)")
		end

	end

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___56de_5fa9()
	CursorSetPos_FromPid(g_pid_lueur)

	local maxHp = UnitGetCapability(g_pid_lueur, CAPABILITY_HP, false)
	local hp = UnitGetHp(g_pid_lueur)

	if ( maxHp - hp ) > 0 then
		Talk("MID_EV4")
	else
		Talk("MID_EV5")
	end

	Tutorial("TUTID_回復")

	VariableSet( "禁止_持ち物", 0 )
	VariableSet( "禁止_交換", 0 )
end

function _u30a4_30d9_30f3_30c8___9003_3052_3088_3046()
	CursorSetPos_FromPid("PID_フラン")
	Talk("MID_EV7")
end

function _uc_o_n_d_i_t_i_o_n___30a4_30d9_30f3_30c8_524d_306b_6575_3092_5168_6ec5()

	if VariableGet( g_key_marthSynchro ) == 1 then
		return false
	end

	if ForceUnitGetCount( FORCE_ENEMY ) == 1 then
		return true
	end

	return false
end

function _u30a4_30d9_30f3_30c8_524d_306b_6575_3092_5168_6ec5()

	if		MapGetPhase() == FORCE_PLAYER then

		VariableSet( "行動後フェイズ終了", 1 )

	end

end

function _uc_o_n_d_i_t_i_o_n___30a4_30d9_30f3_30c8___30de_30eb_30b9_3068_30b7_30f3_30af_30ed()
	if VariableGet( g_key_marthSynchro ) == 1 then
		return false
	end

	if ForceUnitGetCount( FORCE_ENEMY ) == 0 then
		return true
	end

	if MapGetTurn() == 3 then
		return true
	end

	return false

end

function _u30a4_30d9_30f3_30c8___30de_30eb_30b9_3068_30b7_30f3_30af_30ed()

	VariableSet( "行動後フェイズ終了", 0 )

	_u6575_306e_5897_63f4()

	CursorSetPos_FromPid(g_pid_lueur)

	Talk("MID_EV9")

	FadeOutAndWait(FADE_FAST)

			Movie("Scene03")
			SkipEscape()

			_u30de_30eb_30b9_306e_9855_73fe_3068_30b7_30f3_30af_30ed()

			Movie("Scene04")
			SkipEscape()

			CursorSetPos(6, 11)
			MapCameraWait()

			if UnitExistOnMap( g_pid_boss ) then
				UnitDelete( g_pid_boss )
			end

			_u53cc_5b50_96e2_8131()

			if	UnitExistOnMap( "PID_ヴァンドレ" )		and
				( UnitGetX( "PID_ヴァンドレ" ) == 6 )	and
				( UnitGetZ( "PID_ヴァンドレ" ) == 10 )	then
					UnitSetPos( "PID_ヴァンドレ", 5, 9 )
			end

			UnitSetPos(g_pid_lueur, 6, 10)
			UnitMoveWait()
			CursorSetPos_FromPid( g_pid_lueur )

	FadeInAndWait(FADE_FAST)

	_u30b9_30ad_30eb_89e3_9664( g_pid_lueur, "SID_必殺０" )
	_u30b9_30ad_30eb_89e3_9664( "PID_ヴァンドレ", "SID_必殺０" )

	VariableSet( g_key_marthSynchro, 1 )

end

function _u6575_306e_5897_63f4()
	CursorSetPos( 6, 11 )
	MapCameraWait()
	WaitTime(0.5)
	Dispos("Reinforcement", DISPOS_FLAG_NONE)
	Yield()
	WaitTime(0.5)
end

function _u30de_30eb_30b9_306e_9855_73fe_3068_30b7_30f3_30af_30ed()

	Movie("S04")
	SkipEscape()

	GodUnitCreate("GID_マルス")
	UnitSetGodUnit(g_pid_lueur, "GID_マルス")
	UnitSetEngageCount(g_pid_lueur, 7)

	local maxHp = UnitGetCapability(g_pid_lueur, CAPABILITY_HP, true)
	UnitSetHp(g_pid_lueur, maxHp)

end

function _u53cc_5b50_96e2_8131()
	if UnitExistOnMap("PID_フラン") then
		UnitDelete("PID_フラン")
	end
	if UnitExistOnMap("PID_クラン") then
		UnitDelete("PID_クラン")
	end
end

function _u634f_9020_30d0_30c8_30eb()

	_u30b9_30ad_30eb_89e3_9664( g_pid_boss, "SID_死亡回避" )
	_u30b9_30ad_30eb_88c5_5099( g_pid_lueur, "SID_命中１００", "SID_神将スキル確率補正１００" )
	VariableSet( "禁止_経験値", 1 )

	Battle(g_pid_boss, g_pid_lueur)

	VariableSet( "禁止_経験値", 0 )
	_u30b9_30ad_30eb_89e3_9664( g_pid_lueur, "SID_命中１００", "SID_神将スキル確率補正１００" )

end

function _uc_o_n_d_i_t_i_o_n___30de_30eb_30b9_306e_80fd_529b_7d39_4ecb()

	if VariableGet( g_key_tutorial_marth1 ) == 1 then
		return false
	end

	if VariableGet( g_key_marthSynchro ) == 1 then
		return true
	end

	return false

end

function _u30de_30eb_30b9_306e_80fd_529b_7d39_4ecb()
	Talk("MID_EV12")
	Tutorial( "TUTID_シンクロ" )

	VariableSet( g_key_tutorial_marth1, 1 )
end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_58eb_30de_30eb_30b9()
	if VariableGet( g_key_tutorial_marth2 ) == 1 then
		return false
	end

	if UnitGetGodUnit( g_pid_lueur ) ~= nil then
		return true
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___7d0b_7ae0_58eb_30de_30eb_30b9()
	Tutorial("TUTID_紋章士マルス")
	VariableSet( g_key_tutorial_marth2, 1 )
end

function _uc_o_n_d_i_t_i_o_n___52dd_5229_5224_5b9a()

	if VariableGet( g_key_marthSynchro ) == 0 then
		return false
	end

	if ForceUnitGetCount( FORCE_ENEMY ) == 1 then
		return true
	end

	return false

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
