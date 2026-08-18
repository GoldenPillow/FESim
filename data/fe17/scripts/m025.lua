Include("Common")
g_pid_lueur = "PID_リュール"
g_pid_lumiere = "PID_M025_ルミエル"

g_key_beam_turn = "エンゲージビームターン"
g_beam_degree = 30
g_pillar_degree = 10
g_beam_damage = 40

g_map_width = 27
g_map_height = 32

g_key_target_x = "エンゲージビーム_ターゲット座標X"
g_key_target_z = "エンゲージビーム_ターゲット座標Z"

MAP_NONE = 0
MAP_BEAM = 1
MAP_HIDE = 2

g_key_beamBehavior_switch = "ビーム挙動切り替え_済"
g_key_beamDir_west = "ビーム方向_西"

g_PillarList = {
	{11, 18},
	{15, 16},
	{ 4, 10},
	{17,  9},
	{ 9,  6},
	{11,  6},
	{15,  5},
	{17,  5}
}

function Startup()

	Log("Startup")

	WinRuleSetDestroyBoss(true)
	WinRuleSetMID( "MID_RULE_M025_WIN" )

	VariableEntry( "増援_エリア侵入_済", 0 )
	VariableEntry( "増援_エリア侵入1_済", 0 )
	VariableEntry( "増援_戦闘後増援_済", 0 )
	VariableEntry( "エンゲージビーム警告_済", 0 )
	VariableEntry( g_key_beamDir_west, 1 )

	_u30d5_30e9_30b0_767b_9332()

	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( g_key_beam_turn, -1 )
	VariableEntry( g_key_target_x, -1 )
	VariableEntry( g_key_target_z, -1 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryArea(EmptyFunction, 12, 12, 14, 14, FORCE_PLAYER, g_key_beamBehavior_switch)
	EventEntryArea(EmptyFunction,  9, 15, 17, 20, FORCE_PLAYER, g_key_beamBehavior_switch)
	EventEntryArea(EmptyFunction,  6, 21, 20, 27, FORCE_PLAYER, g_key_beamBehavior_switch)
	EventEntryArea(EmptyFunction, 10, 28, 16, 30, FORCE_PLAYER, g_key_beamBehavior_switch)
	EventEntryTurnAfter( _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___30a8_30f3_30b2_30fc_30b8_30d3_30fc_30e0, 2, -1, FORCE_ENEMY, _uc_o_n_d_i_t_i_o_n___9752_30bf_30fc_30f3_958b_59cb_76f4_524d___30a8_30f3_30b2_30fc_30b8_30d3_30fc_30e0 )

	EventEntryBattleTalk(Talk, g_pid_lueur, FORCE_PLAYER, g_pid_lumiere, FORCE_ENEMY, true, "戦闘前会話_ルミエル_リュール_済", "MID_BT2")
	EventEntryBattleTalk(Talk, "PID_ヴァンドレ", FORCE_PLAYER, g_pid_lumiere, FORCE_ENEMY, true, "戦闘前会話_ルミエル_ヴァンドレ_済", "MID_BT3")
	EventEntryBattleTalk(Talk, "PID_クラン", FORCE_PLAYER, g_pid_lumiere, FORCE_ENEMY, true, "戦闘前会話_ルミエル_クラン_済", "MID_BT4")
	EventEntryBattleTalk(Talk, "PID_フラン", FORCE_PLAYER, g_pid_lumiere, FORCE_ENEMY, true, "戦闘前会話_ルミエル_フラン_済", "MID_BT5")
	EventEntryBattleTalk(Talk, "PID_ヴェイル", FORCE_PLAYER, g_pid_lumiere, FORCE_ENEMY, true, "戦闘前会話_ルミエル_ヴェイル_済", "MID_BT6")
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_lumiere, FORCE_ENEMY, true, "戦闘前会話_ルミエル_済", "MID_BT1")
	EventEntryDie(Talk, g_pid_lumiere, FORCE_ENEMY, condition_true, "MID_BT7")

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 6, 24, "IID_シンクエディア")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 20, 24, "IID_竜の盾")

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u5de6_4e0a_5897_63f4, 15, 16, FORCE_PLAYER);
		EventEntryTurn(_u5de6_76d7_8cca_5897_63f4, 7, 7, FORCE_PLAYER);

		EventEntryTurn(_u5de6_4e2d_5897_63f4, 7, 7, FORCE_PLAYER);
		EventEntryTurn(_u5de6_4e0b_5897_63f4, 8, 8, FORCE_PLAYER);

		EventEntryTurn(_u76d7_8cca_5897_63f4, 9, 9, FORCE_PLAYER);
		EventEntryTurn(_u4e2d_592e_5897_63f4, 14, 15, FORCE_PLAYER);

		EventEntryTurn(_u53f3_4e0a_5897_63f4, 15, 16, FORCE_PLAYER);
		EventEntryTurn(_u53f3_76d7_8cca_5897_63f4, 7, 7, FORCE_PLAYER);
		EventEntryTurn(_u53f3_4e2d_5897_63f4, 7, 7, FORCE_PLAYER);
		EventEntryTurn(_u53f3_4e0b_5897_63f4, 8, 8, FORCE_PLAYER);

	elseif DifficultyGet() == DIFFICULTY_HARD then
		EventEntryTurn(_u5de6_4e0a_5897_63f4, 13, 18, FORCE_PLAYER);
		EventEntryTurn(_u5de6_76d7_8cca_5897_63f4, 6, 6, FORCE_PLAYER);

		EventEntryTurn(_u5de6_4e2d_5897_63f4, 6, 6, FORCE_PLAYER);
		EventEntryTurn(_u5de6_4e0b_5897_63f4, 8, 10, FORCE_PLAYER);

		EventEntryTurn(_u76d7_8cca_5897_63f4, 8, 8, FORCE_PLAYER);
		EventEntryTurn(_u4e2d_592e_5897_63f4, 10, 20, FORCE_PLAYER);

		EventEntryTurn(_u53f3_4e0a_5897_63f4, 13, 18, FORCE_PLAYER);
		EventEntryTurn(_u53f3_76d7_8cca_5897_63f4, 6, 6, FORCE_PLAYER);
		EventEntryTurn(_u53f3_4e2d_5897_63f4, 6, 6, FORCE_PLAYER);
		EventEntryTurn(_u53f3_4e0b_5897_63f4, 8, 10, FORCE_PLAYER);

	else
		EventEntryTurn(_u5de6_4e0a_5897_63f4, 10, 20, FORCE_PLAYER);
		EventEntryTurn(_u5de6_76d7_8cca_5897_63f4, 5, 5, FORCE_PLAYER);

		EventEntryTurn(_u5de6_4e2d_5897_63f4, 5, 7, FORCE_PLAYER);
		EventEntryTurn(_u5de6_4e0b_5897_63f4, 7, 11, FORCE_PLAYER);

		EventEntryTurn(_u76d7_8cca_5897_63f4, 7, 7, FORCE_PLAYER);
		EventEntryTurn(_u4e2d_592e_5897_63f4, 9, 20, FORCE_PLAYER);

		EventEntryTurn(_u53f3_4e0a_5897_63f4, 10, 20, FORCE_PLAYER);
		EventEntryTurn(_u53f3_76d7_8cca_5897_63f4, 5, 5, FORCE_PLAYER);
		EventEntryTurn(_u53f3_4e2d_5897_63f4, 4, 6, FORCE_PLAYER);
		EventEntryTurn(_u53f3_4e0b_5897_63f4, 7, 10, FORCE_PLAYER);
	end

end

function _u5de6_76d7_8cca_5897_63f4()
	Dispos("Enemy_ReinforcementL0", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end
function _u53f3_76d7_8cca_5897_63f4()
	Dispos("Enemy_ReinforcementR0", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end
function _u76d7_8cca_5897_63f4()
	Dispos("Enemy_ReinforcementC0", DISPOS_FLAG_FOCUS);

	Yield();
	WaitTime(0.5);
end

function _u4e2d_592e_5897_63f4()
	Dispos("Enemy_ReinforcementC1", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end

function _u5de6_4e0a_5897_63f4()
	Dispos("Enemy_ReinforcementL3", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end
function _u5de6_4e2d_5897_63f4()
	Dispos("Enemy_ReinforcementL1", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end
function _u5de6_4e0b_5897_63f4()
	Dispos("Enemy_ReinforcementL2", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end

function _u53f3_4e0a_5897_63f4()
	Dispos("Enemy_ReinforcementR3", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end
function _u53f3_4e2d_5897_63f4()
	Dispos("Enemy_ReinforcementR1", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end
function _u53f3_4e0b_5897_63f4()
	Dispos("Enemy_ReinforcementR2", DISPOS_FLAG_FOCUS);
	Yield();
	WaitTime(0.5);
end

function EmptyFunction()

end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_4fb5_5165()

	if VariableGet( "増援_エリア侵入_済" ) == 1 then
		do return false end
	end

	if VariableGet( "エリアイベント_済" ) == 1 then
		do return true end
	end

	do return false end

end

function _uc_o_n_d_i_t_i_o_n___30a8_30ea_30a2_4fb5_5165_1()

	if VariableGet( "増援_エリア侵入1_済" ) == 1 then
		do return false end
	end

	if VariableGet( "エリアイベント1_済" ) == 1 then
		do return true end
	end

	do return false end

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_5897_63f4()

	if VariableGet( "増援_戦闘後増援_済" ) == 1 then
		do return false end
	end

	if VariableGet( "戦闘後イベント_済" ) == 1 then
		do return true end
	end

	do return false end

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_0()

	Dispos("Enemy_ReinforcementC1", DISPOS_FLAG_FOCUS)
	Yield()

	VariableSet( "増援_戦闘後増援_済", 1 )

	MapCameraWait()

	WaitTime(1.0)

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_1()

	Dispos("Enemy_ReinforcementL1", DISPOS_FLAG_FOCUS)
	Yield()

	VariableSet( "増援_エリア侵入_済", 1 )

	UnitMovePosFromPos(10,12,9,13)

	MapCameraWait()

	WaitTime(1.0)

end

function _u9752_8ecd_30bf_30fc_30f3_958b_59cb_76f4_524d_2()

	Dispos("Enemy_ReinforcementR1", DISPOS_FLAG_FOCUS)
	Yield()

	VariableSet( "増援_エリア侵入1_済", 1 )

	UnitMovePosFromPos(16,12,17,13)

	MapCameraWait()

	WaitTime(1.0)

end

function Cleanup()

	Log("Cleanup")

end

function Opening()

	Log("Opening")

	PuppetDemo("M025", "MID_OP1")

	Movie("Scene26")
	SkipEscape()

	PuppetDemo("M025", "MID_OP2")

end

function MapOpening()

	Log("MapOpening")

	_u5468_56de_30ab_30e1_30e9()

end

function _u5468_56de_30ab_30e1_30e9()

end

function _uc_o_n_d_i_t_i_o_n___9752_30bf_30fc_30f3_958b_59cb_76f4_524d___30a8_30f3_30b2_30fc_30b8_30d3_30fc_30e0()
	local turn = VariableGet( g_key_beam_turn )

	if DifficultyGet() == DIFFICULTY_NORMAL then
		turn = ( turn + 1 ) % 4
	else
		turn = ( turn + 1 ) % 3
	end

	VariableSet( g_key_beam_turn, turn )

	if turn == 1 or turn == 2 then
		do return true end
	else
		do return false end
	end
end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___30a8_30f3_30b2_30fc_30b8_30d3_30fc_30e0()

	local turn = VariableGet( g_key_beam_turn )
	if turn == 1 then

			CursorSetPos_FromPid(g_pid_lumiere)
			MapCameraWait()

			EffectCreate( "邪竜紋_準備", 13, 30 )
			WaitTime( 1.5 )

			if VariableGet( "エンゲージビーム警告_済" ) == 0 then
				Talk("MID_EV1_0")
			end

			local target = _u30bf_30fc_30b2_30c3_30c8_5ea7_6a19_306e_7b97_51fa()
			VariableSet( g_key_target_x, target.X )
			VariableSet( g_key_target_z, target.Z )

			_u5371_967a_7bc4_56f2_306e_7b97_51fa( target.X, target.Z )

			if VariableGet( "エンゲージビーム警告_済" ) == 0 then
				CursorSetPos_FromPid(g_pid_lueur)
				Talk("MID_EV1_1")

				Tutorial( "TUTID_邪竜紋砲" )

				VariableSet( "エンゲージビーム警告_済", 1 )
			end

	elseif turn == 2 then

			_u30a8_30f3_30b2_30fc_30b8_30d3_30fc_30e0()

	end

end

function _u30a8_30f3_30b2_30fc_30b8_30d3_30fc_30e0()

	CursorSetPos_FromPid( g_pid_lumiere )

	local targetX = VariableGet( g_key_target_x )
	local targetZ = VariableGet( g_key_target_z )
	if g_map == nil then
		_u5371_967a_7bc4_56f2_306e_7b97_51fa( targetX, targetZ )
	end

	EffectPlay( "邪竜紋_発動", 13, 30 )
	EffectDelete( "邪竜紋_準備", 13, 30 )
	WaitTime( 1.0 )

	local lumiereX = UnitGetX( g_pid_lumiere )
	local lumiereZ = UnitGetZ( g_pid_lumiere )
	local effectRotation = _u30a8_30d5_30a7_30af_30c8_306e_89d2_5ea6_3092_8a08_7b97()
	EffectPlay( "エンゲージビーム", lumiereX, lumiereZ, effectRotation )
	WaitTime( 0.3 )
	_u5927_67f1_30d0_30ea_30a2_306e_30a8_30d5_30a7_30af_30c8_518d_751f()
	WaitTime( 1.0 )

	CursorSetPos( targetX, targetZ )
	MapCameraWait()

	MapDamageBegin()
	for i in pairs( g_map ) do
		if ( g_map[i] == MAP_BEAM ) then
			local _x = (i-1) % g_map_width
			local _z = math.floor( (i-1) / g_map_width )

			local unit = UnitGetByPos( _x, _z )
			if ( unit ~= nil ) and ( UnitGetForce( unit ) == FORCE_PLAYER ) then

					local def = UnitGetCapability(unit, CAPABILITY_DEF, true)
					local damage = math.max(g_beam_damage - def, 0)
					MapDamageAdd(unit, damage)

			end
		end
	end
	MapDamageEnd()

	WaitTime( 2.0 )

	MapRangeClear()

end

function _u30a8_30d5_30a7_30af_30c8_306e_89d2_5ea6_3092_8a08_7b97()
	local targetX = VariableGet( g_key_target_x )
	local targetZ = VariableGet( g_key_target_z )
	local lumiereX = UnitGetX( g_pid_lumiere )
	local lumiereZ = UnitGetZ( g_pid_lumiere )

	local dirX = targetX - lumiereX
	local dirZ = targetZ - lumiereZ

	local cos = ( -1 * dirZ ) / ( math.sqrt( dirX * dirX + dirZ * dirZ ) )
	local acos = math.acos( cos )
	local deg = math.deg( acos )

	if dirX > 0 then
		deg = deg * (-1)
	end

	do return deg end
end

function _u5927_67f1_30d0_30ea_30a2_306e_30a8_30d5_30a7_30af_30c8_518d_751f()

	for i = 1, #g_map do
		if ( g_map[i] ~= MAP_NONE ) then

			local _x = (i-1) % g_map_width
			local _z = math.floor( (i-1) / g_map_width )

			if ( TerrainGet( _x, _z ) == "TID_大柱" ) then

				EffectPlay( "大柱バリア", _x, _z )

			end

		end
	end

end

function MapEnding()

	Log("MapEnding")

	CursorSetPos( 13, 30 )
	MapCameraWait()

	EventBrokenObject( 13, 30 )
	WaitTime( 2.0 )

end

function Ending()

	Log("Ending")

end

function GameOver()

	Log("GameOver")

end

function _u5371_967a_7bc4_56f2_306e_7b97_51fa( targetX, targetZ )

		local lumiere_x = UnitGetX( g_pid_lumiere )
		local lumiere_z = UnitGetZ( g_pid_lumiere )

		local dir_x = targetX - lumiere_x
		local dir_z = targetZ - lumiere_z

		g_map = {}
		for i=1, ( g_map_width * g_map_height ) do
			g_map[ #g_map + 1 ] = MAP_NONE
		end

		local line_straight = _u7dda_3092_7b97_51fa( lumiere_x, lumiere_z, dir_x, dir_z )
		local line_rotateA = _u7dda_3092_7b97_51fa( lumiere_x, lumiere_z, _u30d9_30af_30c8_30eb_56de_8ee2( dir_x, dir_z, g_beam_degree / 2 ) )
		local line_rotateB = _u7dda_3092_7b97_51fa( lumiere_x, lumiere_z, _u30d9_30af_30c8_30eb_56de_8ee2( dir_x, dir_z, - ( g_beam_degree / 2 ) ) )

		for i in pairs( line_rotateA ) do
			g_map[ g_map_width * line_rotateA[i].Z + line_rotateA[i].X + 1 ] = MAP_BEAM
		end

		for i in pairs( line_rotateB ) do
			g_map[ g_map_width * line_rotateB[i].Z + line_rotateB[i].X + 1 ] = MAP_BEAM
		end

		_u30de_30c3_30d7_5857_308a_3064_3076_3057( line_straight, line_rotateA, line_rotateB, MAP_BEAM )

		_u30d3_30fc_30e0_906e_853d( lumiere_x, lumiere_z, "TID_大柱" )

		g_map[ g_map_width * lumiere_z + lumiere_x + 1 ] = MAP_NONE

		MapRangeAddBegin()
		for i in pairs( g_map ) do
			if ( g_map[i] == MAP_BEAM ) then
				local _x = (i-1) % g_map_width
				local _z = math.floor( (i-1) / g_map_width )
				MapRangeAdd(_x, _z)
			end
		end
		MapRangeAddEnd()

end

function _u30bf_30fc_30b2_30c3_30c8_5ea7_6a19_306e_7b97_51fa()

	local hazard_map = nil

	if VariableGet( g_key_beamBehavior_switch ) == 0 then

		if VariableGet( g_key_beamDir_west ) == 1 then
			hazard_map = _u30cf_30b6_30fc_30c9_30de_30c3_30d7_4f5c_6210( 2, g_map_width, g_map_height, { FORCE_PLAYER }, _u897f_5074 )
		else
			hazard_map = _u30cf_30b6_30fc_30c9_30de_30c3_30d7_4f5c_6210( 2, g_map_width, g_map_height, { FORCE_PLAYER }, _u6771_5074 )
		end

	end

	if hazard_map == nil then
		hazard_map = _u30cf_30b6_30fc_30c9_30de_30c3_30d7_4f5c_6210( 2, g_map_width, g_map_height, { FORCE_PLAYER }, condition_true )

	elseif VariableGet( g_key_beamBehavior_switch ) == 0 then
		local west = VariableGet( g_key_beamDir_west )
		west = ( west + 1 ) % 2
		VariableSet( g_key_beamDir_west, west )

	end

	local max_danger_num = 0
	for i = 1, #hazard_map do
		if ( hazard_map[i].VAL == hazard_map[1].VAL ) then
			max_danger_num = max_danger_num + 1
		end
	end

	local index = RandomGet( max_danger_num ) + 1
	target = hazard_map[ index ]
	do return target end

end

function _u897f_5074( x, z )
	do return ( x <= math.floor(g_map_width/2) ) end
end

function _u6771_5074( x, z )
	do return ( x > math.floor(g_map_width/2) ) end
end

function _u30d3_30fc_30e0_906e_853d( _start_x, _start_z, tid )

	local fill = MAP_HIDE

	for i = 1, #g_map do
		if ( g_map[i] ~= MAP_NONE ) then

			local _x = (i-1) % g_map_width
			local _z = math.floor( (i-1) / g_map_width )

			if ( TerrainGet( _x, _z ) == tid ) then

				local _dir_x = _x - _start_x
				local _dir_z = _z - _start_z

				local line_straight = _u7dda_3092_7b97_51fa( _x, _z, _dir_x, _dir_z )
				local line_rotateA = _u7dda_3092_7b97_51fa( _x, _z, _u30d9_30af_30c8_30eb_56de_8ee2( _dir_x, _dir_z, g_pillar_degree / 2 ) )
				local line_rotateB = _u7dda_3092_7b97_51fa( _x, _z, _u30d9_30af_30c8_30eb_56de_8ee2( _dir_x, _dir_z, - ( g_pillar_degree / 2 ) ) )

				for j in pairs( line_rotateA ) do
					g_map[ g_map_width * line_rotateA[j].Z + line_rotateA[j].X + 1 ] = fill
				end

				for j in pairs( line_rotateB ) do
					g_map[ g_map_width * line_rotateB[j].Z + line_rotateB[j].X + 1 ] = fill
				end

				_u30de_30c3_30d7_5857_308a_3064_3076_3057( line_straight, line_rotateA, line_rotateB, fill )

				fill = fill + 1

			end

		end
	end

end

function _u30d9_30af_30c8_30eb_56de_8ee2( dir_x, dir_z, degree )

		local cos = math.cos( math.rad( degree ) )
		local sin = math.sin( math.rad( degree ) )

		do return ( cos * dir_x - sin * dir_z ), ( sin * dir_x + cos * dir_z ) end

end

function _u7dda_3092_7b97_51fa( _start_x, _start_z, _dir_x, _dir_z )

		local line = {}

		local _step_x = 0
		local _step_z = 0

		if ( _dir_x < 0 ) then
			_step_x = -1
		else
			_step_x = 1
		end

		if ( _dir_z < 0 ) then
			_step_z = -1
		else
			_step_z = 1
		end

		_dir_x = math.abs( _dir_x * 2 )
		_dir_z = math.abs( _dir_z * 2 )

		local _x = _start_x
		local _z = _start_z

		line[ #line + 1 ] = { X=_x, Z=_z }

		if ( _dir_x > _dir_z ) then
				local _frac = _dir_z - _dir_x / 2
				while not ( ( _x == 0 ) or ( _x == g_map_width - 1 ) or ( _z == 0 ) or ( _z == g_map_height - 1 ) ) do

						if ( _frac >= 0 ) then
							_z = _z + _step_z
							_frac = _frac - _dir_x
						end

						_x = _x + _step_x
						_frac = _frac + _dir_z

						line[ #line + 1 ] = { X=_x, Z=_z }

				end
		else
				local _frac = _dir_x - _dir_z / 2
				while not ( ( _x == 0 ) or ( _x == g_map_width - 1 ) or ( _z == 0 ) or ( _z == g_map_height - 1 ) ) do

						if ( _frac >= 0 ) then
							_x = _x + _step_x
							_frac = _frac - _dir_z
						end

						_z = _z + _step_z
						_frac = _frac + _dir_x

						line[ #line + 1 ] = { X=_x, Z=_z }

				end
		end

		do return line end

end

function _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff38_5024_304c_5408_3046_3082_306e_3092_53d6_5f97(line, index, _x)
	for i = index, #line do
		if ( line[i].X == _x ) then
			do return i end
		end
		if ( i == #line ) then
			do return #line + 1 end
		end
	end

	do return index end
end

function _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff3a_5024_304c_5408_3046_3082_306e_3092_53d6_5f97(line, index, _z)
	for i = index, #line do
		if ( line[i].Z == _z ) then
			do return i end
		end
		if ( i == #line ) then
			do return #line + 1 end
		end
	end

	do return index end
end

function _u30de_30c3_30d7_5857_308a_3064_3076_3057( line, lineA, lineB, fill )

	local stepX = line[2].X-line[1].X
	local stepZ = line[2].Z-line[1].Z

	if ( math.abs( stepX ) >= math.abs( stepZ ) ) then

		if ( stepX > 0 ) then

			local _x = line[1].X
			local indexA = 1
			local indexB = 1

			while ( _x < g_map_width ) do

				indexA = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff38_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineA, indexA, _x )
				indexB = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff38_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineB, indexB, _x )

				local _zMin = 0
				local _zMax = g_map_height - 1

				if ( indexA <= #lineA ) then
					_zMax = lineA[indexA].Z
				end

				if ( indexB <= #lineB ) then
					_zMin = lineB[indexB].Z
				end

				for _z = _zMin, _zMax do
					local id = g_map_width * _z + _x + 1
					g_map[ id ] = fill
				end

				_x = _x + 1

			end

		else

			local _x = line[1].X
			local indexA = 1
			local indexB = 1

			while ( _x >= 0 ) do

				indexA = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff38_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineA, indexA, _x )
				indexB = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff38_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineB, indexB, _x )

				local _zMin = 0
				local _zMax = g_map_height - 1

				if ( indexA <= #lineA ) then
					_zMin = lineA[indexA].Z
				end

				if ( indexB <= #lineB ) then
					_zMax = lineB[indexB].Z
				end

				for _z = _zMin, _zMax do
					local id = g_map_width * _z + _x + 1
					g_map[ id ] = fill
				end

				_x = _x - 1

			end
		end

	else

		if ( stepZ > 0 ) then

			local _z = line[1].Z
			local indexA = 1
			local indexB = 1

			while ( _z < g_map_height ) do

				indexA = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff3a_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineA, indexA, _z )
				indexB = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff3a_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineB, indexB, _z )

				local _xMin = 0
				local _xMax = g_map_width - 1

				if ( indexA <= #lineA ) then
					_xMin = lineA[indexA].X
				end

				if ( indexB <= #lineB ) then
					_xMax = lineB[indexB].X
				end

				for _x = _xMin, _xMax do
					local id = g_map_width * _z + _x + 1
					g_map[ id ] = fill
				end

				_z = _z + 1

			end

		else

			local _z = line[1].Z
			local indexA = 1
			local indexB = 1

			while ( _z >= 0 ) do

				indexA = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff3a_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineA, indexA, _z )
				indexB = _u30e9_30a4_30f3_306e_4e2d_304b_3089_ff3a_5024_304c_5408_3046_3082_306e_3092_53d6_5f97( lineB, indexB, _z )

				local _xMin = 0
				local _xMax = g_map_width - 1

				if ( indexA <= #lineA ) then
					_xMax = lineA[indexA].X
				end

				if ( indexB <= #lineB ) then
					_xMin = lineB[indexB].X
				end

				for _x = _xMin, _xMax do
					local id = g_map_width * _z + _x + 1
					g_map[ id ] = fill
				end

				_z = _z - 1

			end
		end

	end

end

function _u30cf_30b6_30fc_30c9_30de_30c3_30d7_4f5c_6210( range, map_width, map_height, force, condition )
	local temp_map = {}

	for id in pairs( force ) do

		local index = ForceUnitGetFirst( force[id] )
		while index ~= nil do

			local x = UnitGetX(index)
			local z = UnitGetZ(index)

			if condition( x, z ) then

				for _x = x-range, x+range do
					for _z = z-range, z+range do

						if not ( (_x<2) or (_x>map_width-3) or (_z<2) or (_z>map_height-3) ) then

							local key = _x + _z * map_width
							if ( temp_map[ key ] == nil ) then
								temp_map[key] = 1
							else
								temp_map[key] = temp_map[key] + 1
							end

						end

					end
				end

			end

			index = ForceUnitGetNext(index)

		end

	end

	local map = {}
	for key, val in pairs( temp_map ) do
		local _x = key % map_width
		local _z = math.floor( key / map_width )

		map[ #map + 1 ] = { X=_x, Z=_z, VAL=val }
	end

	table.sort( map,
				function( a, b )
					do return ( a.VAL > b.VAL ) end
				end
				)

	if #map == 0 then
		do return nil end
	else
		do return map end
	end

end
