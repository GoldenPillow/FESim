FORCE_PLAYER	= 0
FORCE_ENEMY		= 1
FORCE_ALLY		= 2
FORCE_ABSENT	= 3
FORCE_CANDIDATE	= 4
FORCE_DEAD		= 5
FORCE_LOST		= 6
FORCE_TEMP		= 7
FORCE_EMPTY		= 8
FORCE_ALL		= -1

DIFFICULTY_NORMAL	= 0
DIFFICULTY_HARD		= 1
DIFFICULTY_LUNATIC	= 2

GAMEMODE_CASUAL		= 0
GAMEMODE_CLASSIC	= 1
GAMEMODE_PHOENIX	= 2

FADE_VERY_FAST	= 0.125
FADE_FAST		= 0.25
FADE_NORMAL		= 0.5
FADE_SLOW		= 1.0
FADE_VERY_SLOW	= 2.0

SOUND_FADE_IMMIDIATE	= 0
SOUND_FADE_VERY_FAST	= 1
SOUND_FADE_FAST			= 2
SOUND_FADE_NORMAL		= 3
SOUND_FADE_SLOW			= 4
SOUND_FADE_VERY_SLOW	= 5

CAPABILITY_HP	= 0
CAPABILITY_STR	= 1
CAPABILITY_TECH	= 2
CAPABILITY_QUICK= 3
CAPABILITY_LUCK	= 4
CAPABILITY_DEF	= 5
CAPABILITY_MAGIC= 6
CAPABILITY_RES	= 7
CAPABILITY_PHYS	= 8
CAPABILITY_SIGHT= 9
CAPABILITY_MOVE	= 10

MENU_CONDITION_HIDE		= 0
MENU_CONDITION_ENABLE	= 1
MENU_CONDITION_DISABLE	= 2

AI_ORDER_CAUSE	= 0
AI_ORDER_MIND	= 1
AI_ORDER_ATTACK	= 2
AI_ORDER_MOVE	= 3

RESULT_NO	= 0
RESULT_YES	= 1

MENU_ITEM_HIDE = 0
MENU_ITEM_SHOW = 1

CURSOR_DISTANCE_NEAR	= 0
CURSOR_DISTANCE_MIDDLE	= 1
CURSOR_DISTANCE_FAR	= 2

DEBUG_BUTTON_A		= 1
DEBUG_BUTTON_B		= 2
DEBUG_BUTTON_X		= 4
DEBUG_BUTTON_Y		= 8
DEBUG_BUTTON_L		= 16
DEBUG_BUTTON_R		= 32
DEBUG_BUTTON_LEFT	= 64
DEBUG_BUTTON_UP		= 128
DEBUG_BUTTON_RIGHT	= 256
DEBUG_BUTTON_DOWN	= 512
DEBUG_BUTTON_PLUS	= 1024
DEBUG_BUTTON_MINUS	= 2048

DEBUG_FAKE_PERCENT_OFF	= 0
DEBUG_FAKE_PERCENT_0	= 1
DEBUG_FAKE_PERCENT_50	= 2
DEBUG_FAKE_PERCENT_100	= 3

DEBUG_FAKE_EXP_OFF	= 0
DEBUG_FAKE_EXP_0	= 1
DEBUG_FAKE_EXP_1	= 2
DEBUG_FAKE_EXP_10	= 3
DEBUG_FAKE_EXP_100	= 4

DISPOS_FLAG_NONE		= 0
DISPOS_FLAG_FOCUS		= 1
DISPOS_FLAG_FOCUS_UNIT	= 2
DISPOS_FLAG_FORCED		= 4
DISPOS_FLAG_WARP		= 8
DISPOS_FLAG_NOT_FORCED	= 16
DISPOS_FLAG_LOOSE		= 32

UNIT_STATUS_FIXED			= 1
UNIT_STATUS_MOVE_NOT_ALLOW	= 2
UNIT_STATUS_MUST_SORTIE		= 4
UNIT_STATUS_NEVER_SORTIE	= 8
UNIT_STATUS_DONT_POS_CHANGE	= 16
UNIT_STATUS_DANGER_SHOWING	= 32
UNIT_STATUS_CANDIDATE		= 64
UNIT_STATUS_ENGAGING		= 8388608
UNIT_STATUS_DEFECT			= 1073741824

MOVE_FLAG_NONE		= 0
MOVE_FLAG_FOCUS		= 1
MOVE_FLAG_ESCAPE	= 2
MOVE_FLAG_ARRIVAL	= 4

ROTATE_UP		= 0
ROTATE_RIGHT	= 90
ROTATE_DOWN		= 180
ROTATE_LEFT		= 270

ROTATE_UP_RIGHT		= 45
ROTATE_DOWN_RIGHT	= 135
ROTATE_DOWN_LEFT	= 225
ROTATE_UP_LEFT		= 315

GOD_RELIANCE_D = 0
GOD_RELIANCE_C = 1
GOD_RELIANCE_B = 2
GOD_RELIANCE_A = 3

GOD_STATE_NORMAL  = 0
GOD_STATE_RAMPAGE = 1

MAP_ACTION_NONE = 0
MAP_ACTION_IDLE	= 1
MAP_ACTION_DONE	= 2

UNIT_ANIM_NONE			= 0
UNIT_ANIM_SDAND_BY		= 1
UNIT_ANIM_IDLE_RELAX	= 2
UNIT_ANIM_IDLE_NORMAL	= 3
UNIT_ANIM_RUN_LOOP		= 4
UNIT_ANIM_START			= 5
UNIT_ANIM_ATTACK		= 6
UNIT_ANIM_SHOOT			= 7
UNIT_ANIM_SPECIAL		= 8
UNIT_ANIM_ROD        	= 9
UNIT_ANIM_DANCE			= 10
UNIT_ANIM_MAGIC_WEAPON	= 11
UNIT_ANIM_EVENT1		= 12
UNIT_ANIM_EVENT2		= 13
UNIT_ANIM_EVENT3		= 14
UNIT_ANIM_EVENT4		= 15

CONFIG_ANIM_OFF			= 0
CONFIG_ANIM_ON			= 1
CONFIG_ANIM_PLAYER_UNIT	= 2
CONFIG_ANIM_PLAYER_TURN	= 3

function WaitTime(time)
	while time > 0 do
		if SkipIsBlackOut() then
			break
		end

		time = time - TimeGetDelta()

		coroutine.yield(true)
	end
end

function WaitKeyForDebug()
	while true do
		if SkipIsBlackOut() then
			break
		end
		if DebugIsButton(DEBUG_BUTTON_A) then
			break
		end
		if DebugIsButton(DEBUG_BUTTON_Y) and DebugIsTrigger(DEBUG_BUTTON_X) then
			DebugCreateMenu()
		end
		coroutine.yield(true)
	end
end

function FadeWait()
	while IsFading() do
		coroutine.yield(true)
	end
end

function LoadWait()
	while IsLoading() do
		coroutine.yield(true)
	end
end

function FadeInAndWait(time)
	LoadWait()
	FadeIn(time)
	FadeWait()
end

function FadeOutAndWait(time)
	FadeOut(time)
	FadeWait()
end

function Min(value, min)
	if value > min then
		return min
	else
		return value
	end
end

function WhiteOut(time)
	FadeOut(time, 1, 1, 1)
end

function Max(value, max)
	if value < max then
		return max
	else
		return value
	end
end

function Clamp(value, min, max)
	value = Min(value, max)
	value = Max(value, min)
	return value
end

function VariableAdd(key, value, min, max)
	value = VariableGet(key) + value
	value = Clamp(value, min, max)
	VariableSet(key, value)
	return value
end

function VariableInc(key, min, max)
	return VariableAdd(key, 1, min, max)
end

function VariableDec(key, min, max)
	return VariableAdd(key, -1, min, max)
end

function ForceUnitGetCount(force)
	local count = 0
	local index = ForceUnitGetFirst(force)
	while index ~= nil do
		index = ForceUnitGetNext(index)
		count = count + 1
	end
	return count
end

function EffectWait()
	while EffectIsPlaying() do
		coroutine.yield(true)
	end
end

function _u5b9d_7bb1_5165_624b(iid)
	EventOpenObject()
	WaitTime(1.0)
	ItemGain(MindGetUnit(), iid)
end

function _u5c04_7a0b_5224_5b9a(unit, target)

	if UnitIsExist(unit) and UnitIsExist(target) then

		local sx = UnitGetX(unit)
		local sz = UnitGetZ(unit)

		local tx = UnitGetX(target)
		local tz = UnitGetZ(target)

		local distance = math.abs(tx - sx) + math.abs(tz - sz)

		for i = 0 , UnitGetItemCount(unit) do

			local rangeI = UnitGetItemRangeI(unit, i)
			local rangeO = UnitGetItemRangeO(unit, i)

			if rangeI <= distance and distance <= rangeO then
				return true
			end
		end

	end

	return false
end

function MenuAddCall(menu, mid, func, condition, args)
	local item = MenuItemCreate(menu)
	MenuItemSetMid(item, mid)
	MenuItemSetFunc(item, func, args)
	MenuItemSetCondition(item, condition)
	return item
end

function MenuAddJump(menu, mid, func, condition)
	return MenuAddCall(menu, mid, Jump, condition, func)
end

function MenuAddTalk(menu, mid, talkId, condition)
	local item = MenuAddCall(menu, mid, Talk, condition, talkId)
	return item
end

function MenuAddBack(menu, mid, func, condition)
	MenuCancelJump(menu, func, condtion)
	return MenuAddJump(menu, mid, func, condtion)
end

function MenuAddCallWithObjectFlash(menu, mid, func, condition, objName)
	local item = MenuAddCall(menu, mid, func, condition)
	MenuItemSetSelectFunc(item, ObjectFlash, objName)
	return item
end

function MenuItemExist(mid)

	if MessIsExist(mid) == false then
			return false;
	end

	if VariableIsExist(mid) then
		if VariableGet(mid) == MENU_ITEM_HIDE then
			return false;
		end
	end
	return true;
end

function TryMenuAddLabel(menu, label)
	if MenuItemExist(label) then
		MenuAddLabel(menu, label)
	end
end

function TryMenuAddTalk(menu, selectId, talkId)
	if MenuItemExist(selectId) then
		MenuAddTalk(menu, selectId, talkId, condition)
	end
end

function MenuTalkSelect(mid)
	local menu = MenuCreate()
	TryMenuAddLabel(menu, mid.."_TITLE")
	TryMenuAddTalk(menu, mid.."_SELECT_A", mid.."_TALK_A")
	TryMenuAddTalk(menu, mid.."_SELECT_B", mid.."_TALK_B", true)
	TryMenuAddTalk(menu, mid.."_SELECT_C", mid.."_TALK_C", true)
	TryMenuAddTalk(menu, mid.."_SELECT_D", mid.."_TALK_D", true)
	TryMenuAddTalk(menu, mid.."_SELECT_E", mid.."_TALK_E", true)
	TryMenuAddTalk(menu, mid.."_SELECT_F", mid.."_TALK_F", true)
	TryMenuAddTalk(menu, mid.."_SELECT_G", mid.."_TALK_G", true)
	MenuShow(menu)
	return MenuGetResult()
end

function Callback(func, ...)
	func(...)
end

function UnitMoveWait()
	while UnitIsAction() do
		coroutine.yield(true)
	end
end

function UnitCreateGodUnit(pid, gid)
	GodUnitCreate(gid)
	UnitSetGodUnit(pid, gid)
end

function CursorAnimeCreate( x, z, ... )

	local size = "W1H1"
	local name = "Eff_Cursor01"

	local var = {...}
	if #var >= 1 then
		size = var[1]
	end
	if #var >= 2 then
		name = var[2]
	end

	if ( size == "W1H1" ) then
		CursorSetPos(x,z)
		MapCameraWait()
	end
	MapObjectCreate(name, "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. size, x, z)
	WaitTime( 2.0 )

end

function CursorAnimeDelete( ... )

	local name = "Eff_Cursor01"
	local var = {...}
	if #var >= 1 then
		name = var[1]
	end

	MapObjectDelete( name )

end

function CursorAnimeCreate_DistanceModeNear( x, z, ... )

	local size = "W1H1"
	local name = "Eff_Cursor01"

	local var = {...}
	if #var >= 1 then
		size = var[1]
	end
	if #var >= 2 then
		name = var[2]
	end

	if ( size == "W1H1" ) then
		CursorSetPos(x,z)
	end
	CursorSetDistanceMode(CURSOR_DISTANCE_NEAR)
	MapCameraWait()
	MapObjectCreate(name, "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. size, x, z)
	WaitTime( 2.0 )

end

function CursorAnimeCreate_FromPid( pid, ... )

	local size = "W1H1"
	local name = "Eff_Cursor01"

	local var = {...}
	if #var >= 1 then
		size = var[1]
	end
	if #var >= 2 then
		name = var[2]
	end

	if UnitExistOnMap( pid ) then
		CursorSetPos_FromPid(pid)

		local x = UnitGetX( pid )
		local z = UnitGetZ( pid )
		MapObjectCreate(name, "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. size, x, z)
		WaitTime( 2.0 )
	end
end

function CursorSetPos_FromPid( pid )
	if UnitExistOnMap( pid ) then
		CursorSetPos_FromPid_Sub( pid )
		MapCameraWait()
	end
end

function CursorSetPos_FromPid_DistanceModeNear( pid )
	if UnitExistOnMap( pid ) then
		CursorSetPos_FromPid_Sub( pid )
		CursorSetDistanceMode( CURSOR_DISTANCE_NEAR )
		MapCameraWait()
	end
end

function CursorSetPos_FromPid_Sub( unit )
	if UnitExistOnMap( unit ) then
		CursorSetPos( unit )
	end
end

function AroundCameraSetPos( x, z )
	local camera_speed = 4.125;
	CursorSetPos(x, z, camera_speed);
	MapCameraWait()
end

function UnitExistOnMap(pid)

	if UnitIsExist(pid) == true then
		force = UnitGetForce(pid);
		if ( force == FORCE_PLAYER ) or ( force == FORCE_ALLY ) or ( force == FORCE_ENEMY ) then
			return true;
		end
	end

	return false;

end

function MapObjectAction(x, z, action)

	EventActionObject(x, z, action)

	while EventIsPlayingObject(x, z) do
		coroutine.yield(true)
	end
end

function MapObjectActionNoWait(x, z, action)

	EventActionObject(x, z, action)
end

function MapObjectActionMoveNoWait(x, z, movedX, movedZ, action)

	EventActionMoveObject(x, z, movedX, movedZ, action)
end

function MapObjectCreate(name, path, x, z)

	local px = MapGetPosition(x + 0.5)
	local pz = MapGetPosition(z + 0.5)
	local py = MapGetHeight(px, pz)

	local rx = 0
	local ry = 0
	local rz = 0

	ObjectCreate(name, path, px, py, pz, rx, ry, rz);

end

function MapObjectDelete(name)
	while ObjectIsExist(name) do
		ObjectDelete(name)
		coroutine.yield(true)
	end
end

function MapObjectWaitDelete(name)
	while ObjectIsExist(name) do

		if SkipIsBlackOut() == true then
			MapObjectDelete(name);
		end

		coroutine.yield(true)

	end
end

function MapCameraWait()
	while MapCameraIsScroll() do
		coroutine.yield(true)
	end
end

function MapCameraLooseWait()
	while MapCameraIsScroll(true) do
		coroutine.yield(true)
	end
end

function VisitCameraIn()
	VisitCameraGo();

	while VisitCameraIsAction() do
		coroutine.yield(true)
	end
end

function VisitCameraOut()
	VisitCameraBack();

	while VisitCameraIsAction() do
		coroutine.yield(true)
	end
end

function UnitSetPosFromPos( x, z, toX, toZ )
	local unit = UnitGetByPos(x, z);
	if unit ~= nil then
		UnitSetPos(unit, toX, toZ);
	end
end
function UnitMovePosFromPos( x, z, toX, toZ )
	local unit = UnitGetByPos(x, z);
	if unit ~= nil then
		UnitMovePos(unit, toX, toZ, MOVE_FLAG_NONE);
	end
end

function _u30d7_30ec_30a4_30e4_30fc_8ecd_306e_4e2d_5fc3_70b9_3092_7b97_51fa()
	local x = 0
	local z = 0
	local count = 0

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do

		x = ( x + UnitGetX(index) )
		z = ( z + UnitGetZ(index) )

		count = count + 1
		index = ForceUnitGetNext(index)
	end

	local center_x = math.floor(x/count + 0.5);
	local center_z = math.floor(z/count + 0.5);

	return center_x, center_z
end

function _u4e8c_70b9_9593_8ddd_96e2(x1, z1, x2, z2)
	local _distance = math.abs( x1 - x2 ) + math.abs( z1 - z2 );
	return _distance
end

function _u30b9_30ad_30eb_88c5_5099( pid, ... )
	if UnitIsExist( pid ) then

		local sid_list = {...}
		for index in pairs( sid_list ) do

			local sid = sid_list[index]

			if not UnitHasPrivateSkill( pid, sid ) then

				UnitSetPrivateSkill( pid, sid )

			end

		end

	end
end

function _u30b9_30ad_30eb_89e3_9664( pid, ... )
	if UnitIsExist( pid ) then

		local sid_list = {...}
		for index in pairs( sid_list ) do

			local sid = sid_list[index]

			if UnitHasPrivateSkill( pid, sid ) then

				UnitClearPrivateSkill( pid, sid )

			end

		end

	end
end

function AiSetActiveAll(force, pid, active)

	local unit = ForceUnitGetFirst(force)
	while unit ~= nil do

		local _pid = UnitGetPID( unit )

		if _pid == pid then
			AiSetActive(unit, active)
		end

		unit = ForceUnitGetNext( unit )

	end

end

function AiSetSequenceAll(force, pid, order, sequence, values)

	local unit = ForceUnitGetFirst(force)
	while unit ~= nil do

		local _pid = UnitGetPID( unit )

		if _pid == pid then
			AiSetSequence(unit, order, sequence, values)
		end

		unit = ForceUnitGetNext( unit )

	end

end

function _uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( gid )

	local index = ForceUnitGetFirst( FORCE_ABSENT )
	while ( index ~= nil ) do

		if UnitGetGodUnit( index ) == gid  then
			UnitSetGodUnit( index, nil )
			break
		end

		index = ForceUnitGetNext( index )
	end

	GodUnitSetEscape(gid, true)

end

function _uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( gid )

	GodUnitSetEscape(gid, false)

end

function ExistRareEnemy()

	return (VariableGet("G_遭遇戦_レア敵お金") + VariableGet("G_遭遇戦_レア敵経験値")) > 0

end

function condition_true()
	return true
end

function _u30e2_30fc_30c9_306f_30ce_30fc_30de_30eb()
	return DifficultyGet() == DIFFICULTY_NORMAL
end

function _u30e2_30fc_30c9_306f_30cf_30fc_30c9()
	return DifficultyGet() == DIFFICULTY_HARD
end

function _u30e2_30fc_30c9_306f_30eb_30ca_30c6_30a3_30c3_30af()
	return DifficultyGet() == DIFFICULTY_LUNATIC
end

function _u6c11_5bb6_7834_58ca(x1, z1, x2, z2)
	TerrainSetBegin()
	for z = z1, z2 do
		for x = x1, x2 do
			TerrainSet( x, z, "TID_廃墟" )
		end
	end
	TerrainSetEnd()

	WaitTime( 1.0 )
end

function _u6c11_5bb6_7834_58ca___30d5_30e9_30b0_30bb_30c3_30c8(x1, z1, x2, z2, flag)
	_u6c11_5bb6_7834_58ca( x1, z1, x2, z2 )
	VariableSet( flag, 1 )
end

function _u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( godName, message )

	FadeInAndWait( FADE_NORMAL )

		local flag = "G_" .. godName .. "レベルキャップ解放"

		if not VariableIsExist( flag ) then
			VariableEntry( flag, 1 )
		else
			VariableSet( flag, 1 )
		end

		SkipEscape()
		PuppetDemo( message, "MID_LC1" )

	FadeOutAndWait( FADE_NORMAL )

end

function _u52dd_5229_6761_4ef6()
	if UnitExistOnMap( "PID_リュール" ) then
		CursorSetPos_FromPid( "PID_リュール" )
	end

	WinRule()
end

function _u52dd_5229_6761_4ef6___6575_5c06_30d5_30a9_30fc_30ab_30b9( pid )
	CursorAnimeCreate_FromPid( pid )
	WinRule()
	CursorAnimeDelete()
end

HELP_POINT_UP		= 1
HELP_POINT_RIGHT	= 10
HELP_POINT_DOWN		= 100
HELP_POINT_LEFT		= 1000

HELP_POINT_ALL			= HELP_POINT_UP + HELP_POINT_RIGHT + HELP_POINT_DOWN + HELP_POINT_LEFT
HELP_POINT_OTHER_LEFT	= HELP_POINT_UP + HELP_POINT_RIGHT + HELP_POINT_DOWN
HELP_POINT_OTHER_RIGHT	= HELP_POINT_UP + HELP_POINT_DOWN + HELP_POINT_LEFT
HELP_POINT_OTHER_UP		= HELP_POINT_RIGHT + HELP_POINT_DOWN + HELP_POINT_LEFT
HELP_POINT_OTHER_DOWN	= HELP_POINT_UP + HELP_POINT_RIGHT + HELP_POINT_LEFT

function _u52a0_52e2_30dd_30a4_30f3_30c8_306e_30a8_30ea_30a2_30a4_30d9_30f3_30c8_767b_9332( list )
	for pointer = 1, #list do
		local x			= list[pointer][1]
		local z			= list[pointer][2]
		local flag = "加勢ポイント_" .. tostring( x ) .. "_" .. tostring( z ) .. "_エフェクト展開_済み"

		local option	= HELP_POINT_ALL
		if #list[pointer] >= 3 then
			option	= list[pointer][3]
		end

		EventEntryArea(_u52a0_52e2_30dd_30a4_30f3_30c8_306e_30a8_30d5_30a7_30af_30c8_5c55_958b, x, z, x, z, FORCE_PLAYER, flag, x, z, option )
	end

end

function _u52a0_52e2_30dd_30a4_30f3_30c8_306e_30a8_30d5_30a7_30af_30c8_5c55_958b( x, z, option )

	SkipPushStateAndDisable()

	EventStateObject( x, z, 1 )

	local isLeft = ( option / HELP_POINT_LEFT >= 1 )
	option = option % HELP_POINT_LEFT

	local isDown = ( option / HELP_POINT_DOWN >= 1 )
	option = option % HELP_POINT_DOWN

	local isRight = ( option / HELP_POINT_RIGHT >= 1 )
	option = option % HELP_POINT_RIGHT

	local isUp = ( option / HELP_POINT_UP >= 1 )
	option = option % HELP_POINT_UP

	if isUp then
		EffectPlay( "加勢ポイント_発動", x, z+1 )
	end

	if isRight then
		EffectPlay( "加勢ポイント_発動", x+1, z )
	end

	if isDown then
		EffectPlay( "加勢ポイント_発動", x, z-1 )
	end

	if isLeft then
		EffectPlay( "加勢ポイント_発動", x-1, z )
	end

	WaitTime( 0.2 )

	if isUp then
		EffectCreate( "加勢ポイント_ループ", x, z+1 )
	end

	if isRight then
		EffectCreate( "加勢ポイント_ループ", x+1, z )
	end

	if isDown then
		EffectCreate( "加勢ポイント_ループ", x, z-1 )
	end

	if isLeft then
		EffectCreate( "加勢ポイント_ループ", x-1, z )
	end

	SkipPopState()

end

function _u98db_884c_30e6_30cb_30c3_30c8_306e_ff10_30c0_30e1_30fc_30b8_653b_6483_3092_8a31_53ef()
	if DifficultyGet() == DIFFICULTY_LUNATIC then

		local index	= ForceUnitGetFirst( FORCE_ENEMY )

		while ( index ~= nil ) do

			if ( UnitGetMoveCost( index ) == "COST_飛行" ) then
				AiSetRejectPower0Attack( index, false )
			end

			index = ForceUnitGetNext( index )
		end
	end
end
