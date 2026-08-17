Include("Common")

function _uD_L_C_906d_9047_6226_306e_8a2d_5b9a___6575_306e_A_I()

	local index = ForceUnitGetFirst(FORCE_ENEMY)
	while index ~= nil do
		if UnitGetJID( index ) == "JID_エンチャント"	then
			AiSetSequence(index, AI_ORDER_ATTACK, "AI_AT_Enchant")
			AiSetPriority(index, 130)
		end

		if UnitGetJID( index ) == "JID_モンク" or UnitGetJID( index ) == "JID_マスターモンク" then
			AiSetPriority(index, 110)
		end

		index = ForceUnitGetNext(index)
	end

end
