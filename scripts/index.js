// ©️ 2024 DerCoderJo. All Rights Reserved.

import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"

var cooldown = {}


Minecraft.world.afterEvents.playerInteractWithBlock.subscribe((data) => {
    let player = data.player
    if (cooldown[player.id] == true) return

    cooldown[player.id] = true
    Minecraft.system.runTimeout(() => {
        cooldown[player.id] = false
    }, 10)

    if (player.typeId !== "minecraft:player" || player.isSneaking) return

    if (player.dimension.getBlock(data.block.location).typeId.includes("stairs") && Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScore(Minecraft.world.scoreboard.getParticipants().find(pT => pT.displayName == "seat:All Stairs")) == 1) {
        try {
            player.runCommand(`summon sit:seat ${data.block.location.x} ${data.block.location.y + .35} ${data.block.location.z}`)
            player.runCommandAsync(`ride @s start_riding @r[x=${data.block.location.x}, y=${data.block.location.y}, z=${data.block.location.z}, type=sit:seat]`)
        } catch (err) { console.error(err) }
    } else if (player.dimension.getBlock(data.block.location).typeId.includes("slab") && Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScore(Minecraft.world.scoreboard.getParticipants().find(pT => pT.displayName == "seat:All Slabs")) == 1) {
        player.runCommandAsync(`summon sit:seat ${data.block.location.x} ${data.block.location.y += 0.35} ${data.block.location.z} ${(data.block.permutation.getState("weirdo_direction") * 90)}`)
        player.runCommandAsync(`ride @s start_riding @r[x=${data.block.location.x}, y=${data.block.location.y}, z=${data.block.location.z}, type=sit:seat]`)
    } else for (let seat of Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScores()) if (seat.participant.displayName.startsWith("seatId")) {
        if (Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScore(Minecraft.world.scoreboard.getParticipants().find(pT => pT.displayName == seat.participant.displayName)) >= 1 && player.dimension.getBlock(data.block.location).typeId == seat.participant.displayName.replace("seatId:", "")) {
            player.runCommandAsync(`summon sit:seat ${data.block.location.x} ${data.block.location.y += Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScore(Minecraft.world.scoreboard.getParticipants().find(pT => pT.displayName == `height:${seat.participant.displayName.replace("seatId:", "")}`)) / 10} ${data.block.location.z}`)
            player.runCommandAsync(`ride @s start_riding @r[x=${data.block.location.x}, y=${data.block.location.y}, z=${data.block.location.z}, type=sit:seat]`)
        }
    }
})

Minecraft.system.run(function tick() {
    Minecraft.system.run(tick)


    try {
        Minecraft.world.getDimension("overworld").runCommand(`scoreboard objectives add sitOnStairs:data dummy "Sit On Stairs - Data"`)
        Minecraft.world.getDimension("overworld").runCommand(`scoreboard players set "seat:All Stairs" sitOnStairs:data 1`)
        Minecraft.world.getDimension("overworld").runCommand(`scoreboard players set "seat:All Slabs" sitOnStairs:data 1`)
    } catch { }

    for (let entity of Minecraft.world.getDimension("overworld").getEntities()) if (entity?.typeId == "sit:seat") {
        let playerNear = false
        entity.runCommandAsync(`testfor @a[r=1]`).then((res) => {
            if (res.successCount >= 1) playerNear = true
        })
        Minecraft.system.runTimeout(() => { if (!playerNear) entity.kill() }, 1)
    }

    for (let player of Minecraft.world.getPlayers()) if (player.hasTag("sitOnStairs:settings")) {
        player.removeTag("sitOnStairs:settings")

        new MinecraftUi.ActionFormData()
            .title("§r§fSit on Stairs §8- §fSettings§r")
            .button("Seats")
            .show(player).then((res) => {
                if (res.canceled) return

                if (res.selection == 0) {
                    let buttons = []
                    let form = new MinecraftUi.ActionFormData()

                    for (let data of Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScores()) if (data.participant.displayName.startsWith("seat")) {
                        let activated = Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScore(Minecraft.world.scoreboard.getParticipants().find(pT => pT.displayName == data.participant.displayName))
                        buttons.push({ value: `§r§8${data.participant.displayName.replace("seat:", "").replace("seatId:", "")}§r\n${`§fActivated: ${activated}`.replace("0", "§cFalse§r").replace("1", "§aTrue§r")}`, activated: activated, id: data.participant.displayName })
                    }
                    buttons.push({ value: "Add new Seat" })

                    for (let button of buttons) form.button(button.value)
                    form.show(player).then((res) => {
                        if (res.canceled) return

                        let selection = buttons[res.selection]
                        if (selection.value == "Add new Seat") {
                            new MinecraftUi.ModalFormData()
                                .title("§r§fSit on Stairs §8- §fSettings §8- §fAdd new Seat§r")
                                //.body("Made by DerCoderJo")
                                .textField("Block ID", "minecraft:stone")
                                .slider("Height", 0, 10, 1)
                                .show(player).then((res) => {
                                    player.runCommandAsync(`scoreboard players set "seatId:${res.formValues[0]}" sitOnStairs:data 1`)
                                    player.runCommandAsync(`scoreboard players set "height:${res.formValues[0]}" sitOnStairs:data ${res.formValues[1]}`)
                                })
                        } else {
                            if (selection.activated <= 0) selection.activated = false
                            else selection.activated = true

                            let modal = new MinecraftUi.ModalFormData()
                                .title(`§r§8Sit on Stairs §f- §8Settings §f- ${selection.value.split("\n")[0]}§r`)
                                .toggle("Activated", selection.activated)
                            if (!selection.id.startsWith("seat:")) {
                                modal.slider("Height", 0, 10, 1, parseInt(String(Minecraft.world.getDimension("overworld").runCommandAsync(`scoreboard players test "height:${selection.id.replace("seatId:", "")}" "sitOnStairs:data" *`).statusMessage?.split(" ")[1]), 10))
                            }
                            modal.show(player).then((res) => {
                                if (res.canceled) return

                                if (res?.formValues[0]) player.runCommandAsync(`scoreboard players set "${selection.id}" sitOnStairs:data 1`)
                                else player.runCommandAsync(`scoreboard players set "${selection.id}" sitOnStairs:data 0`)
                                if (res?.formValues[1]) player.runCommandAsync(`scoreboard players set "height:${selection.id.replace("seatId:").replace("undefined", "")}" sitOnStairs:data ${res.formValues[1]}`)
                            })
                        }
                    })
                }
            })
    }
})

Minecraft.system.beforeEvents.watchdogTerminate.subscribe((data) => data.cancel = true)

Minecraft.world.afterEvents.worldInitialize.subscribe(() => {
    console.warn("[Sit on Stairs] Loaded Addon")
})
