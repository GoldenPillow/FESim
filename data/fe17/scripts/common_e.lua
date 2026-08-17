Include("Common")

g_key_battleTalk_Selestia_Sepia		= "G_戦闘会話_セレスティア_セピア_済"
g_key_battleTalk_Gregory_Gris		= "G_戦闘会話_グレゴリー_グリ_済"
g_key_battleTalk_Madeline_Marron	= "G_戦闘会話_マデリーン_マロン_済"

g_RecollectionEquipGod = {
	{ "PID_エル",			"エル",			nil },
	{ "PID_ラファール",		"イル",			nil },
	{ "PID_セレスティア",	"セレスティア",	nil },
	{ "PID_グレゴリー",		"グレゴリー",	nil },
	{ "PID_マデリーン",		"マデリーン",	nil }
}

function _u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30bb_30fc_30d6()

	if MapIsRecollection() then

		for unitId = 1, #g_RecollectionEquipGod do

			if UnitIsExist( g_RecollectionEquipGod[unitId][1] ) then
				g_RecollectionEquipGod[unitId][3] = UnitGetGodUnit( g_RecollectionEquipGod[unitId][1] )
			else
				g_RecollectionEquipGod[unitId][3] = nil
			end

		end

	end

end

function _u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_7d0b_7ae0_58eb_88c5_5099_72b6_6cc1_30ed_30fc_30c9( chapter )

	if MapIsRecollection() then

		local pid_prefix = "PID_" .. chapter .. "_"

		for unitId = 1, #g_RecollectionEquipGod do

			local pid = pid_prefix .. g_RecollectionEquipGod[unitId][2]

			if ( UnitIsExist( pid ) and ( g_RecollectionEquipGod[unitId][3] ~= nil ) ) then
				UnitSetGodUnit( pid, g_RecollectionEquipGod[unitId][3] )
			end

		end

	end

end

function _u90aa_7adc_306e_7ae0___65b0_30ad_30e3_30e9_51fa_6483_4e0d_53ef_8a2d_5b9a()

	for unitId = 1, #g_RecollectionEquipGod do

		local pid = g_RecollectionEquipGod[unitId][1]

		if UnitIsExist( pid ) then
			UnitSetStatus(	pid,	UNIT_STATUS_DEFECT + UNIT_STATUS_NEVER_SORTIE )
			UnitSetGodUnit(	pid,	nil )
		end

	end

end

function GodSaveEquipE()

	if MapIsRecollection() == false then
		GodSaveEquip()
	end

end

function GodLoadEquipE()

	if MapIsRecollection() == false then
		GodLoadEquip()
	end

end

function E_BattleTalk_VariableEntry()

	if not VariableIsExist( g_key_battleTalk_Selestia_Sepia ) then
		VariableEntry(g_key_battleTalk_Selestia_Sepia,	0)
		VariableEntry(g_key_battleTalk_Gregory_Gris,	0)
		VariableEntry(g_key_battleTalk_Madeline_Marron,	0)
	end

end

function E_BattleTalkEntry_Sepia( pid )
	if VariableGet( g_key_battleTalk_Selestia_Sepia ) == 0 then
		EventEntryBattleTalk(Talk, "PID_セレスティア", FORCE_PLAYER, pid, FORCE_ENEMY, true, g_key_battleTalk_Selestia_Sepia, "MID_EX1")
	end
end

function E_BattleTalkEntry_Gris( pid )
	if VariableGet( g_key_battleTalk_Gregory_Gris ) == 0 then
		EventEntryBattleTalk(Talk, "PID_グレゴリー", FORCE_PLAYER, pid, FORCE_ENEMY, true, g_key_battleTalk_Gregory_Gris, "MID_EX2")
	end
end

function E_BattleTalkEntry_Marron( pid )
	if VariableGet( g_key_battleTalk_Madeline_Marron ) == 0 then
		EventEntryBattleTalk(Talk, "PID_マデリーン", FORCE_PLAYER, pid, FORCE_ENEMY, true, g_key_battleTalk_Madeline_Marron, "MID_EX3")
	end
end
