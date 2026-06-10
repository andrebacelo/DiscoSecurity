// GameOverScene — ecrã de fim de jogo. Mostra a pontuação e reinicia.
class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  // Recebe os dados passados no scene.start(..., { score }).
  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#15151f');

    this.add.text(960, 380, 'GAME OVER', {
      fontSize: '120px', color: '#ff6666', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(960, 540, `Pontos finais: ${this.finalScore}`, {
      fontSize: '56px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(960, 700, 'Pressiona ESPAÇO para recomeçar', {
      fontSize: '40px', color: '#a8e6a3',
    }).setOrigin(0.5);

    // Volta à CenaPorta, que abre no estado de menu.
    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('CenaPorta');
    });
  }
}
