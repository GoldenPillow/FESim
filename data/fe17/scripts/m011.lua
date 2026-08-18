Include("Common")
Include("Common_E")

g_pid_lueur					= "PID_リュール"

g_key_area					= "エリア進入_済"
g_key_escapePointEmpty			= "離脱地点空_済"
g_key_4docs_Ivy				= "四狗とアイビー登場_済"
g_key_defeat_engage_enemy_x	= "指輪持ちの敵を初撃破_x"
g_key_defeat_engage_enemy_z	= "指輪持ちの敵を初撃破_z"
g_key_defeat_engage_enemy	= "指輪持ちの敵を初撃破_済"
g_key_replacement_engage	= "増援時_初付け替えエンゲージ_済"

g_map_width					= 18
g_map_height				= 32

g_SynchroNumMax				= 2

g_BattleTalk				= "戦闘前会話_"
g_Waiting4Engage			= "エンゲージ待ち_"
g_GidPrefix					= "GID_M011_敵"

g_center_x = "プレイヤー軍中心座標X"
g_center_z = "プレイヤー軍中心座標Z"

function Startup()

	Log("Startup")

	WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
	WinRuleSetMID( "MID_RULE_M011_WIN" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry(g_key_defeat_engage_enemy_x,	-1)
	VariableEntry(g_key_defeat_engage_enemy_z,	-1)
	VariableEntry(g_key_defeat_engage_enemy,	0)
	VariableEntry(g_key_replacement_engage,		0)
	VariableEntry(g_key_4docs_Ivy,				0)
	VariableEntry(g_key_escapePointEmpty,		0)

	VariableEntry(g_BattleTalk .. "敵マルス"	.. "_済", 0)
	VariableEntry(g_BattleTalk .. "敵シグルド"	.. "_済", 0)
	VariableEntry(g_BattleTalk .. "敵セリカ"	.. "_済", 0)
	VariableEntry(g_BattleTalk .. "敵ミカヤ"	.. "_済", 0)
	VariableEntry(g_BattleTalk .. "敵ロイ"		.. "_済", 0)
	VariableEntry(g_BattleTalk .. "敵リーフ"	.. "_済", 0)

	VariableEntry(g_Waiting4Engage .. g_GidPrefix .. "マルス",		0)
	VariableEntry(g_Waiting4Engage .. g_GidPrefix .. "シグルド",	0)
	VariableEntry(g_Waiting4Engage .. g_GidPrefix .. "セリカ",		0)
	VariableEntry(g_Waiting4Engage .. g_GidPrefix .. "ミカヤ",		0)
	VariableEntry(g_Waiting4Engage .. g_GidPrefix .. "ロイ",		0)
	VariableEntry(g_Waiting4Engage .. g_GidPrefix .. "リーフ",		0)

	VariableEntry(g_center_x, -1)
	VariableEntry(g_center_z, -1)

	E_BattleTalk_VariableEntry()

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u9032_6483_958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn( _u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER )

	EventEntryDie(_u6307_8f2a_306e_5f85_6a5f_72b6_614b_3092_66f4_65b0, "", FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061)

	EventEntryArea(EmptyFunction, 1, 1, 16, 7, FORCE_PLAYER, g_key_area)

	EventEntryTurn(_u9752_8ecd_30bf_30fc_30f3_76f4_524d_30a4_30d9_30f3_30c8, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___9752_8ecd_30bf_30fc_30f3_76f4_524d_30a4_30d9_30f3_30c8)

	EventEntryBattleAfter(	_u6307_8f2a_6301_3061_306e_6575_3092_521d_6483_7834, "", FORCE_ENEMY, "", FORCE_PLAYER, false, _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_306e_6575_3092_521d_6483_7834 )
	EventEntryFixed(		_u6307_8f2a_6301_3061_306e_6575_3092_521d_6483_7834, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_306e_6575_3092_521d_6483_7834 )

	EventEntryBattleTalk( _u6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M011_ヴェイル",	FORCE_ENEMY, true, "戦闘前会話_ヴェイル_済",	"MID_BT7" )

	E_BattleTalkEntry_Sepia( "PID_M011_セピア" )
	EventEntryBattleTalk( _u6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M011_セピア",		FORCE_ENEMY, true, "戦闘前会話_セピア_済",		"MID_BT8" )

	E_BattleTalkEntry_Gris( "PID_M011_グリ" )
	EventEntryBattleTalk( _u6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M011_グリ",		FORCE_ENEMY, true, "戦闘前会話_グリ_済",		"MID_BT10" )

	E_BattleTalkEntry_Marron( "PID_M011_マロン" )
	EventEntryBattleTalk( _u6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M011_マロン",		FORCE_ENEMY, true, "戦闘前会話_マロン_済",	 	"MID_BT12" )

	EventEntryBattleTalk( _u6226_95d8_524d_4f1a_8a71, "", FORCE_PLAYER, "PID_M011_モーヴ",		FORCE_ENEMY, true, "戦闘前会話_モーヴ_済",	 	"MID_BT14" )

	EventEntryBattleTalk( _u6226_95d8_524d_4f1a_8a71___7d0b_7ae0_58eb, g_pid_lueur, FORCE_PLAYER, "", FORCE_ENEMY, true, _uc_o_n_i_d_t_i_o_n___6226_95d8_524d_4f1a_8a71___7d0b_7ae0_58eb )

	EventEntryFixed( _u96e2_8131_5730_70b9_304c_7a7a_3044_305f, "", FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___96e2_8131_5730_70b9_304c_7a7a_3044_305f )

	EventEntryDie( Talk, "PID_M011_セピア",	FORCE_ENEMY, condition_true, "MID_BT9" )
	EventEntryDie( Talk, "PID_M011_グリ",	FORCE_ENEMY, condition_true, "MID_BT11" )
	EventEntryDie( Talk, "PID_M011_マロン",	FORCE_ENEMY, condition_true, "MID_BT13" )
	EventEntryDie( Talk, "PID_M011_モーヴ",	FORCE_ENEMY, condition_true, "MID_BT15" )

	EventEntryEscape(_u96e2_8131_30a4_30d9_30f3_30c8, 7, 1, "PID_リュール", condition_true)
	EventEntryEscape(_u96e2_8131_30a4_30d9_30f3_30c8, 8, 1, "PID_リュール", condition_true)

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

end

function MapOpening()

	Log("MapOpening")

	_u81ea_8ecd_5165_5834_6f14_51fa()

	CursorSetPos( 9, 28 )
	MapCameraWait()

	Dispos("Enemy_OP1", DISPOS_FLAG_NONE)
	Yield()
	WaitTime(0.5)

	Dispos("Enemy_OP2", DISPOS_FLAG_NONE)
	Yield()
	WaitTime(0.5)

	Talk("MID_OP1")

	_uO_P_30a4_30d9_30f3_30c8___7570_5f62_5175_304c_30a8_30f3_30b2_30fc_30b8()

	CursorSetPos_FromPid( g_pid_lueur )
	UnitRotation( g_pid_lueur, ROTATE_UP )
	UnitMoveWait()

	Talk("MID_OP2")

	UnitRotation( g_pid_lueur, ROTATE_DOWN )
	_u96e2_8131_30de_30b9_70b9_706f()

	CursorSetPos_FromPid(g_pid_lueur)

	Talk("MID_OP3")

end

function _u9032_6483_958b_59cb_76f4_5f8c()

	SetFieldBgmWarSituation("A_BGM_Field_P05")

end

function _u81ea_8ecd_5165_5834_6f14_51fa()

	CursorSetPos( 9, 28 )
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()

	FadeInAndWait( SOUND_FADE_VERY_SLOW )

	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 10, 20,  8, 30, 0.2  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 13, 20, 11, 30, 0.1  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 12, 20, 10, 30, 0.15 )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 10, 21,  8, 30, 0.3  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 13, 21, 10, 30, 0.2  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 11, 21,  9, 30, 0.1  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa(  9, 21,  7, 30, 0.1  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 12, 22, 10, 30, 0.5  )
	_u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( 10, 22,  8, 30, 0.0  )

	WaitTime( 0.3 )
	UnitSetPos	( g_pid_lueur,  9, 30 )
	UnitMovePos	( g_pid_lueur,  9, 27, MOVE_FLAG_NONE )
	UnitMoveWait()
	WaitTime( 0.3 )

	UnitRotation( g_pid_lueur, ROTATE_UP )
	WaitTime( 1.0 )

	UnitMovePos	( g_pid_lueur, 11, 19, MOVE_FLAG_NONE )
	WaitTime( 1.0 )

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do
		UnitRotation( index, ROTATE_DOWN )
		index = ForceUnitGetNext(index)
	end

end

function _u30e6_30cb_30c3_30c8_767b_5834_6f14_51fa( x1, z1, x2, z2, wait )
	if _u30e6_30cb_30c3_30c8_304c_3044_308b( x1, z1 ) then
		UnitSetPosFromPos	( x1, z1, x2, z2 )
		UnitMovePosFromPos	( x2, z2, x1, z1 )
		WaitTime( wait )
	end
end

function _u30e6_30cb_30c3_30c8_304c_3044_308b( x, z )
	local unit = UnitGetByPos( x, z )
	do return unit ~= nil end
end

function _u96e2_8131_30de_30b9_70b9_706f()
	CursorSetPos( 7, 1 )
	CursorAnimeCreate_DistanceModeNear( 7, 1, "W2H1" )
	CursorAnimeDelete()

	WaitTime(1.0)
end

function _uO_P_30a4_30d9_30f3_30c8___7570_5f62_5175_304c_30a8_30f3_30b2_30fc_30b8()

	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19( 7, 29, g_GidPrefix .. "シグルド")
	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19( 9, 28, g_GidPrefix .. "ミカヤ")
	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19( 3, 18, g_GidPrefix .. "マルス")
	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19(11, 16, g_GidPrefix .. "ロイ")
	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19( 7, 12, g_GidPrefix .. "リーフ")
	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19( 9,  8, g_GidPrefix .. "セリカ")

end

function _u95c7_30b7_30f3_30af_30ed___5ea7_6a19(x, z, gid, cameraAct)
	local unit = UnitGetByPos(x, z)
	if unit == nil then
		do return end
	end
	if not ( UnitGetForce( unit ) == FORCE_ENEMY ) then
		do return end
	end

	_u95c7_30b7_30f3_30af_30ed(unit, gid, cameraAct)
end

function _u95c7_30b7_30f3_30af_30ed(unit, gid, cameraAct)

	if UnitExistOnMap( unit ) then
		local x = UnitGetX(unit)
		local z = UnitGetZ(unit)

		if ( not ( cameraAct == false ) ) then
			CursorSetPos(x,z)
			MapCameraWait()

			EffectPlay( "ワープイン_闇", x, z )
			UnitShine( unit, 0.3 )
			WaitTime( 0.3 )
		end

		GodUnitCreate( gid )
		UnitSetGodUnit( unit, gid )

		if ( not ( cameraAct == false ) ) then
			EffectWait()
		end

		VariableSet( g_Waiting4Engage .. gid, 0 )

		local god = SubPrefix( gid )
		god = SubPrefix( god )
		if god == "敵マルス" then
			_uA_I_8a2d_5b9a___30de_30eb_30b9( unit )

		elseif god == "敵シグルド" then
			_uA_I_8a2d_5b9a___30b7_30b0_30eb_30c9( unit )

		elseif god == "敵セリカ" then
			_uA_I_8a2d_5b9a___30bb_30ea_30ab( unit )

		elseif god == "敵ミカヤ" then
			_uA_I_8a2d_5b9a___30df_30ab_30e4( unit )

		elseif god == "敵ロイ" then
			_uA_I_8a2d_5b9a___30ed_30a4( unit )

		elseif god == "敵リーフ" then
			_uA_I_8a2d_5b9a___30ea_30fc_30d5( unit )

		end

		if ( cameraAct == nil ) then
			WaitTime(0.3)
		end
	end

end

function _uA_I_8a2d_5b9a___30de_30eb_30b9( unit )
	AiSetActive( unit, true )
end

function _uA_I_8a2d_5b9a___30b7_30b0_30eb_30c9( unit )
	AiSetActive( unit, true )
end

function _uA_I_8a2d_5b9a___30bb_30ea_30ab( unit )
	AiSetSequence( unit, AI_ORDER_ATTACK, "AI_AT_EngageAttack", "1, 1" )
	AiSetActive( unit, true )
end

function _uA_I_8a2d_5b9a___30df_30ab_30e4( unit )
	if DifficultyGet() == DIFFICULTY_NORMAL then
		AiSetSequence( unit, AI_ORDER_ATTACK, "AI_AT_Interference", "" )
	else
		AiSetSequence( unit, AI_ORDER_ATTACK, "AI_AT_InterferenceFrequency", "3, 3" )
	end

	AiSetActive( unit, true )
end

function _uA_I_8a2d_5b9a___30ed_30a4( unit )
	AiSetActive( unit, true )
end

function _uA_I_8a2d_5b9a___30ea_30fc_30d5( unit )
	AiSetActive( unit, true )
end

function _uc_o_n_i_d_t_i_o_n___6226_95d8_524d_4f1a_8a71___7d0b_7ae0_58eb()

	if		( VariableGet(g_BattleTalk .. "敵マルス"		.. "_済") == 1 )
		and	( VariableGet(g_BattleTalk .. "敵シグルド"	.. "_済") == 1 )
		and	( VariableGet(g_BattleTalk .. "敵セリカ"		.. "_済") == 1 )
		and	( VariableGet(g_BattleTalk .. "敵ミカヤ"		.. "_済") == 1 )
		and	( VariableGet(g_BattleTalk .. "敵ロイ"		.. "_済") == 1 )
		and	( VariableGet(g_BattleTalk .. "敵リーフ"		.. "_済") == 1 ) then
			do return false end
	end

	if ( UnitGetPID(MindGetUnit()) ~= g_pid_lueur ) and ( UnitGetPID(MindGetTargetUnit()) ~= g_pid_lueur ) then
		do return false end
	end

	local unit = nil
	if MindGetForce() == FORCE_ENEMY then
		unit = MindGetUnit()
	else
		unit = MindGetTargetUnit()
	end

	local gid = UnitGetGodUnit( unit )
	if gid == nil then
		do return false end
	end

	local god = SubPrefix( gid )
	god = SubPrefix( god )
	if VariableGet(g_BattleTalk .. god .. "_済") == 0 then
		do return true end
	end

	do return false end

end

function _u6226_95d8_524d_4f1a_8a71___7d0b_7ae0_58eb()
	local unit = nil
	if MindGetForce() == FORCE_ENEMY then
		unit = MindGetUnit()
	else
		unit = MindGetTargetUnit()
	end

	local gid = UnitGetGodUnit( unit )
	if gid == nil then
		do return false end
	end

	local god = SubPrefix( gid )
	god = SubPrefix( god )
	if		god == "敵マルス"		then
		Talk("MID_BT1")

	elseif	god == "敵シグルド"	then
		Talk("MID_BT2")

	elseif	god == "敵セリカ"		then
		Talk("MID_BT3")

	elseif	god == "敵ミカヤ"		then
		Talk("MID_BT4")

	elseif	god == "敵ロイ"		then
		Talk("MID_BT6")

	elseif	god == "敵リーフ"		then
		Talk("MID_BT5")

	end

	VariableSet(g_BattleTalk .. god .. "_済", 1)

end

function _u6226_95d8_524d_4f1a_8a71( mid )

	if _uc_o_n_i_d_t_i_o_n___6226_95d8_524d_4f1a_8a71___7d0b_7ae0_58eb() then
		_u6226_95d8_524d_4f1a_8a71___7d0b_7ae0_58eb()
	end

	Talk( mid )

end

function _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061()

	local unit = MindGetEventUnit()
	if unit == nil then
		do return false end
	end

	local gid = UnitGetGodUnit( unit )
	if gid == nil then
		do return false end
	end

	do return true end

end

function _u6307_8f2a_306e_5f85_6a5f_72b6_614b_3092_66f4_65b0()

	local unit = MindGetEventUnit()
	local gid = UnitGetGodUnit( unit )

	if VariableGet( g_key_defeat_engage_enemy ) == 0 then
		VariableSet( g_key_defeat_engage_enemy_x, UnitGetX( unit ) )
		VariableSet( g_key_defeat_engage_enemy_z, UnitGetZ( unit ) )
	end

	_u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( g_GidPrefix .. "マルス",		gid )
	_u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( g_GidPrefix .. "シグルド",	gid )
	_u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( g_GidPrefix .. "セリカ",		gid )
	_u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( g_GidPrefix .. "ミカヤ",		gid )
	_u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( g_GidPrefix .. "ロイ",		gid )
	_u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( g_GidPrefix .. "リーフ",		gid )

end

function _u6307_8f2a_5f85_6a5f_30ab_30a6_30f3_30c8( gid, gid_current )

	if ( gid == gid_current ) then
		VariableSet( g_Waiting4Engage .. gid, 1 )
		do return end
	end

	local value = VariableGet( g_Waiting4Engage .. gid )
	if not ( value == 0 ) then
		VariableSet( g_Waiting4Engage .. gid, value + 1 )
	end

end

function _uc_o_n_d_i_t_i_o_n___6307_8f2a_6301_3061_306e_6575_3092_521d_6483_7834()
	if _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_5728_5eab_3042_308a()
		and ( VariableGet( g_key_defeat_engage_enemy ) == 0 )
		and not ( VariableGet( g_key_defeat_engage_enemy_x ) == -1 )
		and not ( VariableGet( g_key_defeat_engage_enemy_z ) == -1 ) then

			do return true end

	end

	do return false end
end

function _u6307_8f2a_6301_3061_306e_6575_3092_521d_6483_7834()
	local x = VariableGet( g_key_defeat_engage_enemy_x )
	local z = VariableGet( g_key_defeat_engage_enemy_z )
	CursorSetPos( x, z )
	MapCameraWait()

	Talk("MID_EV12")

	EffectPlay( "ワープアウト_闇", x, z )
	EffectWait()

	Talk("MID_EV13")

	VariableSet( g_key_defeat_engage_enemy, 1 )
end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___96e2_8131_5730_70b9_304c_7a7a_3044_305f()

	if VariableGet( g_key_4docs_Ivy ) == 1 then
		do return false end
	end

	do return _u6307_5b9a_5ea7_6a19_4e0a_306b_6575_304c_3044_306a_3044(7, 1) or _u6307_5b9a_5ea7_6a19_4e0a_306b_6575_304c_3044_306a_3044(8, 1) end

end

function _u6307_5b9a_5ea7_6a19_4e0a_306b_6575_304c_3044_306a_3044( x, z )

	local unit = UnitGetByPos(x, z)
	if ( unit == nil ) then
		do return true end
	end

	do return UnitGetForce( unit ) ~= FORCE_ENEMY end

end

function _u96e2_8131_5730_70b9_304c_7a7a_3044_305f()

	VariableSet( g_key_escapePointEmpty, 1 )

	_u56db_72d7_3068_30a2_30a4_30d3_30fc_767b_5834()

end

function _uc_o_n_d_i_t_i_o_n___9752_8ecd_30bf_30fc_30f3_76f4_524d_30a4_30d9_30f3_30c8()

	if ( VariableGet( g_key_area ) == 1 ) and ( VariableGet( g_key_4docs_Ivy ) == 0 ) then
		do return true end
	end

	if ( VariableGet( g_key_escapePointEmpty ) == 1 ) and ( VariableGet( g_key_4docs_Ivy ) == 0 ) then
		do return true end
	end

	if _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_5728_5eab_3042_308a() then
		do return true end
	end

	do return false end

end

function _u9752_8ecd_30bf_30fc_30f3_76f4_524d_30a4_30d9_30f3_30c8()

	if ( VariableGet( g_key_area ) == 1 ) and ( VariableGet( g_key_4docs_Ivy ) == 0 ) then

		_u56db_72d7_3068_30a2_30a4_30d3_30fc_767b_5834()

	elseif ( VariableGet( g_key_escapePointEmpty ) == 1 ) and ( VariableGet( g_key_4docs_Ivy ) == 0 ) then

		_u56db_72d7_3068_30a2_30a4_30d3_30fc_767b_5834()

	else

		if _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_5728_5eab_3042_308a() and _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_53ef_80fd_306a_6575_304c_3044_308b() then

			local emblemWaitList	= _u5f85_6a5f_9806_306b_7d0b_7ae0_58eb_3092_30ea_30b9_30c8_5316()
			local enemyList			= _u8ddd_96e2_512a_5148_5ea6_9806_306e_30ea_30b9_30c8_4f5c_6210( )
			local synchroCount		= 0
			local SigludOrCelica	= 0

			for index, value in pairs( emblemWaitList ) do

				if ( synchroCount >= g_SynchroNumMax ) then

				else

						if ( value.GOD == "シグルド" ) or ( value.GOD == "セリカ" ) then

								if ( SigludOrCelica == 0 ) then

									if _u6307_8f2a_4ed8_3051_66ff_3048___6700_5317_306e_4eba_306b( value.GOD ) then
										synchroCount	= synchroCount + 1
										SigludOrCelica	= 1
									end

								end

						elseif ( value.GOD == "ミカヤ" ) then

								if _u6307_8f2a_4ed8_3051_66ff_3048___6756_4f7f_3044_306b_30df_30ab_30e4_3092() then
									synchroCount = synchroCount + 1
								elseif _u6307_8f2a_4ed8_3051_66ff_3048( value.GOD, enemyList ) then
									synchroCount = synchroCount + 1
								end

						elseif _u6307_8f2a_4ed8_3051_66ff_3048( value.GOD, enemyList ) then

								synchroCount = synchroCount + 1

						end

				end

			end

		end

	end

end

function _u5f85_6a5f_9806_306b_7d0b_7ae0_58eb_3092_30ea_30b9_30c8_5316()

	local list = {}

	list = _u7d0b_7ae0_58eb_3092_5f85_6a5f_30ea_30b9_30c8_306b_8ffd_52a0( list, "マルス" )
	list = _u7d0b_7ae0_58eb_3092_5f85_6a5f_30ea_30b9_30c8_306b_8ffd_52a0___30b7_30b0_30eb_30c9_304b_30bb_30ea_30ab( list )
	list = _u7d0b_7ae0_58eb_3092_5f85_6a5f_30ea_30b9_30c8_306b_8ffd_52a0( list, "ロイ" )
	list = _u7d0b_7ae0_58eb_3092_5f85_6a5f_30ea_30b9_30c8_306b_8ffd_52a0( list, "リーフ" )

	table.sort( list,
		function( a, b )
			do return ( a.WAIT > b.WAIT ) end
		end
	)

	local value_micaiah = VariableGet( g_Waiting4Engage .. g_GidPrefix .. "ミカヤ" )
	if ( value_micaiah > 0 ) then
		if ( #list >= 3 ) and ( value_micaiah > list[3].WAIT ) then
			table.insert( list, 1, { GOD="ミカヤ", WAIT=value_michaiah } )
		end
	end

	do return list end

end

function _u7d0b_7ae0_58eb_3092_5f85_6a5f_30ea_30b9_30c8_306b_8ffd_52a0( list, god )

	local value = VariableGet( g_Waiting4Engage .. g_GidPrefix .. god )
	if value > 0 then
		list[ #list + 1 ] = { GOD=god, WAIT=value }
	end

	do return list end

end

function _u7d0b_7ae0_58eb_3092_5f85_6a5f_30ea_30b9_30c8_306b_8ffd_52a0___30b7_30b0_30eb_30c9_304b_30bb_30ea_30ab( list )

	local value_siglud = VariableGet( g_Waiting4Engage .. g_GidPrefix .. "シグルド" )
	local value_celica = VariableGet( g_Waiting4Engage .. g_GidPrefix .. "セリカ" )

	if ( value_siglud > 0 ) then

		if ( value_celica > 0 ) then

			if ( value_siglud >= value_celica ) then

				list[ #list + 1 ] = { GOD="シグルド", WAIT=value_siglud }

			else

				list[ #list + 1 ] = { GOD="セリカ", WAIT=value_celica }

			end

		else

			list[ #list + 1 ] = { GOD="シグルド", WAIT=value_siglud }

		end

	elseif ( value_celica > 0 ) then

		list[ #list + 1 ] = { GOD="セリカ", WAIT=value_celica }

	end

	do return list end

end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_5728_5eab_3042_308a()

	if 		( VariableGet( g_Waiting4Engage .. g_GidPrefix .. "マルス" )	== 1 )
		or	( VariableGet( g_Waiting4Engage .. g_GidPrefix .. "シグルド" )	== 1 )
		or	( VariableGet( g_Waiting4Engage .. g_GidPrefix .. "セリカ" )	== 1 )
		or	( VariableGet( g_Waiting4Engage .. g_GidPrefix .. "ミカヤ" )	== 1 )
		or	( VariableGet( g_Waiting4Engage .. g_GidPrefix .. "ロイ" )		== 1 )
		or	( VariableGet( g_Waiting4Engage .. g_GidPrefix .. "リーフ" )	== 1 ) then

		do return true end

	end

	do return false end
end

function _u521d_56de_30b7_30f3_30af_30ed_6642_30a4_30d9_30f3_30c8()

	if ( VariableGet( g_key_replacement_engage ) == 0 ) then

		CursorSetPos_FromPid( "PID_M011_ヴェイル" )
		Talk( "MID_EV14" )
		VariableSet( g_key_replacement_engage, 1 )

	end

end

function _u6307_8f2a_4ed8_3051_66ff_3048___6756_4f7f_3044_306b_30df_30ab_30e4_3092()

	local god = "ミカヤ"
	local gid = g_GidPrefix .. god
	local key = g_Waiting4Engage .. gid
	if ( VariableGet( key ) == 0 ) then
		do return false end
	end

	local unit = _u30b7_30f3_30af_30ed_76f8_624b_3092_63a2_3059___6756_4f7f_3044()
	if unit == nil then
		do return false end
	end

	_u521d_56de_30b7_30f3_30af_30ed_6642_30a4_30d9_30f3_30c8()
	_u95c7_30b7_30f3_30af_30ed( unit, gid )

	do return true end

end

function _u6307_8f2a_4ed8_3051_66ff_3048___6700_5317_306e_4eba_306b( god )

	local gid = g_GidPrefix .. god
	local key = g_Waiting4Engage .. gid
	if ( VariableGet( key ) == 0 ) then
		do return false end
	end

	local unit = _u30b7_30f3_30af_30ed_76f8_624b_3092_63a2_3059___6700_5317_306e_4eba( god == "セリカ" )
	if unit == nil then
		do return false end
	end

	_u521d_56de_30b7_30f3_30af_30ed_6642_30a4_30d9_30f3_30c8()
	_u95c7_30b7_30f3_30af_30ed( unit, gid )

	do return true end

end

function _u6307_8f2a_4ed8_3051_66ff_3048( god, list )

	local gid = g_GidPrefix .. god
	local key = g_Waiting4Engage .. gid
	if ( VariableGet( key ) == 0 ) then
		do return true end
	end

	local unit = nil

	for key, value in pairs( list ) do
		if ( unit == nil ) and ( UnitGetGodUnit( value ) == nil ) then
			unit = value
		end
	end

	if unit == nil then
		do return false end
	end

	_u521d_56de_30b7_30f3_30af_30ed_6642_30a4_30d9_30f3_30c8()
	_u95c7_30b7_30f3_30af_30ed( unit, gid )

	do return true end

end

function _u30b7_30f3_30af_30ed_76f8_624b_3092_63a2_3059___6756_4f7f_3044()

	if not _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_53ef_80fd_306a_6575_304c_3044_308b() then
		do return nil end
	end

	local list_candidate = {}

	local index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		if ( not _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_4e0d_53ef_306e_6575_304b(index) ) and ( UnitGetGodUnit(index) == nil ) then

			if UnitGetJID( index ) == "JID_モンク" then
				list_candidate[ #list_candidate + 1 ] = index
			end

		end
		index = ForceUnitGetNext(index)
	end

	if #list_candidate == 0 then
		do return nil end
	elseif #list_candidate == 1 then
		do return list_candidate[1] end
	else

		do return list_candidate[1] end

	end

end

function _u30b7_30f3_30af_30ed_76f8_624b_3092_63a2_3059___6700_5317_306e_4eba( isCelica )

	if not _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_53ef_80fd_306a_6575_304c_3044_308b() then
		do return nil end
	end

	local z = g_map_height - 1
	while ( z > 0 ) do

		local list_candidate = {}

		for x = 1, g_map_width-1 do

			local unit = UnitGetByPos( x, z )

			if not ( unit == nil ) then

				if 		( UnitGetForce( unit ) == FORCE_ENEMY )
					and	( not _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_4e0d_53ef_306e_6575_304b( unit ) )
					and ( UnitGetGodUnit( unit ) == nil )				then

					if isCelica then

						if	( not _uc_o_n_d_i_t_i_o_n___96e2_8131_30dd_30a4_30f3_30c8_306e_6575_304b( unit ) ) and
							( not ( UnitGetJID( unit ) == "JID_アクスアーマー" ) ) then
							list_candidate[ #list_candidate + 1 ] = unit
						end

					else
						list_candidate[ #list_candidate + 1 ] = unit

					end

				end

			end

		end

		z = z - 1

		if #list_candidate == 1 then
			do return list_candidate[1] end
		elseif #list_candidate > 1 then

			do return list_candidate[1] end
		end

	end

	do return nil end

end

function _u8ddd_96e2_512a_5148_5ea6_9806_306e_30ea_30b9_30c8_4f5c_6210()

	VariableSet( g_center_x, -1 )
	VariableSet( g_center_z, -1 )

	local center_x, center_z = _u30d7_30ec_30a4_30e4_30fc_8ecd_306e_4e2d_5fc3_70b9_3092_7b97_51fa()
	VariableSet( g_center_x, center_x )
	VariableSet( g_center_z, center_z )

	local list = _u7bc4_56f2_5185_306e_30ad_30e3_30e9_3092_53d6_5f97( 10, 15 )
	do return list end

end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_53ef_80fd_306a_6575_304c_3044_308b()

	local index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		if ( not _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_4e0d_53ef_306e_6575_304b(index) ) and ( UnitGetGodUnit(index) == nil ) then
			do return true end
		end
		index = ForceUnitGetNext(index)
	end

	do return false end

end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_4e0d_53ef_306e_6575_304b(index)
	local pid = UnitGetPID(index)

	if ( pid == "PID_M011_ヴェイル" ) then
		do return true end
	end

	if	( pid == "PID_M011_異形兵_アクスファイター_トマホーク" ) or
		( pid == "PID_M011_異形竜" ) then
		do return true end
	end

	do return false end
end

function _uc_o_n_d_i_t_i_o_n___96e2_8131_30dd_30a4_30f3_30c8_306e_6575_304b( index )
	local pid = UnitGetPID(index)

	if	( pid == "PID_M011_異形兵_ランスナイト_離脱" ) or
		( pid == "PID_M011_異形兵_アーチャー_離脱" ) then
		do return true end
	end

	do return false end
end

function _u7bc4_56f2_5185_306e_30ad_30e3_30e9_3092_53d6_5f97( min, max )

	local list = {}

	local center_x = VariableGet( g_center_x )
	local center_z = VariableGet( g_center_z )

	if ( center_x == -1 ) or ( center_z == -1 ) then
		do return list end
	end

	local temp_list1 = {}
	local temp_list2 = {}
	local temp_list3 = {}

	local index = ForceUnitGetFirst( FORCE_ENEMY )
	while index ~= nil do
		if ( not _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_88c5_5099_4e0d_53ef_306e_6575_304b(index) ) and ( UnitGetGodUnit(index) == nil ) then

			local distance = _u4e8c_4eba_306e_8ddd_96e2(center_x, center_z, index)

			if		( distance > 0 )	and	( distance < min )	then
				temp_list1[ #temp_list1 + 1 ] = { UNIT=index, DISTANCE=distance }

			elseif	( distance >= min )	and	( distance <= max )	then
				temp_list2[ #temp_list2 + 1 ] = { UNIT=index, DISTANCE=distance }

			else
				temp_list3[ #temp_list3 + 1 ] = { UNIT=index, DISTANCE=distance }

			end

		end

		index = ForceUnitGetNext(index)
	end

	if ( #temp_list2 > 1 ) then
		table.sort( temp_list2,
			function( a, b )
				do return ( a.DISTANCE < b.DISTANCE ) end
			end
		)
	end

	for key, value in pairs( temp_list2 ) do
		list[ #list + 1 ] = value.UNIT
	end

	if ( #temp_list1 > 1 ) then
		table.sort( temp_list1,
			function( a, b )
				do return ( a.DISTANCE > b.DISTANCE ) end
			end
		)
	end

	for key, value in pairs( temp_list1 ) do
		list[ #list + 1 ] = value.UNIT
	end

	if ( #temp_list3 > 1 ) then
		table.sort( temp_list3,
			function( a, b )
				do return ( a.DISTANCE < b.DISTANCE ) end
			end
		)
	end

	for key, value in pairs( temp_list3 ) do
		list[ #list + 1 ] = value.UNIT
	end

	do return list end

end

function _u4e8c_4eba_306e_8ddd_96e2(x1, z1, unit2)

	local x2 = UnitGetX( unit2 )
	local z2 = UnitGetZ( unit2 )
	local _distance = _u4e8c_70b9_9593_8ddd_96e2( x1, z1, x2, z2 )
	do return _distance end

end

function _u56db_72d7_3068_30a2_30a4_30d3_30fc_767b_5834()

	CursorSetPos_FromPid("PID_M011_ヴェイル")
	Talk("MID_EV1")

	Dispos("Enemy_4dogs", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	_u5f37_8005_306b_6307_8f2a_4ed8_4e0e()

	CursorSetPos_FromPid("PID_M011_ヴェイル")

	Talk("MID_EV2")

	CursorSetPos_FromPid(g_pid_lueur)
	Talk("MID_EV3")

	Dispos("Enemy_EV1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.8)

	CursorSetPos_FromPid(g_pid_lueur)
	Talk("MID_EV4")

	Dispos("Ally_Add0", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.8)

	Talk("MID_EV5")

	Dispos("Ally_Add1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.8)

	Talk("MID_EV6")

	_u30a2_30a4_30d3_30fc_968a___30ea_30e5_30fc_30eb_3078_79fb_52d5()

	Talk("MID_EV7")

	Movie("Kengen06")
	SkipEscape()

	FadeInAndWait(FADE_FAST)

	Talk("MID_EV8")

	UnitCreateGodUnit("PID_アイビー", "GID_リン")
	UnitSetEngageCount("PID_アイビー", 7)

	Tutorial( "TUTID_紋章士リン" )

	Talk("MID_EV9")

	Movie("Kengen07")
	SkipEscape()

	FadeInAndWait( FADE_FAST )

	UnitCreateGodUnit(g_pid_lueur, "GID_ルキナ")
	UnitSetEngageCount(g_pid_lueur, 7)

	Talk("MID_EV10")

	Tutorial( "TUTID_紋章士ルキナ" )

	Talk("MID_EV11")

	_u30a2_30a4_30d3_30fc_968a_4ef2_9593_5165_308a()

	SetFieldBgmWarSituation("B_BGM_Field_P05")

	MapHistoryRewindEnable()

	_u6575_306e_5fc5_6bba_ff10_3092_89e3_9664()

	VariableSet( g_key_4docs_Ivy, 1 )

end

function _u5f37_8005_306b_6307_8f2a_4ed8_4e0e()

	local unit = ForceUnitGetFirst( FORCE_ENEMY )
	while unit ~= nil do

		local gid =  UnitGetGodUnit( unit )
		if not ( gid == nil ) then
			UnitSetGodUnit( unit, nil )
			UnitSetItemEquip( unit )

			EffectPlay( "ワープアウト_闇", UnitGetX( unit ), UnitGetZ( unit ) )
			EffectWait()

			AiSetSequence( unit, AI_ORDER_ATTACK, "AI_AT_Attack", "")

			VariableSet( g_Waiting4Engage .. gid, 1 )

		end

		unit = ForceUnitGetNext( unit )
	end

	_u95c7_30b7_30f3_30af_30ed("PID_M011_セピア",	"GID_M011_敵マルス")
	_u95c7_30b7_30f3_30af_30ed("PID_M011_グリ",		"GID_M011_敵セリカ")
	_u95c7_30b7_30f3_30af_30ed("PID_M011_モーヴ",	"GID_M011_敵ミカヤ")
	_u95c7_30b7_30f3_30af_30ed("PID_M011_マロン",	"GID_M011_敵シグルド")

	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19(7, 1, g_GidPrefix .. "ロイ",	false)
	_u95c7_30b7_30f3_30af_30ed___5ea7_6a19(8, 1, g_GidPrefix .. "リーフ",	false)

end

function _u30a2_30a4_30d3_30fc_968a___30ea_30e5_30fc_30eb_3078_79fb_52d5()

	UnitMovePos( "PID_アイビー",	g_pid_lueur, MOVE_FLAG_FOCUS )
	UnitMovePos( "PID_ゼルコバ",	g_pid_lueur, MOVE_FLAG_NONE )
	UnitMovePos( "PID_カゲツ",		g_pid_lueur, MOVE_FLAG_NONE )
	UnitMoveWait()

	CursorSetPos_FromPid( "PID_アイビー" )

end

function _u30a2_30a4_30d3_30fc_968a_4ef2_9593_5165_308a()

	UnitJoin( "PID_アイビー", "PID_ゼルコバ", "PID_カゲツ" )
	WaitTime(0.5)

	local sid = "SID_死亡回避"
	local pid = nil

	pid = "PID_アイビー"
	if UnitExistOnMap( pid ) then
		_u30b9_30ad_30eb_89e3_9664(pid, sid)
	end

	pid = "PID_ゼルコバ"
	if UnitExistOnMap( pid ) then
		_u30b9_30ad_30eb_89e3_9664(pid, sid)
	end

	pid = "PID_カゲツ"
	if UnitExistOnMap( pid ) then
		_u30b9_30ad_30eb_89e3_9664(pid, sid)
	end

end

function _u6575_306e_5fc5_6bba_ff10_3092_89e3_9664()

	local unit = ForceUnitGetFirst( FORCE_ENEMY )
	while unit ~= nil do

		_u30b9_30ad_30eb_89e3_9664( unit, "SID_必殺０_オフェンス時" )

		unit = ForceUnitGetNext(unit)

	end

end

function _u96e2_8131_30a4_30d9_30f3_30c8()
	local unit = MindGetUnit()
	if not UnitExistOnMap( unit ) then
		do return end
	end

	UnitRotation( g_pid_lueur, ROTATE_UP)
	UnitMoveWait()

	Talk( "MID_EV15" )
	VariableSet( "勝利", 1 )
end

function MapEnding()

	Log("MapEnding")

	MapHistoryRewindEnable()

	if VariableGet( g_key_4docs_Ivy ) == 0 then
		UnitJoin( "PID_アイビー", "PID_カゲツ", "PID_ゼルコバ" )

		Tutorial( "TUTID_紋章士リン" )
		Tutorial( "TUTID_紋章士ルキナ" )

		Dialog("MID_TUT_NAVI_M004_TIMECRYSTAL")
	end

	GodUnitCreate( "GID_ルキナ" )
	GodUnitCreate( "GID_リン" )

end

function Ending()

	Log("Ending")

	PuppetDemo("M011", "MID_ED1")
	PuppetDemo("M011", "MID_ED2")
	PuppetDemo("M011", "MID_ED3")

end

function GameOver()

	Log("GameOver")

end
