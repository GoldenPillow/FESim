Include("Common")

g_pid_lueur						= "PID_リュール"
g_pid_boss						= "PID_G005_カミラ"

g_key_enter_center_area			= "マップ中央進入_済"

g_width							= 31
g_height						= 27
g_obstacle_near					= 6
g_unit_near						= 6
g_obstacleBreakTwice			= 15
g_obstacleBreakAtOnce			= 30

g_obstaclePoint = {
	{  3, 20,  2.5, 21.0 },

	{ 21, 23, 21.5, 24.0 },
	{ 22, 20, 22.5, 21.0 },

	{ 27, 20, 27.5, 21.0 },

	{ 11, 18, 11.0, 19.0 },
	{  9, 18,  9.0, 18.0 },

	{ 13, 17, 13.0, 17.5 },
	{ 18, 17, 17.5, 18.0 },
	{ 19, 15, 20.5, 15.0 },
	{  4, 14,  4.0, 15.5 },
	{  8, 13,  7.5, 14.0 },
	{ 13, 13, 12.5, 13.0 },
	{ 17, 14, 17.0, 14.0 },
	{ 26, 12, 26.0, 12.5 },
	{ 23, 10, 22.5, 11.0 },
	{  4, 10,  3.5,  9.0 },
	{ 13,  7, 12.5,  7.5 },
	{ 18,  6, 17.5,  7.0 },
	{ 12,  4, 11.5,  3.0 },
	{ 19,  4, 20.5,  4.0 }
	}

g_obstaclePointSub = {
	{  1, 23,  1.0, 23.5 },
	{ 29, 23, 29.0, 23.5 },
	{ 28,  9, 28.0,  8.5 },
	{  2,  5,  2.0,  4.5 },
	{ 21,  2, 21.5,  2.0 },
	{ 27,  2, 27.5,  1.5 },
	{  3,  1,  2.5,  1.0 }
	}

g_obstaclePointTwice = {
	{  3, 20,  2.5, 21.0 },

	{ 22, 20, 22.5, 21.0 },

	{ 11, 18, 11.0, 19.0 },
	{  9, 18,  9.0, 18.0 },

	{ 13, 17, 13.0, 17.5 },
	{ 18, 17, 17.5, 18.0 },
	{ 19, 15, 20.5, 15.0 },
	{  4, 14,  4.0, 15.5 },
	{  8, 13,  7.5, 14.0 },
	{ 13, 13, 12.5, 13.0 },
	{ 17, 14, 17.0, 14.0 },
	{ 26, 12, 26.0, 12.5 },
	{ 23, 10, 22.5, 11.0 },
	{  4, 10,  3.5,  9.0 },
	{  8,  8,  7.5,  7.5 },
	{ 13,  7, 12.5,  7.5 },
	{ 18,  6, 17.5,  7.0 }
	}

g_obstaclePointAtOnce = {
	{ 27, 20, 27.5, 21.0 },

	{ 11, 18, 11.0, 19.0 },
	{  9, 18,  9.0, 18.0 },

	{ 13, 17, 13.0, 17.5 },
	{ 19, 15, 20.5, 15.0 },
	{  4, 14,  4.0, 15.5 },
	{ 17, 14, 17.0, 14.0 },
	{ 26, 12, 26.0, 12.5 },
	{ 19,  4, 20.5,  4.0 }
	}

function _uc_o_n_d_i_t_i_o_n___7adc_8108___30cf_30fc_30c9_4ee5_4e0b()

	if DifficultyGet() >= DIFFICULTY_LUNATIC then
		return false
	end

	return not AiGetActive( g_pid_boss )

end

function _u7adc_8108___30cf_30fc_30c9_4ee5_4e0b()

	if ( VariableGet( g_key_enter_center_area ) == 1 ) and ( RandomGet( 100 ) < g_obstacleBreakTwice ) then

		if _u7adc_8108___4e0b_65b9_306e_74e6_792b_3092_7834_58ca( g_obstaclePointTwice ) then
			return
		end

	end

	local pointList = _u30e6_30cb_30c3_30c8_304c_96c6_307e_3063_3066_3044_308b_30dd_30a4_30f3_30c8_3092_7b97_51fa()
	if pointList == nil then
		return
	end

	for i = 1, #pointList do

		if _u7adc_8108___4e00_756a_8fd1_304f_306e_969c_5bb3_7269_3092_7834_58ca( g_obstaclePoint, pointList[i], false ) then
			return
		end

	end

	if ( VariableGet( g_key_enter_center_area ) == 1 ) then

		if _u7adc_8108___4e0b_65b9_306e_74e6_792b_3092_7834_58ca( g_obstaclePointTwice ) then
			return
		end

	end

	for i = 1, #pointList do

		if _u7adc_8108___4e00_756a_8fd1_304f_306e_969c_5bb3_7269_3092_7834_58ca( g_obstaclePointSub, pointList[i], false ) then
			return
		end

	end

end

function _uc_o_n_d_i_t_i_o_n___7adc_8108___30eb_30ca_30c6_30a3_30c3_30af()

	return _u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af() and ( not AiGetActive( g_pid_boss ) )

end

function _u7adc_8108___30eb_30ca_30c6_30a3_30c3_30af()

	if ( VariableGet( g_key_enter_center_area ) == 1 ) and ( RandomGet( 100 ) < g_obstacleBreakTwice ) then

		if _u7adc_8108___4e0b_65b9_306e_74e6_792b_3092_7834_58ca( g_obstaclePointTwice ) then
			return
		end

	end

	local pointList = _u30e6_30cb_30c3_30c8_304c_96c6_307e_3063_3066_3044_308b_30dd_30a4_30f3_30c8_3092_7b97_51fa()
	if pointList == nil then
		return
	end

	local atOnce = ( RandomGet( 100 ) < g_obstacleBreakAtOnce )

	for i = 1, #pointList do

		if _u7adc_8108___4e00_756a_8fd1_304f_306e_969c_5bb3_7269_3092_7834_58ca( g_obstaclePoint, pointList[i], atOnce ) then
			return
		end

	end

	if ( VariableGet( g_key_enter_center_area ) == 1 ) then

		if _u7adc_8108___4e0b_65b9_306e_74e6_792b_3092_7834_58ca( g_obstaclePointTwice ) then
			return
		end

	end

	for i = 1, #pointList do

		if _u7adc_8108___4e00_756a_8fd1_304f_306e_969c_5bb3_7269_3092_7834_58ca( g_obstaclePointSub, pointList[i], false ) then
			return
		end

	end

end

function _u30e6_30cb_30c3_30c8_304c_96c6_307e_3063_3066_3044_308b_30dd_30a4_30f3_30c8_3092_7b97_51fa()

	local hazard_map = _u30cf_30b6_30fc_30c9_30de_30c3_30d7_4f5c_6210( 1 )

	if hazard_map == nil then
		return nil
	end

	local result = {}

	while #hazard_map > 0  do

		local max_danger_num = 0

		for i = 1, #hazard_map do
			if ( hazard_map[i].VAL == hazard_map[1].VAL ) then
				max_danger_num = max_danger_num + 1
			end
		end

		local index	= RandomGet( max_danger_num ) + 1
		local p		= hazard_map[ index ]
		table.insert( result, hazard_map[ index ] )
		table.remove( hazard_map, index )

		if ( #hazard_map > 0 ) then

			local removeList = {}

			for i = 1, #hazard_map do
				if _u4e8c_70b9_9593_8ddd_96e2( p.X, p.Z, hazard_map[i].X, hazard_map[i].Z ) <= g_unit_near then
					table.insert( removeList, i )
				end
			end

			if ( #removeList > 0 ) then

				table.sort( removeList,
							function( a, b )
								return ( a > b )
							end
							)

				for i = 1, #removeList do
					table.remove( hazard_map, removeList[i] )
				end
			end

		end

	end

	return result

end

function _u7adc_8108___4e00_756a_8fd1_304f_306e_969c_5bb3_7269_3092_7834_58ca( list, point, atOnce )

	local temp_list_near = {}
	for pointer = 1, #list do
		local x		= list[pointer][1]
		local z		= list[pointer][2]
		local ex	= list[pointer][3]
		local ez	= list[pointer][4]

		if TerrainGet( x, z ) == "TID_建造物" then

				local distance = _u4e8c_70b9_9593_8ddd_96e2( point.X, point.Z, x, z )
				if ( distance < g_obstacle_near ) then
					temp_list_near[ #temp_list_near + 1 ] = { X=x, Z=z, DIST=distance, EX=ex, EZ=ez }
				end

		end
	end

	if ( #temp_list_near > 0 ) then
		table.sort( temp_list_near,
					function( a, b )
						return ( a.DIST < b.DIST )
					end
					)

		local p = temp_list_near[1]

		atOnce = _u4e00_5ea6_3067_7834_58ca_3059_308b_304b( p, atOnce )

		_u7adc_8108_767a_52d5( p.X, p.Z, p.EX, p.EZ, atOnce )
		return true

	end

	return false

end

function _u4e00_5ea6_3067_7834_58ca_3059_308b_304b( point, atOnce )

	if atOnce then

		for i=1, #g_obstaclePointAtOnce do

			local _p = g_obstaclePointAtOnce[i]
			if ( _p[1] == point.X ) and ( _p[2] == point.Z ) then
				return true
			end

		end

	end

	return false

end

function _u7adc_8108___4e0b_65b9_306e_74e6_792b_3092_7834_58ca( list )

	table.sort( list,
				function( a, b )
					return ( a[4] < b[4] )
				end
				)

	for pointer = 1, #list do
		local x		= list[pointer][1]
		local z		= list[pointer][2]
		local ex	= list[pointer][3]
		local ez	= list[pointer][4]

		if TerrainGet( x, z ) == "TID_瓦礫" then

			_u7adc_8108_767a_52d5( x, z, ex, ez, false )
			return true

		end
	end

	return false

end

function _u7adc_8108_767a_52d5( x, z, ex, ez, atOnce )

	if not ( ( TerrainGet( x, z ) == "TID_建造物" ) or ( TerrainGet( x, z ) == "TID_瓦礫" ) ) then
		return
	end

	CursorSetPos_FromPid( g_pid_boss )
	EffectPlay( "水球_発動", UnitGetX( g_pid_boss ), UnitGetZ( g_pid_boss ) )
	EffectWait()

	CursorSetPos( x, z )
	MapCameraWait()

	EffectPlay( "水球", ex, ez )
	EffectWait()

	_u7834_58ca_51e6_7406( x, z, atOnce )

	WaitTime( 1.0 )

end

function _u7834_58ca_51e6_7406( x, z, atOnce )

	local fromTerrain	= TerrainGet( x, z )
	local isObstacle	= ( fromTerrain == "TID_建造物" )
	local isRubble		= ( fromTerrain == "TID_瓦礫" )

	local toTerrain = "TID_瓦礫"
	if ( isRubble or atOnce ) then
		toTerrain = "TID_床"
	end

	if ( isObstacle or isRubble ) then

		if ( x == 21 and z == 23 ) or ( x == 22 and z == 20 ) or ( x == 11 and z == 18 ) or ( x == 9 and z == 18 ) then
			_u969c_5bb3_7269_7834_58ca___7279_6b8a( x, z, toTerrain )

		else
			local map = {}
			for i = 1, g_width * g_height do
				map[ #map + 1 ] = 0
			end
			map = _u969c_5bb3_7269_7834_58ca( x, z, map, fromTerrain )

			if ( #map > 0 ) then
				TerrainSetBegin()
				for key, val in pairs( map ) do
					if val == 1 then
						local _x = ( key - 1 ) % g_width
						local _z = math.floor( ( key - 1 ) / g_width )
						TerrainSet( _x, _z, toTerrain )
					end
				end
				TerrainSetEnd()
			end

		end

	end

	if ( isRubble or atOnce ) then
		EventStateObject( x, z, 2 )

	elseif isObstacle then
		EventStateObject( x, z, 1 )

	end

end

function _u969c_5bb3_7269_7834_58ca( x, z, map, terrain )

	if ( x > 0 and x < g_width-1 and z > 0 and z < g_height-1 ) then

		local key = x + z * g_width + 1

		if ( TerrainGet( x, z ) == terrain ) and ( map[ key ] == 0 ) then

			map[ key ] = 1

			map = _u969c_5bb3_7269_7834_58ca( x-1, z, map, terrain )
			map = _u969c_5bb3_7269_7834_58ca( x, z-1, map, terrain )
			map = _u969c_5bb3_7269_7834_58ca( x+1, z, map, terrain )
			map = _u969c_5bb3_7269_7834_58ca( x, z+1, map, terrain )

		end

	end

	return map

end

function _u969c_5bb3_7269_7834_58ca___7279_6b8a( x, z, terrain )

	if ( x == 21 and z == 23 ) or ( x == 22 and z == 20 ) then
		TerrainSetBegin()
			TerrainSet( x,		z,		terrain )
			TerrainSet( x,		z+1,	terrain )
			TerrainSet( x,		z+2,	terrain )
			TerrainSet( x+1,	z,		terrain )
			TerrainSet( x+1,	z+1,	terrain )
			TerrainSet( x+1,	z+2,	terrain )
		TerrainSetEnd()

	elseif ( x == 11 and z == 18 ) then
		TerrainSetBegin()
			TerrainSet( 11,		18,		terrain )
			TerrainSet( 11,		19,		terrain )
			TerrainSet( 11,		20,		terrain )
		TerrainSetEnd()

	elseif ( x == 9 and z == 18 ) then
		TerrainSetBegin()
			TerrainSet( 8,		18,		terrain )
			TerrainSet( 9,		18,		terrain )
			TerrainSet( 10,		18,		terrain )
		TerrainSetEnd()

	end

end

function _u30cf_30b6_30fc_30c9_30de_30c3_30d7_4f5c_6210( range )
	local temp_map = {}

	local index = ForceUnitGetFirst( FORCE_PLAYER )
	while index ~= nil do

		local x = UnitGetX(index)
		local z = UnitGetZ(index)

		for _x = x-range, x+range do
			for _z = z-range, z+range do

				if not ( (_x<2) or (_x>g_width-3) or (_z<2) or (_z>g_height-3) ) then

					local key = _x + _z * g_width
					if ( temp_map[ key ] == nil ) then
						temp_map[key] = 1
					else
						temp_map[key] = temp_map[key] + 1
					end

				end

			end
		end

		index = ForceUnitGetNext(index)

	end

	local map = {}
	for key, val in pairs( temp_map ) do
		local _x = key % g_width
		local _z = math.floor( key / g_width )

		map[ #map + 1 ] = { X=_x, Z=_z, VAL=val }
	end

	if #map == 0 then
		return nil
	end

	table.sort( map,
				function( a, b )
					return ( a.VAL > b.VAL )
				end
				)

	return map

end
