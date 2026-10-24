# Portfolio

Site estático pronto para GitHub Pages. Os arquivos de configuração, estilo e lógica ficam diretamente na raiz:

```text
.
├── index.html       # página pronta para abrir e publicar
├── site.json        # textos, páginas, links, tema, imagens e faixas
├── site.css         # estilos e animações
├── app.js           # comportamento do site
├── build.py         # sincroniza site.json com index.html
└── assets/
    ├── images/      # papel de parede, avatar e imagens da galeria
    └── audio/       # arquivos de áudio próprios
```

## Editar o site

Edite `site.json` para alterar os textos, abas, links, experiências, imagens, tema e músicas. Caminhos de arquivos são relativos à raiz do site, como `assets/images/wallpaper.jpg`.

Depois de editar o JSON, sincronize a configuração embutida no HTML:

```sh
python3 build.py
```

O HTML contém essa cópia embutida porque navegadores bloqueiam a leitura de um arquivo JSON vizinho quando a página é aberta como `file://`. Assim, você pode abrir `index.html` com duplo clique. Rode `build.py` antes de publicar para garantir que a versão embutida esteja atualizada.

Para trocar uma imagem, coloque-a em `assets/images/` e atualize `background`, `avatar` ou `src` em `media`. Cada imagem da galeria também aceita `crop`, `title` e `desc`.

As faixas atuais são sintetizadas pelo navegador (`src` vazio). Para usar áudio próprio, coloque o arquivo em `assets/audio/` e configure o `src` da faixa no JSON, por exemplo `assets/audio/minha-musica.mp3`.

## Publicar no GitHub Pages

Execute `python3 build.py`, envie todos os arquivos ao repositório e habilite GitHub Pages para a branch/pasta escolhida. Mantenha `index.html`, `site.json`, `site.css`, `app.js`, `build.py` e `assets/` juntos.
