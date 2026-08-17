Include("Common")
g_pid_lueur = "PID_リュール"

g_key_tutorial_visit	= "チュートリアル_訪問_済"

g_key_pickupCeline		= "ピックアップ_セリーヌ_済"

g_key_celineX			= "セリーヌ位置X"
g_key_celineZ			= "セリーヌ位置Z"

g_key_tutorial_warp		= "チュートリアル_ワープライナ_済"
g_key_talk_chloe		= "会話イベント_セリーヌ_クロエ_済"
g_key_talk_louis		= "会話イベント_セリーヌ_ルイ_済"

g_key_house1destroy			= "S_民家１破壊_済"
g_key_house2destroy			= "S_民家２破壊_済"
g_key_turn2event			= "２ターン目のイベント再生済み"

g_map_width				= 23
g_map_height			= 20

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_M004_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_house1destroy, 0 )
	VariableEntry( g_key_house2destroy, 0 )

	VariableEntry( g_key_tutorial_visit, 0 )

	VariableEntry( g_key_pickupCeline, 0 )
	VariableEntry( g_key_celineX, 0 )
	VariableEntry( g_key_celineZ, 0 )
	VariableEntry( g_key_tutorial_warp, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8, 1, 1,  FORCE_PLAYER)

	EventEntryTurn(_u52dd_5229_6761_4ef6___6575_5c06_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER, condition_true, "PID_M004_イルシオン兵_ボス")

	EventEntryTurnAfter(Tutorial, 1, 1, FORCE_PLAYER, condition_true, "TUTID_戦死者の魂" )

	EventEntryPickup(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___8a2a_554f, "", _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___8a2a_554f)

	EventEntryPickup(_u30d4_30c3_30af_30a2_30c3_30d7___30bb_30ea_30fc_30cc, "PID_セリーヌ", _uc_o_n_d_i_t_i_o_n___30d4_30c3_30af_30a2_30c3_30d7___30bb_30ea_30fc_30cc)
	EventEntryEngageAfter(_u30a8_30f3_30b2_30fc_30b8_5f8c_306b_518d_751f, "PID_セリーヌ", "セリーヌ・セリカエンゲージ後_済")
	EventEntryUnitCommandInterrupt(_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ef_30fc_30d7_30e9_30a4_30ca, "PID_セリーヌ", "エンゲージ技", _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ef_30fc_30d7_30e9_30a4_30ca)

	EventEntryTurn(_u9752_8ecd_ff12_30bf_30fc_30f3_76f4_524d, 2, 2,  FORCE_PLAYER, g_key_turn2event)

	EventEntryVisit(_u6c11_5bb6_ff11_8a2a_554f_30a4_30d9_30f3_30c8, 7, 4)
	EventEntryVisit(_u6c11_5bb6_ff12_8a2a_554f_30a4_30d9_30f3_30c8, 14, 10)
	EventEntryDestroy(_u6c11_5bb6_7834_58ca___30d5_30e9_30b0_30bb_30c3_30c8,  7,  4,  7,  4,	 6,  5,  8,  7,		g_key_house1destroy)
	EventEntryDestroy(_u6c11_5bb6_7834_58ca___30d5_30e9_30b0_30bb_30c3_30c8, 14, 10, 14, 10,	13, 11, 15, 13,		g_key_house2destroy)

	EventEntryTalk(Talk, "PID_セリーヌ", FORCE_PLAYER, "PID_クロエ",	FORCE_PLAYER, true, g_key_talk_chloe,	"MID_TK1")
	EventEntryTalk(Talk, "PID_セリーヌ", FORCE_PLAYER, "PID_ルイ",		FORCE_PLAYER, true, g_key_talk_louis,	"MID_TK2")

	EventEntryTurn(_u5897_63f4_ff14_30bf_30fc_30f3_76ee, 4, 4, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff15_30bf_30fc_30f3_76ee, 5, 5, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff17_30bf_30fc_30f3_76ee, 7, 7, FORCE_PLAYER, _u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af)

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, "PID_M004_イルシオン兵_ボス", FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT1")
	EventEntryDie(Talk, "PID_M004_イルシオン兵_ボス", FORCE_ENEMY, condition_true, "MID_BT2")

	EventEntryBattleAfter(_u30dc_30b9_5074_8fd1___5fc5_6bba_8abf_6574_30b9_30ad_30eb_5909_66f4, "PID_M004_異形兵_ボス側近", FORCE_ENEMY, "", FORCE_PLAYER, false, "戦闘後_ボス側近必殺調整_済")

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M004", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

	UnitSetPosFromPos(3,3,3,2)
	UnitSetPosFromPos(4,3,4,2)
	UnitSetPosFromPos(2,4,2,3)
	UnitSetPosFromPos(3,4,3,3)
	UnitSetPosFromPos(4,4,4,3)
	UnitSetPosFromPos(3,5,3,4)
	UnitSetPosFromPos(4,5,4,4)

	CursorSetPos(4,5)
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()
	FadeIn(FADE_NORMAL)
	WaitTime(0.1)

	UnitMovePosFromPos(4,4,4,5)
	UnitMovePosFromPos(3,4,3,5)
	UnitMovePosFromPos(4,3,4,4)
	UnitMovePosFromPos(3,3,3,4)
	UnitMovePosFromPos(2,3,2,4)
	UnitMovePosFromPos(4,2,4,3)
	UnitMovePosFromPos(3,2,3,3)

	UnitMoveWait()
	FadeWait()

	SoundPostEvent("BGM_Evt_Danger1")

	Talk("MID_OP2")

	CursorSetPos(6, 12)
	MapCameraWait()

	WaitTime(1.0)

	Talk("MID_OP3")

	CursorSetPos_FromPid_DistanceModeNear("PID_セリーヌ")

	FadeOutAndWait(FADE_FAST)
		SkipEscape()
		Movie("Scene07")

		if UnitExistOnMap("PID_セリーヌ") then
			UnitDelete("PID_セリーヌ")
		end
	FadeInAndWait(FADE_FAST)

	SoundPostEvent("BGM_Evt_Danger1_End")

	CursorSetPos_FromPid( g_pid_lueur )

	SoundPostEvent("BGM_Evt_Danger1_Stop_1000")
end

function _u9032_6483_958b_59cb_76f4_5f8c_30a4_30d9_30f3_30c8()
	_u30bb_30ea_30fc_30cc_5408_6d41_3068_30bb_30ea_30ab_9855_73fe()
	_u30af_30ed_30a8_3068_30eb_30a4_306e_4f1a_8a71()
end

function _u30bb_30ea_30fc_30cc_5408_6d41_3068_30bb_30ea_30ab_9855_73fe()

	CursorSetPos(2,4)
	MapCameraWait()

	Dispos("Celine", DISPOS_FLAG_NONE)
	Yield()

	_u5473_65b9_304c_30bb_30ea_30fc_30cc_306e_65b9_3092_5411_304f()

	Talk("MID_OP5")

	Movie("Kengen02")
	SkipEscape()

	FadeInAndWait(FADE_FAST)
	Talk("MID_OP6")

	UnitCreateGodUnit("PID_セリーヌ", "GID_セリカ")
	UnitSetEngageCount("PID_セリーヌ", 7)

	UnitMovePos( "PID_セリーヌ", 5, 4, MOVE_FLAG_NONE )
	UnitMoveWait()

	UnitJoin( "PID_セリーヌ", "PID_ルイ", "PID_クロエ" )

	UnitRotation("PID_セリーヌ", ROTATE_UP)
	UnitMoveWait()
	WaitTime(1.0)

end

function _u5473_65b9_304c_30bb_30ea_30fc_30cc_306e_65b9_3092_5411_304f()

	local celineX = UnitGetX("PID_セリーヌ")
	local celineZ = UnitGetZ("PID_セリーヌ")

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do
		UnitRotation(index, celineX, celineZ)
		index = ForceUnitGetNext(index)
	end

end

function _u30af_30ed_30a8_3068_30eb_30a4_306e_4f1a_8a71()

	CursorSetPos(13,9)
	MapCameraWait()

	Talk("MID_EV1")

	WaitTime(0.5)

	Tutorial( "TUTID_重装スタイル" )
	Tutorial( "TUTID_飛行スタイル" )

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___8a2a_554f()

	if VariableGet( g_key_tutorial_visit ) == 1 then
		return false
	end

	local unit = MindGetUnit()
	local pid = UnitGetPID( unit )
	if ( pid == "PID_セリーヌ" )
		or ( pid == "PID_ルイ" )
		or ( pid == "PID_クロエ" ) then
			return false
	end

	if not ( UnitGetForce( unit ) == FORCE_PLAYER ) then
		return false
	end

	if VariableGet("訪問_7_4") == 0 then
		return true
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___8a2a_554f()

	MapCameraWait()
	CursorAnimeCreate(7, 4)
	Talk("MID_EV4")
	CursorAnimeDelete()
	Tutorial( "TUTID_訪問" )

	VariableSet( g_key_tutorial_visit, 1 )

end

function _uc_o_n_d_i_t_i_o_n___30d4_30c3_30af_30a2_30c3_30d7___30bb_30ea_30fc_30cc()

	if VariableGet( g_key_pickupCeline ) == 0 then
		return true
	end

	if VariableGet( g_key_tutorial_warp ) == 0 then
		return true
	end

	return false

end

function _u30d4_30c3_30af_30a2_30c3_30d7___30bb_30ea_30fc_30cc()

	if VariableGet( g_key_pickupCeline ) == 0 then
		MapCameraWait()
		Talk("MID_EV2")

		Tutorial( "TUTID_紋章士セリカ" )

		Talk("MID_EV10")

		VariableSet( g_key_pickupCeline, 1 )
	end

	VariableSet( g_key_celineX, UnitGetX( "PID_セリーヌ" ) )
	VariableSet( g_key_celineZ, UnitGetZ( "PID_セリーヌ" ) )

end

function _u30a8_30f3_30b2_30fc_30b8_5f8c_306b_518d_751f()

	Talk( "MID_EV3" )

end

function _uc_o_n_d_i_t_i_o_n___30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ef_30fc_30d7_30e9_30a4_30ca()

	if VariableGet( g_key_tutorial_warp ) ~= 0 then
		return false
	end

	if _uc_o_n_d_i_t_i_o_n___6551_52a9_53ef_80fd() then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6551_52a9_53ef_80fd()

	if		VariableGet( g_key_talk_chloe ) ~= 0
		and	VariableGet( g_key_talk_louis ) ~= 0 then
			return false
	end

	local x_celine = VariableGet( g_key_celineX )
	local z_celine = VariableGet( g_key_celineZ )

	local enemy = ForceUnitGetFirst(FORCE_ENEMY)
	while enemy ~= nil do

		local x_enemy = UnitGetX( enemy )
		local z_enemy = UnitGetZ( enemy )
		local _dist = _u4e8c_70b9_9593_8ddd_96e2(x_celine, z_celine, x_enemy, z_enemy)

		if ( 6 < _dist ) and ( _dist <= 16 ) then

			if		( UnitExistOnMap("PID_ルイ")	and ( VariableGet( g_key_talk_louis ) == 0 ) and _uc_o_n_d_i_t_i_o_n___6551_52a9_8ddd_96e2( x_celine, z_celine, x_enemy, z_enemy, "PID_ルイ" ) )
				or	( UnitExistOnMap("PID_クロエ")	and	( VariableGet( g_key_talk_chloe ) == 0 ) and _uc_o_n_d_i_t_i_o_n___6551_52a9_8ddd_96e2( x_celine, z_celine, x_enemy, z_enemy, "PID_クロエ" ) ) then

				if _uc_o_n_d_i_t_i_o_n___30ef_30fc_30d7_653b_6483_53ef_80fd( x_celine, z_celine, x_enemy, z_enemy ) then
					return true
				end

			end

		end

		enemy = ForceUnitGetNext( enemy )
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___6551_52a9_8ddd_96e2( x_celine, z_celine, x_enemy, z_enemy, pid )

	x_unit = UnitGetX( pid )
	z_unit = UnitGetZ( pid )

	local dist_C_U = _u4e8c_70b9_9593_8ddd_96e2(x_celine,	z_celine,	x_unit,		z_unit)
	local dist_U_E = _u4e8c_70b9_9593_8ddd_96e2(x_unit,		z_unit,		x_enemy,	z_enemy)

	if ( dist_U_E <= 5 ) and ( dist_U_E < dist_C_U ) then
		return true
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___30ef_30fc_30d7_653b_6483_53ef_80fd( x_celine, z_celine, x_enemy, z_enemy )

	for z = -2, 2 do
		for x = -2, 2 do

			local _x = x_enemy + x
			local _z = z_enemy + z

			if ( 0 < _z ) and ( _z < g_map_height ) and ( 0 < _x ) and ( _x < g_map_width ) then

				if _u4e8c_70b9_9593_8ddd_96e2(x_celine, z_celine, _x, _z) <= 14 then

					local abs = math.abs( z ) + math.abs( x )
					if ( abs == 1 ) or ( abs == 2 ) then

						if UnitGetByPos( _x, _z ) == nil then

							local cost = TerrainGetMoveCost( _x, _z )
							if ( cost == "COST_平地" ) or ( cost == "COST_林" ) or ( cost == "COST_浅瀬" ) then

								return true

							end

						end

					end

				end

			end

		end
	end

	return false

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___30ef_30fc_30d7_30e9_30a4_30ca()

	Talk( "MID_EV11" )
	VariableSet( g_key_tutorial_warp, 1 )

end

function _u9752_8ecd_ff12_30bf_30fc_30f3_76f4_524d()

	Dispos("Bandit", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
	Talk("MID_EV8")

	CursorSetPos_FromPid( g_pid_lueur )
	Talk("MID_EV9")
	SoundPostEvent("ItemGet_Important")
	Dialog( "MID_TUT_NAVI_M004_TIMECRYSTAL" )
	Tutorial( "TUTID_竜の時水晶" )

	MapHistoryRewindEnable()
end

function _u6c11_5bb6_ff11_8a2a_554f_30a4_30d9_30f3_30c8()
	Talk("MID_EV5")
	ItemGain(MindGetUnit(), "IID_手槍")
end

function _u6c11_5bb6_ff12_8a2a_554f_30a4_30d9_30f3_30c8()
	Talk("MID_EV6")
	ItemGain(MindGetUnit(), "IID_2000G")

	local pid = "PID_M004_蛮族"
	if UnitExistOnMap(pid) then
		AiSetSequence(pid, AI_ORDER_MIND, "AI_MI_Village", "pos(7,4)")
		AiSetSequence(pid, AI_ORDER_MOVE, "AI_MV_VillageToAttack", "pos(7,4)")
	end
end

function _u5897_63f4_ff14_30bf_30fc_30f3_76ee()
	CursorSetPos_FromPid("M004_イルシオン兵_ボス")
	Talk("MID_EV7")

	CursorSetPos( 13, 15 )
	MapCameraWait()

	Dispos("Event1", DISPOS_FLAG_FORCED)
	Yield()
	WaitTime(0.5)

	Tutorial( "TUTID_増援" )
end

function _u5897_63f4_ff15_30bf_30fc_30f3_76ee()
	Dispos("Event2", DISPOS_FLAG_FOCUS)
	Yield()

	Dispos("Event3", DISPOS_FLAG_FOCUS)
	Yield()

end

function _u5897_63f4_ff17_30bf_30fc_30f3_76ee()
	Dispos("Event4", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u30dc_30b9_5074_8fd1___5fc5_6bba_8abf_6574_30b9_30ad_30eb_5909_66f4()
	local pid = "PID_M004_異形兵_ボス側近"

	if UnitExistOnMap( pid ) then
		_u30b9_30ad_30eb_89e3_9664( pid, "SID_必殺０" )
	end
end

function MapEnding()
	Log("MapEnding")

	if VariableGet( g_key_turn2event ) == 0 then
		MapHistoryRewindEnable()
	end
end

function Ending()
	Log("Ending")
end

function GameOver()
	Log("GameOver")
end
