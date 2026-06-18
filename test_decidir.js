const fs = require('fs');

// We will just read CenaPorta.js and execute it using a mock Phaser object to catch any runtime errors.

const code = fs.readFileSync('src/scenes/CenaPorta.js', 'utf8');

// Mock Phaser
global.Phaser = {
  Scene: class {},
  Utils: {
    Array: { Shuffle: arr => arr }
  },
  Math: {
    Between: (min, max) => min,
    Clamp: (val, min, max) => Math.max(min, Math.min(max, val))
  }
};

global.I18N = {
  t: (k) => k
};

// Evaluate CenaPorta class
eval(code);

// Mock the scene environment
const scene = new CenaPorta();
scene.registry = {
  data: { pontos: 0, vidas: 3, dificuldade: 'normal' },
  get: function(k) { return this.data[k]; },
  set: function(k, v) { this.data[k] = v; }
};
scene.tweens = { add: () => {} };
scene.time = { delayedCall: (t, cb) => { cb(); } };
scene.cliente = {
  atributos: { chapeu: true, oculos: false },
  andar: () => {},
  setFlip: () => {},
  destroy: () => {}
};
scene.regras = [ { label: 'regra_chapeu', check: (a) => !a.chapeu } ];
scene.aDecidir = true;
scene.tempoAtual = 10000;
scene.barraTempo = { scaleX: 1 };
scene.hudVidas = { setText: () => {} };
scene.hudPontos = { setText: () => {} };
scene.feedback = { setText: () => ({ setColor: () => {} }) };
scene.textoRegras = { setText: () => {} };

try {
  scene.decidir('barrar'); // This is what the user did: barred a banned person
  console.log('SUCCESS, pontos:', scene.registry.get('pontos'));
} catch (e) {
  console.error('ERROR:', e);
}
