class CenaPorta extends Phaser.Scene {
  constructor() {
    super('CenaPorta');
  }

  create() {
    this.cameras.main.setBackgroundColor('#15151f');

    this.add.text(400, 180, 'Cena da Porta', {
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 260, 'Aqui será a Portaria.', {
      fontSize: '24px',
      color: '#c2c2ff',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    this.add.text(400, 340, 'Teste simples: continua daqui.', {
      fontSize: '20px',
      color: '#a4ffa4',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    this.add.text(400, 420, 'Pressiona ESPAÇO para voltar ao menu inicial.', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('BootScene');
    });
  }
}
