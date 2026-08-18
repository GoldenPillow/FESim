Include("Common")
g_pid_lueur = "PID_リュール"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_セリカ" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S013_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry( "セリカ行動開始", 0 )

	VariableEntry( "召喚１", 0 )
	VariableEntry( "召喚２", 0 )
	VariableEntry( "召喚３", 0 )

	VariableEntry( "幻影竜ワープ１済", 0 )
	VariableEntry( "幻影竜ワープ２済", 0 )
	VariableEntry( "幻影竜ワープ３済", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryBattleTalk(Talk, "PID_S013_セリカ", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_セリカ_リュール_済",		"MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S013_セリカ", FORCE_ENEMY, "PID_アルフレッド",	FORCE_PLAYER, true, "戦闘前会話_セリカ_アルフレッド_済",	"MID_BT2")
	EventEntryBattleTalk(Talk, "PID_S013_セリカ", FORCE_ENEMY, "PID_セリーヌ",		FORCE_PLAYER, true, "戦闘前会話_セリカ_セリーヌ_済",		"MID_BT3")

	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u53ec_559a_5e2b_ff11, 4, -1, FORCE_PLAYER)
		EventEntryTurn(_u53ec_559a_5e2b_ff12, 4, -1, FORCE_PLAYER)
		EventEntryTurn(_u53ec_559a_5e2b_ff13, 4, -1, FORCE_PLAYER)

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then
		EventEntryTurn(_u53ec_559a_5e2b_ff11, 2, -1, FORCE_PLAYER)
		EventEntryTurn(_u53ec_559a_5e2b_ff12, 2, -1, FORCE_PLAYER)
		EventEntryTurn(_u53ec_559a_5e2b_ff13, 2, -1, FORCE_PLAYER)

	else
		EventEntryTurn(_u53ec_559a_5e2b_ff11, 3, -1, FORCE_PLAYER)
		EventEntryTurn(_u53ec_559a_5e2b_ff12, 3, -1, FORCE_PLAYER)
		EventEntryTurn(_u53ec_559a_5e2b_ff13, 3, -1, FORCE_PLAYER)
	end

	EventEntryTurn(_u30bb_30ea_30ab_59cb_52d5, -1, -1, FORCE_PLAYER)

	EventEntryFixed( _u5e7b_5f71_7adc_30ef_30fc_30d7_ff11,	"PID_S013_幻影兵_ワープ１", FORCE_ENEMY, "幻影竜ワープ１済" )
	EventEntryFixed( _u5e7b_5f71_7adc_30ef_30fc_30d7_ff12,	"PID_S013_幻影兵_ワープ２", FORCE_ENEMY, "幻影竜ワープ２済" )
	EventEntryFixed( _u5e7b_5f71_7adc_30ef_30fc_30d7_ff13,	"PID_S013_幻影兵_ワープ３", FORCE_ENEMY, "幻影竜ワープ３済" )

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_セリカ" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S013", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()
	CursorAnimeCreate_FromPid( "PID_S013_セリカ")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

	Dispos( "Reinforcement1", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement2", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 0.5 )

	Dispos( "Reinforcement3", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
	Yield()
	WaitTime( 0.5 )

	CursorAnimeCreate_FromPid("PID_S013_幻影兵_召喚師３")
	Talk( "MID_EV2" )
	CursorAnimeDelete()

end

function _u53ec_559a_5e2b_ff11()
	local turn = MapGetTurn() + 1

	if UnitExistOnMap("PID_S013_幻影兵_召喚師１") then
		if turn  % 2 == 1 then
			if VariableGet( "召喚１" )  == 1 then
				VariableSet( "召喚１", 0 )
				Dispos("Reinforcement1_2C", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
				Yield()
				WaitTime(0.5)
			else
				VariableSet( "召喚１", 1 )
				Dispos("Reinforcement1C", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
				Yield()
				WaitTime(0.5)
			end
		end
	end
end

function _u53ec_559a_5e2b_ff12()
	local turn = MapGetTurn() + 1

	if UnitExistOnMap("PID_S013_幻影兵_召喚師２") then
		if turn  % 2 == 0 then
			if VariableGet( "召喚２" )  == 1 then
				VariableSet( "召喚２", 0 )
				Dispos("Reinforcement2C", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
				Yield()
				WaitTime(0.5)
			else
				VariableSet( "召喚２", 1 )
				Dispos("Reinforcement2_2C", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
				Yield()
				WaitTime(0.5)
			end
		end
	end
end

function _u53ec_559a_5e2b_ff13()
	local turn = MapGetTurn() + 1

	if UnitExistOnMap("PID_S013_幻影兵_召喚師３") then
		if turn  % 2 == 1 then
			if VariableGet( "召喚３" )  == 1 then
				VariableSet( "召喚３", 0 )
				Dispos("Reinforcement3_2C", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
				Yield()
				WaitTime(0.5)
			else
				VariableSet( "召喚３", 1 )
				Dispos("Reinforcement3C", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP)
				Yield()
				WaitTime(0.5)
			end
		end
	end
end

function _u30bb_30ea_30ab_59cb_52d5()
	local count = 0
	if VariableGet( "セリカ行動開始" )  == 0 then
		if not UnitExistOnMap("PID_S013_幻影兵_召喚師１") then
			count = count + 1
		end
		if not UnitExistOnMap("PID_S013_幻影兵_召喚師２") then
			count = count + 1
		end
		if not UnitExistOnMap("PID_S013_幻影兵_召喚師３") then
			count = count + 1
		end

		if count > 1 then
			Dispos( "Reinforcement4", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime( 0.5 )

			if DifficultyGet() ~= DIFFICULTY_NORMAL then
				AiSetSequence("PID_S013_セリカ", AI_ORDER_CAUSE, "AI_AC_Everytime")
			end

			AiSetSequence("S013_幻影竜１", AI_ORDER_CAUSE, "AI_AC_Everytime")
			AiSetSequence("S013_幻影竜２", AI_ORDER_CAUSE, "AI_AC_Everytime")
			AiSetSequence("S013_幻影竜３", AI_ORDER_CAUSE, "AI_AC_Everytime")

			VariableSet( "セリカ行動開始", 1 )
		end
	end
end

function _u7adc_30ef_30fc_30d7_5834_6240_30c1_30a7_30c3_30af(x,y)
	if ( UnitGetByPos(x, y) == nil ) and ( UnitGetByPos(x+1, y) == nil ) and ( UnitGetByPos(x, y+1) == nil ) and ( UnitGetByPos(x+1, y+1) == nil ) then
		do return true end
	end
	do return false end
end

function _u5e7b_5f71_7adc_30ef_30fc_30d7_ff11()
	posMax = 9

	dpos = {0, 7,9 , 7,8 ,6,8 ,8,8 ,  5,7 ,6,7 ,7,7 ,8,7, 9,7 }

	if UnitGetByPos(7, 4) ~= nil then
		for i = 1, posMax do
			x = dpos[i*2]
			y = dpos[i*2+1]
			chk = _u7adc_30ef_30fc_30d7_5834_6240_30c1_30a7_30c3_30af(x,y)
			if chk == true then
				Log( tostring( x ) )
				Log( tostring( y ) )
				UnitWarpOut("PID_S013_幻影竜１")

				Yield()
				WaitTime(1.0)
				UnitSetPos("PID_S013_幻影竜１", x, y)
				CursorSetPos_FromPid("PID_S013_幻影竜１")
				MapCameraWait()
				UnitWarpIn("PID_S013_幻影竜１")

				Yield()
				WaitTime(1.0)
				break
			end
		end
	end

	VariableSet( "幻影竜ワープ１済", 1 )
end

function _u5e7b_5f71_7adc_30ef_30fc_30d7_ff12()
	posMax = 9

	dpos = {0, 13,8 , 13,7 ,12,7 ,14,7 ,  11,6 ,12,6 ,13,6 ,14,6, 15,6 }

	if UnitGetByPos(13, 3) ~= nil then
		for i = 1, posMax do
			x = dpos[i*2]
			y = dpos[i*2+1]
			chk = _u7adc_30ef_30fc_30d7_5834_6240_30c1_30a7_30c3_30af(x,y)
			if chk == true then
				Log( tostring( x ) )
				Log( tostring( y ) )
				UnitWarpOut("PID_S013_幻影竜２")

				Yield()
				WaitTime(1.0)
				UnitSetPos("PID_S013_幻影竜２", x, y)
				CursorSetPos_FromPid("PID_S013_幻影竜２")
				MapCameraWait()
				UnitWarpIn("PID_S013_幻影竜２")

				Yield()
				WaitTime(1.0)
				break
			end
		end
	end

	VariableSet( "幻影竜ワープ２済", 1 )
end

function _u5e7b_5f71_7adc_30ef_30fc_30d7_ff13()
	posMax = 9

	dpos = {0, 18,8 , 17,7 ,18,7 ,19,7 ,  16,6 ,17,6 ,18,6 ,19,6, 20,6 }

	if UnitGetByPos(18, 3) ~= nil then
		for i = 1, posMax do
			x = dpos[i*2]
			y = dpos[i*2+1]
			chk = _u7adc_30ef_30fc_30d7_5834_6240_30c1_30a7_30c3_30af(x,y)
			if chk == true then
				Log( tostring( x ) )
				Log( tostring( y ) )
				UnitWarpOut("PID_S013_幻影竜３")

				Yield()
				WaitTime(1.0)
				UnitSetPos("PID_S013_幻影竜３", x, y)
				CursorSetPos_FromPid("PID_S013_幻影竜３")
				MapCameraWait()
				UnitWarpIn("PID_S013_幻影竜３")

				Yield()
				WaitTime(1.0)
				break
			end
		end
	end

	VariableSet( "幻影竜ワープ３済", 1 )
end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S013", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "セリカ", "S013" )

end

function GameOver()

	Log("GameOver")

end
