Include("Common")

g_pid_lueur = "PID_リュール"
g_key_tutorial_talk_synchro	= "チュートリアル_会話シンクロ_済"
g_key_emblem1				= "紋章士顕現_ベレト_ルキナ_リン_済"
g_key_emblem2				= "紋章士顕現_ミカヤ_セリカ_済"
g_key_emblem3				= "紋章士顕現_アイク_シグルド_エイリーク_済"
g_key_emblem4				= "紋章士顕現_ロイ_リーフ_カムイ_済"
g_key_emblem_count			= "紋章士カウント"
g_key_ring_complete			= "指輪全部集めた_済"

g_key_reinforcement1		= "増援１_済"
g_key_reinforcement2		= "増援２_済"
g_key_reinforcement3		= "増援３_済"

g_key_pickup_pre			= "指輪拾う会話_"

map_width = 23
map_height = 29

_uE_M_B_L_E_M___30b7_30b0_30eb_30c9		= 1
_uE_M_B_L_E_M___30bb_30ea_30ab		= 2
_uE_M_B_L_E_M___30df_30ab_30e4		= 3
_uE_M_B_L_E_M___30ed_30a4			= 4
_uE_M_B_L_E_M___30ea_30fc_30d5		= 5
_uE_M_B_L_E_M___30eb_30ad_30ca		= 6
_uE_M_B_L_E_M___30ea_30f3			= 7
_uE_M_B_L_E_M___30a2_30a4_30af		= 8
_uE_M_B_L_E_M___30d9_30ec_30c8		= 9
_uE_M_B_L_E_M___30ab_30e0_30a4		= 10
_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af	= 11

g_emblem_list = {
	"シグルド",
	"セリカ",
	"ミカヤ",
	"ロイ",
	"リーフ",
	"ルキナ",
	"リン",
	"アイク",
	"ベレト",
	"カムイ",
	"エイリーク"
	}

g_emblem_position = {
	{X=4,	Z=9},
	{X=9,	Z=15},
	{X=7,	Z=14},
	{X=15,	Z=7},
	{X=17,	Z=7},
	{X=19,	Z=17},
	{X=18,	Z=19},
	{X=5,	Z=7},
	{X=17,	Z=18},
	{X=16,	Z=8},
	{X=3,	Z=8}
	}

function Startup()

	Log("Startup")

	_u30d5_30e9_30b0_767b_9332()

	_u30a4_30d9_30f3_30c8_767b_9332()

	if ( VariableGet( g_key_ring_complete ) == 0 ) then
		WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
		WinRuleSetMID( "MID_RULE_M022_WIN" )
	end

	VariableSet( "他軍フェイズスキップ", 1 )

end

function _u30d5_30e9_30b0_767b_9332()

	VariableEntry( g_key_tutorial_talk_synchro, 0 )
	VariableEntry( g_key_emblem_count, 0 )
	VariableEntry( g_key_ring_complete, 0 )

	VariableEntry( g_key_reinforcement1, 0 )
	VariableEntry( g_key_reinforcement2, 0 )
	VariableEntry( g_key_reinforcement3, 0 )

	VariableEntry( g_key_emblem1,	0 )
	VariableEntry( g_key_emblem2,	0 )
	VariableEntry( g_key_emblem3,	0 )
	VariableEntry( g_key_emblem4,	0 )

	if ( #g_emblem_list > 0 ) then
		for index = 1, #g_emblem_list do
			key = "紋章士顕現_" .. g_emblem_list[index] .. "_済"
			VariableEntry( key, 0 )
		end
	end

end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurnAfter(_u9752_ff11_30bf_30fc_30f3_958b_59cb_76f4_5f8c,	1, 1, FORCE_PLAYER)
	EventEntryTurn(		_u52dd_5229_6761_4ef6,			1, 1, FORCE_PLAYER )

	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff11___30ce_30fc_30de_30eb,	 5,  5, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___5897_63f4_ff11___30ce_30fc_30de_30eb)
	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff11,				 5,  5, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___5897_63f4_ff11)
	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff12,				 8,  8, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___5897_63f4_ff12___30ce_30fc_30de_30eb)
	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff12,				 8,  8, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___5897_63f4_ff12)
	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff13,				11, 11, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___5897_63f4_ff13___30ce_30fc_30de_30eb)
	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff13,				11, 11, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___5897_63f4_ff13)

	EventEntryTurn(_u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___7121_9650_5897_63f4,			13, -1, FORCE_PLAYER,	_uc_o_n_d_i_t_i_o_n___7121_9650_5897_63f4)

	EventEntryFixed( _u7d0b_7ae0_58eb_9855_73fe___30d9_30ec_30c8___30eb_30ad_30ca___30ea_30f3,			g_pid_lueur, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30d9_30ec_30c8___30eb_30ad_30ca___30ea_30f3 )
	EventEntryFixed( _u7d0b_7ae0_58eb_9855_73fe___30df_30ab_30e4___30bb_30ea_30ab,				g_pid_lueur, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30df_30ab_30e4___30bb_30ea_30ab )
	EventEntryFixed( _u7d0b_7ae0_58eb_9855_73fe___30a2_30a4_30af___30b7_30b0_30eb_30c9___30a8_30a4_30ea_30fc_30af,	g_pid_lueur, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30a2_30a4_30af___30b7_30b0_30eb_30c9___30a8_30a4_30ea_30fc_30af )
	EventEntryFixed( _u7d0b_7ae0_58eb_9855_73fe___30ed_30a4___30ea_30fc_30d5___30ab_30e0_30a4,			g_pid_lueur, FORCE_PLAYER, _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30ed_30a4___30ea_30fc_30d5___30ab_30e0_30a4 )

	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_シグルド",	FORCE_ALLY, true, "シグルド会話_済"	)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_セリカ",		FORCE_ALLY, true, "セリカ会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_ミカヤ",		FORCE_ALLY, true, "ミカヤ会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_ロイ",		FORCE_ALLY, true, "ロイ会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_リーフ",		FORCE_ALLY, true, "リーフ会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_ルキナ",		FORCE_ALLY, true, "ルキナ会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_リン",		FORCE_ALLY, true, "リン会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_アイク",		FORCE_ALLY, true, "アイク会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_ベレト",		FORCE_ALLY, true, "ベレト会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_カムイ",		FORCE_ALLY, true, "カムイ会話_済"		)
	EventEntryTalk(_u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71,	"", FORCE_PLAYER, "PID_M022_紋章士_エイリーク",	FORCE_ALLY, true, "エイリーク会話_済"	)

end

function Cleanup()

	Log("Cleanup")

	_u7d0b_7ae0_58eb_95c7_5316( false )

end

function Opening()

	Log("Opening")

	FadeInAndWait(FADE_NORMAL)
		Movie("S19")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

	PuppetDemo("M022", "MID_OP1")

	PuppetDemo("M022", "MID_OP2")

	_u30b9_30ad_30eb_88c5_5099( g_pid_lueur, "SID_異形兵" )
	GodUnitSetDarkness("GID_マルス", true)

	VariableSet( "G_置換_MPID_H_Lueur", 1 )

	Movie("Scene24")
	SkipEscape()

	PuppetDemo("M022", "MID_OP4")

end

function MapOpening()

	Log("MapOpening")

	FadeOutAndWait(FADE_FAST)

	UnitSetGodUnit( g_pid_lueur, "GID_マルス" )

	if ( #g_emblem_list > 0 ) then
		for index = 1, #g_emblem_list do
			EffectCreate( "指輪集め_" .. g_emblem_list[index], g_emblem_position[index].X, g_emblem_position[index].Z )
		end
	end

	FadeInAndWait(FADE_FAST)

end

function _u9752_ff11_30bf_30fc_30f3_958b_59cb_76f4_5f8c()

	local x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 3, _uE_M_B_L_E_M___30d9_30ec_30c8, _uE_M_B_L_E_M___30eb_30ad_30ca, _uE_M_B_L_E_M___30ea_30f3 )
	CursorSetPos(x,z)
	MapCameraWait()
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].X, g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].Z)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].X, g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].Z)
	MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].Z)
	WaitTime( 2.0 )
	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")
	MapObjectDelete("Eff_Cursor03")

	x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 2, _uE_M_B_L_E_M___30df_30ab_30e4, _uE_M_B_L_E_M___30bb_30ea_30ab )
	CursorSetPos(x,z)
	MapCameraWait()
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].X, g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].Z)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].X, g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].Z)
	WaitTime( 2.0 )
	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")

	x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 3, _uE_M_B_L_E_M___30a2_30a4_30af, _uE_M_B_L_E_M___30b7_30b0_30eb_30c9, _uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af )
	CursorSetPos(x,z)
	MapCameraWait()
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].Z)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].X, g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].Z)
	MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].Z)
	WaitTime( 2.0 )
	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")
	MapObjectDelete("Eff_Cursor03")

	x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 3, _uE_M_B_L_E_M___30ed_30a4, _uE_M_B_L_E_M___30ea_30fc_30d5, _uE_M_B_L_E_M___30ab_30e0_30a4 )
	CursorSetPos(x,z)
	MapCameraWait()
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].Z)
	MapObjectCreate("Eff_Cursor02", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].Z)
	MapObjectCreate("Eff_Cursor03", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_W1H1", g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].Z)
	WaitTime( 2.0 )
	MapObjectDelete("Eff_Cursor01")
	MapObjectDelete("Eff_Cursor02")
	MapObjectDelete("Eff_Cursor03")

	CursorSetPos_FromPid( "PID_ヴェイル" )
	Talk("MID_EV1")

	Tutorial( "TUTID_指輪収集" )

	pid = "PID_ヴェイル"
	if UnitExistOnMap( pid ) and ( UnitGetForce(pid) == FORCE_ALLY ) then
		UnitJoin( pid )
	end

	_u6307_8f2a_62fe_3046_30d5_30e9_30b0_767b_9332()

end

function _u6307_8f2a_62fe_3046_30d5_30e9_30b0_767b_9332()

	local index = ForceUnitGetFirst(FORCE_PLAYER)
	while index ~= nil do
		local key = _u6307_8f2a_62fe_3046_30d5_30e9_30b0_751f_6210( index )
		VariableEntry( key, 0 )

		index = ForceUnitGetNext(index)
	end

end

function _u6307_8f2a_62fe_3046_30d5_30e9_30b0_751f_6210( unit )
	local key = g_key_pickup_pre .. UnitGetMPID( unit )
	return key
end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11___30ce_30fc_30de_30eb()

	if VariableGet( g_key_reinforcement1 ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()
	end

	return false

end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff11___30ce_30fc_30de_30eb()

	Dispos( "Reinforcement1_Normal", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	VariableSet( g_key_reinforcement1, 1 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()

	return ( VariableGet( g_key_ring_complete ) == 0 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff11()

	if VariableGet( g_key_reinforcement1 ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()
	end

	return false
end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff11()

	Dispos( "Reinforcement1_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement1_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement1_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	VariableSet( g_key_reinforcement1, 1 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12___30ce_30fc_30de_30eb()

	if VariableGet( g_key_reinforcement2 ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff12()

	if VariableGet( g_key_reinforcement2 ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()
	end

	return false
end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff12()

	Dispos( "Reinforcement2_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement2_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement2_3", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement2_4", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	VariableSet( g_key_reinforcement2, 1 )

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff13___30ce_30fc_30de_30eb()

	if VariableGet( g_key_reinforcement3 ) ~= 0 then
		return false
	end

	if DifficultyGet() == DIFFICULTY_NORMAL then
		return _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()
	end

	return false

end

function _uc_o_n_d_i_t_i_o_n___5897_63f4_ff13()

	if VariableGet( g_key_reinforcement3 ) ~= 0 then
		return false
	end

	if DifficultyGet() > DIFFICULTY_NORMAL then
		return _uc_o_n_d_i_t_i_o_n___5897_63f4_767b_5834()
	end

	return false
end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___5897_63f4_ff13()

	Dispos( "Reinforcement3_1", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	Dispos( "Reinforcement3_2", DISPOS_FLAG_FOCUS )
	Yield()
	WaitTime(0.5)

	if DifficultyGet() > DIFFICULTY_NORMAL then

		Dispos( "Reinforcement3_3", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)

		Dispos( "Reinforcement3_4", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)

	end

	VariableSet( g_key_reinforcement3, 1 )

end

function _uc_o_n_d_i_t_i_o_n___7121_9650_5897_63f4()

	if VariableGet( g_key_ring_complete ) == 1 then
		return false
	end

	local turn = MapGetTurn()
	if ( ( ( turn - 13 ) % 3 ) == 0 ) then
		return true
	end

	return false

end

function _u9752_30bf_30fc_30f3_958b_59cb_76f4_524d___7121_9650_5897_63f4()

	Dispos("Reinforcement_Endless", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime( 0.5 )

end

function _u30c1_30e5_30fc_30c8_30ea_30a2_30eb___4f1a_8a71_30b7_30f3_30af_30ed()
	if VariableGet( g_key_tutorial_talk_synchro ) == 0 then

		Tutorial( "TUTID_再シンクロ" )

		VariableSet( g_key_tutorial_talk_synchro, 1 )

	end
end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30d9_30ec_30c8___30eb_30ad_30ca___30ea_30f3()

	if ( VariableGet( g_key_emblem1 ) == 1 ) then
		return false
	end

	local lueur_x = UnitGetX( g_pid_lueur )
	local lueur_z = UnitGetZ( g_pid_lueur )

	local distance1	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].X, g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].Z )
	local distance2	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].X, g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].Z )
	local distance3	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].Z )

	if ( distance1 <= 3 ) or ( distance2 <= 3 ) or ( distance3 <= 3 ) then
		return true
	end

	return false

end

function _u7d0b_7ae0_58eb_9855_73fe___30d9_30ec_30c8___30eb_30ad_30ca___30ea_30f3()

	local x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 3, _uE_M_B_L_E_M___30d9_30ec_30c8, _uE_M_B_L_E_M___30eb_30ad_30ca, _uE_M_B_L_E_M___30ea_30f3 )
	CursorSetPos(x,z)
	MapCameraWait()

	Talk( "MID_EV2" )

	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30d9_30ec_30c8], g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].X, g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30eb_30ad_30ca], g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].X, g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30ea_30f3], g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].Z )

	TerrainSetBegin()
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].X, g_emblem_position[_uE_M_B_L_E_M___30d9_30ec_30c8].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].X, g_emblem_position[_uE_M_B_L_E_M___30eb_30ad_30ca].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30f3].Z, "TID_床")
	TerrainSetEnd()

	Dispos( "Emblem1", DISPOS_FLAG_NONE )
	Yield()
	WaitTime( 0.5 )

	_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___4f1a_8a71_30b7_30f3_30af_30ed()

	VariableSet( g_key_emblem1, 1 )

end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30df_30ab_30e4___30bb_30ea_30ab()

	if ( VariableGet( g_key_emblem2 ) == 1 ) then
		return false
	end

	local lueur_x = UnitGetX( g_pid_lueur )
	local lueur_z = UnitGetZ( g_pid_lueur )

	local distance1	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].X, g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].Z )
	local distance2	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].X, g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].Z )

	if ( distance1 <= 3 ) or ( distance2 <= 3 ) then
		return true
	end

	return false

end

function _u7d0b_7ae0_58eb_9855_73fe___30df_30ab_30e4___30bb_30ea_30ab()

	local x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 2, _uE_M_B_L_E_M___30df_30ab_30e4, _uE_M_B_L_E_M___30bb_30ea_30ab )
	CursorSetPos(x, z)
	MapCameraWait()

	Talk( "MID_EV3" )

	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30df_30ab_30e4], g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].X, g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30bb_30ea_30ab], g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].X, g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].Z )

	TerrainSetBegin()
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].X, g_emblem_position[_uE_M_B_L_E_M___30df_30ab_30e4].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].X, g_emblem_position[_uE_M_B_L_E_M___30bb_30ea_30ab].Z, "TID_床")
	TerrainSetEnd()

	Dispos( "Emblem2", DISPOS_FLAG_NONE )
	Yield()
	WaitTime( 0.5 )

	_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___4f1a_8a71_30b7_30f3_30af_30ed()

	VariableSet( g_key_emblem2, 1 )

end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30a2_30a4_30af___30b7_30b0_30eb_30c9___30a8_30a4_30ea_30fc_30af()

	if ( VariableGet( g_key_emblem3 ) == 1 ) then
		return false
	end

	local lueur_x = UnitGetX( g_pid_lueur )
	local lueur_z = UnitGetZ( g_pid_lueur )

	local distance1	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].Z )
	local distance2	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].X, g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].Z )
	local distance3	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].Z )

	if ( distance1 <= 3 ) or ( distance2 <= 3 ) or ( distance3 <= 3 ) then
		return true
	end

	return false

end

function _u7d0b_7ae0_58eb_9855_73fe___30a2_30a4_30af___30b7_30b0_30eb_30c9___30a8_30a4_30ea_30fc_30af()

	local x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 3, _uE_M_B_L_E_M___30a2_30a4_30af, _uE_M_B_L_E_M___30b7_30b0_30eb_30c9, _uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af )
	CursorSetPos(x, z)
	MapCameraWait()

	Talk( "MID_EV4" )

	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30a2_30a4_30af], g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9], g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].X, g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af], g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].Z )

	TerrainSetBegin()
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a2_30a4_30af].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].X, g_emblem_position[_uE_M_B_L_E_M___30b7_30b0_30eb_30c9].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].X, g_emblem_position[_uE_M_B_L_E_M___30a8_30a4_30ea_30fc_30af].Z, "TID_床")
	TerrainSetEnd()

	Dispos( "Emblem3", DISPOS_FLAG_NONE )
	Yield()
	WaitTime( 0.5 )

	_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___4f1a_8a71_30b7_30f3_30af_30ed()

	VariableSet( g_key_emblem3, 1 )

end

function _uc_o_n_d_i_t_i_o_n___7d0b_7ae0_58eb_9855_73fe___30ed_30a4___30ea_30fc_30d5___30ab_30e0_30a4()

	if ( VariableGet( g_key_emblem4 ) == 1 ) then
		return false
	end

	local lueur_x = UnitGetX( g_pid_lueur )
	local lueur_z = UnitGetZ( g_pid_lueur )

	local distance1	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].Z )
	local distance2	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].Z )
	local distance3	= _u4e8c_70b9_9593_8ddd_96e2( lueur_x, lueur_z, g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].Z )

	if ( distance1 <= 3 ) or ( distance2 <= 3 ) or ( distance3 <= 3 ) then
		return true
	end

	return false

end

function _u7d0b_7ae0_58eb_9855_73fe___30ed_30a4___30ea_30fc_30d5___30ab_30e0_30a4()

	local x, z = _u4e2d_9593_70b9_3092_8fd4_3059( 3, _uE_M_B_L_E_M___30ed_30a4, _uE_M_B_L_E_M___30ea_30fc_30d5, _uE_M_B_L_E_M___30ab_30e0_30a4 )
	CursorSetPos(x, z)
	MapCameraWait()

	Talk( "MID_EV5" )

	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30ed_30a4], g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30ea_30fc_30d5], g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].Z )
	EffectDelete( "指輪集め_" .. g_emblem_list[_uE_M_B_L_E_M___30ab_30e0_30a4], g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].Z )

	TerrainSetBegin()
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ed_30a4].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].X, g_emblem_position[_uE_M_B_L_E_M___30ea_30fc_30d5].Z, "TID_床")
	TerrainSet(g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].X, g_emblem_position[_uE_M_B_L_E_M___30ab_30e0_30a4].Z, "TID_床")
	TerrainSetEnd()

	Dispos( "Emblem4", DISPOS_FLAG_NONE )
	Yield()
	WaitTime( 0.5 )

	_u30c1_30e5_30fc_30c8_30ea_30a2_30eb___4f1a_8a71_30b7_30f3_30af_30ed()

	VariableSet( g_key_emblem4, 1 )

end

function _u30e6_30cb_30c3_30c8_3068_7d0b_7ae0_58eb_306e_4f1a_8a71()

	local mind_pid		= UnitGetPID( MindGetUnit() )
	local target_pid	= UnitGetPID( MindGetTargetUnit() )
	local gid			= UnitGetGodUnit( mind_pid )
	local target_gid	= _u7d0b_7ae0_58eb_I_D_53d6_5f97( target_pid )
	local target_mgid	= GodDataGetMGID( target_gid )

	if gid == nil then

		TalkBeginContinue()
			MessSetArgument( 0, target_mgid )
			_u30e6_30cb_30c3_30c8_4f1a_8a71___30bd_30ed_6642( mind_pid )
			_u7d0b_7ae0_58eb_4f1a_8a71( target_pid )
		TalkEndContinue()

	else

		local key = _u6307_8f2a_62fe_3046_30d5_30e9_30b0_751f_6210( mind_pid )
		if ( VariableGet( key ) == 0 ) then

			MessSetArgument( 0, target_mgid )
			_u30e6_30cb_30c3_30c8_4f1a_8a71___30b7_30f3_30af_30ed_4e2d( mind_pid )
			VariableSet( key, 1 )

		end

		Dialog( "MID_TUT_NAVI_M022_GET_" .. SubPrefix( target_mgid ) )

	end

	if UnitExistOnMap( target_pid ) then
		UnitDelete( target_pid )
	end

	GodUnitSetEscape(target_gid, false)

	GodUnitSetDarkness( target_gid, true )

	if gid == nil then

		UnitSetGodUnit( mind_pid, target_gid )

	end

	local count = VariableGet( g_key_emblem_count )
	count = count + 1
	VariableSet( g_key_emblem_count, count )

	if _uc_o_n_d_i_t_i_o_n___6307_8f2a_5168_90e8_96c6_3081_305f() then
		_u6307_8f2a_5168_90e8_96c6_3081_305f()
	end

end

function _uc_o_n_d_i_t_i_o_n___6307_8f2a_5168_90e8_96c6_3081_305f()

	if VariableGet( g_key_ring_complete ) == 1 then
		return false
	end

	if VariableGet( g_key_emblem_count ) >= 11 then
		return true
	end

	return false

end

function _u6307_8f2a_5168_90e8_96c6_3081_305f()

	CursorSetPos_FromPid( g_pid_lueur )
	Talk( "MID_EV6" )

	local index = ForceUnitGetFirst(FORCE_ENEMY)
	if index == nil then
		VariableSet( "勝利", 1 )
		UnitSetStatus( MindGetUnit(), UNIT_STATUS_FIXED )

	else

		WinRuleSetEnemyNumberLessThanOrEqualTo(0)
		WinRuleSetMID( "MID_RULE_ANNIHILATE" )
		WinRule()

	end

	VariableSet( g_key_ring_complete, 1 )

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("M022", "MID_ED1")

	FadeInAndWait(FADE_SLOW)
		Movie("S20")
		SkipEscape()
	FadeOutAndWait(FADE_NORMAL)

	_u30b9_30ad_30eb_89e3_9664( g_pid_lueur, "SID_異形兵" )
	GodUnitCreate("GID_リュール")

	VariableSet( "G_置換_MPID_H_Lueur", 2 )

	PuppetDemo("M022", "MID_ED2")
	PuppetDemo("M022", "MID_ED3")

end

function GameOver()

	Log("GameOver")

end

function _u7d0b_7ae0_58eb_95c7_5316( enable )

	GodUnitSetDarkness("GID_マルス",		enable)
	GodUnitSetDarkness("GID_シグルド",		enable)
	GodUnitSetDarkness("GID_セリカ",		enable)
	GodUnitSetDarkness("GID_ミカヤ",		enable)
	GodUnitSetDarkness("GID_ロイ",			enable)
	GodUnitSetDarkness("GID_リーフ",		enable)
	GodUnitSetDarkness("GID_ルキナ",		enable)
	GodUnitSetDarkness("GID_リン",			enable)
	GodUnitSetDarkness("GID_アイク",		enable)
	GodUnitSetDarkness("GID_ベレト",		enable)
	GodUnitSetDarkness("GID_カムイ",		enable)
	GodUnitSetDarkness("GID_エイリーク",	enable)

end

function _u4e2d_9593_70b9_3092_8fd4_3059( emblem_num, ... )

	local emblem_list = {...}
	local x = 0
	local z = 0

	for index in pairs(emblem_list) do

		local emblem = emblem_list[index]
		x = x + g_emblem_position[emblem].X
		z = z + g_emblem_position[emblem].Z

	end

	return math.floor( x / emblem_num ), math.floor( z / emblem_num )

end

function _u30e6_30cb_30c3_30c8_4f1a_8a71___30bd_30ed_6642(pid)

	if		pid == "PID_ヴァンドレ"	then
		Talk( "MID_TK_Vandre1" )

	elseif	pid == "PID_クラン"	then
		Talk( "MID_TK_Clan1" )

	elseif	pid == "PID_フラン"	then
		Talk( "MID_TK_Fram1" )

	elseif	pid == "PID_アルフレッド"	then
		Talk( "MID_TK_Alfred1" )

	elseif	pid == "PID_エーティエ"	then
		Talk( "MID_TK_Etie1" )

	elseif	pid == "PID_ブシュロン"	then
		Talk( "MID_TK_Boucheron1" )

	elseif	pid == "PID_セリーヌ"	then
		Talk( "MID_TK_Celine1" )

	elseif	pid == "PID_ルイ"	then
		Talk( "MID_TK_Louis1" )

	elseif	pid == "PID_クロエ"	then
		Talk( "MID_TK_Chloe1" )

	elseif	pid == "PID_ユナカ"	then
		Talk( "MID_TK_Yunaka1" )

	elseif	pid == "PID_スタルーク"	then
		Talk( "MID_TK_Staluke1" )

	elseif	pid == "PID_シトリニカ"	then
		Talk( "MID_TK_Citrinica1" )

	elseif	pid == "PID_ラピス"	then
		Talk( "MID_TK_Lapis1" )

	elseif	pid == "PID_ディアマンド"	then
		Talk( "MID_TK_Diamand1" )

	elseif	pid == "PID_アンバー"	then
		Talk( "MID_TK_Umber1" )

	elseif	pid == "PID_ジェーデ"	then
		Talk( "MID_TK_Jade1" )

	elseif	pid == "PID_アイビー"	then
		Talk( "MID_TK_Ivy1" )

	elseif	pid == "PID_カゲツ"	then
		Talk( "MID_TK_Kagetsu1" )

	elseif	pid == "PID_ゼルコバ"	then
		Talk( "MID_TK_Zelkova1" )

	elseif	pid == "PID_フォガート"	then
		Talk( "MID_TK_Fogato1" )

	elseif	pid == "PID_パンドロ"	then
		Talk( "MID_TK_Pandoro1" )

	elseif	pid == "PID_ボネ"	then
		Talk( "MID_TK_Bonet1" )

	elseif	pid == "PID_ミスティラ"	then
		Talk( "MID_TK_Misutira1" )

	elseif	pid == "PID_パネトネ"	then
		Talk( "MID_TK_Panetone1" )

	elseif	pid == "PID_メリン"	then
		Talk( "MID_TK_Merin1" )

	elseif	pid == "PID_オルテンシア"	then
		Talk( "MID_TK_Hortensia1" )

	elseif	pid == "PID_セアダス"	then
		Talk( "MID_TK_Seadas1" )

	elseif	pid == "PID_ロサード"	then
		Talk( "MID_TK_Rosado1" )

	elseif	pid == "PID_ゴルドマリー"	then
		Talk( "MID_TK_Goldmary1" )

	elseif	pid == "PID_リンデン"	then
		Talk( "MID_TK_Linden1" )

	elseif	pid == "PID_ザフィーア"	then
		Talk( "MID_TK_Sapir1" )

	elseif	pid == "PID_ヴェイル"	then
		Talk( "MID_TK_Veyre1" )

	elseif	pid == "PID_モーヴ"	then
		Talk( "MID_TK_Mauve1" )

	elseif	pid == "PID_アンナ"	then
		Talk( "MID_TK_Anna1" )

	elseif	pid == "PID_ジャン"	then
		Talk( "MID_TK_Jean1" )

	elseif	( pid == "PID_エル" )			or
			( pid == "PID_ラファール" )		or
			( pid == "PID_セレスティア" )	or
			( pid == "PID_グレゴリー" )		or
			( pid == "PID_マデリーン" )		then
		local unit = UnitGetByPID( pid )
		local name = SubPrefix( UnitGetMPID( unit ) )
		local mid = "MID_TK_" .. name .. "1"
		Talk( mid )

	end

end

function _u30e6_30cb_30c3_30c8_4f1a_8a71___30b7_30f3_30af_30ed_4e2d(pid)

	if		pid == g_pid_lueur then
		Talk( "MID_TK_Lueur2" )

	elseif	pid == "PID_ヴァンドレ"	then
		Talk( "MID_TK_Vandre2" )

	elseif	pid == "PID_クラン"	then
		Talk( "MID_TK_Clan2" )

	elseif	pid == "PID_フラン"	then
		Talk( "MID_TK_Fram2" )

	elseif	pid == "PID_アルフレッド"	then
		Talk( "MID_TK_Alfred2" )

	elseif	pid == "PID_エーティエ"	then
		Talk( "MID_TK_Etie2" )

	elseif	pid == "PID_ブシュロン"	then
		Talk( "MID_TK_Boucheron2" )

	elseif	pid == "PID_セリーヌ"	then
		Talk( "MID_TK_Celine2" )

	elseif	pid == "PID_ルイ"	then
		Talk( "MID_TK_Louis2" )

	elseif	pid == "PID_クロエ"	then
		Talk( "MID_TK_Chloe2" )

	elseif	pid == "PID_ユナカ"	then
		Talk( "MID_TK_Yunaka2" )

	elseif	pid == "PID_スタルーク"	then
		Talk( "MID_TK_Staluke2" )

	elseif	pid == "PID_シトリニカ"	then
		Talk( "MID_TK_Citrinica2" )

	elseif	pid == "PID_ラピス"	then
		Talk( "MID_TK_Lapis2" )

	elseif	pid == "PID_ディアマンド"	then
		Talk( "MID_TK_Diamand2" )

	elseif	pid == "PID_アンバー"	then
		Talk( "MID_TK_Umber2" )

	elseif	pid == "PID_ジェーデ"	then
		Talk( "MID_TK_Jade2" )

	elseif	pid == "PID_アイビー"	then
		Talk( "MID_TK_Ivy2" )

	elseif	pid == "PID_カゲツ"	then
		Talk( "MID_TK_Kagetsu2" )

	elseif	pid == "PID_ゼルコバ"	then
		Talk( "MID_TK_Zelkova2" )

	elseif	pid == "PID_フォガート"	then
		Talk( "MID_TK_Fogato2" )

	elseif	pid == "PID_パンドロ"	then
		Talk( "MID_TK_Pandoro2" )

	elseif	pid == "PID_ボネ"	then
		Talk( "MID_TK_Bonet2" )

	elseif	pid == "PID_ミスティラ"	then
		Talk( "MID_TK_Misutira2" )

	elseif	pid == "PID_パネトネ"	then
		Talk( "MID_TK_Panetone2" )

	elseif	pid == "PID_メリン"	then
		Talk( "MID_TK_Merin2" )

	elseif	pid == "PID_オルテンシア"	then
		Talk( "MID_TK_Hortensia2" )

	elseif	pid == "PID_セアダス"	then
		Talk( "MID_TK_Seadas2" )

	elseif	pid == "PID_ロサード"	then
		Talk( "MID_TK_Rosado2" )

	elseif	pid == "PID_ゴルドマリー"	then
		Talk( "MID_TK_Goldmary2" )

	elseif	pid == "PID_リンデン"	then
		Talk( "MID_TK_Linden2" )

	elseif	pid == "PID_ザフィーア"	then
		Talk( "MID_TK_Sapir2" )

	elseif	pid == "PID_ヴェイル"	then
		Talk( "MID_TK_Veyre2" )

	elseif	pid == "PID_モーヴ"	then
		Talk( "MID_TK_Mauve2" )

	elseif	pid == "PID_アンナ"	then
		Talk( "MID_TK_Anna2" )

	elseif	pid == "PID_ジャン"	then
		Talk( "MID_TK_Jean2" )

	elseif	( pid == "PID_エル" )			or
			( pid == "PID_ラファール" )		or
			( pid == "PID_セレスティア" )	or
			( pid == "PID_グレゴリー" )		or
			( pid == "PID_マデリーン" )		then
		local unit = UnitGetByPID( pid )
		local name = SubPrefix( UnitGetMPID( unit ) )
		local mid = "MID_TK_" .. name .. "2"
		Talk( mid )

	end

end

function _u7d0b_7ae0_58eb_4f1a_8a71(pid)

	if		pid == "PID_M022_紋章士_シグルド"	then
		Talk( "MID_TK_Siglud" )

	elseif	pid == "PID_M022_紋章士_セリカ"	then
		Talk( "MID_TK_Celica" )

	elseif	pid == "PID_M022_紋章士_ミカヤ"	then
		Talk( "MID_TK_Micaiah" )

	elseif	pid == "PID_M022_紋章士_ロイ"	then
		Talk( "MID_TK_Roy" )

	elseif	pid == "PID_M022_紋章士_リーフ"	then
		Talk( "MID_TK_Leaf" )

	elseif	pid == "PID_M022_紋章士_ルキナ"	then
		Talk( "MID_TK_Lucina" )

	elseif	pid == "PID_M022_紋章士_リン"	then
		Talk( "MID_TK_Lin" )

	elseif	pid == "PID_M022_紋章士_アイク"	then
		Talk( "MID_TK_Ike" )

	elseif	pid == "PID_M022_紋章士_ベレト"	then
		Talk( "MID_TK_Byleth" )

	elseif	pid == "PID_M022_紋章士_カムイ"	then
		Talk( "MID_TK_Kamui" )

	elseif	pid == "PID_M022_紋章士_エイリーク"	then
		Talk( "MID_TK_Eirik" )

	end

end

function _u7d0b_7ae0_58eb_I_D_53d6_5f97(pid)

	local gid = nil

	if		pid == "PID_M022_紋章士_シグルド"	then
		gid = "GID_シグルド"

	elseif	pid == "PID_M022_紋章士_セリカ"	then
		gid = "GID_セリカ"

	elseif	pid == "PID_M022_紋章士_ミカヤ"	then
		gid = "GID_ミカヤ"

	elseif	pid == "PID_M022_紋章士_ロイ"	then
		gid = "GID_ロイ"

	elseif	pid == "PID_M022_紋章士_リーフ"	then
		gid = "GID_リーフ"

	elseif	pid == "PID_M022_紋章士_ルキナ"	then
		gid = "GID_ルキナ"

	elseif	pid == "PID_M022_紋章士_リン"	then
		gid = "GID_リン"

	elseif	pid == "PID_M022_紋章士_アイク"	then
		gid = "GID_アイク"

	elseif	pid == "PID_M022_紋章士_ベレト"	then
		gid = "GID_ベレト"

	elseif	pid == "PID_M022_紋章士_カムイ"	then
		gid = "GID_カムイ"

	elseif	pid == "PID_M022_紋章士_エイリーク"	then
		gid = "GID_エイリーク"

	end

	return gid

end
