// Configuração do jogo e registo de cenas.
// O menu deixou de ser uma cena própria — agora é uma camada da CenaPorta,
// por isso o jogo arranca diretamente na CenaPorta.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1d2b',
  // Scale Manager: a resolução interna é 1280x720 (nítida), e o FIT estica
  // para caber na janela mantendo a proporção; CENTER_BOTH centra o canvas.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
  },
  physics: {
    // Gravidade global a 0; a fase de perseguição ativará a sua própria.
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  // A primeira do array é a que arranca. Por defeito é a CenaPorta (menu).
  // Atalho de DESENVOLVIMENTO: abrir com "?cena=perseguicao" no URL faz o jogo
  // arrancar direto na perseguição, para a testar sem passar pela porta.
  scene: new URLSearchParams(location.search).get('cena') === 'perseguicao'
    ? [CenaPerseguicao, CenaPorta, GameOverScene]
    : [CenaPorta, CenaPerseguicao, GameOverScene],
};

// Esperamos a fonte pixel carregar ANTES de criar o jogo. Razão: o Phaser
// desenha o texto numa textura no momento em que a cena arranca; se a fonte
// ainda não estiver pronta, usa a do sistema e não volta a corrigir.
async function arrancarJogo() {
  try {
    await document.fonts.load('16px "Press Start 2P"');
    await document.fonts.ready;
  } catch (e) {
    console.warn('Fonte pixel não carregou, sigo com a do sistema:', e);
  }
  new Phaser.Game(config);
}
arrancarJogo();
