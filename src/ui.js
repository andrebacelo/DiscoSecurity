// UI — elementos de interface partilhados pelas cenas.
//
// O botão padrão do jogo (decisão de design fixa): moldura de CONTORNO rosa
// (sem preenchimento rosa), fundo escuro translúcido, texto pixel branco;
// no hover o contorno fica cião e o texto dourado. Sem glow.
// Vive aqui para TODAS as cenas (menu, opções, pausa, ...) usarem o mesmo.
const UI = {
  ROSA: 0xfe00bf,  // rosa do "Disco" no logótipo
  CIAO: 0x01fafe,  // cião do "Security" no logótipo
  FONTE: '"Press Start 2P"',

  // 'centrado': false = ancorado à esquerda (menu); true = centrado em (x,y).
  criarBotao(cena, x, y, texto, aoClicar, centrado = false) {
    const LARG = 360, ALT = 84;

    const moldura = cena.add.rectangle(0, 0, LARG, ALT, 0x12121a, 0.7)
      .setOrigin(centrado ? 0.5 : 0, 0.5).setStrokeStyle(4, this.ROSA);
    const label = cena.add.text(centrado ? 0 : LARG / 2, 0, texto, {
      fontFamily: this.FONTE, fontSize: '26px', color: '#ffffff',
    }).setOrigin(0.5);

    const botao = cena.add.container(x, y, [moldura, label]);

    // A moldura é a zona clicável (área grande = mais fácil de acertar).
    moldura.setInteractive({ useHandCursor: true });
    moldura.on('pointerdown', () => {
      // Som do clique (se estiver carregado nesta cena).
      if (cena.cache.audio.exists('ui-click')) cena.sound.play('ui-click', { volume: 0.8 });
      aoClicar();
    });
    moldura.on('pointerover', () => {
      moldura.setStrokeStyle(4, this.CIAO); label.setColor('#ffd166');
    });
    moldura.on('pointerout', () => {
      moldura.setStrokeStyle(4, this.ROSA); label.setColor('#ffffff');
    });
    return botao;
  },
};
