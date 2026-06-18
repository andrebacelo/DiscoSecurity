// I18N — traduções do jogo
//
// Como funciona:
//  1. As cenas carregam i18n/pt.json e i18n/en.json no preload() (this.load.json);
//  2. No create(), chamam I18N.carregar(this) para ler os JSON da cache;
//  3. Todo o texto da UI passa por I18N.t('chave') em vez de string fixa;
//  4. Trocar de língua nas OPÇÕES chama I18N.trocar() e reinicia a cena
//     (scene.restart), que redesenha tudo já na língua nova.
//
// É um objeto global simples (sem módulos) porque o projeto usa script tags.
const I18N = {
  // Língua ativa: recupera a última escolha do localStorage (sobrevive a
  // fechar o separador). O try/catch protege contra modo privado/bloqueado.
  lingua: (() => {
    try {
      const guardada = localStorage.getItem('discosecurity-lingua');
      return guardada === 'en' ? 'en' : 'pt';
    } catch (e) { return 'pt'; }
  })(),
  textos: { pt: null, en: null },

  // Lê os JSON (já carregados pelo loader da cena) para a memória.
  carregar(cena) {
    this.textos.pt = cena.cache.json.get('i18n-pt');
    this.textos.en = cena.cache.json.get('i18n-en');
  },

  // Devolve o texto na língua ativa. Se a chave não existir, devolve a
  // própria chave — assim um texto em falta nota-se logo no ecrã.
  t(chave) {
    const dicionario = this.textos[this.lingua];
    return (dicionario && dicionario[chave]) || chave;
  },

  trocar() {
    this.lingua = this.lingua === 'pt' ? 'en' : 'pt';
    try { localStorage.setItem('discosecurity-lingua', this.lingua); } catch (e) { /* sem storage */ }
  },
};
