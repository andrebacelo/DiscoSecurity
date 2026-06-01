class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.add.text(400, 200, 'Disco Security', {
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 280, 'És o segurança da discoteca.', {
      fontSize: '20px',
      color: '#f7f7f7',
    }).setOrigin(0.5);

    this.add.text(400, 330, 'Usa as setas para mover o guarda.', {
      fontSize: '18px',
      color: '#c2c2ff',
    }).setOrigin(0.5);

    this.add.text(400, 360, 'Pressiona ESPAÇO para começar.', {
      fontSize: '18px',
      color: '#c2ffc2',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('CenaPorta');
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#1d1d2b',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, CenaPorta, GameOverScene],
};

new Phaser.Game(config);
