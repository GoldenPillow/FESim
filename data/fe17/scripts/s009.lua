Include("Common")
g_pid_lueur = "PID_リュール"
g_key_bridge		= "戦闘後会話_これで橋がかかる_済"
g_key_zagam_Die		= "ザガム死亡_済"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_シグルド" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S009_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry("橋を架ける_済", 0)
	VariableEntry("罠発動_済", 0)
	VariableEntry("アイテム_済", 0)
	VariableEntry( g_key_bridge, 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_S009_シグルド", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_シグルド_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S009_シグルド", FORCE_ENEMY, "PID_ヴァンドレ",			FORCE_PLAYER, true, "戦闘前会話_シグルド_ヴァンドレ_済", "MID_BT2")

	EventEntryTurn(_u6a4b_3092_67b6_3051_308b, -1, -1, FORCE_PLAYER)

	EventEntryArea(_u7f60_767a_52d5,  6,22, 19,28, FORCE_PLAYER, "罠発動_済")
	EventEntryArea(_u30a2_30a4_30c6_30e0_5165_624b, 25,26, 25,26, FORCE_PLAYER, "アイテム_済")

	EventEntryDie(_u30b6_30ac_30e0_6b7b_4ea1, "S009_幻影兵_ザガム", FORCE_ENEMY, g_key_zagam_Die)
	EventEntryBattleAfter(_u6226_95d8_5f8c_4f1a_8a71___3053_308c_3067_6a4b_304c_304b_304b_308b, "", FORCE_PLAYER, "PID_S009_幻影兵_ザガム", FORCE_ENEMY, true, _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_4f1a_8a71___3053_308c_3067_6a4b_304c_304b_304b_308b )

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_シグルド" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S009", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()

	CursorAnimeCreate_FromPid("PID_S009_シグルド")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

	CursorSetPos( 4, 16 )
	MapCameraWait()
	CursorAnimeCreate( 4, 16, "W2H3" )
	CursorAnimeDelete()

	CursorAnimeCreate_FromPid("PID_S009_幻影兵_ザガム")
	Talk("MID_EV2")
	CursorAnimeDelete()

end

function _u30b6_30ac_30e0_6b7b_4ea1()

end

function _uc_o_n_d_i_t_i_o_n___6226_95d8_5f8c_4f1a_8a71___3053_308c_3067_6a4b_304c_304b_304b_308b()

	if VariableGet( g_key_zagam_Die ) == 0 then
		do return false end
	end

	if VariableGet( "罠発動_済" ) == 1 then
		do return false end
	end

	do return true end
end

function _u6226_95d8_5f8c_4f1a_8a71___3053_308c_3067_6a4b_304c_304b_304b_308b()

	CursorSetPos( 4, 16 )
	WaitTime(2.0)
	Talk("MID_EV3")

	CursorSetPos( 8, 10 )
	WaitTime(2.0)
	VariableSet( g_key_bridge, 1 )
end

function _u8df3_306d_6a4b_8d77_52d5()
	CursorSetPos(4, 17)
	MapCameraWait()

	MapObjectAction(5, 16, MAP_ACTION_DONE)

	TerrainSetBegin()
	TerrainSet( 4,18, "TID_橋" )
	TerrainSet( 5,18, "TID_橋" )
	TerrainSet( 4,17, "TID_橋" )
	TerrainSet( 5,17, "TID_橋" )
	TerrainSet( 4,16, "TID_橋" )
	TerrainSet( 5,16, "TID_橋" )
	TerrainSetEnd()
end

function _u6a4b_3092_67b6_3051_308b()
	if VariableGet("橋を架ける_済") == 0 then
		if not UnitExistOnMap("PID_S009_幻影兵_ザガム") then
			_u8df3_306d_6a4b_8d77_52d5()

			if DifficultyGet() ~= DIFFICULTY_NORMAL then

				index = ForceUnitGetFirst(FORCE_ENEMY)
				while index ~= nil do
					if UnitGetPID(index) ~= "PID_S009_幻影兵_ユリウス"	then
						if UnitGetPID(index) ~= "PID_S009_幻影兵_イシュタル"	then
							AiSetSequence(index, AI_ORDER_CAUSE, "AI_AC_Everytime")
						end
					end
					index = ForceUnitGetNext(index)
				end
			else
				AiSetSequence("PID_S009_シグルド", AI_ORDER_CAUSE, "AI_AC_Everytime")

			end

			Dispos( "Enemy_ReinforcementKni", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
			Dispos( "Enemy_ReinforcementMgi", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)
			Dispos( "Enemy_ReinforcementArm", DISPOS_FLAG_FOCUS )
			Yield()
			WaitTime(0.5)

			VariableSet("橋を架ける_済", 1)
			VariableSet("罠発動_済", 1)

		end
	end

end

function _u7f60_767a_52d5()
	if VariableGet("橋を架ける_済") == 0 then

		CursorSetPos(4, 17)
		MapCameraWait()

		_u8df3_306d_6a4b_8d77_52d5()

		Dispos( "Enemy_ReinforcementKni", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)
		Dispos( "Enemy_ReinforcementMgi", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)
		Dispos( "Enemy_ReinforcementArm", DISPOS_FLAG_FOCUS )
		Yield()
		WaitTime(0.5)

		index = ForceUnitGetFirst(FORCE_ENEMY)
		while index ~= nil do
			AiSetSequence(index, AI_ORDER_CAUSE, "AI_AC_Everytime")
			index = ForceUnitGetNext(index)
		end
		AiSetSequence("PID_S009_シグルド", AI_ORDER_MOVE, "AI_MV_WeakEnemy", "")
		UnitClearStatus("PID_S009_幻影兵_ザガム", UNIT_STATUS_MOVE_NOT_ALLOW)

		VariableSet("橋を架ける_済", 1)
		VariableSet("罠発動_済", 1)
	end

end

function _u30a2_30a4_30c6_30e0_5165_624b()
	ItemGain(MindGetUnit(), "IID_女神の像")
	VariableSet("アイテム_済", 1)

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	PuppetDemo("S009", "MID_ED1")

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "シグルド", "S009" )

end

function GameOver()

	Log("GameOver")

end
