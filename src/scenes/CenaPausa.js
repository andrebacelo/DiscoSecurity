// CenaPausa — menu de pausa (ESC durante o jogo).
//
// É uma cena LANÇADA POR CIMA da cena de jogo (scene.launch), que fica em
// pausa por baixo (scene.pause): a física, os tweens e os timers congelam
// sozinhos. 'de' diz-nos que cena pausámos, para a retomar no fim.
class CenaPausa extends Phaser.Scene {
  constructor() {
    super('CenaPausa');
  }

  preload() {
    // Som do clique (já em cache em jogo normal; o loader não repete).
    this.load.audio('ui-click', 'src/assets/audio/ui-click.mp3');
  }

  init(data) {
    this.cenaPausada = data.de; // 'CenaPorta' ou 'CenaPerseguicao'
  }

  create() {
    I18N.carregar(this);

    // Véu escuro por cima do jogo congelado.
    this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.6);

    this.add.text(960, 340, I18N.t('pausa_titulo'), {
      fontFamily: UI.FONTE, fontSize: '64px', color: '#ffd166',
      stroke: '#12121a', strokeThickness: 10,
    }).setOrigin(0.5);

    UI.criarBotao(this, 960, 510, I18N.t('pausa_continuar'), () => this.continuar(), true);
    UI.criarBotao(this, 960, 625, I18N.t('pausa_menu'), () => this.voltarAoMenu(), true);

    this.add.text(960, 730, I18N.t('pausa_dica'), {
      fontFamily: UI.FONTE, fontSize: '16px', color: '#bbbbcc',
    }).setOrigin(0.5);

    // ESC outra vez = continuar.
    this.input.keyboard.on('keydown-ESC', () => this.continuar());
  }

  continuar() {
    this.scene.stop();                    // fecha a pausa
    this.scene.resume(this.cenaPausada);  // descongela o jogo onde estava
  }

  voltarAoMenu() {
    // Se a pausa veio da perseguição, a CenaPorta também está parada por
    // baixo (foi ela que lançou a perseguição) — há que fechar as duas.
    if (this.cenaPausada === 'CenaPerseguicao') {
      const mc = this.registry.get('musChase'); if (mc) mc.stop(); // pára música da perseguição
      this.scene.stop('CenaPerseguicao');
      this.scene.stop('CenaPorta');
    } else {
      this.scene.stop('CenaPorta');
    }
    // start() fecha esta cena e arranca a CenaPorta do zero (abre no menu)
    // — a CenaPorta.create volta a pôr a música do menu a tocar.
    // reabrirOpcoes: false explícito (senão o Phaser reusa o data antigo).
    this.scene.start('CenaPorta', { reabrirOpcoes: false });
  }
}
