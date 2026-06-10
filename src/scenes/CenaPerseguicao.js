// CenaPerseguicao — a fase de plataformas (interceção).
//
// Ecrã FIXO (1920x1080), sem câmara/scroll/IA. O intruso corre a direito para
// a saída (à direita); o segurança (jogador) persegue, salta e desvia-se de
// obstáculos. Física Arcade com gravidade PRÓPRIA (a global está a 0).
//
// Resultado:
//  - Apanhar o intruso (overlap) -> RECUPERA a vida (que a CenaPorta já tirou
//    quando deixaste entrar o proibido) e volta à porta.
//  - Intruso chega à saída OU acaba o tempo -> falhaste (a vida fica perdida).
class CenaPerseguicao extends Phaser.Scene {
  constructor() {
    super('CenaPerseguicao');
  }

  // Constantes afináveis num só sítio (mais fácil de equilibrar depois).
  static GRAVIDADE     = 1200;  // puxa para baixo nesta cena
  static VEL_SEGURANCA = 360;   // velocidade horizontal do jogador
  static VEL_SALTO     = 850;   // impulso do salto (para cima)
  static VEL_INTRUSO   = 190;   // velocidade do intruso (menor que a tua p/ ser apanhável)
  static TEMPO_FASE    = 12000; // ms de segurança (backup do "escapou")
  static SOLO_TOPO_Y   = 1000;  // altura do chão (topo da superfície)

  // preload() carrega os ficheiros desta cena para a memória.
  preload() {
    this.load.image('fundo-disco', 'src/assets/images/fundo-disco.png');
    this.load.image('seguranca', 'src/assets/images/seguranca.png');
  }

  // init() corre antes de create() e recebe os dados do launch().
  init(data) {
    // A CenaPorta lança com { atributos } do cliente proibido. Se a cena for
    // aberta sozinha (modo de teste), usa uns por defeito para não rebentar.
    this.atributos = (data && data.atributos) || { idade: 16, calcado: 'crocs' };
    this.resolvido = false;          // trava para não ganhar/perder duas vezes
    this.podeLevarEmpurrao = true;   // cooldown do empurrão dos obstáculos

    // Em jogo normal, a CenaPorta já criou 'vidas'. Isto é só para a cena
    // poder ser testada sozinha sem rebentar.
    if (this.registry.get('vidas') === undefined) this.registry.set('vidas', 3);
  }

  create() {
    // (1) GRAVIDADE PRÓPRIA desta cena. A config global tem y:0; aqui ligamos.
    this.physics.world.gravity.y = CenaPerseguicao.GRAVIDADE;

    // Fundo: interior da discoteca com "zoom fixo" — amplio a imagem 25% e
    // ancoro-a ao FUNDO do ecrã (origem 0.5,1), para a pista de dança ficar
    // ao nível do chão de jogo. As bordas cortadas dão a sensação de zoom
    // sem precisar de câmara/scroll.
    this.add.image(960, 1080, 'fundo-disco').setOrigin(0.5, 1).setScale(1.25);

    // (2) PLATAFORMAS estáticas (não se mexem). Grupo estático = sem gravidade.
    // Por agora só o CHÃO. As plataformas suspensas foram removidas: com o
    // boneco grande (230px) ficavam à altura da cabeça e travavam o salto.
    // A verticalidade vem dos obstáculos no chão (saltas por cima).
    this.plataformas = this.physics.add.staticGroup();
    this.criarPlataforma(960, CenaPerseguicao.SOLO_TOPO_Y + 40, 1920, 80, 0xfe00bf); // chão (neon rosa)

    // (3) SEGURANÇA (jogador): sprite real com corpo físico + gravidade.
    // physics.add.sprite já cria a imagem COM corpo Arcade de uma vez.
    this.seguranca = this.physics.add.sprite(140, 860, 'seguranca');
    this.seguranca.setScale(230 / this.seguranca.height); // ~230px de altura
    this.seguranca.setCollideWorldBounds(true);           // não sai do ecrã
    this.physics.add.collider(this.seguranca, this.plataformas); // pisa o chão

    // (4) INTRUSO: corre a direito (velocidade fixa, SEM IA).
    this.intruso = this.add.rectangle(360, 880, 70, 210, 0xff4d4d);
    this.physics.add.existing(this.intruso);
    this.intruso.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.intruso, this.plataformas);
    this.intruso.body.setVelocityX(CenaPerseguicao.VEL_INTRUSO);

    // (5) SAÍDA: zona à direita. Se o intruso lá chegar, falhaste.
    this.saida = this.add.rectangle(1860, 860, 70, 240, 0x2ecc71, 0.35);
    this.physics.add.existing(this.saida, true);          // 'true' = estático

    // (6) OBSTÁCULOS: usamos OVERLAP (deteta o toque mas NÃO bloqueia), ao
    // contrário do collider. Ao tocar, o jogador leva um empurrão.
    this.obstaculos = this.physics.add.staticGroup();
    this.criarObstaculo(780, 965);
    this.criarObstaculo(1280, 965);
    this.physics.add.overlap(this.seguranca, this.obstaculos, this.tocarObstaculo, null, this);

    // (7) VITÓRIA / DERROTA (também por overlap).
    this.physics.add.overlap(this.seguranca, this.intruso, this.apanhou, null, this);
    this.physics.add.overlap(this.intruso, this.saida, this.escapou, null, this);

    // (8) CONTROLOS: setas + WASD para mover, Espaço/↑/W para saltar.
    this.cursores = this.input.keyboard.createCursorKeys();
    this.teclas = this.input.keyboard.addKeys('A,D,W,SPACE');

    // (9) TIMER de segurança + HUD simples.
    this.tempoRestante = CenaPerseguicao.TEMPO_FASE;
    // Placa escura atrás do texto para se ler sobre a bola de espelhos.
    this.hud = this.add.text(960, 60, '', {
      fontFamily: '"Press Start 2P"', fontSize: '26px', color: '#ffd166',
      backgroundColor: '#12121acc', padding: { x: 14, y: 10 },
    }).setOrigin(0.5).setDepth(10);
    this.add.text(960, 1030, 'Apanha o intruso!  ←→ / A D mover   ESPAÇO saltar', {
      fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#bbbbcc',
    }).setOrigin(0.5).setDepth(10);
  }

  // Corre a cada frame: movimento, salto e contagem do tempo.
  update(time, delta) {
    if (this.resolvido) return;

    const corpo = this.seguranca.body;
    const esquerda = this.cursores.left.isDown  || this.teclas.A.isDown;
    const direita  = this.cursores.right.isDown || this.teclas.D.isDown;

    // Movimento horizontal (+ vira o sprite para o lado do movimento).
    if (esquerda)      { corpo.setVelocityX(-CenaPerseguicao.VEL_SEGURANCA); this.seguranca.setFlipX(true); }
    else if (direita)  { corpo.setVelocityX(CenaPerseguicao.VEL_SEGURANCA);  this.seguranca.setFlipX(false); }
    else               corpo.setVelocityX(0);

    // Salto: só quando os pés estão no chão (blocked.down).
    const querSaltar = this.cursores.up.isDown || this.teclas.W.isDown || this.teclas.SPACE.isDown;
    if (querSaltar && corpo.blocked.down) {
      corpo.setVelocityY(-CenaPerseguicao.VEL_SALTO);
    }

    // Tempo (delta = ms desde o último frame).
    this.tempoRestante -= delta;
    this.hud.setText(Math.ceil(this.tempoRestante / 1000) + 's');
    if (this.tempoRestante <= 0) this.escapou();
  }

  // ---------- Ajudas para criar objetos ----------
  // Plataforma estática com visual "disco": base escura + bordo neon.
  // corNeon por defeito = cião (as plataformas); o chão passa rosa.
  criarPlataforma(x, y, larg, alt, corNeon = 0x2fcbe4) {
    const p = this.add.rectangle(x, y, larg, alt, 0x0d0a18).setStrokeStyle(5, corNeon);
    this.plataformas.add(p); // ao juntar ao grupo estático ganha corpo estático
    return p;
  }

  criarObstaculo(x, y) {
    const o = this.add.rectangle(x, y, 70, 70, 0xffa500);
    this.obstaculos.add(o);
    return o;
  }

  // ---------- Eventos ----------
  // Empurrão ao tocar num obstáculo (com cooldown para não disparar 60x/s).
  tocarObstaculo(seguranca) {
    if (!this.podeLevarEmpurrao) return;
    this.podeLevarEmpurrao = false;
    seguranca.body.setVelocityX(-420); // atira para trás
    seguranca.body.setVelocityY(-260); // e um pouco para cima
    this.time.delayedCall(600, () => { this.podeLevarEmpurrao = true; });
  }

  // Apanhaste o intruso -> recuperas a vida e voltas à porta.
  apanhou() {
    if (this.resolvido) return;
    this.resolvido = true;
    this.registry.set('vidas', this.registry.get('vidas') + 1);
    this.mostrarResultado('APANHASTE!', '#a8e6a3');
  }

  // O intruso escapou (chegou à saída ou acabou o tempo). A vida já tinha sido
  // perdida na CenaPorta, por isso aqui não se desconta de novo.
  escapou() {
    if (this.resolvido) return;
    this.resolvido = true;
    this.mostrarResultado('ESCAPOU!', '#ff6b6b');
  }

  // Mostra o resultado um instante e depois devolve o controlo à CenaPorta.
  mostrarResultado(texto, cor) {
    this.intruso.body.setVelocity(0, 0);
    this.add.text(960, 480, texto, {
      fontFamily: '"Press Start 2P"', fontSize: '64px', color: cor,
    }).setOrigin(0.5).setDepth(20);
    this.time.delayedCall(1200, () => this.terminar());
  }

  terminar() {
    this.scene.stop();                 // fecha esta cena
    this.scene.resume('CenaPorta');    // retoma a fase porta onde estava
  }
}
