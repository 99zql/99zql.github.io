# 99zql.github.io

Perfil pessoal — dark theme, liquid glass, player de música e contador de views.

## Estrutura

```
99zql.github.io/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── img/        (avatar.jpg, background.jpg)
    ├── music/       (track1.mp3, track2.mp3, ...)
    └── icons/       (svg das redes + favicon.png)
```

## Como publicar

1. Suba os arquivos de imagem em `assets/img/` e as músicas em `assets/music/`
   (veja os README.md dentro de cada pasta).
2. Faça commit e push para o repositório `99zql.github.io` na branch `main`.
3. Em Settings → Pages, confirme que a branch `main` está selecionada como source.
4. O site fica disponível em https://99zql.github.io

## Editar conteúdo

- **Sobre mim / experiências**: edite diretamente o texto dentro de `index.html`
  (seções `.about` e `.exp-list`).
- **Links de redes**: os `<a href="...">` dentro de `.media-grid` em `index.html`.
- **Playlist**: array `PLAYLIST` no topo de `script.js`.
- **Cores/tema**: variáveis no topo de `style.css` (`:root`), tudo referenciado
  a partir delas.

## Views

O contador usa a API pública gratuita do CounterAPI (`api.counterapi.dev`), sem
necessidade de backend próprio. Se quiser resetar a contagem, troque o valor de
`VIEWS_NAMESPACE` no topo de `script.js` para um novo nome único.
