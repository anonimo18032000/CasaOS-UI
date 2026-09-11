[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=IceWhaleTech_CasaOS-UI&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=IceWhaleTech_CasaOS-UI)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=IceWhaleTech_CasaOS-UI&metric=bugs)](https://sonarcloud.io/summary/new_code?id=IceWhaleTech_CasaOS-UI)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=IceWhaleTech_CasaOS-UI&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=IceWhaleTech_CasaOS-UI)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=IceWhaleTech_CasaOS-UI&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=IceWhaleTech_CasaOS-UI)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=IceWhaleTech_CasaOS-UI&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=IceWhaleTech_CasaOS-UI)

# Como desenvolver este projeto

## Pré-requisitos
1. Node 18 ([instruções de instalação](https://github.com/nvm-sh/nvm?tab=readme-ov-file#usage))
2. pnpm@9.0.6 ([instruções de instalação](https://pnpm.io/installation))

## Variáveis de ambiente
Se você quiser conectar a versão de desenvolvimento da UI ao seu servidor CasaOS local, será necessário configurar algumas variáveis de ambiente:
1. Copie `.env.dev` para `.env.dev.local` (este arquivo está no .gitignore)
2. Defina `VUE_APP_DEV_IP` com o endereço IP do seu servidor CasaOS local

## Configurar o servidor de desenvolvimento
```shell
# instalar dependências
pnpm install

# build
pnpm dev 
```

# Como compilar este projeto

```shell
# instalar dependências
pnpm install

# build
pnpm build 
```

# Como testar este projeto

```shell
pnpm test
```

# Como contribuir com este projeto

O CasaOS é um projeto de código aberto impulsionado pela comunidade, e as pessoas envolvidas são usuários do CasaOS. Isso significa que o CasaOS sempre vai
precisar de contribuições de membros da comunidade como você!

- Veja <https://wiki.casaos.io/en/contribute> para formas de contribuir com o CasaOS
- Veja <https://wiki.casaos.io/en/contribute/development> se você quiser se envolver especificamente com contribuições de código


# Como contatar este projeto

A palavra Casa vem do espanhol e significa "lar". O projeto CasaOS surgiu como um sistema pré-instalado no produto financiado via crowdfunding
[ZimaBoard](https://www.zimaboard.com) no Kickstarter.

Depois de analisar muitos sistemas e softwares no mercado, a equipe constatou, infelizmente, que não havia nenhum sistema de servidor projetado para
cenários domésticos.

Por isso, decidimos construir este projeto de código aberto para desenvolver o CasaOS com nossas próprias mãos, todos na comunidade, e
você.

Acreditamos que, por meio da inovação colaborativa impulsionada pela comunidade e da comunicação aberta com desenvolvedores do mundo todo, podemos
transformar a experiência doméstica digital como nunca antes.

**Você é muito bem-vindo para buscar ajuda ou compartilhar grandes ideias no [Discord](https://discord.gg/knqAbbBbeX)!**

[![Discord Card](https://discordapp.com/api/guilds/884667213326463016/widget.png?style=banner2)](https://discord.gg/knqAbbBbeX)