// ©️ 2025 Hajsori. All Rights Reserved.

import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"


Minecraft.world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
    let player = data.player

    if (player.typeId !== "minecraft:player" || player.isSneaking) {
        return
    }

    const blockId = player.dimension.getBlock(data.block.location).typeId
    const dataScoreboard = Minecraft.world.scoreboard.getObjective("sitOnStairs:data")

    if (blockId.includes("stairs") && dataScoreboard.getScore("seat:All Stairs") == 1) {
        createSit(data.block, player, 0.35)
    
        data.cancel = true
    } else if (blockId.includes("slab") && dataScoreboard.getScore("seat:All Slabs") == 1) {
        createSit(data.block, player, 0.35)
    
        data.cancel = true
    } else {
        for (let seat of dataScoreboard.getScores()) {
            if (seat.participant.displayName.startsWith("seatId") && dataScoreboard.getScore(seat.participant.displayName) >= 1 && player.dimension.getBlock(data.block.location).typeId == seat.participant.displayName.replace("seatId:", "")) {
                createSit(data.block, player, dataScoreboard.getScore(`height:${seat.participant.displayName.replace("seatId:", "")}`) / 10)
    
                data.cancel = true
            }
        }
    }
})

Minecraft.system.runInterval(() => {
    const dimensions = [
        Minecraft.world.getDimension("overworld"),
        Minecraft.world.getDimension("nether"),
        Minecraft.world.getDimension("the_end")
    ]

    for (const dimension of dimensions) {
        for (const entity of dimension.getEntities()) {
            if (entity.typeId === "sit:seat") {
                const seatComponent = entity.getComponent(Minecraft.EntityComponentTypes.Rideable)
                if (seatComponent.getRiders().length == 0) {
                    entity.remove()
                }
            }
        }
    }
})

Minecraft.world.afterEvents.worldLoad.subscribe(() => {
    console.warn("[Sit on Stairs] Loaded Addon")

    if (!Minecraft.world.scoreboard.getObjective("sitOnStairs:data")) {
        const dataScoreboard = Minecraft.world.scoreboard.addObjective("sitOnStairs:data", "Sit on Stairs Data")
        dataScoreboard.addScore("seat:All Stairs", 1)
        dataScoreboard.addScore("seat:All Slabs", 1)
    }
})

Minecraft.system.beforeEvents.startup.subscribe((event) => {
    event.customCommandRegistry.registerCommand(
        {
            name: "sit:seats",
            description: "Opens the Sit on Stairs settings menu",
            permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors
        },
        (origin) => {
            Minecraft.system.run(() => {
                if (origin.sourceType == Minecraft.CustomCommandSource.Entity && origin.sourceEntity.typeId == "minecraft:player") {
                    showSettingsMenu(origin.sourceEntity)
                } else if (origin.sourceType == Minecraft.CustomCommandSource.NPCDialogue && origin.initiator.typeId == "minecraft:player") {
                    showSettingsMenu(origin.initiator)
                }
            })
        }
    )
})


/**
 * 
 * @param {Minecraft.Block} block 
 * @param {Minecraft.Player} player 
 * @param {number} yOffset 
 */
function createSit(block, player, yOffset = 0) {
    Minecraft.system.run(() => {
        if (!block.dimension.getEntitiesAtBlockLocation(block.location).find((entity) => entity.id === "sit:seat")) {
            const location = {
                x: block.location.x + 0.5,
                y: block.location.y + yOffset,
                z: block.location.z + 0.5
            }
            const seat = block.dimension.spawnEntity("sit:seat", location)
            const direction = block.permutation.getState("weirdo_direction")
            const directions = [
                { name: "west", offset: { x: -1, y: 0, z: 0 } },
                { name: "east", offset: { x: 1, y: 0, z: 0 } },
                { name: "north", offset: { x: 0, y: 0, z: -1 } },
                { name: "south", offset: { x: 0, y: 0, z: 1 } }
            ]
            
            if (directions[direction]) {
                const offset = directions[direction].offset
                const facingLocation = {
                    x: seat.location.x + offset.x,
                    y: seat.location.y + offset.y,
                    z: seat.location.z + offset.z
                }
                seat.teleport(seat.location, { facingLocation })
            }
            
            seat.getComponent(Minecraft.EntityComponentTypes.Rideable).addRider(player)
        }
    })
}

function showSettingsMenu(player) {
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
                .label("Made by Hajsori")
                .textField("Block ID", "minecraft:stone")
                .slider("Height", 0, 10, { defaultValue: 1 })
                .show(player).then((res) => {
                    player.runCommand(`scoreboard players set "seatId:${res.formValues[1]}" sitOnStairs:data 1`)
                    player.runCommand(`scoreboard players set "height:${res.formValues[1]}" sitOnStairs:data ${res.formValues[2]}`)
                })
        } else {
            if (selection.activated <= 0) selection.activated = false
            else selection.activated = true

            let modal = new MinecraftUi.ModalFormData()
                .title(`§r§8Sit on Stairs §f- §8Settings §f- ${selection.value.split("\n")[0]}§r`)
                .toggle("Activated", { defaultValue: selection.activated })

            if (!selection.id.startsWith("seat:")) {
                const height = Minecraft.world.scoreboard.getObjective("sitOnStairs:data").getScore(Minecraft.world.scoreboard.getParticipants().find(pT => pT.displayName == selection.id))
                modal.slider("Height", 0, 10, { defaultValue: height })
            }
            modal.toggle("Delete Seat", { defaultValue: false })
            
            modal.show(player).then((res) => {
                if (res.canceled) return

                if (res?.formValues[0]) {
                    player.runCommand(`scoreboard players set "${selection.id}" sitOnStairs:data 1`)
                } else {
                    player.runCommand(`scoreboard players set "${selection.id}" sitOnStairs:data 0`)
                }
                if (res?.formValues[1]) {
                    player.runCommand(`scoreboard players set "height:${selection.id.replace("seatId:").replace("undefined", "")}" sitOnStairs:data ${res.formValues[1]}`)
                }
                if (res?.formValues[2]) {
                    new MinecraftUi.MessageFormData()
                        .title("§r§8Sit on Stairs §f- §8Settings §f- §8Delete Seat")
                        .body(`§cAre you sure you want to delete the seat §2${selection.value.split("\n")[0]}§c?`)
                        .button1("§aNo")
                        .button2("§cYes")
                        .show(player).then((res) => {
                            if (res.canceled || res.selection == 0) {
                                return
                            }

                            if (res.selection == 1) {
                                player.runCommand(`scoreboard players reset "${selection.id}" sitOnStairs:data`)
                                player.runCommand(`scoreboard players reset "height:${selection.id.replace("seatId:").replace("undefined", "")}" sitOnStairs:data`)
                            }
                        })
                }
            })
        }
    })
}
