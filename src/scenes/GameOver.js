class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    this.add.text(400, 240, 'Game Over', {
      fontSize: '44px',
      color: '#ff6666',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 320, `Pontos finais: ${this.finalScore}`, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(400, 380, 'Pressiona ESPAÇO para reiniciar.', {
      fontSize: '18px',
      color: '#c2ffc2',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('BootScene');
    });
  }
}
