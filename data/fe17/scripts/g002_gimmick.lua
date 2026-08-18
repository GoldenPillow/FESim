Include("Common")

g_Key_Event_Gas_Warning = "イベント会話_毒ガス_警告_済"

g_GasPortInfoList = {
	{ x = 9		, z = 2		, dir = "上", length = 2 },
	{ x = 10	, z = 2		, dir = "上", length = 3 },
	{ x = 22	, z = 2		, dir = "上", length = 4 },
	{ x = 14	, z = 3		, dir = "上", length = 3 },
	{ x = 3		, z = 5		, dir = "右", length = 3 },
	{ x = 8		, z = 7		, dir = "左", length = 4 },
	{ x = 10	, z = 7		, dir = "右", length = 3 },
	{ x = 21	, z = 7		, dir = "下", length = 3 },
	{ x = 26	, z = 8		, dir = "左", length = 2 },
	{ x = 14	, z = 9		, dir = "左", length = 3 },
	{ x = 3		, z = 10	, dir = "右", length = 3 },
	{ x = 10	, z = 10	, dir = "右", length = 3 },
	{ x = 17	, z = 10	, dir = "下", length = 4 },
	{ x = 2		, z = 12	, dir = "右", length = 4 },
	{ x = 10	, z = 12	, dir = "右", length = 4 },
	{ x = 15	, z = 12	, dir = "上", length = 5 },
	{ x = 8		, z = 13	, dir = "左", length = 5 },
	{ x = 21	, z = 13	, dir = "右", length = 4 },
	{ x = 26	, z = 13	, dir = "下", length = 2 },
	{ x = 28	, z = 13	, dir = "下", length = 3 },
	{ x = 9		, z = 14	, dir = "左", length = 5 },
	{ x = 18	, z = 14	, dir = "上", length = 5 },
	{ x = 21	, z = 16	, dir = "右", length = 4 },
	{ x = 27	, z = 17	, dir = "下", length = 1 },
	{ x = 16	, z = 19	, dir = "下", length = 5 },
	{ x = 15	, z = 20	, dir = "左", length = 3 },
}

g_BelchList = {}

g_UnitList = {}

g_BottomRightX = 30
g_BottomRightZ = 1

g_SearchX = 1
g_SearchZ = 1

function _u6bd2_30ac_30b9_30a4_30d9_30f3_30c8_767b_9332( ... )

	VariableEntry( "毒ガス_噴出_済", 0 )

	VariableEntry( g_Key_Event_Gas_Warning, 0 )

	local warns = ...

	if warns == nil then

		warns = false
		VariableSet( g_Key_Event_Gas_Warning, 1 )

	end

	if DifficultyGet() == DIFFICULTY_NORMAL then

		EventEntryTurn(_u6bd2_30ac_30b9_767a_5c04_30a4_30d9_30f3_30c8, 2, -1, FORCE_PLAYER)

	elseif DifficultyGet() == DIFFICULTY_HARD then

		EventEntryTurn(_u6bd2_30ac_30b9_767a_5c04_30a4_30d9_30f3_30c8, 1, -1, FORCE_ENEMY)

	else

		EventEntryTurn(_u6bd2_30ac_30b9_767a_5c04_30a4_30d9_30f3_30c8, 1, -1, FORCE_ENEMY)

	end
end

function _u6bd2_30ac_30b9_767a_5c04_30a4_30d9_30f3_30c8()

	_u6bd2_30ac_30b9_306e_5674_51fa_3067_4f7f_7528_3059_308b_30d1_30e9_30e1_30fc_30bf_30fc_3092_30ea_30bb_30c3_30c8_3059_308b()
	_u6bd2_30ac_30b9_304c_5674_304d_51fa_308b_5674_51fa_53e3_3092_5217_6319_3059_308b()
	_u6bd2_30ac_30b9_3092_767a_5c04_3059_308b()
	_u6bd2_30ac_30b9_306e_8b66_544a_30a4_30d9_30f3_30c8_3092_5b9f_884c_3059_308b()

end

function _u6bd2_30ac_30b9_306e_5674_51fa_3067_4f7f_7528_3059_308b_30d1_30e9_30e1_30fc_30bf_30fc_3092_30ea_30bb_30c3_30c8_3059_308b()

	g_SearchX = g_BottomRightX
	g_SearchZ = g_BottomRightZ

end

function _u6bd2_30ac_30b9_304c_5674_304d_51fa_308b_5674_51fa_53e3_3092_5217_6319_3059_308b()

	InitList( g_BelchList )

	for pointer = 1, #g_GasPortInfoList do

		local result = _u6307_5b9a_306e_5674_51fa_53e3_304b_3089_5674_304d_51fa_308b_6bd2_30ac_30b9_306e_7bc4_56f2_5185_306b_30e6_30cb_30c3_30c8_304c_3044_308b_304b_8abf_67fb_3059_308b( pointer, false )

		if result == true then
			g_BelchList[#g_BelchList + 1] = pointer

		end
	end
end

function _u6bd2_30ac_30b9_3092_767a_5c04_3059_308b()

	CursorSetDistanceMode( CURSOR_DISTANCE_MIDDLE )

	local pointer = _u5674_51fa_53e3_3092_53d6_5f97_3059_308b()

	while pointer > 0 do

		InitList( g_UnitList )

		local result = _u6307_5b9a_306e_5674_51fa_53e3_304b_3089_5674_304d_51fa_308b_6bd2_30ac_30b9_306e_7bc4_56f2_5185_306b_30e6_30cb_30c3_30c8_304c_3044_308b_304b_8abf_67fb_3059_308b( pointer, true )

		if result == true then

			local x			= g_GasPortInfoList[pointer].x
			local z			= g_GasPortInfoList[pointer].z
			local dir		= g_GasPortInfoList[pointer].dir
			local length	= g_GasPortInfoList[pointer].length

			CursorSetPos( x, z )
			MapCameraWait()

			local deg = _u6bd2_30ac_30b9_306e_5674_51fa_65b9_5411_3092_53d6_5f97_3059_308b( dir )

			_u6bd2_30ac_30b9_306e_5674_51fa_30a8_30d5_30a7_30af_30c8_3092_518d_751f_3059_308b( x, z, length, deg )

			WaitTime( 0.5 )

			_u6bd2_30ac_30b9_306e_52b9_679c_3092_30e6_30cb_30c3_30c8_306b_4e0e_3048_308b()

			WaitTime( 0.5 )

			if VariableGet( "毒ガス_噴出_済" ) == 0 then

				VariableSet( "毒ガス_噴出_済", 1 )

			end
		end

		pointer = _u5674_51fa_53e3_3092_53d6_5f97_3059_308b()
	end
end

function _u6bd2_30ac_30b9_306e_8b66_544a_30a4_30d9_30f3_30c8_3092_5b9f_884c_3059_308b()

	if VariableGet( g_Key_Event_Gas_Warning ) == 0 then

		if VariableGet( "毒ガス_噴出_済" ) == 1 then

			SkipEscape()

			WaitTime( 1.0 )

			Talk("MID_EV3")

			VariableSet( g_Key_Event_Gas_Warning, 1 )
		end
	end
end

function InitList( list )

	for i in pairs (list) do
		list[i] = nil

	end
end

function _u6bd2_30ac_30b9_306e_52b9_679c_3092_30e6_30cb_30c3_30c8_306b_4e0e_3048_308b()

	for pointer = 1, #g_UnitList do

		local unit = g_UnitList[pointer]

		_u6bd2_30ac_30b9_306b_3088_308b_72b6_614b_7570_5e38_3092_4ed8_4e0e_3059_308b( unit )

	end

end

function _u5674_51fa_53e3_3092_53d6_5f97_3059_308b()

	local preDistance = -1

	local nearestPointer = -1

	local deletePointer = -1

	local nearestX = g_SearchX
	local nearestZ = g_SearchZ

	for belchPointer = 1, #g_BelchList do

		local infoPointer = g_BelchList[belchPointer]

		local x = g_GasPortInfoList[infoPointer].x
		local z = g_GasPortInfoList[infoPointer].z

		calcDistance = _u4e8c_70b9_9593_8ddd_96e2(g_SearchX, g_SearchZ, x, z)

		if preDistance < 0 or calcDistance < preDistance then
			nearestPointer	= infoPointer
			deletePointer	= belchPointer
			preDistance		= calcDistance
			nearestX		= x
			nearestZ		= z

		end
	end

	if deletePointer > 0 then

		table.remove(g_BelchList, deletePointer)

	end

	g_SearchX = nearestX
	g_SearchZ = nearestZ

	do return nearestPointer end
end

function _u6bd2_30ac_30b9_306e_5674_51fa_30a8_30d5_30a7_30af_30c8_3092_518d_751f_3059_308b( x, z, length, deg )

	if length == 1 then
		EffectPlay( "毒ガス_発射W1", x, z, deg )

	elseif length == 2 then
		EffectPlay( "毒ガス_発射W2", x, z, deg )

	elseif length == 3 then
		EffectPlay( "毒ガス_発射W3", x, z, deg )

	elseif length == 4 then
		EffectPlay( "毒ガス_発射W4", x, z, deg )

	elseif length == 5 then
		EffectPlay( "毒ガス_発射W5", x, z, deg )
	end
end

function _u6bd2_30ac_30b9_306e_5674_51fa_65b9_5411_3092_53d6_5f97_3059_308b( dir )

	if dir == "右" then
		do return 0 end
	end

	if dir == "下" then
		do return 90 end
	end

	if dir == "左" then
		do return 180 end
	end

	if dir == "上" then
		do return 270 end
	end

	do return 0 end
end

function _u6307_5b9a_306e_5674_51fa_53e3_304b_3089_5674_304d_51fa_308b_6bd2_30ac_30b9_306e_7bc4_56f2_5185_306b_30e6_30cb_30c3_30c8_304c_3044_308b_304b_8abf_67fb_3059_308b( pointer, isList )

	local vec_x = 0
	local vec_z = 0

	local dir = g_GasPortInfoList[pointer].dir

	if dir == "右" then
		vec_x = 1
	end

	if dir == "下" then
		vec_z = -1
	end

	if dir == "左" then
		vec_x = -1
	end

	if dir == "上" then
		vec_z = 1
	end

	local x			= g_GasPortInfoList[pointer].x
	local z			= g_GasPortInfoList[pointer].z
	local length	= g_GasPortInfoList[pointer].length

	local isFind	= false

	for i = 1, length do

		x = x + vec_x
		z = z + vec_z

		local unit = UnitGetByPos( x, z )

		if unit ~= nil then

			if isList == true then

				g_UnitList[#g_UnitList + 1] = unit

			end

			isFind = true
		end
	end

	do return isFind end
end

function _u6bd2_30ac_30b9_306b_3088_308b_72b6_614b_7570_5e38_3092_4ed8_4e0e_3059_308b( unit )

	if not UnitHasPrivateSkill( unit, "SID_毒" )		and
	   not UnitHasPrivateSkill( unit, "SID_猛毒" )		and
	   not UnitHasPrivateSkill( unit, "SID_劇毒" )		then

		_u30b9_30ad_30eb_88c5_5099( unit, "SID_毒" )

	elseif UnitHasPrivateSkill( unit, "SID_毒" ) then

		_u30b9_30ad_30eb_89e3_9664( unit, "SID_毒" )
		_u30b9_30ad_30eb_88c5_5099( unit, "SID_猛毒" )

	elseif UnitHasPrivateSkill( unit, "SID_猛毒" ) then

		_u30b9_30ad_30eb_89e3_9664( unit, "SID_猛毒" )
		_u30b9_30ad_30eb_88c5_5099( unit, "SID_劇毒" )

	end

	local x = UnitGetX( unit )
	local z = UnitGetZ( unit )

	EffectPlay( "毒スキルヒット", x, z )

end

function _u6bd2_30ac_30b9_306b_3088_308b_30c0_30e1_30fc_30b8_3092_4e0e_3048_308b( unit )

	MapDamageBegin();

	local hp		= UnitGetCapability(unit, CAPABILITY_HP, true)

	local damage	= hp * 0.2

	MapDamageAdd(unit, damage)

	MapDamageEnd();

end
