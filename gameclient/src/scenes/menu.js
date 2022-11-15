
import Phaser from '../lib/phaser.js'

export default class MenuScene extends Phaser.Scene {   

  constructor() {
    super("menu");      
  }
  
  preload(){
    this.load.image("tab-start","assets/start.png");
    this.load.image("gameName","assets/GameName.png")
    this.load.image("bg","assets/bg.png")
    this.load.image("char","assets/pngegg.png")
    const width  = this.scale.width;
    const height = this.scale.height;    
    this.center = {x: width/2, y: height/2};
  }
  create() {
    const bShader = new Phaser.Display.BaseShader('star', this.city);
    //const shader = this.add.shader(bShader, this.center.x, this.center.y, 16*60, 8*60);

    this.add.image(this.center.x, this.center.y, "bg");
    this.add.image(this.center.x, 330, "char");
    this.add.image(this.center.x, 500, "tab-start");
    this.add.image(this.center.x, 120, "gameName");

    this.input.on('pointerdown',() => this.scene.start("game") );
  }

}