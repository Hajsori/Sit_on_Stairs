tellraw @a {"rawtext": [{"text": "§r§8[§fSit on Stairs§8] §cStarting reset...§r"}]}
scoreboard objectives remove "sitOnStairs:data"
scoreboard objectives add sitOnStairs:data dummy "Sit On Stairs - Data"
scoreboard players set "seat:All Stairs" sitOnStairs:data 1
scoreboard players set "seat:All Slabs" sitOnStairs:data 1
tellraw @a {"rawtext": [{"text": "§r§8[§fSit on Stairs§8] §aReset Succesfull!§r"}]}