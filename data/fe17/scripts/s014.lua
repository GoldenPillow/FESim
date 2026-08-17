Include("Common")
g_pid_lueur = "PID_リュール"

function Startup()

	Log("Startup")

	_uS_t_a_r_t_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_3092_4e00_6642_7684_306b_7121_52b9_5316( "GID_マルス" )

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_S014_WIN" )

	_u5909_6570_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()

end

function _u5909_6570_767b_9332()
	VariableEntry("玉座侵入", 0)

	VariableEntry( "増援開始", 0 )
	VariableEntry( "下増援カウント", 0 )
	VariableEntry( "右増援カウント", 0 )
	VariableEntry( "宝箱増援カウント", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()
	EventEntryTurn(_u958b_59cb_76f4_5f8c, 1, 1, FORCE_PLAYER)
	EventEntryTurn(_u52dd_5229_6761_4ef6, 1, 1, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_S014_マルス", FORCE_ENEMY, g_pid_lueur,			FORCE_PLAYER, true, "戦闘前会話_マルス_リュール_済", "MID_BT1")
	EventEntryBattleTalk(Talk, "PID_S014_マルス", FORCE_ENEMY, "PID_ヴェイル",		FORCE_PLAYER, true, "戦闘前会話_マルス_ヴェイル_済", "MID_BT2")

	EventEntryTurn(_u7389_5ea7_306e_9593_4fb5_5165, -1, -1, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_NORMAL then

		EventEntryTurn(_u4e0b_5897_63f4, 10,10, FORCE_PLAYER);

	elseif DifficultyGet() == DIFFICULTY_LUNATIC then

		EventEntryTurn(_u4e0b_5897_63f4, 8,10, FORCE_PLAYER);

	else

		EventEntryTurn(_u4e0b_5897_63f4, 9,10, FORCE_PLAYER);
	end

	EventEntryTurn(_u6249_958b_9589_5897_63f4, -1, -1, FORCE_PLAYER)

	EventEntryTbox(_u5b9d_7bb1_5165_624b, 4,  9, "IID_特効薬")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 7,  9, "IID_速さの薬")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 5,  7, "IID_銀の大斧")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 8,  7, "IID_毒消し")

end

function Cleanup()

	Log("Cleanup")

	_uC_l_e_a_n_u_p___7d0b_7ae0_58eb_5916_4f1d___5bfe_8c61_7d0b_7ae0_58eb_306e_7121_52b9_5316_89e3_9664( "GID_マルス" )

end

function Opening()

	Log("Opening")

	PuppetDemo("S014", "MID_OP1")

end

function MapOpening()

	Log("MapOpening")

end

function _u958b_59cb_76f4_5f8c()

	CursorAnimeCreate_FromPid("PID_S014_マルス")
	Talk( "MID_EV1" )
	CursorAnimeDelete()

end

function EmptyFunction()
end

function _u7389_5ea7_306e_9593_4fb5_5165()

	if VariableGet( "玉座侵入" ) == 0 then
		if AiGetActive( "PID_S014_マルス" ) == true then

			CursorAnimeCreate_FromPid("PID_S014_マルス")
			Talk( "MID_EV2" )
			CursorAnimeDelete()

			CursorSetPos(22, 12 )
			WaitTime(2.0)

			EventOpenDoor(22,12)
			VariableSet("玉座侵入", 1)

		end
	end

end

function _u4e0b_5897_63f4()

	Dispos("Enemy_Reinforcement2_3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

end

function _u6249_958b_9589_5897_63f4()

	if VariableGet( "増援開始" ) == 1 then
		VariableInc("右増援カウント", 0, 8)

		if (VariableGet( "右増援カウント" ) + 1 ) % 2 == 1 then
			Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
			Yield()
			WaitTime(0.5)
		else

		end

		if VariableGet( "玉座侵入" ) == 1 then

		end
	end

	if TerrainGet(22,12) == "TID_床" then
		VariableSet( "増援開始", 1 )
	end

end

function _u5b9d_7bb1_5897_63f4()

	if VariableGet( "宝箱増援カウント" ) < 2 then
		tbox = 0
		if TerrainGet(4,9) == "TID_空宝箱" then
			tbox = 1
		elseif TerrainGet(7,9) == "TID_空宝箱" then
			tbox = 1
		elseif TerrainGet(5,7) == "TID_空宝箱" then
			tbox = 1
		elseif TerrainGet(8,7) == "TID_空宝箱" then
			tbox = 1
		end

		if tbox == 1 then
			VariableInc("宝箱増援カウント", 0, 3)
			if VariableGet( "宝箱増援カウント" ) == 1 then
				Dispos("Enemy_Reinforcement2_3", DISPOS_FLAG_FOCUS)
				Yield()
				WaitTime(0.5)
			end
		end
	end

end

function MapEnding()

	Log("MapEnding")

end

function Ending()

	Log("Ending")

	FadeInAndWait(FADE_NORMAL)
	PuppetDemo("S014", "MID_ED1" )
	FadeOutAndWait(FADE_NORMAL)

	_u7d0b_7ae0_58eb_5916_4f1d___30ec_30d9_30eb_30ad_30e3_30c3_30d7_958b_653e( "マルス", "S014" )

end

function GameOver()

	Log("GameOver")

end
