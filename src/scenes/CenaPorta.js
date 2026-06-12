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

  // Tempo para decidir cada cliente (ms), por dificuldade. A dificuldade
  // escolhe-se nas OPÇÕES e fica no registry (partilhada com a perseguição).
  static TEMPOS = { facil: 7000, normal: 5000, dificil: 3500 };

  // preload() corre primeiro: carrega os ficheiros (imagens, som) para a memoria.
  preload() {
    this.load.image('fundo', 'src/assets/images/fundo.png');
    this.load.image('seguranca', 'src/assets/images/seguranca.png');
    this.load.image('titulo', 'src/assets/images/titulo.png');
    // Traduções (uma por língua). O loader ignora se já estiverem na cache.
    this.load.json('i18n-pt', 'i18n/pt.json');
    this.load.json('i18n-en', 'i18n/en.json');
  }

  // init() corre antes de create(). Garante que vidas/pontos existem no
  // registry (estado partilhado que sobrevive entre cenas).
  init(data) {
    if (this.registry.get('vidas') === undefined) this.registry.set('vidas', 3);
    if (this.registry.get('pontos') === undefined) this.registry.set('pontos', 0);
    if (this.registry.get('dificuldade') === undefined) this.registry.set('dificuldade', 'normal');
    // Ao trocar de língua a cena reinicia — isto reabre o painel de opções.
    this.reabrirOpcoes = !!(data && data.reabrirOpcoes);
  }

  create() {
    I18N.carregar(this); // lê os JSON de tradução (carregados no preload)

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
    this.construirPainelOpcoes();

    // Ao voltar da perseguição (resume), o HUD pode estar desatualizado —
    // apanhar o intruso devolve uma vida e ninguém redesenhou os corações.
    this.events.on('resume', () => this.atualizarHUD());

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

  // ---------- Regras ----------
  // O "saco": todas as regras possíveis. Cada regra tem um label (a mostrar)
  // e um check(atributos) que devolve true se o cliente CUMPRE a regra.
  // Cliente "limpo" = cumpre todas as regras ATIVAS.
  // O 'label' é uma CHAVE de tradução (i18n/pt.json, en.json) — o texto
  // final sai de I18N.t(label) no momento de desenhar.
  definirPoolRegras() {
    return [
      { label: 'regra_idade18', check: (a) => a.idade >= 18 },
      { label: 'regra_idade21', check: (a) => a.idade >= 21 },
      { label: 'regra_crocs',   check: (a) => a.calcado !== 'crocs' },
      { label: 'regra_botas',   check: (a) => a.calcado !== 'botas' },
      { label: 'regra_chapeu',  check: (a) => !a.chapeu },
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
    // Para alternar posicao: mudar o X (esq./dir.), o Y (cima/baixo) e a ALTURA.
    const X = 1450;
    const Y = 778;
    const ALTURA = 520;

    this.seguranca = this.add.image(X, Y, 'seguranca');
    // setScale com altura_alvo / altura_real mantém a proporção (não estica).
    this.seguranca.setScale(ALTURA / this.seguranca.height);
  }

  // ---------- Quadro de regras (canto sup. esq.) ----------
  construirQuadroRegras() {
    const painel = this.add.rectangle(40, 40, 620, 300, 0x12121a, 0.85)
      .setOrigin(0, 0).setStrokeStyle(2, 0x55557a).setDepth(1);
    const titulo = this.add.text(70, 60, I18N.t('regras_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '22px', color: '#ffd166',
    }).setDepth(2);
    const lista = this.add.text(70, 130,
      this.regras.map((r) => '•  ' + I18N.t(r.label)).join('\n'),
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
    const fundo = this.add.rectangle(960, 540, 860, 460, 0x12121a, 0.95)
      .setStrokeStyle(3, 0x55557a);
    const titulo = this.add.text(960, 380, I18N.t('opcoes_titulo'), {
      fontFamily: CenaPorta.FONTE, fontSize: '30px', color: '#ffd166',
    }).setOrigin(0.5);

    // Linha da dificuldade: cada clique roda fácil→normal→difícil.
    this.labelDificuldade = this.criarLinhaOpcao(960, 480, () => this.mudarDificuldade());

    // Linha da língua: cada clique alterna PT↔EN.
    this.labelLingua = this.criarLinhaOpcao(960, 555, () => this.mudarLingua());

    const nota = this.add.text(960, 615, I18N.t('opcoes_clica'), {
      fontFamily: CenaPorta.FONTE, fontSize: '14px', color: '#888899',
    }).setOrigin(0.5);

    // VOLTAR usa o botão padrão do jogo (moldura rosa), centrado.
    const voltar = this.criarOpcao(960, 695, I18N.t('opcoes_voltar'),
      () => this.fecharOpcoes(), true);

    this.painelOpcoes = this.add.container(0, 0,
      [fundo, titulo, this.labelDificuldade, this.labelLingua, nota, voltar]);
    this.painelOpcoes.setDepth(30).setVisible(false);
  }

  // Linha de definição clicável do painel (texto que muda ao clicar).
  criarLinhaOpcao(x, y, aoClicar) {
    const linha = this.add.text(x, y, '', {
      fontFamily: CenaPorta.FONTE, fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    linha.on('pointerdown', aoClicar);
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

  atualizarLinhasOpcoes() {
    const d = this.registry.get('dificuldade');
    const seg = (CenaPorta.TEMPOS[d] / 1000).toString()
      .replace('.', I18N.lingua === 'pt' ? ',' : '.');
    this.labelDificuldade.setText(I18N.t('opcoes_dificuldade') + ':  '
      + I18N.t('dif_' + d) + '  (' + seg + 's)');
    this.labelLingua.setText(I18N.t('opcoes_lingua') + ':  ' + I18N.t('lingua_nome'));
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
      duration: CenaPorta.TEMPOS[this.registry.get('dificuldade')],
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
    this.mostrarFeedback(I18N.t('fb_tempo'), '#ff6b6b');
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
      this.mostrarFeedback(I18N.t('fb_certo'), '#a8e6a3');
    } else {
      this.registry.set('vidas', this.registry.get('vidas') - 1);
      if (!deveEntrar && deixouEntrar) {
        // ERRO GRAVE: entrou um proibido. Hook da perseguição.
        this.mostrarFeedback(I18N.t('fb_entrou_proibido'), '#ff6b6b');
        this.onIntrusoEntrou();
      } else {
        this.mostrarFeedback(I18N.t('fb_podia_entrar'), '#ff6b6b');
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

  // ---------- Fim de jogo ----------
  gameOver() {
    this.scene.start('GameOverScene', { score: this.registry.get('pontos') });
  }
}
