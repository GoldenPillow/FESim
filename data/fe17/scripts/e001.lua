Include("Common")
Include("Common_E")

g_pid_boss = "PID_E001_Boss"

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_E001_WIN" )
	LoseRuleSetMID( "MID_RULE_DLC_LOSE" )

	_u30a4_30d9_30f3_30c8_767b_9332()
	_u30d5_30e9_30b0_767b_9332()
end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "ボスアクティブ_済", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryFixed( _u30dc_30b9_30a2_30af_30c6_30a3_30d6,	g_pid_boss, FORCE_ENEMY)
	EventEntryTurn( _u30dc_30b9_79fb_52d5_958b_59cb,	-1,  -1, FORCE_ENEMY )

	EventEntryTurn( GodSaveEquipE,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )
	EventEntryTurn( Turn1Enemy,	1,  1, FORCE_ENEMY )
	EventEntryTurn( Turn2Player,	2,  2, FORCE_PLAYER )

	EventEntryTurn(_u5897_63f4_4e0b,  6, 6, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_5de6_4e0b, 8, 8, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_リュール", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_リュール_済", "MID_BT2");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT1");
	EventEntryDie(Talk, g_pid_boss, FORCE_ENEMY, condition_true, "MID_BT3");

	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E001_イル", FORCE_PLAYER, condition_true )
	EventEntryDie(_u5473_65b9_6b7b_4ea1, "PID_E001_エル", FORCE_PLAYER, condition_true )

end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	PlayChapterTitle("E001")
	Yield()
	FadeOut(0)

	Movie("Narration01")
	SkipEscape()

	PuppetDemo("E001", "MID_OP2")
	PuppetDemo("E001", "MID_OP3")
	PuppetDemo("E001", "MID_OP4")

	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()

end

function MapOpening()

	Log("MapOpening");

	GodLoadEquipE()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( "E001" )

	if DifficultyGet() == DIFFICULTY_LUNATIC then
		local index	= ForceUnitGetFirst( FORCE_ENEMY )
		while ( index ~= nil ) do
			AiSetRejectPower0Attack( index, false )
			index = ForceUnitGetNext( index )
		end
	end
end

function _u6226_95d8_958b_59cb_76f4_5f8c()
	Talk( "MID_EV0" )

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()

	local x = UnitGetX( g_pid_boss )
	local z = UnitGetZ( g_pid_boss )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)
	WaitTime( 2.0 )

	Talk( "MID_EV1" )
	WinRule()

	MapObjectDelete( "Eff_Cursor01" )
end

function Turn1Enemy()

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()
	Talk( "MID_EV2" )
end
function Turn2Player()

	CursorSetPos_FromPid("PID_E001_イル")
	MapCameraWait()
	Talk( "MID_EV3" )

	Tutorial( "TUTID_牙呪" )

end

function _u5473_65b9_6b7b_4ea1()
	VariableSet( "敗北", 1 )
end

function _u30dc_30b9_79fb_52d5_958b_59cb()
	local setai = 0
	local pid = "PID_E001_超強_異形狼"

	if UnitExistOnMap(pid) then
		local stock = UnitGetHpStock(pid)

		if stock == 1 then
			setai = 1
		end
	else
		setai = 1
	end
	if setai == 1 then
		AiSetSequence(g_pid_boss, AI_ORDER_ATTACK, "AI_AT_Breath")
		AiSetSequence(g_pid_boss, AI_ORDER_MOVE, "AI_MV_WeakEnemy")
		UnitClearStatus(g_pid_boss, UNIT_STATUS_MOVE_NOT_ALLOW)
		UnitClearStatus(UnitGetByPos(8, 1), UNIT_STATUS_MOVE_NOT_ALLOW)
	end
end

function _u30dc_30b9_30a8_30f3_30b2()
	if VariableGet( "ボスアクティブ_済" )  == 0 then

		if UnitExistOnMap("PID_E001_超強_異形狼") then
			CursorSetPos_FromPid(g_pid_boss)
			MapCameraWait()
			Talk( "MID_EV4" )
		end
		VariableSet( "ボスアクティブ_済", 1 )
	end
end

function _u30dc_30b9_30a2_30af_30c6_30a3_30d6()
	if AiGetActive( g_pid_boss ) == true then
		_u30dc_30b9_30a8_30f3_30b2()
	end
end

function _u5897_63f4_4e0b()
	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_5de6_4e0b()
	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("E001", "MID_ED1")
	PuppetDemo("E001", "MID_ED2")
	PuppetDemo("E001", "MID_ED3")

end

function GameOver()

	Log("GameOver");

end
