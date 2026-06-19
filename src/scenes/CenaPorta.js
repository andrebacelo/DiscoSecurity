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

  static POS_PARAGEM_X = 1080; // onde o cliente pára, à frente da porta.
  static POS_Y = 645;
  static PORTA_X = 1635;        // para onde vai quando o deixamos entrar.
  static FONTE = '"Press Start 2P"'; // fonte pixel (declarada no index.html).

  // Banco de tempo máximo inicial (ms). Menor = mais rápido.
  static TEMPO_MAXIMO = 5000;
  // Taxa de redução (velocidade de esgotamento) baseada na dificuldade.
  static DRAIN_RATE = { facil: 1.0, normal: 1.5, dificil: 2.0 };

  // preload() corre primeiro: carrega os ficheiros (imagens, som) para a memoria.
  preload() {
    this.load.image('fundo', 'src/assets/images/fundo.png');
    this.load.image('seguranca_menu', 'src/assets/images/seguranca_menu.png');
    this.load.image('titulo', 'src/assets/images/titulo.png');

    // Sprites do cliente (variantes base / chapéu / óculos / chapéu+óculos).
    this.load.spritesheet('cliente_andar', 'src/assets/images/cliente_andar.png', { frameWidth: 356, frameHeight: 593 });
    this.load.image('cliente_parado', 'src/assets/images/cliente_parado.png');
    this.load.spritesheet('cliente_andar_chapeu', 'src/assets/images/cliente_andar_chapeu.png', { frameWidth: 418, frameHeight: 675 });
    this.load.image('cliente_chapeu', 'src/assets/images/cliente_chapeu.png');
    this.load.spritesheet('cliente_oculos', 'src/assets/images/cliente_oculos.png', { frameWidth: 384, frameHeight: 457 });
    this.load.image('cliente_parado_oculos', 'src/assets/images/cliente_parado_oculos.png');
    this.load.spritesheet('cliente_chapeu_oculos_andar', 'src/assets/images/cliente_chapeu_oculos_andar.png', { frameWidth: 256, frameHeight: 372 });
    this.load.image('cliente_chapeu_oculos_parado', 'src/assets/images/cliente_chapeu_oculos_parado.png');

    this.load.audio('ui-click', 'src/assets/audio/ui-click.mp3'); // clique dos botões
    this.load.audio('musica-menu', 'src/assets/audio/musica-menu.mp3'); // fundo do menu/porta
    this.load.audio('entrou', 'src/assets/audio/entrou.mp3');
    this.load.audio('barrado', 'src/assets/audio/barrado.mp3');
    this.load.audio('Entrou_errado', 'src/assets/audio/Entrou_errado.mp3');
    // Traduções (uma por língua). O loader ignora se já estiverem na cache.
        this.load.json('i18n-pt', 'i18n/pt.json');
        this.load.json('i18n-en', 'i18n/en.json');
  }
  init(data) {
    if (this.registry.get('vidas') === undefined) this.registry.set('vidas', 3);
    if (this.registry.get('pontos') === undefined) this.registry.set('pontos', 0);
    if (this.registry.get('dificuldade') === undefined) this.registry.set('dificuldade', 'normal');
    // Ao trocar de língua a cena reinicia — isto reabre o painel de opções.
    this.reabrirOpcoes = !!(data && data.reabrirOpcoes);
  }

  create() {
    I18N.carregar(this); // lê os JSON de tradução (carregados no preload)
    this.criarAnimacoesCliente(); // animações de andar (4 variantes)

    this.estado = 'menu';   // 'menu' ou 'jogo'
    this.aDecidir = false;  // true só quando há um cliente à espera de decisão
    this.timerTween = null; // referência ao tween da barra de tempo
    this.uiJogo = [];       // elementos de UI escondidos enquanto está o menu

    this.poolRegras = this.definirPoolRegras(); // o "saco" com todas as regras
    this.regras = [this.poolRegras[0]]; // Começa só com a regra 1 (chapéu)

    this.construirFundo();
    this.construirSeguranca();
    this.construirRegrasCentrais();
    this.construirHUD();
    this.construirTimer();
    this.construirMenu();
    this.construirPainelOpcoes();
    this.construirPainelComoJogar();

    // Ao voltar da perseguição (resume), o HUD pode estar desatualizado —
    // apanhar o intruso devolve uma vida e ninguém redesenhou os corações.
    this.events.on('resume', () => this.atualizarHUD());

    this.arrancarMusicaMenu(); // música de fundo do menu/porta (loop)

    // No arranque, a UI de jogo fica escondida (só aparece no JOGAR).
    this.uiJogo.forEach((o) => o.setVisible(false));

    // ESPAÇO: no menu, começa o jogo.
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.estado === 'menu') this.iniciarJogo();
    });
    // Setas: decisão (só atuam se houver cliente à espera).
    this.input.keyboard.on('keydown-LEFT', () => this.decidir('barrar'));
    this.input.keyboard.on('keydown-RIGHT', () => this.decidir('entrar'));
    // ESC: pausa (só durante o jogo — no menu não faz sentido).
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.estado === 'jogo') this.pausar();
    });

    // Se a cena reiniciou por troca de língua, volta a abrir as opções.
    if (this.reabrirOpcoes) this.abrirOpcoes();
  }

  // Pausa: congela esta cena e lança o menu de pausa por cima.
  pausar() {
    this.scene.pause();
    this.scene.launch('CenaPausa', { de: 'CenaPorta' });
  }

  // Cria as animações de "andar" do cliente (uma por variante de acessórios).
  // O guard anims.exists evita recriar ao reiniciar a cena (troca de língua).
  criarAnimacoesCliente() {
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

  // ---------- Regras ----------
  // O "saco": todas as regras possíveis. Cada regra tem um label (a mostrar)
  // e um check(atributos) que devolve true se o cliente CUMPRE a regra.
  // Cliente "limpo" = cumpre todas as regras ATIVAS.
  // O 'label' é uma CHAVE de tradução (i18n/pt.json, en.json) — o texto
  // final sai de I18N.t(label) no momento de desenhar.
  definirPoolRegras() {
    return [
      { label: 'regra_chapeu', check: (a) => !a.chapeu },
      { label: 'regra_oculos', check: (a) => !a.oculos },
    ];
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
    // Para alternar posicao: mudar o X (esq./dir.), o Y (cima/baixo) e a ALTURA.
    const X = 1450;
    const Y = 778;
    const ALTURA = 520;

    this.seguranca = this.add.image(X, Y, 'seguranca_menu');
    // setScale com altura_alvo / altura_real mantém a proporção (não estica).
    this.seguranca.setScale(ALTURA / this.seguranca.height);
    // Depth 4 = à FRENTE do cliente (depth 0), para o cliente entrar/desvanecer
    // por TRÁS do segurança. Fica abaixo do menu/painéis (depth ≥10).
    this.seguranca.setDepth(4);
  }

  // ---------- Regras Centrais ----------
  construirRegrasCentrais() {
    this.textoRegras = this.add.text(960, 160, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '32px', color: '#ffd166', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5).setDepth(2);
    this.uiJogo.push(this.textoRegras);
  }

  atualizarRegrasCentrais() {
    let chave = '';
    if (this.regras.length === 2) {
      chave = 'regra_ambos_grande';
    } else if (this.regras[0].label === 'regra_chapeu') {
      chave = 'regra_chapeu_grande';
    } else {
      chave = 'regra_oculos_grande';
    }
    this.textoRegras.setText(I18N.t(chave)); // String exata (sem toUpperCase)
  }

  // ---------- HUD: vidas, pontos, feedback, dica ----------
  construirHUD() {
    this.hudVidas = this.add.text(1880, 40, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '30px', color: '#ff6b6b',
    }).setOrigin(1, 0).setDepth(2);
    this.hudPontos = this.add.text(1880, 100, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '22px', color: '#a8e6a3',
    }).setOrigin(1, 0).setDepth(2);
    this.feedback = this.add.text(960, 250, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '28px',
    }).setOrigin(0.5).setDepth(3);
    const dica = this.add.text(960, 1020, I18N.t('dica_porta'), {
      fontFamily: CenaPorta.FONTE, fontSize: '18px', color: '#bbbbcc',
    }).setOrigin(0.5).setDepth(2);

    this.atualizarHUD();
    this.uiJogo.push(this.hudVidas, this.hudPontos, this.feedback, dica);
  }

  atualizarHUD() {
    const v = this.registry.get('vidas');
    this.hudVidas.setText(v > 0 ? '♥ '.repeat(v).trim() : '—');
    this.hudPontos.setText(I18N.t('hud_pontos') + this.registry.get('pontos'));
  }

  // ---------- Barra de tempo (ao centro, acima das regras) ----------
  construirTimer() {
    // Fundo da barra centrado em x=960, y=100 (600 de largura)
    const fundo = this.add.rectangle(960, 100, 600, 30, 0x333344)
      .setStrokeStyle(2, 0x888899).setDepth(2);
    // Barra que diminui: origem à esquerda (x=660) para encolher da direita para a esquerda
    this.barraTempo = this.add.rectangle(660, 100, 600, 30, 0x4cc9f0)
      .setOrigin(0, 0.5).setDepth(2);

    this.uiJogo.push(fundo, this.barraTempo);
  }

  // ---------- Menu (título + opções, à esquerda) ----------
  construirMenu() {
    // Título: a imagem do logótipo. setOrigin(0,0) = ancorado no canto sup. esq.
    // Para afinares: muda X, Y e a ESCALA (1 = tamanho original).
    const titulo = this.add.image(90, 90, 'titulo').setOrigin(0, 0);
    titulo.setScale(0.8);

    // Brilho neon a "respirar": adiciona um glow e faz pulsar a sua força.
    // postFX só existe em WebGL — protejo para não rebentar em Canvas.
    if (titulo.postFX) {
      const glow = titulo.postFX.addGlow(0xffffff, 2, 0); // branco suave
      this.tweens.add({
        targets: glow, outerStrength: 6,   // pulsa entre 2 e 6
        duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // Opções do menu (textos vêm do i18n — mudam com a língua).
    const jogar  = this.criarOpcao(120, 420, I18N.t('menu_jogar'),  () => this.iniciarJogo());
    const opcoes = this.criarOpcao(120, 540, I18N.t('menu_opcoes'), () => this.abrirOpcoes());
    const sair   = this.criarOpcao(120, 660, I18N.t('menu_quit'),   () => this.sair());

    // Agrupo título + opções para subir o menu todo de uma vez no JOGAR.
    this.menu = this.add.container(0, 0, [titulo, jogar, opcoes, sair]);
    this.menu.setDepth(10);
  }

  // Botão padrão do jogo — a implementação vive em UI.criarBotao (src/ui.js),
  // partilhada com as outras cenas (ex.: pausa) para o estilo ser sempre igual.
  criarOpcao(x, y, texto, aoClicar, centrado = false) {
    return UI.criarBotao(this, x, y, texto, aoClicar, centrado);
  }

  // ---------- Painel de OPÇÕES ----------
  // Um painel central escondido. Por agora tem uma opção real: a DIFICULDADE,
  // que muda o tempo para decidir (porta) e a velocidade do intruso (perseguição).
  construirPainelOpcoes() {
    // setInteractive() no fundo = painel "modal": apanha os cliques para não
    // passarem para os botões do menu por baixo.
    const fundo = this.add.rectangle(960, 540, 900, 620, 0x12121a, 0.95)
      .setStrokeStyle(3, 0x55557a).setInteractive();
    const titulo = this.add.text(960, 300, I18N.t('opcoes_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '30px', color: '#ffd166',
    }).setOrigin(0.5);

    // Linhas clicáveis: cada clique avança a opção (e dá a volta no fim).
    this.labelDificuldade = this.criarLinhaOpcao(960, 372, () => this.mudarDificuldade());
    this.labelLingua      = this.criarLinhaOpcao(960, 424, () => this.mudarLingua());
    this.labelMusica      = this.criarLinhaOpcao(960, 476, () => this.mudarMusica());
    this.labelEfeitos     = this.criarLinhaOpcao(960, 528, () => this.mudarEfeitos());

    const nota = this.add.text(960, 575, I18N.t('opcoes_clica'), {
      fontFamily: CenaPorta.FONTE, fontSize: '14px', color: '#888899',
    }).setOrigin(0.5);

    // Botões padrão (moldura rosa), centrados.
    const comoJogar = this.criarOpcao(960, 648, I18N.t('opcoes_como_jogar'),
      () => this.abrirComoJogar(), true);
    const voltar = this.criarOpcao(960, 748, I18N.t('opcoes_voltar'),
      () => this.fecharOpcoes(), true);

    this.painelOpcoes = this.add.container(0, 0,
      [fundo, titulo, this.labelDificuldade, this.labelLingua, this.labelMusica,
       this.labelEfeitos, nota, comoJogar, voltar]);
    this.painelOpcoes.setDepth(30).setVisible(false);
  }

  // Painel "COMO JOGAR" — abre POR CIMA do das opções (depth maior). O fundo
  // é interativo (modal): não deixa clicar no painel de opções por baixo.
  construirPainelComoJogar() {
    const fundo = this.add.rectangle(960, 540, 1180, 640, 0x12121a, 0.98)
      .setStrokeStyle(3, 0xfe00bf).setInteractive();
    const titulo = this.add.text(960, 290, I18N.t('comojogar_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '30px', color: '#ffd166',
    }).setOrigin(0.5);
    // align:'center' + \n no JSON dão o bloco de instruções já formatado.
    const texto = this.add.text(960, 530, I18N.t('comojogar_texto'), {
      fontFamily: CenaPorta.FONTE, fontSize: '16px', color: '#dcdcff',
      align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
    const voltar = this.criarOpcao(960, 790, I18N.t('opcoes_voltar'),
      () => this.fecharComoJogar(), true);

    this.painelComoJogar = this.add.container(0, 0, [fundo, titulo, texto, voltar]);
    this.painelComoJogar.setDepth(40).setVisible(false);
  }

  // Linha de definição clicável do painel (texto que muda ao clicar).
  criarLinhaOpcao(x, y, aoClicar) {
    const linha = this.add.text(x, y, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    linha.on('pointerdown', () => {
      Som.efeito(this, 'ui-click', 0.8);
      aoClicar();
    });
    linha.on('pointerover', () => linha.setColor('#ffd166'));
    linha.on('pointerout',  () => linha.setColor('#ffffff'));
    return linha;
  }

  abrirOpcoes() {
    if (this.estado !== 'menu') return;
    this.estado = 'opcoes'; // bloqueia JOGAR/ESPAÇO enquanto o painel está aberto
    this.atualizarLinhasOpcoes();
    this.painelOpcoes.setVisible(true);
  }

  fecharOpcoes() {
    this.estado = 'menu';
    this.painelOpcoes.setVisible(false);
  }

  abrirComoJogar() {
    if (this.estado !== 'opcoes') return;
    this.estado = 'comojogar'; // o painel de opções fica por baixo
    this.painelComoJogar.setVisible(true);
  }

  fecharComoJogar() {
    this.estado = 'opcoes'; // volta para o painel de opções
    this.painelComoJogar.setVisible(false);
  }

  mudarDificuldade() {
    const ordem = ['facil', 'normal', 'dificil'];
    const atual = ordem.indexOf(this.registry.get('dificuldade'));
    // O resto da divisão (%) faz a roda voltar ao início depois do último.
    this.registry.set('dificuldade', ordem[(atual + 1) % ordem.length]);
    this.atualizarLinhasOpcoes();
  }

  // Troca PT↔EN e REINICIA a cena: o create() volta a correr e desenha toda a UI já na língua nova
  mudarLingua() {
    I18N.trocar();
    this.scene.restart({ reabrirOpcoes: true });
  }

  // Volume da música: avança o nível, guarda e aplica já às músicas a tocar.
  mudarMusica() {
    Som.musica = Som.proximo(Som.musica);
    Som.guardar();
    Som.aplicarMusica(this.registry.get('musMenu'));
    Som.aplicarMusica(this.registry.get('musChase'));
    this.atualizarLinhasOpcoes();
  }

  // Volume dos efeitos: avança o nível e guarda (o próximo SFX já sai assim).
  mudarEfeitos() {
    Som.efeitos = Som.proximo(Som.efeitos);
    Som.guardar();
    this.atualizarLinhasOpcoes();
  }

  atualizarLinhasOpcoes() {
    const d = this.registry.get('dificuldade');
    const segs = (CenaPorta.TEMPO_MAXIMO / 1000) / CenaPorta.DRAIN_RATE[d];
    const segTexto = segs.toFixed(1).replace('.', I18N.lingua === 'pt' ? ',' : '.');
    this.labelDificuldade.setText(I18N.t('opcoes_dificuldade') + ':  '
      + I18N.t('dif_' + d) + '  (' + segTexto + 's)');
    this.labelLingua.setText(I18N.t('opcoes_lingua') + ':  ' + I18N.t('lingua_nome'));
    this.labelMusica.setText(I18N.t('opcoes_musica') + ':  ' + Som.percent(Som.musica));
    this.labelEfeitos.setText(I18N.t('opcoes_efeitos') + ':  ' + Som.percent(Som.efeitos));
  }

  // ---------- QUIT ----------
  // Num browser não se pode fechar um separador que não foi aberto por script;
  // tentamos o window.close() e, se não der, fica o ecrã de despedida.
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
    this.tempoAtual = CenaPorta.TEMPO_MAXIMO;
    this.drainRate = CenaPorta.DRAIN_RATE[this.registry.get('dificuldade')];
    this.regras = [this.poolRegras[0]]; // Reseta as regras
    this.atualizarRegrasCentrais();
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
      // Só ao chegar é que se pode decidir — e arranca o timer.
      onComplete: () => {
        this.cliente.parar(); // pára a animação e mostra a sprite de frente
        this.aDecidir = true;
        this.iniciarTimer();
      },
    });
  }

  // ---------- Timer Contínuo ----------
  iniciarTimer() {
    this.barraTempo.scaleX = Phaser.Math.Clamp(this.tempoAtual / CenaPorta.TEMPO_MAXIMO, 0, 1);
  }

  pararTimer() {
    // Apenas marcação; a lógica para de descer porque this.aDecidir fica false
  }

  tempoEsgotado() {
    if (!this.aDecidir) return; // segurança: já tinha decidido.
    this.aDecidir = false;

    this.registry.set('vidas', this.registry.get('vidas') - 1);
    this.mostrarFeedback(I18N.t('fb_tempo'), '#ff6b6b');
    this.voltarParaRua(this.cliente);
    
    // Devolve totalmente o tempo para não perder em loop
    this.tempoAtual = CenaPorta.TEMPO_MAXIMO;
    this.barraTempo.scaleX = 1;
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
    else {
      this.voltarParaRua(this.cliente);
    }

    if (correta) {
      this.registry.set('pontos', this.registry.get('pontos') + 1);
      this.mostrarFeedback(I18N.t('fb_certo'), '#a8e6a3');
      Som.efeito(this, 'entrou');
      // Ganha tempo com acertos (ex: 1.5s em vez de 2.5s para manter a dificuldade)
      this.tempoAtual += 1500;
      if (this.tempoAtual > CenaPorta.TEMPO_MAXIMO) this.tempoAtual = CenaPorta.TEMPO_MAXIMO;
      this.verificarProgressao();
    } else {
      this.registry.set('vidas', this.registry.get('vidas') - 1);
      if (!deveEntrar && deixouEntrar) {
        // ERRO GRAVE: entrou um proibido. Hook da perseguição.
        Som.efeito(this, 'Entrou_errado');
        this.mostrarFeedback(I18N.t('fb_entrou_proibido'), '#ff6b6b');
        this.onIntrusoEntrou();
      } else {
        Som.efeito(this, 'barrado');
        this.mostrarFeedback(I18N.t('fb_podia_entrar'), '#ff6b6b');
      }
    }
    
    this.barraTempo.scaleX = Phaser.Math.Clamp(this.tempoAtual / CenaPorta.TEMPO_MAXIMO, 0, 1);
    this.atualizarHUD();
    this.proximaRonda();
  }

  verificarProgressao() {
    const pts = this.registry.get('pontos');
    
    // Acelera de forma incremental
    this.drainRate += 0.05; 

    // Muda as regras em patamares
    if (pts === 5) {
      this.regras = [this.poolRegras[1]]; // Só óculos
      this.atualizarRegrasCentrais();
      this.mostrarFeedback(I18N.t('fb_nova_regra'), '#ffd166');
    } else if (pts === 10) {
      this.regras = [this.poolRegras[0], this.poolRegras[1]]; // Ambos
      this.atualizarRegrasCentrais();
      this.mostrarFeedback(I18N.t('fb_duas_regras'), '#ffd166');
    }
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
    cliente.andar(); // volta a andar ao entrar pela porta
    this.tweens.add({
      targets: cliente, x: CenaPorta.PORTA_X, scale: 0.6, alpha: 0,
      duration: 800, ease: 'Cubic.easeIn',
    });
  }

  voltarParaRua(cliente) {
    cliente.andar();
    cliente.setFlip(true); // vira-se para a esquerda ao ser barrado
    this.tweens.add({
      targets: cliente, x: -200, alpha: 0,
      duration: 800, ease: 'Cubic.easeIn',
    });
  }

  // HOOK da perseguição: pausa a fase porta e lança a CenaPerseguicao,
  // passando os atributos do cliente (para o intruso mostrar a infração).
  // A vida já foi descontada no decidir(); apanhar o intruso recupera-a.
  // Quando a perseguição acaba, faz scene.resume('CenaPorta') e o jogo
  // continua aqui — a proximaRonda() já agendada trata do próximo cliente.
  onIntrusoEntrou() {
    // As infrações são as regras ativas que este cliente NÃO cumpre.
    // A perseguição mostra a primeira numa etiqueta por cima do intruso.
    const a = this.cliente.atributos;
    const infracoes = this.regras.filter((r) => !r.check(a)).map((r) => r.label);
    this.scene.pause();
    this.scene.launch('CenaPerseguicao', { atributos: a, infracoes });
  }

  // ---------- Música de fundo ----------
  // Loop do menu/porta. A instância vive no registry para sobreviver a
  // reinícios da cena (troca de língua) sem duplicar. Os browsers bloqueiam
  // áudio até à 1ª interação — se estiver "locked", arranca no 1º clique/tecla.
  arrancarMusicaMenu() {
    let m = this.registry.get('musMenu');
    if (!m) {
      m = this.sound.add('musica-menu', { loop: true });
      this.registry.set('musMenu', m);
    }
    m.setVolume(Som.volMusicaFaixa('musica-menu')); // volume atual das opções
    if (m.isPlaying) return;
    if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, () => m.play());
    else m.play();
  }

  // ---------- Fim de jogo ----------
  gameOver() {
    const m = this.registry.get('musMenu');
    if (m) m.stop(); // pára a música do menu (o Game Over tem o seu som)
    this.scene.start('GameOverScene', { score: this.registry.get('pontos') });
  }

  update(time, delta) {
    if (this.cliente) this.cliente.updateAccessories();
    
    // O tempo esgota de forma contínua apenas enquanto o jogador tem de decidir
    if (this.estado === 'jogo' && this.aDecidir && !this.scene.isPaused('CenaPorta')) {
      this.tempoAtual -= delta * this.drainRate;
      if (this.tempoAtual <= 0) {
        this.tempoAtual = 0;
        this.tempoEsgotado();
      }
      this.barraTempo.scaleX = Phaser.Math.Clamp(this.tempoAtual / CenaPorta.TEMPO_MAXIMO, 0, 1);
    }
  }
}
