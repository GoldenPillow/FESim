Include("Common")
Include("Common_P0")
Include("G002_Gimmick")

g_pid_boss		= "PID_G002_ヘクトル"
g_key_hectorAttacked = "非アクティブヘクトルを攻撃_済み"
g_key_StrongEnemy = "強力な増援_済み"

function Startup()

	Log("Startup");

	_uS_t_a_r_t_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_ヘクトル" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_G002_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function Cleanup()

	Log("Cleanup");

	_uC_l_e_a_n_u_p___795e_7adc_306e_7ae0___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_ヘクトル" )

end

function Opening()

	Log("Opening");

	PuppetDemo("G002", "MID_OP1")
	FadeInAndWait(FADE_NORMAL)
	Movie("Kengen15")
	SkipEscape()
	FadeOutAndWait(FADE_NORMAL)
	PuppetDemo("G002", "MID_OP2")

end

function MapOpening()

	Log("MapOpening");

end

function MapEnding()

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("G002", "MID_ED1")

	_u795e_7adc_306e_7ae0___7d0b_7ae0_58eb_52a0_5165( "GID_ヘクトル" )

	if GodUnitExists("GID_リン") then
		PuppetDemo("G002", "MID_ED2")
	end

	FadeInAndWait(FADE_FAST)
	Tutorial("TUTID_紋章士ヘクトル")

end

function GameOver()

	Log("GameOver");

end

function _u5909_6570_767b_9332()

	VariableEntry( "戦闘前会話_ヘクトル_リン_済", 0 )

	VariableEntry( g_key_hectorAttacked, 0 )
	VariableEntry( g_key_StrongEnemy, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	_u6bd2_30ac_30b9_30a4_30d9_30f3_30c8_767b_9332( true )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9, 1, 1, FORCE_PLAYER )

	EventEntryArea(_u30a8_30ea_30a2___30d8_30af_30c8_30eb, 1, 8, 8, 21, FORCE_PLAYER, "エリア進入_済" )

	EventEntryTurn(_u5897_63f4_ff11,  5,  5, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff12,  8,  8, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff13, 11, 11, FORCE_PLAYER)
	EventEntryTurn(_u5897_63f4_ff14, 14, 14, FORCE_PLAYER)

	EventEntryTbox(_u5b9d_7bb1_5165_624b,28, 21, "IID_2000G")
	EventEntryTbox(_u5b9d_7bb1_5165_624b,13, 21, "IID_竜の盾")
	EventEntryTbox(_u5b9d_7bb1_5165_624b,17,  2, "IID_聖水")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 2, 13, "IID_特効薬")

	EventEntryBattleBefore(VariableSet, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, false, _uc_o_n_d_i_t_i_o_n___975e_30a2_30af_30c6_30a3_30d6_30d8_30af_30c8_30eb_304c_653b_6483_3055_308c_305f, g_key_hectorAttacked, 1)
	EventEntryTurn(_u5f37_529b_306a_5897_63f4, -1 , -1, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___5f37_529b_306a_5897_63f4)

	EventEntryBattleTalk( _u30ea_30e5_30fc_30eb_3068_6226_95d8,	"PID_リュール",	FORCE_PLAYER, g_pid_boss,			FORCE_ENEMY, true, "戦闘開始前会話_ヘクトル_リュール_済" )

	EventEntryBattleTalk( _u30ea_30f3_3068_6226_95d8,	"",	FORCE_PLAYER, g_pid_boss,			FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___30ea_30f3_3068_6226_95d8 )

end

function _uc_o_n_d_i_t_i_o_n___975e_30a2_30af_30c6_30a3_30d6_30d8_30af_30c8_30eb_304c_653b_6483_3055_308c_305f()

	if VariableGet( g_key_hectorAttacked ) == 1 then
		do return false end
	end

	if AiGetActive( g_pid_boss ) then
		do return false end
	end

	do return true end

end

function _uc_o_n_d_i_t_i_o_n___5f37_529b_306a_5897_63f4()

	if VariableGet( g_key_StrongEnemy ) == 1 then
		do return false end
	end

	if VariableGet( g_key_hectorAttacked ) == 0 then
		do return false end
	end

	local unit = ForceUnitGetFirst( FORCE_PLAYER )
	while unit ~= nil do

		if UnitGetX( unit ) <= 9 then
			do return false end
		end

		unit = ForceUnitGetNext( unit )
	end

	do return true end

end

function _u5f37_529b_306a_5897_63f4()

	Dispos( "ReinforcementD1", DISPOS_FLAG_WARP + DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	Dispos( "ReinforcementD2", DISPOS_FLAG_WARP + DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	VariableSet( g_key_StrongEnemy, 1 )

end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	_u4f1a_8a71_30a4_30d9_30f3_30c8___30d8_30af_30c8_30eb___6226_95d8_958b_59cb_5ba3_8a00()
	_u8b66_544a_30a4_30d9_30f3_30c8___30f4_30a1_30f3_30c9_30ec___6bd2_30ac_30b9_3078_306e_8b66_6212()

end

function _u52dd_5229_6761_4ef6___7d0b_7ae0_58eb_306b_30d5_30a9_30fc_30ab_30b9()
	CursorAnimeCreate_FromPid( g_pid_boss )
	WinRule()
	CursorAnimeDelete()
end

function _u4f1a_8a71_30a4_30d9_30f3_30c8___30d8_30af_30c8_30eb___6226_95d8_958b_59cb_5ba3_8a00()

	CursorSetPos_FromPid( "PID_G002_ヘクトル" )
	Talk( "MID_EV1" )

end

function _u8b66_544a_30a4_30d9_30f3_30c8___30f4_30a1_30f3_30c9_30ec___6bd2_30ac_30b9_3078_306e_8b66_6212()

	CursorSetPos(26, 8)
	MapCameraWait()

	CursorAnimeCreate( 24, 8, "W2H1" )
	CursorAnimeDelete()

	WaitTime( 0.5 )

	local deg = _u6bd2_30ac_30b9_306e_5674_51fa_65b9_5411_3092_53d6_5f97_3059_308b( "左" )
	_u6bd2_30ac_30b9_306e_5674_51fa_30a8_30d5_30a7_30af_30c8_3092_518d_751f_3059_308b( 26, 8, 2, deg )

	WaitTime( 1.5 )

	Talk("MID_EV2")

end

function _u30a8_30ea_30a2___30d8_30af_30c8_30eb()

		CursorSetPos(5, 21)
		MapCameraWait()

		Talk( "MID_EV4" )
		AiSetActive( "PID_G002_ヘクトル", true )
		CursorSetPos_FromPid( "PID_リュール" )

	end

function _u5897_63f4_ff11()

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	_u5897_63f4_A_I_8a2d_5b9a_306e_5909_66f4()

end

function _u5897_63f4_ff12()

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	_u5897_63f4_A_I_8a2d_5b9a_306e_5909_66f4()

end

function _u5897_63f4_ff13()

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	_u5897_63f4_A_I_8a2d_5b9a_306e_5909_66f4()

end

function _u5897_63f4_ff14()

	Dispos( "Reinforcement1_4", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime( 0.5 )

	_u5897_63f4_A_I_8a2d_5b9a_306e_5909_66f4()

end

function _u5897_63f4_A_I_8a2d_5b9a_306e_5909_66f4()

	local unit = ForceUnitGetFirst( FORCE_ENEMY )
	while unit ~= nil do

		local pid = UnitGetPID( unit )

		if	( pid == "PID_G002_幻影兵_ソードナイト_増援" ) or
			( pid == "PID_G002_幻影兵_ランスナイト_増援" ) or
			( pid == "PID_G002_幻影兵_アクスペガサス_増援" ) or
			( pid == "PID_G002_幻影兵_ソードペガサス_増援" ) or
			( pid == "PID_G002_幻影兵_アクスアーマー_増援" ) or
			( pid == "PID_G002_幻影兵_ランスファイター_増援" ) or
			( pid == "PID_G002_幻影兵_ランスペガサス_増援" ) then

			AiSetRejectPower0Attack( unit, false )

		end

		unit = ForceUnitGetNext( unit )

	end

end

function _u30ea_30e5_30fc_30eb_3068_6226_95d8()

	Talk( "MID_BT2" )

 	if _uc_o_n_d_i_t_i_o_n___30ea_30f3_3068_6226_95d8() then
		_u30ea_30f3_3068_6226_95d8()
	end

end

function _uc_o_n_d_i_t_i_o_n___30ea_30f3_3068_6226_95d8()

	if VariableGet( "戦闘前会話_ヘクトル_リン_済" ) == 1 then
		do return false end
	end

	local god = nil
	if MindGetForce() == FORCE_PLAYER then
		god = UnitGetGodUnit( MindGetUnit() )
	else
		god = UnitGetGodUnit( MindGetTargetUnit() )
	end

	if ( god == "GID_リン" ) then
		do return true end
	else
		do return false end
	end

end

function _u30ea_30f3_3068_6226_95d8()

	Talk( "MID_BT1" )

	VariableSet( "戦闘前会話_ヘクトル_リン_済", 1 )

end
