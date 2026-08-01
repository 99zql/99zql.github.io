# 99zql.github.io

Perfil pessoal — dark theme, liquid glass, abas (Sobre/Experiências/Mídias),
player de música com disco girando, volume e progresso.

Todo o conteúdo e o visual são controlados por um único arquivo: **config.json**.

## Estrutura

```
99zql.github.io/
├── index.html
├── style.css
├── script.js
├── config.json      ← edite este arquivo pra mudar qualquer coisa
└── assets/
    ├── img/       (avatar.jpg, background.jpg)
    ├── music/     (track1.mp3, track2.mp3... + covers/)
    └── media/     (imagens da aba Mídias)
```

## Como editar (config.json)

Abra `config.json` num editor de texto qualquer. Estrutura:

```json
{
  "profile": {
    "nick": "seu nome",
    "tagline": "sua bio curta",
    "avatar": "assets/img/avatar.jpg",
    "background": "assets/img/background.jpg"
  },
  "socials": [
    { "platform": "github", "icon": "bi-github", "url": "https://..." }
  ],
  "about": {
    "html": "texto da aba Sobre mim (aceita <span class='highlight'>) e <br><br>)",
    "tags": ["tag1", "tag2"]
  },
  "experiences": [
    { "title": "...", "role": "...", "period": "...", "desc": "..." }
  ],
  "media": ["assets/media/1.jpg", "..."],
  "playlist": [
    { "title": "faixa", "file": "assets/music/track1.mp3", "cover": "assets/music/covers/1.jpg" }
  ],
  "theme": {
    "accentColor": "#5fb8ff",
    "accentColor2": "#7c6aff",
    "backgroundDarkness": 0.58,
    "glassOpacity": 0.55,
    "glassBlur": 22,
    "defaultVolume": 0.6
  }
}
```

### O que cada campo do "theme" faz

- **accentColor / accentColor2**: as duas cores usadas em bordas, ícones e no disco do player.
- **backgroundDarkness**: 0 a 1 — quanto maior, mais escuro fica o fundo (imagem aparece menos). 0 = sem escurecer, 0.9 = quase preto.
- **glassOpacity**: 0 a 1 — opacidade do "vidro" do card. Menor = mais transparente, mostra mais o fundo atrás.
- **glassBlur**: em pixels — intensidade do desfoque do liquid glass. 0 = sem blur (vidro nítido), 40 = bem desfocado.
- **defaultVolume**: 0 a 1 — volume inicial do player quando a página carrega.

### Ícones disponíveis para "socials"

Qualquer classe do Bootstrap Icons (https://icones.js.org/collection/bi ou
bootstrap-icons no site oficial), ex: `bi-github`, `bi-instagram`, `bi-steam`,
`bi-controller`, `bi-soundwave`, `bi-twitter-x`, `bi-youtube`, `bi-twitch`.

Depois de editar o `config.json`, é só salvar, dar commit e push — não precisa
mexer em mais nenhum arquivo.

## Publicar

1. Suba as imagens/mp3 nas pastas de assets.
2. Edite o `config.json` com seus dados reais.
3. Commit + push pra branch `main` do repositório `99zql.github.io`.
4. Settings → Pages → Source: branch `main`, pasta `/root`.
5. Fica em https://99zql.github.io depois de 1-3 min.
