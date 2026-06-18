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
  static GRAVIDADE = 1200;  // puxa para baixo nesta cena
  static VEL_SEGURANCA = 360;   // velocidade horizontal do jogador
  static VEL_SALTO = 850;   // impulso do salto (para cima)
  static SOLO_TOPO_Y = 1000;  // altura do chão (topo da superfície)
  static FONTE = '"Press Start 2P"';

  // Velocidade do intruso por dificuldade (a dificuldade vive no registry,
  // escolhida nas OPÇÕES do menu).
  static VEL_INTRUSO = { facil: 195, normal: 250, dificil: 310 };

  // Obstáculos do chão (saltáveis): cada um é um sprite com altura-alvo no
  // jogo (a largura sai da proporção). Apogeu do salto ≈ 300px.
  // hitW/hitH = fração da imagem que conta como colisão (o resto é brilho/ar).
  static TIPOS_OBSTACULO = [
    { tex: 'obs-caixa1', altura: 100, hitW: 0.70, hitH: 0.78 }, // uma caixa
    { tex: 'obs-mesa', altura: 120, hitW: 0.86, hitH: 0.55 }, // mesa (baixa, larga)
  ];

  // Muro (barreira alta a trepar): a coluna de som, escalada à altura.
  // (array para ser fácil juntar mais variantes de muro no futuro.)
  static TIPOS_MURO = ['obs-coluna'];

  // preload() carrega os ficheiros desta cena para a memória.
  preload() {
    this.load.image('fundo-disco', 'src/assets/images/fundo-disco.png');
    this.load.image('seguranca', 'src/assets/images/seguranca.png');
    // Sprites do nível. As pilhas altas (coluna, caixa) servem de MURO;
    // a caixa única e a mesa são os obstáculos do chão (saltáveis).
    this.load.image('obs-coluna', 'src/assets/images/obs-coluna.png');   // coluna → muro
    this.load.image('obs-caixa1', 'src/assets/images/obs-caixa1.png');   // caixa única → obstáculo
    this.load.image('obs-mesa', 'src/assets/images/obs-mesa.png');
    this.load.image('plataforma', 'src/assets/images/plataforma.png');
    // Sprites do intruso (o cliente que entrou — variantes chapéu/óculos).
    this.load.spritesheet('cliente_andar', 'src/assets/images/cliente_andar.png', { frameWidth: 356, frameHeight: 593 });
    this.load.spritesheet('cliente_andar_chapeu', 'src/assets/images/cliente_andar_chapeu.png', { frameWidth: 418, frameHeight: 941 });
    this.load.spritesheet('cliente_oculos', 'src/assets/images/cliente_oculos.png', { frameWidth: 384, frameHeight: 457 });
    this.load.spritesheet('cliente_chapeu_oculos_andar', 'src/assets/images/cliente_chapeu_oculos_andar.png', { frameWidth: 256, frameHeight: 372 });
    // Sons da perseguição.
    this.load.audio('salto', 'src/assets/audio/salto.mp3');
    this.load.audio('bonk', 'src/assets/audio/bonk.mp3');
    this.load.audio('apanhar', 'src/assets/audio/apanhar.mp3');
    this.load.audio('escapou', 'src/assets/audio/escapou.mp3');
    this.load.audio('musica-perseguicao', 'src/assets/audio/musica-perseguicao.mp3');
    // Sprites do cliente (para mostrar o intruso a fugir).
    this.load.spritesheet('cliente_andar', 'src/assets/images/cliente_andar.png', { frameWidth: 356, frameHeight: 593 });
    this.load.spritesheet('cliente_andar_chapeu', 'src/assets/images/cliente_andar_chapeu.png', { frameWidth: 418, frameHeight: 941 });
    this.load.spritesheet('cliente_oculos', 'src/assets/images/cliente_oculos.png', { frameWidth: 384, frameHeight: 457 });
    this.load.spritesheet('cliente_chapeu_oculos_andar', 'src/assets/images/cliente_chapeu_oculos_andar.png', { frameWidth: 256, frameHeight: 372 });
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

    // Música: baixa (pausa) a do menu e toca a da perseguição em loop.
    const mm = this.registry.get('musMenu'); if (mm) mm.pause();
    let mc = this.registry.get('musChase');
    if (!mc) {
      mc = this.sound.add('musica-perseguicao', { loop: true });
      this.registry.set('musChase', mc);
    }
    mc.setVolume(Som.volMusicaFaixa('musica-perseguicao')); // volume atual das opções
    mc.play();

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
    this.intruso = this.add.rectangle(360, 880, 70, 210, 0xff4d4d).setVisible(false);
    this.physics.add.existing(this.intruso);
    this.intruso.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.intruso, this.chao);
    const dif = this.registry.get('dificuldade');
    this.velIntruso = CenaPerseguicao.VEL_INTRUSO[dif] || 195;
    this.intruso.body.setVelocityX(this.velIntruso);

    // Sprite animado do intruso, na variante que entrou (chapéu/óculos).
    this.criarAnimacoesIntruso();
    const at = this.atributos;
    const variante = (at.chapeu && at.oculos) ? 'chapeu_oculos'
      : at.chapeu ? 'chapeu' : at.oculos ? 'oculos' : 'base';
    const VARS = {
      base: ['cliente_andar', 'andar'],
      chapeu: ['cliente_andar_chapeu', 'andar_chapeu'],
      oculos: ['cliente_oculos', 'andar_oculos'],
      chapeu_oculos: ['cliente_chapeu_oculos_andar', 'andar_chapeu_oculos'],
    };
    const [tex, anim] = VARS[variante];
    this.intrusoSprite = this.add.sprite(this.intruso.x, 0, tex).setOrigin(0.5, 1).setDepth(5);
    this.intrusoSprite.setScale(220 / this.intrusoSprite.height); // ~220px de altura
    this.intrusoSprite.play(anim);

    // Etiqueta removida a pedido do utilizador.

    // (6) ZONA DE FUGA: o intruso "perde-se na pista". Encostada à direita
    // (zona de colisão invisível) para a fuga só contar quase no fim do ecrã.
    this.saida = this.add.rectangle(1900, 540, 40, 1080, 0x000000, 0); // invisível
    this.physics.add.existing(this.saida, true);          // 'true' = estático
    this.criarFeixe();                                    // brilho da pista (visual)

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
      this.criarPlataforma(degrauX, R(790, 840), R(220, 300));
      this.criarMuro(muroX, R(610, 690));
      proibidoMin = degrauX - 320;
      proibidoMax = muroX + 200;
      alvo = R(1, 2);
    } else {
      alvo = R(3, 4); // sem muro → uns quantos a mais para compensar
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
    const esquerda = this.cursores.left.isDown || this.teclas.A.isDown;
    const direita = this.cursores.right.isDown || this.teclas.D.isDown;

    // Movimento horizontal (+ vira o sprite para o lado do movimento).
    if (esquerda) { corpo.setVelocityX(-CenaPerseguicao.VEL_SEGURANCA); this.seguranca.setFlipX(true); }
    else if (direita) { corpo.setVelocityX(CenaPerseguicao.VEL_SEGURANCA); this.seguranca.setFlipX(false); }
    else corpo.setVelocityX(0);

    // Salto: só quando os pés estão no chão (blocked.down).
    const querSaltar = this.cursores.up.isDown || this.teclas.W.isDown || this.teclas.SPACE.isDown;
    if (querSaltar && corpo.blocked.down) {
      corpo.setVelocityY(-CenaPerseguicao.VEL_SALTO);
      Som.efeito(this, 'salto', 0.5);
    }


    // O sprite do intruso segue o corpo (pés alinhados com a base do retângulo).
    this.intrusoSprite.setPosition(this.intruso.x, this.intruso.body.bottom);

    // Tempo (delta = ms desde o último frame). Fica vermelho nos últimos 3s.
    this.tempoRestante -= delta;
    this.hud.setText(Math.ceil(this.tempoRestante / 1000) + 's');
    this.hud.setColor(this.tempoRestante <= 3000 ? '#ff6b6b' : '#ffd166');
    if (this.tempoRestante <= 0) this.escapou();
  }

  // ---------- Ajudas para criar objetos ----------
  // Degrau: sprite da plataforma. Largura dada, altura pela proporção da imagem.
  // 'create' num grupo estático já dá corpo físico; depois de escalar é preciso
  // refreshBody() para o corpo de colisão bater certo com o novo tamanho.
  criarPlataforma(x, y, larg) {
    const p = this.plataformas.create(x, y, 'plataforma');
    p.setDisplaySize(larg, larg * p.height / p.width).refreshBody();
    return p;
  }

  // Chão (bordo rosa). Grupo próprio porque colidem segurança E intruso.
  criarChao(x, y, larg, alt) {
    const c = this.add.rectangle(x, y, larg, alt, 0x0d0a18).setStrokeStyle(5, 0xfe00bf);
    this.chao.add(c);
    return c;
  }

  // Muro alto: uma pilha (coluna OU caixa, à sorte) escalada para ir do 'topo'
  // até ao chão. Vive no grupo das plataformas (só o segurança colide).
  criarMuro(x, topo) {
    const alt = CenaPerseguicao.SOLO_TOPO_Y - topo;
    const tex = Phaser.Utils.Array.GetRandom(CenaPerseguicao.TIPOS_MURO);
    const m = this.plataformas.create(x, 0, tex);
    m.setScale(alt / m.height);                              // escala à altura do muro
    m.y = CenaPerseguicao.SOLO_TOPO_Y - m.displayHeight / 2; // assenta no chão
    m.refreshBody();
    return m;
  }

  // Obstáculo: sprite escalado para a altura-alvo do tipo (largura pela
  // proporção) e assente no chão (base a SOLO_TOPO_Y).
  // Brilho da pista (só visual): um GRADIENTE encostado à borda direita, só na
  // zona de baixo (um pouco mais alto que o boneco), forte no canto e a esbater
  // para a esquerda/cima. É aqui que o intruso "se enfia" e escapa.
  // fillGradientStyle dá uma cor + alpha por canto (precisa de WebGL).
  criarFeixe() {
    const VERDE = 0x33ff66;
    const X0 = 1620, LARG = 300;   // de x=1620 até à borda (1920)
    const Y0 = 0, ALT = 1000;    // do topo até um pouco acima da linha rosa do chão
    const g = this.add.graphics().setDepth(1);
    // cantos: (sup-esq, sup-dir, inf-esq, inf-dir) -> alphas: esquerda 0,
    // direita forte, mais intenso em baixo.
    g.fillGradientStyle(VERDE, VERDE, VERDE, VERDE, 0, 0.10, 0, 0.55);
    g.fillRect(X0, Y0, LARG, ALT);
    this.feixe = g;
    // Pulsa muito devagar (luz "viva", mas uniforme).
    this.tweens.add({
      targets: g, alpha: 0.8,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    return g;
  }

  // Cria as animações de andar do intruso (guard evita recriar / partilha com
  // a CenaPorta se já existirem).
  criarAnimacoesIntruso() {
    const defs = [
      ['andar', 'cliente_andar'],
      ['andar_chapeu', 'cliente_andar_chapeu'],
      ['andar_oculos', 'cliente_oculos'],
      ['andar_chapeu_oculos', 'cliente_chapeu_oculos_andar'],
    ];
    defs.forEach(([key, tex]) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 3 }),
          frameRate: 8, repeat: -1,
        });
      }
    });
  }

  criarObstaculo(x, tipo) {
    const o = this.obstaculos.create(x, 0, tipo.tex);
    o.setScale(tipo.altura / o.height);                       // mantém a proporção
    o.y = CenaPerseguicao.SOLO_TOPO_Y - o.displayHeight / 2;  // assenta no chão
    o.refreshBody();

    // Hitbox menor que a imagem (tira o brilho/ar à volta), centrada no
    // objeto e assente no chão — a colisão é por OVERLAP (empurrão).
    const w = o.displayWidth * tipo.hitW;
    const h = o.displayHeight * tipo.hitH;
    o.body.setSize(w, h);
    o.body.position.set(o.x - w / 2, CenaPerseguicao.SOLO_TOPO_Y - h);
    o.body.updateCenter();
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
    Som.efeito(this, 'bonk', 0.9);
    this.cameras.main.shake(120, 0.004);
    this.time.delayedCall(600, () => { this.podeLevarEmpurrao = true; });
  }

  // Apanhaste o intruso -> recuperas a vida e voltas à porta.
  apanhou() {
    if (this.resolvido) return;
    this.resolvido = true;
    this.registry.set('vidas', this.registry.get('vidas') + 1);
    this.atualizarVidas();
    Som.efeito(this, 'apanhar', 1);
    this.mostrarResultado(I18N.t('chase_apanhaste'), '#a8e6a3');
  }

  // O intruso escapou (chegou à saída ou acabou o tempo). A vida já tinha sido
  // perdida na CenaPorta, por isso aqui não se desconta de novo.
  escapou() {
    if (this.resolvido) return;
    this.resolvido = true;
    Som.efeito(this, 'escapou', 0.9);
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
    this.intrusoSprite.anims.stop(); // pára a animação de corrida do intruso
    this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.45).setDepth(15);
    this.add.text(960, 480, texto, {
      fontFamily: CenaPerseguicao.FONTE, fontSize: '64px', color: cor,
      stroke: '#12121a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(20);
    this.time.delayedCall(1400, () => this.terminar());
  }

  terminar() {
    const mc = this.registry.get('musChase'); if (mc) mc.stop(); // pára a música da perseguição
    const mm = this.registry.get('musMenu'); if (mm) mm.resume(); // retoma a do menu
    this.scene.stop();                 // fecha esta cena
    this.scene.resume('CenaPorta');    // retoma a fase porta onde estava
  }

  // ---------- Helpers para o sprite do intruso ----------
  obterVarianteIntruso(atributos) {
    if (atributos.chapeu && atributos.oculos) return 'chapeu_oculos';
    if (atributos.chapeu) return 'chapeu';
    if (atributos.oculos) return 'oculos';
    return 'base';
  }

  obterConfigIntruso(variante) {
    const configs = {
      base: { texture: 'cliente_andar', anim: 'andar', scale: 0.45 },
      chapeu: { texture: 'cliente_andar_chapeu', anim: 'andar_chapeu', scale: 0.35 },
      oculos: { texture: 'cliente_oculos', anim: 'andar_oculos', scale: 0.55 },
      chapeu_oculos: { texture: 'cliente_chapeu_oculos_andar', anim: 'andar_chapeu_oculos', scale: 0.70 },
    };
    return configs[variante] || configs.base;
  }
}
