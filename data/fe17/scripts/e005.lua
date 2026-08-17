Include("Common")
Include("Common_E")

g_pid_boss  = "PID_E005_Boss"
g_pid_hide1 = "PID_E005_Hide1"
g_pid_hide2 = "PID_E005_Hide2"

g_Normal_Serious	=	9
g_Other_Serious		=	15

function Startup()

	Log("Startup");

	WinRuleSetDestroyBoss( true )
	WinRuleSetMID( "MID_RULE_E005_WIN" )
	LoseRuleSetMID( "MID_RULE_DLC_LOSE2" )

	_u30d5_30e9_30b0_767b_9332()
	_u30a4_30d9_30f3_30c8_767b_9332()
end

function _u30d5_30e9_30b0_767b_9332()
	VariableEntry( "特殊召喚カウント", 0 )
	VariableEntry( "狼配置", 0 )

	VariableEntry( "弱異形飛竜死亡", 0 )
	VariableEntry( "弱異形飛竜カウント", 0 )

	VariableEntry( "モンク死亡", 0 )
	VariableEntry( "モンクカウント", 0 )

	VariableEntry( "イル本気出す", 0 )
	VariableEntry( "イル本気後", 0 )
end

function _u30a4_30d9_30f3_30c8_767b_9332()

	EventEntryTurn( GodSaveEquipE,	1,  1, FORCE_PLAYER )

	EventEntryTurn( _u6226_95d8_958b_59cb_76f4_5f8c,	1,  1, FORCE_PLAYER )
	EventEntryTurnAfter( _u6226_95d8_958b_59cb_76f4_5f8c_8d64,	1,  1, FORCE_ENEMY )

	EventEntryTurn(_u53ec_559a_7ba1_7406, -1, -1, FORCE_PLAYER)
	EventEntryTurn(_u72fc_7ba1_7406, -1, -1, FORCE_PLAYER)
	EventEntryTurn(_u30e2_30f3_30af_7ba1_7406, 1, 20, FORCE_PLAYER)
	if DifficultyGet() == DIFFICULTY_LUNATIC then
		EventEntryTurn(_u5f31_7570_5f62_98db_7adc_7ba1_7406, 7, -1, FORCE_PLAYER)
	end

	EventEntryArea(_u30dc_30b9_90e8_5c4b_7ba1_7406, 16,23, 24,26, FORCE_PLAYER)

	EventEntryArea(_u30a8_30eb_90e8_5c4b_304b_3089_51fa_305f, 23,23, 29,28, FORCE_ENEMY)

	EventEntryTurn(_u30aa_30eb_30c6_30f3_30b7_30a2_7ba1_7406, -1, -1, FORCE_PLAYER)

	EventEntryBattleAfter(_u6226_95d8_5f8c_30a4_30eb_672c_6c17, "PID_E005_Boss", FORCE_ENEMY, "", FORCE_PLAYER, true)

	EventEntryTbox(_u5b9d_7bb1_5165_624b,  4, 6, "IID_フリーズ")
	EventEntryTbox(_u5b9d_7bb1_5165_624b,  3, 4, "IID_レスト")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 10,12, "IID_リブロー")
	EventEntryTbox(_u5b9d_7bb1_5165_624b, 21,20, "IID_リザーブ")

	EventEntryTurn(_u5897_63f4_4e2d_592e_968e_6bb5,  4, 4, FORCE_PLAYER)

	if DifficultyGet() == DIFFICULTY_NORMAL then
		EventEntryTurn(_u5897_63f4_4e0a_7802_6f20_5927_98db_7adc,  8, 8, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b_7802_6f20_5927_98db_7adc,  9, 9, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_53f3_4e0b_76d7_8cca,  9, 9, FORCE_PLAYER)

	elseif DifficultyGet() == DIFFICULTY_HARD then
		EventEntryTurn(_u5897_63f4_4e2d_592e_968e_6bb5,  2, 2, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_7802_6f20_5927_98db_7adc,  6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_53f3_4e0b_76d7_8cca,  7, 7, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b_7802_6f20_5927_98db_7adc,  7, 7, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b_7802_6f20,  8, 8, FORCE_PLAYER)

	else
		EventEntryTurn(_u5897_63f4_4e2d_592e_968e_6bb5,  2, 2, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0a_7802_6f20_5927_98db_7adc,  6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_53f3_4e0b_76d7_8cca,  6, 6, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b_7802_6f20_5927_98db_7adc,  7, 7, FORCE_PLAYER)
		EventEntryTurn(_u5897_63f4_4e0b_7802_6f20,  8, 9, FORCE_PLAYER)
	end

	EventEntryTurn(_u5897_63f4_30a4_30eb_672c_6c17_7528,  2,15, FORCE_PLAYER)

	EventEntryBattleTalk(Talk, "PID_E005_エル", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_エーティエ_済", "MID_BT7");

	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_boss, FORCE_ENEMY, true, "戦闘前会話_ボス_済", "MID_BT1");
	EventEntryDie(Talk, g_pid_boss, FORCE_ENEMY, condition_true, "MID_BT2");

	EventEntryBattleTalk(Talk, "PID_オルテンシア", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_オルテンシア_済", "MID_BT9");
	EventEntryBattleTalk(Talk, "PID_アイビー", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_アイビー_済", "MID_BT10");

	EventEntryBattleTalk(Talk, "PID_ロサード", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_ロサード_済", "MID_BT12");
	EventEntryBattleTalk(Talk, "PID_ゴルドマリー", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_ゴルドマリー_済", "MID_BT13");
	EventEntryBattleTalk(Talk, "PID_リンデン", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_リンデン_済", "MID_BT14");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide1, FORCE_ENEMY, true, "戦闘前会話_裏１_済", "MID_BT3");
	EventEntryDie(Talk, g_pid_hide1, FORCE_ENEMY, condition_true, "MID_BT4");

	EventEntryBattleTalk(Talk, "PID_フォガート", FORCE_PLAYER, g_pid_hide2, FORCE_ENEMY, true, "戦闘前会話_裏２_フォガート_済", "MID_BT15");
	EventEntryBattleTalk(Talk, "PID_ミスティラ", FORCE_PLAYER, g_pid_hide2, FORCE_ENEMY, true, "戦闘前会話_裏２_ミスティラ_済", "MID_BT16");

	EventEntryBattleTalk(Talk, "PID_パンドロ", FORCE_PLAYER, g_pid_hide2, FORCE_ENEMY, true, "戦闘前会話_裏２_パンドロ_済", "MID_BT18");
	EventEntryBattleTalk(Talk, "PID_ボネ", FORCE_PLAYER, g_pid_hide2, FORCE_ENEMY, true, "戦闘前会話_裏２_ボネ_済", "MID_BT19");
	EventEntryBattleTalk(Talk, "", FORCE_PLAYER, g_pid_hide2, FORCE_ENEMY, true, "戦闘前会話_裏２_済", "MID_BT5");
	EventEntryDie(Talk, g_pid_hide2, FORCE_ENEMY, condition_true, "MID_BT6");

	EventEntryDie(EmptyFunction, "PID_E005_異形兵弱_異形飛竜", FORCE_ENEMY, "弱異形飛竜死亡")
	EventEntryDie(EmptyFunction, "PID_E005_異形兵特殊_マスターモンク", FORCE_ENEMY, "モンク死亡")

	EventEntryDie(_u30a8_30eb_6b7b_4ea1, "PID_E005_エル", FORCE_ALL)

end

function Cleanup()

	Log("Cleanup");

end

function Opening()

	Log("Opening");

	PlayChapterTitle("E005")
	Yield()
	FadeOut(0)

	Movie("Narration05")
	SkipEscape()

	PuppetDemo("E005", "MID_OP2")
	PuppetDemo("E005", "MID_OP3")
	PuppetDemo("E005", "MID_OP4")
	PuppetDemo("E005", "MID_OP5")
	PuppetDemo("E005", "MID_OP6")

	UnitSetStatus( "PID_リュール", UNIT_STATUS_DEFECT )

	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()
end

function MapOpening()

	UnitPutOffItem("PID_リュール","IID_銀の剣")
	UnitPutOffItem("PID_リュール", "IID_リベラシオン")
	UnitPutOffItem("PID_リュール", "IID_ドラゴンキラー")
	UnitPutOffItem("PID_リュール", "IID_特効薬")

	Log("MapOpening");
	UnitSetStatus("PID_リュール",UNIT_STATUS_DEFECT)

	EffectCreate( "魔法障壁_展開_E005", 13,24 )

	GodLoadEquipE()
	_u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( "E005" )

	UnitSetGodUnit("PID_リュール",nil)

	if DifficultyGet() == DIFFICULTY_NORMAL then

		MapOverlapSetBegin()
			MapOverlapSet(3, 10, "TID_無し")
			MapOverlapSet(3, 11, "TID_無し")

			MapOverlapSet(14,12, "TID_無し")
			MapOverlapSet(18,10, "TID_無し")

			MapOverlapSet(24, 8, "TID_無し")
			MapOverlapSet(22,11, "TID_無し")
			MapOverlapSet(23,13, "TID_無し")
			MapOverlapSet(21,14, "TID_無し")

			MapOverlapSet(24,15, "TID_無し")
			MapOverlapSet(25,16, "TID_無し")
		MapOverlapSetEnd()
	end
end

function _u6226_95d8_958b_59cb_76f4_5f8c()

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()

	local x = UnitGetX( g_pid_boss )
	local z = UnitGetZ( g_pid_boss )
	MapObjectCreate("Eff_Cursor01", "Effects/BMap/UI/Guide/Prefabs/Eff_Cursor_" .. "W1H1", x, z)
	WaitTime( 2.0 )

	Talk( "MID_EV1" )
	Tutorial( "TUTID_捕虜" )

	WinRule()

	MapObjectDelete( "Eff_Cursor01" )

end

function _u6226_95d8_958b_59cb_76f4_5f8c_8d64()

	CursorSetPos_FromPid(g_pid_boss)
	MapCameraWait()

	Talk( "MID_BT8" )

end

function _u30a8_30eb_6b7b_4ea1()

	VariableSet( "敗北", 1 )

end

function _u5897_63f4_4e2d_592e_968e_6bb5()
	Dispos("Enemy_Reinforcement5", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_4e0b_7802_6f20()
	Dispos("Enemy_Reinforcement7", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_53f3_4e0b_968e_6bb5()
	Dispos("Enemy_Reinforcement6", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_4e0b_7802_6f20_5927_98db_7adc()
	Dispos("Enemy_Reinforcement1", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_4e0a_7802_6f20_5927_98db_7adc()
	Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)

	Talk( "MID_EV2" )

end
function _u5897_63f4_5de6_4e0b_76d7_8cca()
	Dispos("Enemy_Reinforcement4", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end
function _u5897_63f4_53f3_4e0b_76d7_8cca()
	Dispos("Enemy_Reinforcement3", DISPOS_FLAG_FOCUS)
	Yield()
	WaitTime(0.5)
end

function _u5897_63f4_30a4_30eb_672c_6c17_7528()
	if VariableGet( "イル本気後" )  == 1 then
		local turn = MapGetTurn()
		local diffcult
		if DifficultyGet() == DIFFICULTY_NORMAL then
			diffcult = g_Normal_Serious
		else
			diffcult = g_Other_Serious
		end
		if turn <= diffcult then
			Dispos("Enemy_ReinforcementS2", DISPOS_FLAG_FORCED)
			Yield()
		end
	end
end

function _u6226_95d8_5f8c_30a4_30eb_672c_6c17()

	local turn = MapGetTurn()

	if MindGetForce() == FORCE_PLAYER then
		local pid = UnitGetPID(MindGetUnit())
		if pid ~= "PID_E005_エル" then
			_u30a4_30eb_672c_6c17_30a4_30d9_30f3_30c8(turn)
			local index = ForceUnitGetFirst(FORCE_ENEMY)
			while index ~= nil do
				local pid = UnitGetPID(index)
				AiClearMoveLimit(pid)
				index = ForceUnitGetNext(index)
			end
		end
	else
		local pid = UnitGetPID(MindGetTargetUnit())
		if pid ~= "PID_E005_エル" then
			VariableSet( "イル本気出す", 1 )
			local index = ForceUnitGetFirst(FORCE_ENEMY)
			while index ~= nil do
				local pid = UnitGetPID(index)
				AiClearMoveLimit(pid)
				index = ForceUnitGetNext(index)
			end
		end
	end
end

function _u30a8_30eb_90e8_5c4b_304b_3089_51fa_305f()
	local pid = UnitGetPID(MindGetUnit())
	local turn = MapGetTurn()

	if pid == "PID_E005_Boss" then

		if VariableGet( "イル本気後" )  == 0 then
			_u30a4_30eb_672c_6c17_30a4_30d9_30f3_30c8(turn)
			VariableSet( "イル本気出す", 2 )
		end
	end

end

function _u30aa_30eb_30c6_30f3_30b7_30a2_7ba1_7406()

	if VariableGet( "イル本気後" )  == 0 then
		if VariableGet( "イル本気出す" )  == 1 then
			_u30a4_30eb_672c_6c17_30a4_30d9_30f3_30c8(99)
			VariableSet( "イル本気出す", 2 )

		elseif AiGetActive( "PID_E005_Hide1" ) == true then
			_u30a4_30eb_672c_6c17_30a4_30d9_30f3_30c8(99)
		end
	end
end
function _u30dc_30b9_90e8_5c4b_7ba1_7406()

	local turn = MapGetTurn()

	local pid = UnitGetPID(MindGetUnit())
	if pid ~= "PID_E005_エル" then
		_u30a4_30eb_672c_6c17_30a4_30d9_30f3_30c8(turn)
	end

end

function _u30a4_30eb_672c_6c17_30a4_30d9_30f3_30c8(turn)
	if VariableGet( "イル本気後" )  == 0 then
		Talk( "MID_EV3" )

		local diffcult
		if DifficultyGet() == DIFFICULTY_NORMAL then
			diffcult = g_Normal_Serious
		else
			diffcult = g_Other_Serious
		end

		if turn <= diffcult then
			Dispos("Enemy_ReinforcementS2", DISPOS_FLAG_FORCED)
			Yield()
			Dispos("Enemy_ReinforcementS3", DISPOS_FLAG_FORCED)
			Yield()

		else
			Dispos("Enemy_ReinforcementS", DISPOS_FLAG_FOCUS)
			Yield()
		end

		local index = ForceUnitGetFirst(FORCE_ENEMY)
		while index ~= nil do
			local pid = UnitGetPID(index)

			AiSetSequence(pid, AI_ORDER_CAUSE, "AI_AC_Everytime")
			index = ForceUnitGetNext(index)
		end
		VariableSet( "イル本気後", 1 )
	end
end

function _u72fc_7ba1_7406()

	if VariableGet( "狼配置" )  == 0 then

		local count = 0

		index = ForceUnitGetFirst(FORCE_ENEMY)
		while index ~= nil do
			if UnitGetPID(index) == "PID_E005_異形兵_異形狼"	then
				count = count + 1
			end
			if UnitGetPID(index) == "PID_E005_異形兵強_異形狼"	then
				count = count + 1
			end

			index = ForceUnitGetNext(index)
		end

		if count <= 3 then
			Dispos("Enemy_Reinforcement8", DISPOS_FLAG_FOCUS)
			Yield()
			WaitTime(0.5)
			VariableSet( "狼配置", 1 )
		end
	end
end
function EmptyFunction()
end

function _u30e2_30f3_30af_7ba1_7406()

	if VariableGet( "モンク死亡" )  == 1 then
		if VariableGet( "モンクカウント" )  == 1 then
			Dispos("Enemy_ReinforcementS4", DISPOS_FLAG_FOCUS)
			Yield()
			WaitTime(0.5)
			VariableSet( "モンク死亡", 0 )
			VariableSet( "モンクカウント", 0 )
		else
			VariableInc("モンクカウント", 0, 1)
		end
	end
end

function _u5f31_7570_5f62_98db_7adc_7ba1_7406()
	if VariableGet( "弱異形飛竜死亡" )  == 1 then
		if VariableGet( "弱異形飛竜カウント" )  == 1 then
			Dispos("Enemy_Reinforcement2", DISPOS_FLAG_FOCUS)
			Yield()
			WaitTime(0.5)
			VariableSet( "弱異形飛竜死亡", 0 )
			VariableSet( "弱異形飛竜カウント", 0 )
		else
			VariableInc("弱異形飛竜カウント", 0, 1)
		end
	end
end

function _u53ec_559a_7ba1_7406()
	if AiGetActive( "PID_E005_Hide2" ) == true then
		if VariableGet( "特殊召喚カウント" )  == 0 then
			CursorSetPos_FromPid( "PID_E005_Hide2" )
			MapCameraWait()

			Talk( "MID_EV4" )

			EventEngageSummon( "PID_E005_Hide2" )
			Dispos( "Enemy_ReinforcementBoss1", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
			Yield()
			WaitTime( 2.0 )

			if DifficultyGet() == DIFFICULTY_LUNATIC then
				VariableSet( "特殊召喚カウント", 2 )
			else
				VariableSet( "特殊召喚カウント", 1 )
			end

		elseif	VariableGet( "特殊召喚カウント" )  == 1 then
			CursorSetPos_FromPid( "PID_E005_Hide2" )
			MapCameraWait()

			EventEngageSummon( "PID_E005_Hide2" )
			Dispos( "Enemy_ReinforcementBoss2", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
			Yield()
			WaitTime( 2.0 )
			VariableSet( "特殊召喚カウント", 2 )

		elseif	VariableGet( "特殊召喚カウント" )  == 2 then
			CursorSetPos_FromPid( "PID_E005_Hide2" )
			MapCameraWait()

			EventEngageSummon( "PID_E005_Hide2" )
			Dispos( "Enemy_ReinforcementBoss3", DISPOS_FLAG_FOCUS + DISPOS_FLAG_WARP )
			Yield()
			WaitTime( 2.0 )

			AiSetSequence("PID_E005_Hide2", AI_ORDER_ATTACK, "AI_AT_ExcludePerson2","PID_リュール,PID_E005_エル")
			AiSetSequence("PID_E005_Hide2", AI_ORDER_MOVE, "AI_MV_NearestEnemyExcludePerson2","PID_リュール,PID_E005_エル")

			VariableSet( "特殊召喚カウント", 3 )

		end
	end

end

function MapEnding()

	CursorSetPos_FromPid("PID_リュール")
	MapCameraWait()

	EffectPlay( "魔法障壁_破壊_E005", 13,24 )
	EffectDelete( "魔法障壁_展開_E005", 13,24 )
	EffectWait()
	WaitTime( 3.0 )

	Log("MapEnding");

end

function Ending()

	Log("Ending");

	PuppetDemo("E005", "MID_ED1")
	PuppetDemo("E005", "MID_ED2")
	PuppetDemo("E005", "MID_ED3")
	PuppetDemo("E005", "MID_ED4")
	PuppetDemo("E005", "MID_ED5")
	PuppetDemo("E005", "MID_ED6")

end

function GameOver()

	Log("GameOver");

end
