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

    // Placeholders (sem arte ainda). Coordenadas relativas ao container:
    // (0,0) é o centro do cliente.
    // Cabeça redonda — só para ler como "pessoa" em vez de cubo.
    const cabeca = scene.add.circle(0, -210, 48, 0xffe0b0);
    // Corpo. A origem do rectangle é o centro por defeito.
    const corpo = scene.add
      .rectangle(0, 0, 180, 315, 0x4cc9f0)
      .setStrokeStyle(3, 0xffffff);

    // Legenda com os atributos, por baixo do corpo.
    // setOrigin(0.5, 0): centrado na horizontal, a começar no topo do texto.
    const a = this.atributos;
    const legenda = scene.add.text(
      0, 188,
      `Idade: ${a.idade}\nCalçado: ${a.calcado}\nChapéu: ${a.chapeu ? 'sim' : 'não'}`,
      { fontSize: '30px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5, 0);

    // add() mete os filhos DENTRO do container.
    this.add([cabeca, corpo, legenda]);

    // add.existing() regista o container na cena. Sem isto, nada aparece.
    scene.add.existing(this);
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
