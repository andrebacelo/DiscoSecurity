// GameOverScene — ecrã de fim de jogo. Mostra a pontuação e reinicia.
class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  preload() {
    this.load.audio('gameover', 'src/assets/audio/gameover.mp3');
    // Traduções (já em cache em jogo normal; o loader não repete).
    this.load.json('i18n-pt', 'i18n/pt.json');
    this.load.json('i18n-en', 'i18n/en.json');
    this.load.json('i18n-es', 'i18n/es.json');
  }

  // Recebe os dados passados no scene.start(..., { score }).
  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    I18N.carregar(this);
    this.cameras.main.setBackgroundColor('#15151f');
    Som.efeito(this, 'gameover', 0.9);

    this.add.text(960, 380, I18N.t('go_titulo'), {
      fontFamily: '"Press Start 2P"', fontSize: '90px', color: '#ff6666',
    }).setOrigin(0.5);

    this.add.text(960, 540, I18N.t('go_pontos') + this.finalScore, {
      fontFamily: '"Press Start 2P"', fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(960, 700, I18N.t('go_reiniciar'), {
      fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#a8e6a3',
    }).setOrigin(0.5);

    // Volta à CenaPorta, que abre no estado de menu.
    this.input.keyboard.on('keydown-SPACE', () => {
      // reabrirOpcoes: false explícito — senão o Phaser reutiliza o data
      // antigo (da troca de língua) e o menu abria com as opções abertas.
      this.scene.start('CenaPorta', { reabrirOpcoes: false });
    });
  }
}
