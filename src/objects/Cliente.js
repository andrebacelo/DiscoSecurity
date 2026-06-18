// Sistema de variantes do cliente — cada combinação de acessórios tem sprites
// integrados. A escala é ajustada por variante para manter tamanho visual
// consistente apesar de as imagens terem dimensões diferentes.
//
// Assets disponíveis:
//   Base:            andar (spritesheet 356x593), parado (imagem 489x1163)
//   Chapéu:          andar (spritesheet 418x941), parado (imagem 243x557)
//   Óculos:          andar (spritesheet 384x457), parado (imagem 489x1163)
//   Chapéu+Óculos:   andar (spritesheet 256x372), parado (imagem 165x359)

const VARIANTES = {
  // { chapeu: false, oculos: false }
  base: {
    andar:  { texture: 'cliente_andar',              anim: 'andar',              scale: 0.59, yOff: 0 },
    parado: { texture: 'cliente_parado',             anim: null,                 scale: 0.30, yOff: 0 },
  },
  // { chapeu: true, oculos: false }
  chapeu: {
    andar:  { texture: 'cliente_andar_chapeu',       anim: 'andar_chapeu',       scale: 0.45, yOff: 50 },
    parado: { texture: 'cliente_chapeu',             anim: null,                 scale: 0.63, yOff: 0 },
  },
  // { chapeu: false, oculos: true }
  oculos: {
    andar:  { texture: 'cliente_oculos',             anim: 'andar_oculos',       scale: 0.77, yOff: 0 },
    parado: { texture: 'cliente_parado_oculos',      anim: null,                 scale: 0.30, yOff: 0 },
  },
  // { chapeu: true, oculos: true }
  chapeu_oculos: {
    andar:  { texture: 'cliente_chapeu_oculos_andar',  anim: 'andar_chapeu_oculos', scale: 0.94, yOff: 0 },
    parado: { texture: 'cliente_chapeu_oculos_parado', anim: null,                  scale: 0.97, yOff: 0 },
  },
};

class Cliente extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);

    this.atributos = Cliente.gerarAtributos();
    this.variante = Cliente.obterVariante(this.atributos);

    const cfg = VARIANTES[this.variante].andar;
    this.sprite = scene.add.sprite(0, 220, cfg.texture);
    this.sprite.setOrigin(0.5, 1);

    this.add([this.sprite]);

    this.andar();
    scene.add.existing(this);
  }

  // Determina que variante de sprite usar com base nos atributos.
  static obterVariante(atributos) {
    if (atributos.chapeu && atributos.oculos) return 'chapeu_oculos';
    if (atributos.chapeu) return 'chapeu';
    if (atributos.oculos) return 'oculos';
    return 'base';
  }

  andar() {
    const cfg = VARIANTES[this.variante].andar;
    this.sprite.setTexture(cfg.texture);
    this.sprite.setScale(cfg.scale);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.y = 220 + (cfg.yOff || 0);
    if (cfg.anim) {
      this.sprite.play(cfg.anim);
    }
  }

  parar() {
    this.sprite.stop();
    const cfg = VARIANTES[this.variante].parado;
    this.sprite.setTexture(cfg.texture);
    this.sprite.setScale(cfg.scale);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.y = 220 + (cfg.yOff || 0);
    if (cfg.anim) {
      this.sprite.play(cfg.anim);
    }
  }

  setFlip(flip) {
    this.sprite.setFlipX(flip);
  }

  // Mantido por retrocompatibilidade — o CenaPorta chama isto no update().
  updateAccessories() {
    // Noop — acessórios integrados nas sprites.
  }

  static gerarAtributos() {
    return {
      chapeu: Phaser.Math.Between(0, 1) === 1,
      oculos: Phaser.Math.Between(0, 1) === 1,
    };
  }
}
