
import Phaser from '../lib/phaser.js'

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("game");
    }
    load_dragonbone(key, name, tex = "") {
        this.load.dragonbone(
            key,
            "assets/dragonbone/" + name + "_tex.png",
            "assets/dragonbone/" + name + "_tex.json",
            "assets/dragonbone/" + name + "_ske.dbbin",
            null,
            null,
            { responseType: "arraybuffer" }
        );
    }
    preload() {
        this.load_dragonbone("player", "player");
        this.load_dragonbone("monsters", "monster");
        this.load_dragonbone("items", "items");

        this.load.tilemapTiledJSON("map", "assets/dungeon_map.json");
        this.load.image("platform", "assets/dungeon_map.png");

        this.load.audio("jump_sfx","assets/sfx/jump-15984.mp3")
        this.load.audio("get_sfx","assets/sfx/getpoint.wav")
        // this.load.audio("atk1_sfx","assets/sfx/atk_1.wav")
        // this.load.audio("atk2_sfx","assets/sfx/atk_2.wav")
        this.load.audio("music_sfx","assets/sfx/sfx_music.mp3")
        this.load.audio("atk_sfx","assets/sfx/whoosh.mp3")

        const width  = this.scale.width;
        const height = this.scale.height; 
        this.center = {x: width/2, y: height/2};
    }
    create() {        
        this.song = this.sound.add('music_sfx', {volume: 0.1});
    	this.song.play();

        const width = this.scale.width;
        const height = this.scale.height;

        this.cameras.main.setDeadzone(width * 0.3, height * 0.2);

        this.map = this.make.tilemap({ key: "map" });
        const tileset = this.map.addTilesetImage("dungeon_map", "platform");
        this.layer_bg = this.map.createStaticLayer("bg", tileset, 0, 0);
        this.layer_ground = this.map.createDynamicLayer("g", tileset, 0, 0);
        this.layer_fg = this.map.createStaticLayer("fg", tileset, 0, 0);
        this.layer_bg.depth = -1;
        this.layer_fg.depth = 9;
        this.players = {};
        this.items = {};
        this.monsters = {};

        //this.players_group = this.add.group();
        this.cursors = this.input.keyboard.createCursorKeys();
        //this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);  // 32

        this.attackKey = this.input.keyboard.addKey(32); 

        this.leftKeyPressed = false;
        this.rightKeyPressed = false;
        this.upKeyPressed = false;

        this.attackPressed = false;

        // var p = this.add.armature("player_zombie", "player");
        // p.x =400; p.y = 400;

        this.create_socket();
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start("menu");
            // ตัดการติดต่อเมื่อกลับไปหน้าจอเมนู
            this.socket.disconnect();
        });

    }
    create_socket() {
        // connect game server  
        this.socket = io();
        // จัดการข้อมูลที่ได้รับจาก server
        this.socket.on('currentPlayers', (players) => {
            //console.log(players,this.socket);
            for (const id in players) {
                if (players[id].playerId === this.socket.id) {
                    this.me = this.displayPlayers(players[id]);
                    this.cameras.main.startFollow(this.me);
                } else {
                    this.displayPlayers(players[id]);
                }
            }
        });

        this.socket.on('currentItems', (items) => {
            for (const id in items) {
                var it = items[id];
                var iname = "01";
                if (it.color == "blue") iname = "02";
                if (it.color == "yellow") iname = "03";
                //var c = this.add.sprite(it.x, it.y, "items", it.tile);
                var c = this.add.armature("item_" + iname, "items");
                c.x = it.x;
                c.y = it.y;
                c.depth = 1;
                //c.animation.play("idle",-1);
                c.animation.gotoAndPlayByTime("idle", 100 * Math.random(), -1);
                c.id = id;
                c.item = it.item;
                c.setVisible(it.active);
                this.items[id] = c;
                // this.sound.play("jump_sfx")
            }
        });

        this.socket.on('newPlayer', (playerInfo) => {
            this.displayPlayers(playerInfo);
        });

        this.socket.on('removeItem', (itemid) => {
            if (this.items[itemid])
                this.sound.play("get_sfx");
                this.items[itemid].setVisible(false);
        }
        );

        this.socket.on('showItem', (itemid) => {
            if (this.items[itemid])
                this.items[itemid].setVisible(true);
        }
        );

        this.socket.on('removeplayer', (playerId) => {
            if (this.players[playerId]) {
                this.players[playerId].destroy();
                delete this.players[playerId];
            }
        });

        this.socket.on('playerUpdates', (players) => {
            for (var id in players) {
                if (this.players[id]) {
                    this.players[id].x = players[id].x;
                    this.players[id].y = players[id].y + 35;
                    //this.players[id].setFlipX(players[id].flipX);       // สำหรับ sprite
                    this.players[id].armature.flipX = players[id].flipX;  // สำหรับ dragonbone
                    this.players[id].label.text = "SCORE:" + players[id].score + " \nHP:" + players[id].hp;
                    if (this.players[id].animation_name != players[id].animation) {
                        this.players[id].animation_name = players[id].animation;
                        var loop = (players[id].animation=="dead")?1 : -1;  // -1 = infinity
                        this.players[id].animation.play(players[id].animation, loop);  // สำหรับ dragonbone

                    }
                }
            }
        });

        this.socket.on('currentMonsters', (list) => {
            for (const id in list) {
                var it = list[id];
                var c = this.add.armature("monster_" + it.sprite, "monsters");
                c.x = it.x;
                c.y = it.y + 35;
                c.depth = 1;
                c.animation.gotoAndPlayByTime("idle", 100 * Math.random(), -1);
                c.id = id;
                c.setVisible(it.active);
                c.label = this.add.text(-30, -110, "hp:");
                c.add(c.label);

                this.monsters[id] = c;
            }
        });

        this.socket.on('monstersUpdate', (list) => {
            for (var id in list) {
                if (this.monsters[id]) {
                    var it = list[id];
                    var c = this.monsters[id];
                    //c.setVisible(it.active);
                    c.label.text = "HP:" + it.hp;                    
                    if (!it.active) it.animation="dead";
                    c.x = it.x;
                    c.y = it.y;
                    c.armature.flipX = it.flipX;
                    if (c.animation_name != it.animation) {
                        c.animation_name = it.animation;
                        var loop = (it.animation=="dead")?1 : -1;  // -1 = infinity
                        c.animation.play(it.animation, loop);
                    }
                    //}
                }
            }
        });

        this.socket.on('disconnect', () => {
            this.socket.disconnect();
            this.scene.start("menu");
        });
    }

    update() {
        const left = this.leftKeyPressed;
        const right = this.rightKeyPressed;
        const jump = this.upKeyPressed;
        const attack = this.attackPressed;
        this.attackPressed = this.attackKey.isDown;

        if (this.cursors.left.isDown) {
            this.leftKeyPressed = true;
        } 
        else if (this.cursors.right.isDown) {
            this.rightKeyPressed = true;
        }
        else {
            this.leftKeyPressed = false;
            this.rightKeyPressed = false;
        }

        if (this.cursors.up.isDown) {
            this.sound.play("jump_sfx");
            this.upKeyPressed = true;
        } else {
            this.upKeyPressed = false;
        }

        if(this.cursors.space.isDown){
            this.sound.play("atk_sfx");
        }

        if (left !== this.leftKeyPressed || right !== this.rightKeyPressed || jump !== this.upKeyPressed ||
            attack !== this.attackPressed
        ) {
            this.socket.emit('playerInput',
                {
                    left: this.leftKeyPressed,
                    right: this.rightKeyPressed,
                    jump: this.upKeyPressed,
                    attack: this.attackPressed,
                });
        }
    }
    displayPlayers(playerInfo) {
        console.log(playerInfo);
        const player = this.add.armature("player_" + playerInfo.sprite, "player");
        player.animation.play("idle", -1);
        player.playerId = playerInfo.playerId;
        player.depth = 1;
        player.x = playerInfo.x;
        player.y = playerInfo.y + 35;
        player.label = this.add.text(-30, -130, "Score:");
        player.add(player.label);

        this.players[player.playerId] = player;
        return player;
    }
}
