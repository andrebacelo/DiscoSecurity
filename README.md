# Projeto Phaser - Tecnologias Multimédia

# Disco Security

Jogo 2D em **Phaser 3**, a correr no browser — Trabalho Prático 2 de
**Tecnologias Multimédia 2025/2026**.

És o segurança à porta de uma discoteca: decides quem entra e, quando te
escapa um proibido, persegue-lo lá dentro.

## Equipa de Desenvolvimento
* **André Bacelo** — Número: 33200
* **Simão Figueiredo** — Número: 33401

---

## Phaser
- **Versão:** Phaser 3.90.0
- **Inclusão:** via **CDN (cdnjs)**, com um `<script>` no `index.html`:
  `https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js`.
  Sem npm nem bundler — só ficheiros estáticos servidos por HTTP local.

---

## Descrição do jogo
- **Género:** jogo de decisão/reação sob tempo, com uma fase de plataformas.
- **Objetivo:** aplicar as regras da porta o mais depressa possível; se deixares
  entrar alguém proibido, apanhá-lo na perseguição para não perderes a vida.

### Fase porta (loop principal)
Os clientes chegam um a um. As **regras ativas** estão sempre visíveis no ecrã
(ex.: idade mínima, sem crocs, sem chapéu). Dentro de um **tempo limite**,
decides **deixar entrar** ou **barrar**, comparando os atributos do cliente com
as regras. Acertar dá pontos; errar custa uma vida.

### Fase perseguição (plataformer)
Disparada quando deixas entrar um proibido. Ecrã fixo: o intruso corre para o
fundo da pista e tu (segurança) persegue-lo, **saltas** e desvias-te de
**obstáculos** (que te empurram ao toque) e trepas um **muro** por uma
plataforma. **Apanhar o intruso recupera a vida**; se ele se perder na pista ou
o tempo acabar, a vida fica perdida. O nível é **gerado aleatoriamente** a cada
perseguição.

### Estado e fim de jogo
Pontuação + vidas. Sem vidas = **Game Over**, com reinício.

### Funcionalidades
- Duas fases ligadas (decisão à porta + perseguição em plataformas)
- Regras dinâmicas mostradas no ecrã
- 3 níveis de **dificuldade** (afetam o tempo de decisão e a velocidade do intruso)
- Nível de perseguição **gerado aleatoriamente**
- **Menu de pausa** (ESC)
- **2 línguas** (Português / Inglês) com seletor
- **Controlo de volume** separado para música e efeitos (guardado entre sessões)
- Efeitos sonoros e músicas de fundo

---

## Controlos
| Onde | Tecla / Ação | Efeito |
|---|---|---|
| Menu | Rato | Clicar nas opções |
| Menu | `ESPAÇO` | Começar a jogar |
| Porta | `←` | Barrar o cliente |
| Porta | `→` | Deixar entrar |
| Perseguição | `←` `→` ou `A` `D` | Mover |
| Perseguição | `ESPAÇO`, `↑` ou `W` | Saltar |
| Em jogo | `ESC` | Pausa |
| Game Over | `ESPAÇO` | Recomeçar |

---

## Como executar
O jogo precisa de ser servido por **HTTP local** .

1. **VS Code + Live Server:** botão direito em `index.html` → _Open with Live Server_.
2. **Alternativa:** `npx serve` na raiz do projeto e abrir o endereço indicado.

---

## Aspetos multimédia
- **Imagens / sprites:** pixel art (fundos da rua e da discoteca, segurança,
  cliente, obstáculos — coluna, caixa, mesa, plataforma — e logótipo). Geradas
  com IA (Google Gemini) e **processadas e otimizadas por nós** (recorte,
  remoção de fundo/transparência, redução para 1080p e paleta de cores). Formato
  PNG.
- **Som:** efeitos (clique, salto, embate, apanhar, fuga, game over) e duas
  músicas de fundo (menu e perseguição), em **MP3** cortado e comprimido.
  Origem: [Pixabay](https://pixabay.com) (áudio de uso livre).
- **Fonte:** "Press Start 2P" ([Google Fonts](https://fonts.google.com/specimen/Press+Start+2P),
  licença OFL), incluída localmente em `src/assets/fonts/`.
- **Internacionalização (i18n):** traduções em ficheiro (`i18n/pt.json`,
  `i18n/en.json`), sem strings de UI no código.
- **Tamanho:** sprites em resolução proporcional ao uso e áudio comprimido —
  total dos ficheiros versionados abaixo de ~6 MB.

---

## Estrutura do projeto
```
index.html            # carrega o Phaser (CDN) e os scripts do jogo
src/
  main.js             # config do jogo + registo das cenas
  i18n.js             # traduções (PT/EN)
  som.js              # volumes de música e efeitos
  ui.js               # botão padrão partilhado
  objects/Cliente.js  # o cliente da fase porta
  scenes/             # CenaPorta, CenaPerseguicao, CenaPausa, GameOver
  assets/             # images/, audio/, fonts/
i18n/                 # pt.json, en.json
```
