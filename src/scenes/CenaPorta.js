// CenaPorta — a "fase porta", o loop principal do jogo.
//
// Ecrã único: a rua/discoteca é a imagem de fundo, o menu fica à
// esquerda. No JOGAR o menu sobe; os clientes entram a andar pela esquerda,
// param à frente da porta, e o jogador decide ← (barrar) ou → (deixar entrar)
// DENTRO de um tempo limite, comparando os atributos do cliente com as regras.
class CenaPorta extends Phaser.Scene {
  constructor() {
    super('CenaPorta');
  }

  static POS_PARAGEM_X = 1050; // onde o cliente pára, à frente da porta.
  static POS_Y = 680;           // container Y — pés ficam a ~900 (chão).
  static PORTA_X = 1300;        // para onde vai quando o deixamos entrar.
  static FONTE = '"Press Start 2P"';

  // Tempo por dificuldade (ms).
  static TEMPOS = { facil: 7000, normal: 5000, dificil: 3500 };

  // Tempo para decidir cada cliente (ms), por dificuldade. A dificuldade
  // escolhe-se nas OPÇÕES e fica no registry (partilhada com a perseguição).
  static TEMPOS = { facil: 7000, normal: 5000, dificil: 3500 };

  // preload() corre primeiro: carrega os ficheiros (imagens, som) para a memoria.
  preload() {
    this.load.image('fundo', 'src/assets/images/fundo.png');
    this.load.image('seguranca', 'src/assets/images/seguranca2.png');
    this.load.image('titulo', 'src/assets/images/titulo.png');

    // --- Cliente base (sem acessórios) ---
    this.load.spritesheet('cliente_andar', 'src/assets/images/cliente_andar.png', {
      frameWidth: 356, frameHeight: 593
    });
    this.load.image('cliente_parado', 'src/assets/images/cliente_parado.png');

    // --- Cliente com chapéu (sem óculos) ---
    this.load.spritesheet('cliente_andar_chapeu', 'src/assets/images/cliente_andar_chapeu.png', {
      frameWidth: 418, frameHeight: 941
    });
    this.load.image('cliente_chapeu', 'src/assets/images/cliente_chapeu.png');

    // --- Cliente com óculos (sem chapéu) ---
    this.load.spritesheet('cliente_oculos', 'src/assets/images/cliente_oculos.png', {
      frameWidth: 384, frameHeight: 457
    });
    this.load.image('cliente_parado_oculos', 'src/assets/images/cliente_parado_oculos.png');

    // --- Cliente com chapéu + óculos ---
    this.load.spritesheet('cliente_chapeu_oculos_andar', 'src/assets/images/cliente_chapeu_oculos_andar.png', {
      frameWidth: 256, frameHeight: 372
    });
    this.load.image('cliente_chapeu_oculos_parado', 'src/assets/images/cliente_chapeu_oculos_parado.png');

    // Traduções
    this.load.json('i18n-pt', 'i18n/pt.json');
    this.load.json('i18n-en', 'i18n/en.json');
  }

  // init() corre antes de create(). Garante que vidas/pontos existem no
  // registry (estado partilhado que sobrevive entre cenas).
  init(data) {
    if (this.registry.get('vidas') === undefined) this.registry.set('vidas', 3);
    if (this.registry.get('pontos') === undefined) this.registry.set('pontos', 0);
    if (this.registry.get('dificuldade') === undefined) this.registry.set('dificuldade', 'normal');
    // Se veio de scene.restart({ reabrirOpcoes: true }), abre as opções logo.
    this.reabrirOpcoes = data && data.reabrirOpcoes;
  }

  create() {
    I18N.carregar(this); // lê os JSON de tradução

    this.estado = 'menu';   // 'menu', 'jogo', 'opcoes', 'comojogar', 'quit'
    this.aDecidir = false;
    this.timerTween = null;
    this.uiJogo = [];

    this.poolRegras = this.definirPoolRegras();
    this.regras = this.escolherRegras(1);

    this.construirFundo();
    this.construirSeguranca();
    this.construirQuadroRegras();
    this.construirHUD();
    this.construirTimer();
    this.construirMenu();
    this.construirPainelOpcoes();
    this.construirPainelComoJogar();

    // No arranque, a UI de jogo fica escondida (só aparece no JOGAR).
    this.uiJogo.forEach((o) => o.setVisible(false));

    // ESPAÇO: no menu, começa o jogo.
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.estado === 'menu') this.iniciarJogo();
    });
    // Setas: decisão (só atuam se houver cliente à espera).
    this.input.keyboard.on('keydown-LEFT', () => this.decidir('barrar'));
    this.input.keyboard.on('keydown-RIGHT', () => this.decidir('entrar'));
    // ESC: pausa durante o jogo.
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.estado === 'jogo') {
        this.scene.pause();
        this.scene.launch('CenaPausa', { de: 'CenaPorta' });
      }
    });

    // --- Criar animações de andar para cada variante ---
    if (!this.anims.exists('andar')) {
      this.anims.create({
        key: 'andar',
        frames: this.anims.generateFrameNumbers('cliente_andar', { start: 0, end: 3 }),
        frameRate: 8, repeat: -1
      });
    }
    if (!this.anims.exists('andar_chapeu')) {
      this.anims.create({
        key: 'andar_chapeu',
        frames: this.anims.generateFrameNumbers('cliente_andar_chapeu', { start: 0, end: 3 }),
        frameRate: 8, repeat: -1
      });
    }
    if (!this.anims.exists('andar_oculos')) {
      this.anims.create({
        key: 'andar_oculos',
        frames: this.anims.generateFrameNumbers('cliente_oculos', { start: 0, end: 3 }),
        frameRate: 8, repeat: -1
      });
    }
    if (!this.anims.exists('andar_chapeu_oculos')) {
      this.anims.create({
        key: 'andar_chapeu_oculos',
        frames: this.anims.generateFrameNumbers('cliente_chapeu_oculos_andar', { start: 0, end: 3 }),
        frameRate: 8, repeat: -1
      });
    }

    // Se veio de mudarLingua() (restart com reabrirOpcoes), abre o painel logo.
    if (this.reabrirOpcoes) this.abrirOpcoes();
  }

  // ---------- Regras ----------
  definirPoolRegras() {
    return [
      { label: 'regra_chapeu', check: (a) => !a.chapeu },
      { label: 'regra_oculos', check: (a) => !a.oculos },
    ];
  }

  escolherRegras(n) {
    const baralhado = Phaser.Utils.Array.Shuffle(this.poolRegras.slice());
    return baralhado.slice(0, n);
  }

  // ---------- Fundo ----------
  construirFundo() {
    const fundo = this.add.image(960, 540, 'fundo');
    fundo.setDisplaySize(1920, 1080);
  }

  // ---------- Segurança ----------
  construirSeguranca() {
    const X = 1350, Y = 990, ALTURA = 450;
    this.seguranca = this.add.image(X, Y, 'seguranca');
    this.seguranca.setOrigin(0.5, 1);
    this.seguranca.setScale(ALTURA / this.seguranca.height);
    this.seguranca.setDepth(5);
  }

  // ---------- Quadro de regras ----------
  construirQuadroRegras() {
    const painel = this.add.rectangle(40, 40, 620, 300, 0x12121a, 0.85)
      .setOrigin(0, 0).setStrokeStyle(2, 0x55557a).setDepth(1);
    const titulo = this.add.text(70, 60, I18N.t('regras_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '28px', color: '#ffd166', fontStyle: 'bold',
    }).setDepth(2);
    const lista = this.add.text(70, 120,
      this.regras.map((r) => '•  ' + I18N.t(r.label)).join('\n'),
      { fontFamily: CenaPorta.FONTE, fontSize: '20px', color: '#dcdcff', lineSpacing: 12 }
    ).setDepth(2);

    this.uiJogo.push(painel, titulo, lista);
  }

  // ---------- HUD ----------
  construirHUD() {
    this.hudVidas = this.add.text(1880, 40, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '36px', color: '#ff6b6b'
    }).setOrigin(1, 0).setDepth(2);
    this.hudPontos = this.add.text(1880, 100, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '28px', color: '#a8e6a3'
    }).setOrigin(1, 0).setDepth(2);
    this.feedback = this.add.text(960, 150, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '40px', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);
    const dica = this.add.text(960, 1020, I18N.t('dica_porta'), {
      fontFamily: CenaPorta.FONTE, fontSize: '22px', color: '#bbbbcc',
    }).setOrigin(0.5).setDepth(2);

    this.atualizarHUD();
    this.uiJogo.push(this.hudVidas, this.hudPontos, this.feedback, dica);
  }

  atualizarHUD() {
    const v = this.registry.get('vidas');
    this.hudVidas.setText(v > 0 ? '♥ '.repeat(v).trim() : '—');
    this.hudPontos.setText(I18N.t('hud_pontos') + this.registry.get('pontos'));
  }

  // ---------- Barra de tempo ----------
  construirTimer() {
    const timerX = CenaPorta.POS_PARAGEM_X;
    const timerY = 440;
    const timerW = 350;
    const fundo = this.add.rectangle(timerX, timerY, timerW, 24, 0x333344)
      .setStrokeStyle(2, 0x888899).setDepth(2);
    this.barraTempo = this.add.rectangle(timerX - timerW / 2, timerY, timerW, 24, 0x4cc9f0)
      .setOrigin(0, 0.5).setDepth(2);

    this.uiJogo.push(fundo, this.barraTempo);
  }

  // ---------- Menu ----------
  construirMenu() {
    const titulo = this.add.image(90, 90, 'titulo').setOrigin(0, 0);
    titulo.setScale(0.6);

    const jogar = this.criarOpcao(120, 620, I18N.t('menu_jogar'), () => this.iniciarJogo());
    const opcoes = this.criarOpcao(120, 740, I18N.t('menu_opcoes'), () => this.abrirOpcoes());
    const sair = this.criarOpcao(120, 860, I18N.t('menu_quit'), () => this.sair());

    this.menu = this.add.container(0, 0, [titulo, jogar, opcoes, sair]);
    this.menu.setDepth(10);
  }

  criarOpcao(x, y, texto, aoClicar, centrado = false) {
    const op = this.add.text(x, y, texto, {
      fontFamily: CenaPorta.FONTE, fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(centrado ? 0.5 : 0, 0.5);
    op.setInteractive({ useHandCursor: true });
    op.on('pointerdown', aoClicar);
    op.on('pointerover', () => op.setColor('#ffd166'));
    op.on('pointerout', () => op.setColor('#ffffff'));
    return op;
  }

  // ---------- Painel de Opções ----------
  construirPainelOpcoes() {
    const fundo = this.add.rectangle(960, 540, 800, 620, 0x12121a, 0.95)
      .setStrokeStyle(3, 0xfe00bf).setInteractive();
    const titulo = this.add.text(960, 290, I18N.t('opcoes_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '36px', color: '#ffd166',
    }).setOrigin(0.5);
    const clica = this.add.text(960, 340, I18N.t('opcoes_clica'), {
      fontFamily: CenaPorta.FONTE, fontSize: '14px', color: '#888899',
    }).setOrigin(0.5);

    this.labelDificuldade = this.criarLinhaOpcao(960, 430, () => this.mudarDificuldade());
    this.labelLingua = this.criarLinhaOpcao(960, 510, () => this.mudarLingua());
    const comoJogar = this.criarOpcao(960, 610, I18N.t('opcoes_como_jogar'),
      () => this.abrirComoJogar(), true);
    const voltar = this.criarOpcao(960, 720, I18N.t('opcoes_voltar'),
      () => this.fecharOpcoes(), true);

    this.painelOpcoes = this.add.container(0, 0,
      [fundo, titulo, clica, this.labelDificuldade, this.labelLingua, comoJogar, voltar]);
    this.painelOpcoes.setDepth(40).setVisible(false);
  }

  // ---------- Painel Como Jogar ----------
  construirPainelComoJogar() {
    const fundo = this.add.rectangle(960, 540, 900, 700, 0x12121a, 0.97)
      .setStrokeStyle(3, 0xfe00bf).setInteractive();
    const titulo = this.add.text(960, 240, I18N.t('comojogar_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '30px', color: '#ffd166',
    }).setOrigin(0.5);
    const texto = this.add.text(960, 530, I18N.t('comojogar_texto'), {
      fontFamily: CenaPorta.FONTE, fontSize: '14px', color: '#dcdcff',
      align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
    const voltar = this.criarOpcao(960, 840, I18N.t('opcoes_voltar'),
      () => this.fecharComoJogar(), true);

    this.painelComoJogar = this.add.container(0, 0, [fundo, titulo, texto, voltar]);
    this.painelComoJogar.setDepth(50).setVisible(false);
  }

  criarLinhaOpcao(x, y, aoClicar) {
    const linha = this.add.text(x, y, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    linha.on('pointerdown', aoClicar);
    linha.on('pointerover', () => linha.setColor('#ffd166'));
    linha.on('pointerout',  () => linha.setColor('#ffffff'));
    return linha;
  }

  abrirOpcoes() {
    if (this.estado !== 'menu') return;
    this.estado = 'opcoes';
    this.atualizarLinhasOpcoes();
    this.painelOpcoes.setVisible(true);
  }

  fecharOpcoes() {
    this.estado = 'menu';
    this.painelOpcoes.setVisible(false);
  }

  abrirComoJogar() {
    if (this.estado !== 'opcoes') return;
    this.estado = 'comojogar';
    this.painelComoJogar.setVisible(true);
  }

  fecharComoJogar() {
    this.estado = 'opcoes';
    this.painelComoJogar.setVisible(false);
  }

  mudarDificuldade() {
    const ordem = ['facil', 'normal', 'dificil'];
    const atual = ordem.indexOf(this.registry.get('dificuldade'));
    this.registry.set('dificuldade', ordem[(atual + 1) % ordem.length]);
    this.atualizarLinhasOpcoes();
  }

  mudarLingua() {
    I18N.trocar();
    this.scene.restart({ reabrirOpcoes: true });
  }

  atualizarLinhasOpcoes() {
    const d = this.registry.get('dificuldade');
    const seg = (CenaPorta.TEMPOS[d] / 1000).toString()
      .replace('.', I18N.lingua === 'pt' ? ',' : '.');
    this.labelDificuldade.setText(I18N.t('opcoes_dificuldade') + ':  '
      + I18N.t('dif_' + d) + '  (' + seg + 's)');
    this.labelLingua.setText(I18N.t('opcoes_lingua') + ':  ' + I18N.t('lingua_nome'));
  }

  // ---------- QUIT ----------
  sair() {
    if (this.estado !== 'menu') return;
    this.estado = 'quit';
    this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.93).setDepth(40);
    this.add.text(960, 500, I18N.t('quit_obrigado'), {
      fontFamily: CenaPorta.FONTE, fontSize: '40px', color: '#ffd166',
    }).setOrigin(0.5).setDepth(41);
    this.add.text(960, 580, I18N.t('quit_fechar'), {
      fontFamily: CenaPorta.FONTE, fontSize: '20px', color: '#bbbbcc',
    }).setOrigin(0.5).setDepth(41);
    this.time.delayedCall(400, () => window.close());
  }

  // ---------- JOGAR ----------
  iniciarJogo() {
    if (this.estado !== 'menu') return;
    this.estado = 'jogo';

    this.registry.set('vidas', 3);
    this.registry.set('pontos', 0);
    this.atualizarHUD();

    this.uiJogo.forEach((o) => o.setVisible(true));

    this.tweens.add({
      targets: this.menu,
      y: -1080,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => this.spawnCliente(),
    });
  }

  // ---------- Cliente entra a andar pela esquerda ----------
  spawnCliente() {
    if (this.cliente) this.cliente.destroy();

    this.aDecidir = false;
    this.feedback.setText('');
    this.cliente = new Cliente(this, -180, CenaPorta.POS_Y);

    this.tweens.add({
      targets: this.cliente,
      x: CenaPorta.POS_PARAGEM_X,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        this.cliente.parar();
        this.aDecidir = true;
        this.iniciarTimer();
      },
    });
  }

  // ---------- Timer por cliente ----------
  iniciarTimer() {
    this.barraTempo.scaleX = 1;
    this.timerTween = this.tweens.add({
      targets: this.barraTempo,
      scaleX: 0,
      duration: CenaPorta.TEMPOS[this.registry.get('dificuldade')],
      ease: 'Linear',
      onComplete: () => this.tempoEsgotado(),
    });
  }

  pararTimer() {
    if (this.timerTween) {
      this.timerTween.remove();
      this.timerTween = null;
    }
  }

  tempoEsgotado() {
    if (!this.aDecidir) return;
    this.aDecidir = false;
    this.timerTween = null;

    this.registry.set('vidas', this.registry.get('vidas') - 1);
    this.mostrarFeedback(I18N.t('fb_tempo'), '#ff6b6b');
    this.voltarParaRua(this.cliente);
    this.atualizarHUD();
    this.proximaRonda();
  }

  // ---------- Decisão ----------
  decidir(acao) {
    if (!this.aDecidir) return;
    this.aDecidir = false;
    this.pararTimer();

    const a = this.cliente.atributos;
    const deveEntrar = this.regras.every((r) => r.check(a));
    const deixouEntrar = acao === 'entrar';
    const correta = deveEntrar === deixouEntrar;

    if (deixouEntrar) this.entrarPelaPorta(this.cliente);
    else this.voltarParaRua(this.cliente);

    if (correta) {
      this.registry.set('pontos', this.registry.get('pontos') + 1);
      this.mostrarFeedback(I18N.t('fb_certo'), '#a8e6a3');
    } else {
      this.registry.set('vidas', this.registry.get('vidas') - 1);
      if (!deveEntrar && deixouEntrar) {
        this.mostrarFeedback(I18N.t('fb_entrou_proibido'), '#ff6b6b');
        this.onIntrusoEntrou();
      } else {
        this.mostrarFeedback(I18N.t('fb_podia_entrar'), '#ff6b6b');
      }
    }
    this.atualizarHUD();
    this.proximaRonda();
  }

  proximaRonda() {
    this.time.delayedCall(1000, () => {
      if (this.registry.get('vidas') <= 0) this.gameOver();
      else this.spawnCliente();
    });
  }

  mostrarFeedback(texto, cor) {
    this.feedback.setText(texto).setColor(cor);
  }

  entrarPelaPorta(cliente) {
    cliente.andar();
    this.tweens.add({
      targets: cliente, x: CenaPorta.PORTA_X, scale: 0.6, alpha: 0,
      duration: 800, ease: 'Cubic.easeIn',
    });
  }

  voltarParaRua(cliente) {
    cliente.andar();
    cliente.setFlip(true);
    this.tweens.add({
      targets: cliente, x: -200, alpha: 0,
      duration: 800, ease: 'Cubic.easeIn',
    });
  }

  // HOOK da perseguição: pausa a fase porta e lança a CenaPerseguicao,
  // passando os atributos do cliente (para o intruso mostrar a infração).
  onIntrusoEntrou() {
    const a = this.cliente.atributos;
    const infracoes = this.regras.filter((r) => !r.check(a)).map((r) => r.label);
    this.scene.pause();
    this.scene.launch('CenaPerseguicao', { atributos: a, infracoes });
  }

  // ---------- Fim de jogo ----------
  gameOver() {
    const m = this.registry.get('musMenu');
    if (m) m.stop(); // pára a música do menu (o Game Over tem o seu som)
    this.scene.start('GameOverScene', { score: this.registry.get('pontos') });
  }

  update() {
    if (this.cliente) this.cliente.updateAccessories();
  }
}
