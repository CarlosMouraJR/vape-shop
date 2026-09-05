# Vape Shop

Catálogo de pods descartáveis com carrinho e fechamento de pedido pelo WhatsApp.
Site estático — sem backend, sem banco, sem chave de API. Roda em GitHub Pages de graça.

## Como funciona

O cliente monta o carrinho e clica em **Finalizar no WhatsApp**. O site abre
`api.whatsapp.com/send` com o pedido já escrito no campo de mensagem — quem aperta
enviar é o cliente. Nada é enviado por trás.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | Estrutura da página, portão 18+, gaveta do carrinho |
| `styles.css` | Tema neon escuro, grade, responsivo |
| `catalog.js` | Os 21 modelos, 115 sabores, preços e a paleta de cores por sabor |
| `app.js` | Arte SVG dos aparelhos, filtros, busca, carrinho, checkout |

## Editar o catálogo

Tudo em `catalog.js`. Cada produto:

```js
{
  id: "ignite-v500",          // único, kebab-case
  brand: "Ignite",            // precisa existir em BRAND_COLORS
  model: "V500",
  puffs: 50000,               // usado na ordenação "mais puxadas"
  puffsLabel: "50 mil puxadas",
  priceFrom: 230,             // preço riscado
  priceTo: 194,               // preço de venda
  dual: false,                // true = dois tanques, exige dualA/dualB nos sabores
  form: "cylinder",           // cylinder | ultraslim | box | shisha | dual
  novo: true,                 // opcional, mostra o selo "Lançamento"
  flavors: [{ name: "Uva ice", emoji: "🍇", key: "uva-ice" }],
}
```

Não há imagem de produto: a arte de cada aparelho é um SVG gerado na hora. O
**formato** vem de `form`, a **cor** vem do sabor, casando a `key` contra a lista
`PALETTE` (a primeira regra cujo `match` aparece na chave vence, então regra
específica vem antes da genérica). Sabor sem regra cai no roxo do `PALETTE_FALLBACK`.

## Trocar o número do WhatsApp

Topo de `app.js`, em `CONFIG.whatsapp`. Formato internacional, só dígitos:
DDI + DDD + número, sem `+`, sem espaço, sem traço.

## Rodar local

```sh
python3 -m http.server 8777
# abre http://127.0.0.1:8777
```

## Deploy

Push na branch `main`. O GitHub Pages publica a raiz do repositório.
