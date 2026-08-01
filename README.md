# 99zql.github.io

Perfil pessoal — dark theme, liquid glass, abas (Sobre/Experiências/Mídias),
player de música com disco girando, e contador de views.

## Estrutura

```
99zql.github.io/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── img/       (avatar.jpg, background.jpg)
    ├── music/     (track1.mp3, track2.mp3... + covers/)
    └── media/     (imagens da aba Mídias)
```

## Publicar

1. Suba as imagens, mp3 e capas nas pastas de assets (veja README.md de cada uma).
2. Commit + push pra branch `main` do repositório `99zql.github.io`.
3. Settings → Pages → Source: branch `main`, pasta `/root`.
4. Fica em https://99zql.github.io depois de 1-3 min.

## Editar

- **Sobre mim / tags**: `index.html`, seção `#panel-sobre`.
- **Experiências**: `index.html`, seção `#panel-exp` — os placeholders estão
  marcados pra você trocar pelo texto real.
- **Redes sociais**: `<a class="social-btn">` no `index.html`.
- **Playlist**: array `playlist` no topo do `script.js`.
- **Cores**: variáveis de cor usadas direto no `style.css` (busque por `5fb8ff`,
  o azul principal, e `7c6aff`, o roxo secundário, se quiser trocar a paleta).

## Views

Contador via CounterAPI (`api.counterapi.dev`), gratuito, sem backend próprio.
Pra resetar a contagem, troque `VIEWS_NAMESPACE` no topo do `script.js`.
