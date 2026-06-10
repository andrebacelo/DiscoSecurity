// CenaPorta — a "fase porta", o loop principal do jogo.
//
// Ecrã único (1920x1080): a rua/discoteca é a imagem de fundo, o menu fica à
// esquerda. No JOGAR o menu sobe; os clientes entram a andar pela esquerda,
// param à frente da porta, e o jogador decide ← (barrar) ou → (deixar entrar)
// DENTRO de um tempo limite, comparando os atributos do cliente com as regras.
class CenaPorta extends Phaser.Scene {
  constructor() {
    super('CenaPorta');
  }

  static POS_PARAGEM_X = 1080; // onde o cliente pára, à frente da porta.
  static POS_Y = 645;
  static PORTA_X = 1635;        // para onde vai quando o deixamos entrar.
  static TEMPO_LIMITE = 5000;   // ms para decidir cada cliente.
  static FONTE = '"Press Start 2P"'; // fonte pixel (declarada no index.html).

  // preload() corre primeiro: carrega os ficheiros (imagens, som) para a
  // memória. 'fundo' é a chave; depois pedimos a imagem por esse nome.
  preload() {
    this.load.image('fundo', 'src/assets/images/fundo.png');
    this.load.image('seguranca', 'src/assets/images/seguranca.png');
    this.load.image('titulo', 'src/assets/images/titulo.png');
  }

  // init() corre antes de create(). Garante que vidas/pontos existem no
  // registry (estado partilhado que sobrevive entre cenas).
  init() {
    if (this.registry.get('vidas') === undefined) this.registry.set('vidas', 3);
    if (this.registry.get('pontos') === undefined) this.registry.set('pontos', 0);
  }

  create() {
    this.estado = 'menu';   // 'menu' ou 'jogo'
    this.aDecidir = false;  // true só quando há um cliente à espera de decisão
    this.timerTween = null; // referência ao tween da barra de tempo
    this.uiJogo = [];       // elementos de UI escondidos enquanto está o menu

    this.poolRegras = this.definirPoolRegras(); // o "saco" com todas as regras
    this.regras = this.escolherRegras(2);       // tira 2 ao calhas para começar

    this.construirFundo();
    this.construirSeguranca();
    this.construirQuadroRegras();
    this.construirHUD();
    this.construirTimer();
    this.construirMenu();

    // No arranque, a UI de jogo fica escondida (só aparece no JOGAR).
    this.uiJogo.forEach((o) => o.setVisible(false));

    // ESPAÇO: no menu, começa o jogo.
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.estado === 'menu') this.iniciarJogo();
    });
    // Setas: decisão (só atuam se houver cliente à espera).
    this.input.keyboard.on('keydown-LEFT', () => this.decidir('barrar'));
    this.input.keyboard.on('keydown-RIGHT', () => this.decidir('entrar'));
  }

  // ---------- Regras ----------
  // O "saco": todas as regras possíveis. Cada regra tem um label (a mostrar)
  // e um check(atributos) que devolve true se o cliente CUMPRE a regra.
  // Cliente "limpo" = cumpre todas as regras ATIVAS.
  definirPoolRegras() {
    return [
      { label: 'Idade mínima: 18', check: (a) => a.idade >= 18 },
      { label: 'Idade mínima: 21', check: (a) => a.idade >= 21 },
      { label: 'Proibido: crocs',  check: (a) => a.calcado !== 'crocs' },
      { label: 'Proibido: botas',  check: (a) => a.calcado !== 'botas' },
      { label: 'Proibido: chapéu', check: (a) => !a.chapeu },
    ];
  }

  // Tira n regras ao calhas do saco, sem repetir.
  escolherRegras(n) {
    // Shuffle baralha o array (como cartas). Uso uma CÓPIA (slice()) para não
    // estragar o saco original. Fico com as n primeiras.
    const baralhado = Phaser.Utils.Array.Shuffle(this.poolRegras.slice());
    return baralhado.slice(0, n);
  }

  // ---------- Fundo (a imagem da discoteca) ----------
  construirFundo() {
    // add.image(x, y, 'chave') desenha a imagem carregada no preload().
    // (960, 540) é o centro do ecrã (origem da imagem é o centro).
    const fundo = this.add.image(960, 540, 'fundo');
    fundo.setDisplaySize(1920, 1080); // estica para encher o ecrã.
  }

  // ---------- Segurança (imagem, à direita junto à porta) ----------
  construirSeguranca() {
    // Para afinares: muda o X (esq./dir.), o Y (cima/baixo) e a ALTURA.
    const X = 1450;
    const Y = 770;
    const ALTURA = 700;

    this.seguranca = this.add.image(X, Y, 'seguranca');
    // setScale com altura_alvo / altura_real mantém a proporção (não estica).
    this.seguranca.setScale(ALTURA / this.seguranca.height);
  }

  // ---------- Quadro de regras (canto sup. esq.) ----------
  construirQuadroRegras() {
    const painel = this.add.rectangle(40, 40, 620, 300, 0x12121a, 0.85)
      .setOrigin(0, 0).setStrokeStyle(2, 0x55557a).setDepth(1);
    const titulo = this.add.text(70, 60, 'REGRAS À PORTA', {
      fontFamily: CenaPorta.FONTE, fontSize: '22px', color: '#ffd166',
    }).setDepth(2);
    const lista = this.add.text(70, 130,
      this.regras.map((r) => '•  ' + r.label).join('\n'),
      { fontFamily: CenaPorta.FONTE, fontSize: '18px', color: '#dcdcff', lineSpacing: 20 }
    ).setDepth(2);

    this.uiJogo.push(painel, titulo, lista);
  }

  // ---------- HUD: vidas, pontos, feedback, dica ----------
  construirHUD() {
    this.hudVidas = this.add.text(1880, 40, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '30px', color: '#ff6b6b',
    }).setOrigin(1, 0).setDepth(2);
    this.hudPontos = this.add.text(1880, 100, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '22px', color: '#a8e6a3',
    }).setOrigin(1, 0).setDepth(2);
    this.feedback = this.add.text(960, 150, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '28px',
    }).setOrigin(0.5).setDepth(3);
    const dica = this.add.text(960, 1020, '←  Barrar          →  Deixar entrar', {
      fontFamily: CenaPorta.FONTE, fontSize: '18px', color: '#bbbbcc',
    }).setOrigin(0.5).setDepth(2);

    this.atualizarHUD();
    this.uiJogo.push(this.hudVidas, this.hudPontos, this.feedback, dica);
  }

  atualizarHUD() {
    const v = this.registry.get('vidas');
    this.hudVidas.setText(v > 0 ? '♥ '.repeat(v).trim() : '—');
    this.hudPontos.setText('Pontos: ' + this.registry.get('pontos'));
  }

  // ---------- Barra de tempo (por cima do cliente) ----------
  construirTimer() {
    const fundo = this.add.rectangle(1080, 300, 400, 30, 0x333344)
      .setStrokeStyle(2, 0x888899).setDepth(2);
    // Origem à esquerda: ao reduzir scaleX, a barra encolhe da direita p/ a esq.
    this.barraTempo = this.add.rectangle(880, 300, 400, 30, 0x4cc9f0)
      .setOrigin(0, 0.5).setDepth(2);

    this.uiJogo.push(fundo, this.barraTempo);
  }

  // ---------- Menu (título + opções, à esquerda) ----------
  construirMenu() {
    // Título: a imagem do logótipo. setOrigin(0,0) = ancorado no canto sup. esq.
    // Para afinares: muda X, Y e a ESCALA (1 = tamanho original).
    const titulo = this.add.image(90, 90, 'titulo').setOrigin(0, 0);
    titulo.setScale(1.8);

    // Opções: texto a sério → clicável (e traduzível PT/EN depois).
    const jogar  = this.criarOpcao(120, 420, 'JOGAR',  () => this.iniciarJogo());
    const opcoes = this.criarOpcao(120, 540, 'OPÇÕES', () => {}); // TODO: opções
    const sair   = this.criarOpcao(120, 660, 'QUIT',   () => {}); // TODO

    // Agrupo título + opções para subir o menu todo de uma vez no JOGAR.
    this.menu = this.add.container(0, 0, [titulo, jogar, opcoes, sair]);
    this.menu.setDepth(10);
  }

  // Cria um botão de menu: uma "placa" (moldura neon) com o texto por cima.
  // Devolve um container [moldura + texto] para se mover/agrupar como um só.
  // O texto fica separado da imagem → continua traduzível (PT/EN) depois.
  criarOpcao(x, y, texto, aoClicar) {
    const LARG = 360, ALT = 84;
    // Cores tiradas do próprio logótipo: rosa do "Disco", cião do "Security".
    const ROSA = 0xdf347b, CIAO = 0x2fcbe4; // normal / hover

    // Placa: fundo escuro semi-transparente + contorno neon rosa.
    const moldura = this.add.rectangle(0, 0, LARG, ALT, 0x12121a, 0.7)
      .setOrigin(0, 0.5).setStrokeStyle(4, ROSA);

    // Texto pixel, centrado na placa.
    const label = this.add.text(LARG / 2, 0, texto, {
      fontFamily: CenaPorta.FONTE, fontSize: '26px', color: '#ffffff',
    }).setOrigin(0.5);

    const botao = this.add.container(x, y, [moldura, label]);

    // A moldura é a zona clicável (área grande = mais fácil de acertar).
    moldura.setInteractive({ useHandCursor: true });
    moldura.on('pointerdown', aoClicar);
    // Hover: contorno fica cião e o texto amarelo (realce).
    moldura.on('pointerover', () => {
      moldura.setStrokeStyle(4, CIAO); label.setColor('#ffd166');
    });
    moldura.on('pointerout', () => {
      moldura.setStrokeStyle(4, ROSA); label.setColor('#ffffff');
    });
    return botao;
  }

  // ---------- JOGAR: reseta o jogo, mostra a UI, menu sobe, entra o cliente ----------
  iniciarJogo() {
    if (this.estado !== 'menu') return;
    this.estado = 'jogo';

    this.registry.set('vidas', 3);
    this.registry.set('pontos', 0);
    this.atualizarHUD();

    // Agora sim, mostra a UI de jogo (estava escondida no menu).
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
      // Só ao chegar é que se pode decidir — e arranca o timer.
      onComplete: () => {
        this.aDecidir = true;
        this.iniciarTimer();
      },
    });
  }

  // ---------- Timer por cliente ----------
  iniciarTimer() {
    this.barraTempo.scaleX = 1; // barra cheia
    this.timerTween = this.tweens.add({
      targets: this.barraTempo,
      scaleX: 0,
      duration: CenaPorta.TEMPO_LIMITE,
      ease: 'Linear',
      onComplete: () => this.tempoEsgotado(),
    });
  }

  pararTimer() {
    if (this.timerTween) {
      this.timerTween.remove(); // cancela o tween para não disparar o onComplete.
      this.timerTween = null;
    }
  }

  tempoEsgotado() {
    if (!this.aDecidir) return; // segurança: já tinha decidido.
    this.aDecidir = false;
    this.timerTween = null;

    this.registry.set('vidas', this.registry.get('vidas') - 1);
    this.mostrarFeedback('Tempo esgotado!', '#ff6b6b');
    this.voltarParaRua(this.cliente);
    this.atualizarHUD();
    this.proximaRonda();
  }

  // ---------- Decisão ----------
  decidir(acao) {
    if (!this.aDecidir) return; // ignora setas fora do momento de decisão.
    this.aDecidir = false;
    this.pararTimer();          // congela o tempo ao decidir.

    const a = this.cliente.atributos;
    const deveEntrar = this.regras.every((r) => r.check(a));
    const deixouEntrar = acao === 'entrar';
    const correta = deveEntrar === deixouEntrar;

    if (deixouEntrar) this.entrarPelaPorta(this.cliente);
    else this.voltarParaRua(this.cliente);

    if (correta) {
      this.registry.set('pontos', this.registry.get('pontos') + 1);
      this.mostrarFeedback('Certo!', '#a8e6a3');
    } else {
      this.registry.set('vidas', this.registry.get('vidas') - 1);
      if (!deveEntrar && deixouEntrar) {
        // ERRO GRAVE: entrou um proibido. Hook da perseguição.
        this.mostrarFeedback('Entrou um proibido!', '#ff6b6b');
        this.onIntrusoEntrou();
      } else {
        this.mostrarFeedback('Esse podia entrar!', '#ff6b6b');
      }
    }
    this.atualizarHUD();
    this.proximaRonda();
  }

  // Espera um pouco (para ler o feedback) e depois: Game Over ou próximo cliente.
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
    this.tweens.add({
      targets: cliente, x: CenaPorta.PORTA_X, scale: 0.6, alpha: 0,
      duration: 800, ease: 'Cubic.easeIn',
    });
  }

  voltarParaRua(cliente) {
    this.tweens.add({
      targets: cliente, x: -200, alpha: 0,
      duration: 800, ease: 'Cubic.easeIn',
    });
  }

  // -----------------------------------------------------------------
  // HOOK da perseguição. Por agora só regista — a vida já foi descontada
  // no decidir(). Quando a CenaPerseguicao existir, troca-se por:
  //   this.scene.pause();
  //   this.scene.launch('CenaPerseguicao', { atributos: this.cliente.atributos });
  // -----------------------------------------------------------------
  onIntrusoEntrou() {
    console.log('[TODO perseguição] intruso entrou:', this.cliente.atributos);
  }

  // ---------- Fim de jogo ----------
  gameOver() {
    this.scene.start('GameOverScene', { score: this.registry.get('pontos') });
  }
}
