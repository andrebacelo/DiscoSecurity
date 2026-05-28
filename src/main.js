// Cena mínima só para confirmar que o Phaser arranca
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.add.text(400, 270, 'Phaser 3 a funcionar', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(400, 312, 'Próximo passo: GameScene (a porta)', {
      fontSize: '16px',
      color: '#9a9ac6',
    }).setOrigin(0.5);
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
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene],
};

new Phaser.Game(config);
