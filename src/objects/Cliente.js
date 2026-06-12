// Cliente — um cliente que chega à porta da discoteca.
//
// É um Container do Phaser: um objeto que AGRUPA outros (aqui, o corpo
// placeholder + a legenda com os atributos). Vantagem: posicionamos e
// destruímos o cliente todo de uma vez, e as posições dos filhos passam a
// ser relativas ao container (0,0 = centro do cliente).
class Cliente extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    // super() do Container precisa da cena e da posição.
    super(scene, x, y);

    // Atributos aleatórios — é com base nisto que o jogador vai decidir.
    // Fica guardado em this.atributos para a lógica de regras (passo 3) ler.
    this.atributos = Cliente.gerarAtributos();

    // Sprite do cliente. Posicionado para que a base (pés) fique alinhada.
    // Usamos origem (0.5, 1) para que as transformações de textura mantenham a base no mesmo sítio.
    this.sprite = scene.add.sprite(0, 240, 'cliente_andar');
    this.sprite.setOrigin(0.5, 1);

    // Legenda com os atributos, por baixo do corpo.
    // setOrigin(0.5, 0): centrado na horizontal, a começar no topo do texto.
    const a = this.atributos;
    this.legenda = scene.add.text(
      -250, 170,
      `Idade: ${a.idade}\nCalçado: ${a.calcado}\nChapéu: ${a.chapeu ? 'sim' : 'não'}`,
      { fontSize: '30px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5, 0);

    // add() mete os filhos DENTRO do container.
    this.add([this.sprite, this.legenda]);

    // Inicia com o estado de andar
    this.andar();

    // add.existing() regista o container na cena. Sem isto, nada aparece.
    scene.add.existing(this);
  }

  // Ativa a animação de andar
  andar() {
    this.sprite.setTexture('cliente_andar');
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(0.9);
    this.sprite.play('andar');
    if (this.legenda) this.legenda.setVisible(false);
  }

  // Pára a animação de andar e mostra a sprite de frente
  parar() {
    this.sprite.stop();
    this.sprite.setTexture('cliente_parado');
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(0.9);
    if (this.legenda) this.legenda.setVisible(true);
  }

  // Método static: pertence à classe, não a uma instância. Útil como "fábrica"
  // de atributos — podemos chamá-lo sem ter um Cliente criado.
  static gerarAtributos() {
    return {
      // Between() é inclusivo nos dois extremos.
      idade: Phaser.Math.Between(14, 30),
      // GetRandom() escolhe um item aleatório do array.
      calcado: Phaser.Utils.Array.GetRandom(['crocs', 'ténis', 'botas']),
      // 0 ou 1 → false/true.
      chapeu: Phaser.Math.Between(0, 1) === 1,
    };
  }
}
