Include("Common")
g_pid_lueur = "PID_リュール"
g_pid_eirik = "PID_S008_エイリーク"

g_key_area1					= "エリア１侵入"
g_key_area2					= "エリア２侵入"
g_key_reinforcement1		= "増援１終了"
g_key_reinforcement2		= "増援２終了"
g_key_reinforcement3		= "増援３カウンター"
g_key_reinforcement3Even	= "増援３_偶数ターン"
g_reinfocement3_max_normal	= 2
g_reinfocement3_max			= 5
g_key_reinforcement_first = "増援初回"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_エイリーク" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S008_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_エイリーク" )

end

function _u5909_6570_767b_9332()

	VariableEntry( g_key_area1, 0 )
	VariableEntry( g_key_area2, 0 )

	VariableEntry( g_key_reinforcement1, 0 )
	VariableEntry( g_key_reinforcement2, 0 )
	VariableEntry( g_key_reinforcement3, 0 )
	VariableEntry( g_key_reinforcement3Even, 0 )

	VariableEntry( g_key_reinforcement_first, 0 )

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn(_u958b_6226, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryArea(EmptyFunction,  1, 9,  6, 14, FORCE_PLAYER, g_key_area1)
	EventEntryArea(EmptyFunction, 16, 9, 21, 14, FORCE_PLAYER, g_key_area2)

	EventEntryTurn(_u5897_63f4, -1, -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5897_63f4)

	EventEntryBattleTalk(Talk, g_pid_eirik, FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_エイリーク_リュール_済",		"MID_BT1")
	EventEntryBattleTalk(Talk, g_pid_eirik, FORCE_ENEMY, "PID_ロサード",		FORCE_PLAYER, true, "戦闘前会話_エイリーク_ロサード_済",		"MID_BT2")
	EventEntryBattleTalk(Talk, g_pid_eirik, FORCE_ENEMY, "PID_ゴルドマリー",	FORCE_PLAYER, true, "戦闘前会話_エイリーク_ゴルドマリー_済",	"MID_BT3")

	EventEntryTbox(_u5b9d_7bb1_5165_624b,  2, 7, "IID_チェンジプルフ")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 21, 7, "IID_天使の衣")

end

function Opening()

	Log("Opening")

	FadeInAndWait( FADE_NORMAL )
		PuppetDemo( "S008", "MID_OP1" )
	FadeOutAndWait( FADE_NORMAL )

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_6226()

	CursorSetPos_FromPid( g_pid_eirik )
	Talk( "MID_EV1" )

end

function EmptyFunction()
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4()

	local re1 = VariableGet( g_key_reinforcement1 )
	local re2 = VariableGet( g_key_reinforcement2 )
	local re3 = VariableGet( g_key_reinforcement3 )

	if		(re1 == 1)
		and	(re2 == 1)
		and (
				( DifficultyGet() == DIFFICULTY_NORMAL and re3 == g_reinfocement3_max_normal )
			or	( DifficultyGet() > DIFFICULTY_NORMAL and re3 == g_reinfocement3_max )
			) then
			do return false end
	end

	if re1 == 0 and VariableGet( g_key_area1 ) == 1 then
		do return true end
	end

	if re2 == 0 and VariableGet( g_key_area2 ) == 1 then
		do return true end
	end

	if AiGetActive( g_pid_eirik ) then

		if		( ( DifficultyGet() == DIFFICULTY_NORMAL ) and ( re3 < g_reinfocement3_max_normal ) )
			or	( ( DifficultyGet() > DIFFICULTY_NORMAL ) and ( re3 < g_reinfocement3_max ) )			then
				do return true end
		end

	end

	do return false end

end

function _u5897_63f4()

	if VariableGet( g_key_reinforcement_first ) == 0 then

		CursorSetPos_FromPid( g_pid_eirik )
		Talk( "MID_EV2" )

		VariableSet( g_key_reinforcement_first, 1 )
	end

	if	VariableGet( g_key_reinforcement1 ) == 0	and
		VariableGet( g_key_area1 ) == 1				then

		Dispos( "Reinforcement1", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )

		VariableSet( g_key_reinforcement1, 1 )
	end

	if  VariableGet( g_key_reinforcement2 ) == 0	and
		VariableGet( g_key_area2 ) == 1				then

		Dispos( "Reinforcement2", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime( 0.5 )

		VariableSet( g_key_reinforcement2, 1 )
	end

	local re3 = VariableGet( g_key_reinforcement3 )
	if AiGetActive( g_pid_eirik ) then

		if		( ( DifficultyGet() == DIFFICULTY_NORMAL ) and ( re3 < g_reinfocement3_max_normal ) )
			or	( ( DifficultyGet() > DIFFICULTY_NORMAL ) and ( re3 < g_reinfocement3_max ) )			then

			if re3 == 0 then
				if ( ( MapGetTurn() % 2 ) == 0 ) then
					VariableSet( g_key_reinforcement3Even, 1 )
				end
			end

			if ( VariableGet( g_key_reinforcement3Even ) == 1 ) == ( ( MapGetTurn() % 2 ) == 0 ) then

				Dispos( "Reinforcement3", DISPOS_FLAG_FOCUS )
				Yield()
				WaitTime( 0.5 )

				re3 = re3 + 1
				VariableSet( g_key_reinforcement3, re3 )

			end

		end

	end

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	FadeInAndWait( FADE_NORMAL )
	PuppetDemo("S008", "MID_ED1")
	FadeOutAndWait( FADE_NORMAL )

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "エイリーク", "S008" )

end

function GameOver()

	Log("GameOver")

end
