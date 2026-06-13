// CenaPerseguicao — a fase de plataformas (interceção).
//
// Ecrã fixo, o intruso corre a direito para
// a saída (à direita); o segurança (jogador) persegue, salta e desvia-se de
// obstáculos. Física Arcade com gravidade PRÓPRIA (a global está a 0).
//
// O nível é GERADO ALEATORIAMENTE a cada perseguição (degrau, muro e
// obstáculos mudam de sítio), mas sempre dentro de limites que garantem
// que é possível
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
  static SOLO_TOPO_Y   = 1000;  // altura do chão (topo da superfície)
  static FONTE = '"Press Start 2P"';

  // Velocidade do intruso por dificuldade (a dificuldade vive no registry,
  // escolhida nas OPÇÕES do menu).
  static VEL_INTRUSO = { facil: 150, normal: 195, dificil: 250 };

  // Tipos de obstáculo: proporções e cores diferentes leem-se como coisas
  // diferentes no ecrã (caixa, coluna alta e estreita, mesa baixa e larga).
  // [min, max] de cada dimensão; todos saltáveis.
  static TIPOS_OBSTACULO = [
    { larg: [60, 95],   alt: [60, 95],   cor: 0xffa500 }, // caixa
    { larg: [38, 55],   alt: [120, 175], cor: 0x9b59b6 }, // coluna
    { larg: [130, 185], alt: [50, 70],   cor: 0x2ecc71 }, // mesa
  ];

  // preload() carrega os ficheiros desta cena para a memória.
  preload() {
    this.load.image('fundo-disco', 'src/assets/images/fundo-disco.png');
    this.load.image('seguranca', 'src/assets/images/seguranca.png');
    // Traduções (necessário para o modo de teste ?cena=perseguicao;
    // em jogo normal já estão na cache e o loader não repete).
    this.load.json('i18n-pt', 'i18n/pt.json');
    this.load.json('i18n-en', 'i18n/en.json');
  }

  // init() corre antes de create() e recebe os dados do launch().
  init(data) {
    // A CenaPorta lança com { atributos, infracoes } do cliente proibido.
    // Se a cena for aberta sozinha (?cena=perseguicao), usa valores de teste.
    this.atributos = (data && data.atributos) || { idade: 16, calcado: 'crocs' };
    this.infracoes = (data && data.infracoes) || [];
    this.resolvido = false;          // trava para não ganhar/perder duas vezes
    this.podeLevarEmpurrao = true;   // cooldown do empurrão dos obstáculos

    // Em jogo normal, a CenaPorta já criou isto. É só para testes isolados.
    if (this.registry.get('vidas') === undefined) this.registry.set('vidas', 3);
    if (this.registry.get('dificuldade') === undefined) this.registry.set('dificuldade', 'normal');
  }

  create() {
    I18N.carregar(this); // lê os JSON de tradução (carregados no preload)

    // (1) GRAVIDADE PRÓPRIA desta cena. A config global tem y:0; aqui ligamos.
    this.physics.world.gravity.y = CenaPerseguicao.GRAVIDADE;

    // fundo interior da disco
    this.add.image(960, 1080, 'fundo-disco').setOrigin(0.5, 1).setScale(1.25);

    // (2) CHÃO (grupo próprio): colidem o segurança E o intruso.
    this.chao = this.physics.add.staticGroup();
    this.criarChao(960, CenaPerseguicao.SOLO_TOPO_Y + 40, 1920, 80);

    // (3) NÍVEL ALEATÓRIO: degrau + muro + obstáculos, diferente a cada vez.
    this.plataformas = this.physics.add.staticGroup();
    this.obstaculos = this.physics.add.staticGroup();
    this.gerarNivel();

    // (4) SEGURANÇA (jogador): sprite real com corpo físico + gravidade.
    this.seguranca = this.physics.add.sprite(140, 860, 'seguranca');
    this.seguranca.setScale(230 / this.seguranca.height); // ~230px de altura
    this.seguranca.setCollideWorldBounds(true);           // não sai do ecrã
    this.physics.add.collider(this.seguranca, this.chao);        // pisa o chão
    this.physics.add.collider(this.seguranca, this.plataformas); // sobe degrau/muro

    // (5) INTRUSO: corre a direito (velocidade fixa). Só colide com o
    // chão — é ágil e passa por entre a multidão; o muro é problema apenas do seguranca.
    this.intruso = this.add.rectangle(360, 880, 70, 210, 0xff4d4d);
    this.physics.add.existing(this.intruso);
    this.intruso.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.intruso, this.chao);
    const dif = this.registry.get('dificuldade');
    this.velIntruso = CenaPerseguicao.VEL_INTRUSO[dif] || 195;
    this.intruso.body.setVelocityX(this.velIntruso);

    // Etiqueta com a infração por cima do intruso (segue-o no update).
    // A CenaPorta envia CHAVES de tradução; o texto final sai do I18N.
    const chaveInfracao = this.infracoes[0] || 'chase_intruso';
    this.labelIntruso = this.add.text(360, 740, I18N.t(chaveInfracao), {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '16px', color: '#ffffff',
      backgroundColor: '#c0392bdd', padding: { x: 8, y: 6 },
    }).setOrigin(0.5).setDepth(10);

    // (6) SAÍDA: zona à direita. Se o intruso lá chegar, falhaste.
    this.saida = this.add.rectangle(1860, 860, 70, 240, 0x2ecc71, 0.35);
    this.physics.add.existing(this.saida, true);          // 'true' = estático

    // (7) OVERLAPS: obstáculos empurram; intruso+segurança = vitória;
    // intruso+saída = derrota. Overlap deteta SEM bloquear (vs. collider).
    this.physics.add.overlap(this.seguranca, this.obstaculos, this.tocarObstaculo, null, this);
    this.physics.add.overlap(this.seguranca, this.intruso, this.apanhou, null, this);
    this.physics.add.overlap(this.intruso, this.saida, this.escapou, null, this);

    // (8) CONTROLOS: setas + WASD para mover, Espaço/↑/W para saltar.
    this.cursores = this.input.keyboard.createCursorKeys();
    this.teclas = this.input.keyboard.addKeys('A,D,W,SPACE');
    // ESC: pausa (congela esta cena e lança o menu de pausa por cima).
    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.resolvido) {
        this.scene.pause();
        this.scene.launch('CenaPausa', { de: 'CenaPerseguicao' });
      }
    });

    // (9) HUD: tempo (centro), vidas (esquerda) e dica (rodapé).
    // O tempo é CALCULADO: distância até à saída ÷ velocidade do intruso, por
    // isso o contador chega a 0 mesmo quando ele foge. No difícil ele é mais
    // rápido => menos tempo. distFuga = espaço até os bordos se tocarem.
    const distFuga = (this.saida.x - this.saida.width / 2) - (this.intruso.x + this.intruso.width / 2);
    this.tempoRestante = (distFuga / this.velIntruso) * 1000;
    this.hud = this.add.text(960, 60, '', {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '26px', color: '#ffd166',
      backgroundColor: '#12121acc', padding: { x: 14, y: 10 },
    }).setOrigin(0.5).setDepth(10);
    this.hudVidas = this.add.text(40, 40, '', {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '26px', color: '#ff6b6b',
      backgroundColor: '#12121acc', padding: { x: 12, y: 10 },
    }).setOrigin(0, 0).setDepth(10);
    this.atualizarVidas();
    this.add.text(960, 1030, I18N.t('chase_dica'), {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '18px', color: '#bbbbcc',
    }).setOrigin(0.5).setDepth(10);

    // (10) Aviso de entrada: aparece grande e desvanece (urgência!).
    const aviso = this.add.text(960, 420, I18N.t('chase_aviso'), {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '54px', color: '#ff6b6b',
      stroke: '#12121a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: aviso, alpha: 0, scale: 1.35, delay: 700, duration: 500,
      onComplete: () => aviso.destroy(),
    });
  }

  // ---------- Geração aleatória do nível ----------
  // Solvabilidade (porque é que nunca gera um nível impossível):
  //  - apogeu do salto = VEL_SALTO² / (2·GRAVIDADE) = 850²/2400 ≈ 300 px;
  //  - do chão (pés a 1000) os pés chegam a ~700 → o DEGRAU (topo 776-826)
  //    está sempre ao alcance;
  //  - do degrau, os pés chegam a ~475-525 → o topo do MURO (610-690) passa-se
  //    sempre com folga;
  //  - os OBSTÁCULOS nunca calham no corredor degrau→muro (para não levares
  //    empurrões a meio da subida) nem na zona de spawn/saída.
  gerarNivel() {
    const R = Phaser.Math.Between; // atalho: inteiro aleatório [min, max]

    // Dois padrões de nível: na maioria das vezes há degrau+muro a transpor;
    // 1 em cada 4 é uma "corrida de obstáculos" pura (sem muro, mais coisas
    // no chão). Assim duas perseguições seguidas raramente se parecem.
    const temMuro = R(1, 4) > 1;
    let proibidoMin = -1, proibidoMax = -1; // corredor de subida (sem obstáculos)
    let alvo;

    if (temMuro) {
      // Degrau e muro: posições e larguras aleatórias, gap saltável (190-260).
      const degrauX = R(620, 980);
      const muroX = degrauX + R(190, 260);
      this.criarPlataforma(degrauX, R(790, 840), R(210, 290), 28);
      this.criarMuro(muroX, R(610, 690), R(100, 150));
      proibidoMin = degrauX - 320;
      proibidoMax = muroX + 160;
      alvo = R(2, 4);
    } else {
      alvo = R(4, 6); // sem muro → mais obstáculos para compensar
    }

    // Obstáculos: tipo ao calhas (caixa/coluna/mesa), fora do corredor de
    // subida e com espaço entre eles para o salto ter onde aterrar.
    const usados = [];
    let tentativas = 0;
    while (usados.length < alvo && tentativas < 100) {
      tentativas++;
      const x = R(400, 1700);
      if (x > proibidoMin && x < proibidoMax) continue;          // corredor de subida
      if (usados.some((u) => Math.abs(u - x) < 200)) continue;   // muito perto de outro
      usados.push(x);
      this.criarObstaculo(x, Phaser.Utils.Array.GetRandom(CenaPerseguicao.TIPOS_OBSTACULO));
    }
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

    // A etiqueta da infração segue o intruso.
    this.labelIntruso.setPosition(this.intruso.x, this.intruso.y - 140);

    // Tempo (delta = ms desde o último frame). Fica vermelho nos últimos 3s.
    this.tempoRestante -= delta;
    this.hud.setText(Math.ceil(this.tempoRestante / 1000) + 's');
    this.hud.setColor(this.tempoRestante <= 3000 ? '#ff6b6b' : '#ffd166');
    if (this.tempoRestante <= 0) this.escapou();
  }

  // ---------- Ajudas para criar objetos ----------
  // Plataforma estática (degrau) com visual "disco": base escura + bordo cião.
  criarPlataforma(x, y, larg, alt, corNeon = 0x2fcbe4) {
    const p = this.add.rectangle(x, y, larg, alt, 0x0d0a18).setStrokeStyle(5, corNeon);
    this.plataformas.add(p); // ao juntar ao grupo estático ganha corpo estático
    return p;
  }

  // Chão (bordo rosa). Grupo próprio porque colidem segurança E intruso.
  criarChao(x, y, larg, alt) {
    const c = this.add.rectangle(x, y, larg, alt, 0x0d0a18).setStrokeStyle(5, 0xfe00bf);
    this.chao.add(c);
    return c;
  }

  // Muro alto: vai do 'topo' até ao chão. Vive no grupo das plataformas (só o
  // segurança colide). Bordo laranja para se ler como barreira.
  criarMuro(x, topo, larg = 120) {
    const alt = CenaPerseguicao.SOLO_TOPO_Y - topo;
    const m = this.add.rectangle(x, topo + alt / 2, larg, alt, 0x0d0a18).setStrokeStyle(5, 0xffa500);
    this.plataformas.add(m);
    return m;
  }

  // Obstáculo assente no chão (a base fica sempre a SOLO_TOPO_Y).
  // 'tipo' vem de TIPOS_OBSTACULO: dá os intervalos de tamanho e a cor.
  criarObstaculo(x, tipo) {
    const R = Phaser.Math.Between;
    const larg = R(tipo.larg[0], tipo.larg[1]);
    const alt = R(tipo.alt[0], tipo.alt[1]);
    const o = this.add.rectangle(x, CenaPerseguicao.SOLO_TOPO_Y - alt / 2, larg, alt, tipo.cor);
    this.obstaculos.add(o);
    return o;
  }

  // ---------- Eventos ----------
  // Empurrão ao tocar num obstáculo (com cooldown para não disparar 60x/s).
  // O abanão da câmara dá feedback físico sem precisar de animação.
  tocarObstaculo(seguranca) {
    if (!this.podeLevarEmpurrao) return;
    this.podeLevarEmpurrao = false;
    seguranca.body.setVelocityX(-420); // atira para trás
    seguranca.body.setVelocityY(-260); // e um pouco para cima
    this.cameras.main.shake(120, 0.004);
    this.time.delayedCall(600, () => { this.podeLevarEmpurrao = true; });
  }

  // Apanhaste o intruso -> recuperas a vida e voltas à porta.
  apanhou() {
    if (this.resolvido) return;
    this.resolvido = true;
    this.registry.set('vidas', this.registry.get('vidas') + 1);
    this.atualizarVidas();
    this.mostrarResultado(I18N.t('chase_apanhaste'), '#a8e6a3');
  }

  // O intruso escapou (chegou à saída ou acabou o tempo). A vida já tinha sido
  // perdida na CenaPorta, por isso aqui não se desconta de novo.
  escapou() {
    if (this.resolvido) return;
    this.resolvido = true;
    this.mostrarResultado(I18N.t('chase_escapou'), '#ff6b6b');
  }

  atualizarVidas() {
    const v = this.registry.get('vidas');
    this.hudVidas.setText(v > 0 ? '♥ '.repeat(v).trim() : '—');
  }

  // Mostra o resultado sobre um véu escuro e devolve o controlo à CenaPorta.
  mostrarResultado(texto, cor) {
    this.intruso.body.setVelocity(0, 0);
    this.seguranca.body.setVelocity(0, 0);
    this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.45).setDepth(15);
    this.add.text(960, 480, texto, {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '64px', color: cor,
      stroke: '#12121a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(20);
    this.time.delayedCall(1400, () => this.terminar());
  }

  terminar() {
    this.scene.stop();                 // fecha esta cena
    this.scene.resume('CenaPorta');    // retoma a fase porta onde estava
  }
}
