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
  // A primeira do array é a que arranca. CenaPorta abre já no estado de menu.
  scene: [CenaPorta, GameOverScene],
};

new Phaser.Game(config);
