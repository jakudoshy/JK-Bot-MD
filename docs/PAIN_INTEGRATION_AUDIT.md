# Auditoría de comandos Pain Bot → JK-Bot-MD

Fuente: https://github.com/nexusday/pain-bot

- Plugins con comandos detectados: **214**
- Aliases Pain detectados: **642**
- Labels del dispatcher JK detectados: **447**
- Aliases Pain no encontrados en el dispatcher JK: **537**

> El conteo es orientativo: JK registra muchos aliases directamente en `index.js`, mientras Pain los declara en cada plugin. No implica compatibilidad automática.

| Plugin Pain | Comandos detectados | No encontrados en JK |
|---|---|---|
| `Download-fb.js` | `facebook`, `fb` | — |
| `Download-ig.js` | `ig`, `instagram` | `instagram` |
| `Download-play.js` | `play`, `playaudio`, `ytmp3` | `play`, `playaudio`, `ytmp3` |
| `Download-play2.js` | `audio2`, `music2`, `play2`, `song2` | `audio2`, `music2`, `play2`, `song2` |
| `Download-soundcloud.js` | `sc`, `scdl`, `scloud`, `soundcloud` | `sc`, `scdl`, `scloud`, `soundcloud` |
| `Download-video.js` | `download`, `downloadvideo`, `video`, `ytmp4`, `ytvideo` | `downloadvideo`, `ytmp4`, `ytvideo` |
| `anti-audio.js` | `antiaudio` | `antiaudio` |
| `anti-bot.js` | `antibot`, `antibots`, `nobots` | `antibot`, `antibots`, `nobots` |
| `anti-caracter.js` | `anticaracter`, `anticaracteres` | `anticaracter`, `anticaracteres` |
| `anti-contact.js` | `anticontact` | `anticontact` |
| `anti-delete.js` | `antidel`, `antidelete`, `antieliminar` | `antidel`, `antieliminar` |
| `anti-document.js` | `antidoc`, `antidocument`, `antidocuments` | `antidoc`, `antidocument`, `antidocuments` |
| `anti-estados.js` | `antiestado`, `antiestados`, `antistatus`, `antistatusmention` | `antiestado`, `antiestados`, `antistatusmention` |
| `anti-img.js` | `antiimg` | `antiimg` |
| `anti-link.js` | `antilink` | — |
| `anti-lista.js` | `antilista`, `antis`, `listantis` | `antilista`, `antis`, `listantis` |
| `anti-mention.js` | `antimention` | `antimention` |
| `anti-palabra.js` | `antipalabra` | `antipalabra` |
| `anti-prefijo.js` | `antiprefijo` | `antiprefijo` |
| `anti-spam.js` | `antispam` | `antispam` |
| `anti-sticker.js` | `antisticker` | `antisticker` |
| `anti-video.js` | `antivideo` | `antivideo` |
| `audio-slow.js` | `slow` | `slow` |
| `audio-speed.js` | `speed` | — |
| `audio-ssa.js` | `saveaudio`, `ssa`, `ssaudio` | `saveaudio`, `ssa`, `ssaudio` |
| `audio-stt.js` | `att`, `escuchar`, `stt`, `transcribir`, `voz2text` | `att`, `escuchar`, `stt`, `transcribir`, `voz2text` |
| `audio-toaudio.js` | `audio`, `mp3`, `toaudio`, `tomp3` | `audio`, `toaudio` |
| `audio-tts.js` | `hablar`, `say`, `speak`, `textovoz`, `tts`, `voz` | `hablar`, `say`, `speak`, `textovoz`, `voz` |
| `buscador-yt.js` | `youtube`, `yt`, `ytsearch` | — |
| `cmd18-toggle.js` | `cmd18`, `nsfwon` | `cmd18`, `nsfwon` |
| `download-apps.js` | `apk`, `aptoide`, `descargar` | `aptoide`, `descargar` |
| `download-gitclone.js` | `git` | `git` |
| `download-igsearch.js` | `igbuscar`, `igs`, `igsearch` | `igbuscar`, `igs`, `igsearch` |
| `download-img.js` | `image`, `imagen` | — |
| `download-pinterest.js` | `pin`, `pinterest` | — |
| `download-spotify.js` | `splay`, `spotify` | `splay` |
| `economia-coins.js` | `bal`, `balance`, `coins` | — |
| `game-html-snake.js` | `htmlsnake`, `serpiente`, `snake` | `htmlsnake`, `serpiente`, `snake` |
| `get-canalid.js` | `canal`, `canalid`, `getcanal`, `newsletter` | `canal`, `canalid`, `getcanal`, `newsletter` |
| `get-id.js` | `detid`, `getid`, `id` | `detid`, `getid` |
| `google-search.js` | `buscar`, `g`, `google`, `search` | `g`, `search` |
| `group-add.js` | `addgp`, `addgroup`, `adg` | `addgp`, `addgroup`, `adg` |
| `group-clas.js` | `clas`, `clasificacion`, `equipos`, `teams` | `clas`, `clasificacion`, `equipos`, `teams` |
| `group-clear.js` | `clean`, `clear`, `limpiar` | `clean`, `limpiar` |
| `group-close.js` | `cerrar`, `close`, `grupo-cerrado` | `grupo-cerrado` |
| `group-delete.js` | `d`, `del`, `delete`, `eliminar` | `del`, `delete`, `eliminar` |
| `group-delnota.js` | `deletenote`, `delnota`, `eliminarnota` | `deletenote`, `delnota`, `eliminarnota` |
| `group-delwarn.js` | `delwarn`, `delwarns`, `eliminaradvertencia`, `limpiaradvertencias` | `delwarn`, `delwarns`, `eliminaradvertencia`, `limpiaradvertencias` |
| `group-demote.js` | `degradar`, `demote`, `quitaradmin` | `degradar`, `quitaradmin` |
| `group-kick.js` | `ban`, `kick` | — |
| `group-mute.js` | `delmute`, `group-mute`, `group-unmute`, `mute`, `unmute` | `delmute`, `group-mute`, `group-unmute` |
| `group-nota.js` | `anotar`, `nota`, `note` | `anotar` |
| `group-open.js` | `abrir`, `grupo-abierto`, `open` | `grupo-abierto` |
| `group-pin.js` | `desfijar`, `desfijarmsj`, `despin`, `fijar`, `fijarmensaje`, `fijarmsj`, `pin`, `unfijar`, `unpin` | `desfijar`, `desfijarmsj`, `despin`, `fijar`, `fijarmensaje`, `fijarmsj`, `unfijar`, `unpin` |
| `group-promote.js` | `daradmin`, `promote`, `promover` | `daradmin`, `promover` |
| `group-sban.js` | `bansticker`, `sban`, `setbansticker`, `stickerban` | `bansticker`, `sban`, `setbansticker`, `stickerban` |
| `group-setdesc.js` | `desgp` | `desgp` |
| `group-setfoto.js` | `photogp` | `photogp` |
| `group-setname.js` | `namegp` | `namegp` |
| `group-vernotas.js` | `listnotes`, `notes`, `vernotas` | `listnotes`, `notes`, `vernotas` |
| `group-warn.js` | `advertencia`, `advertir`, `warn` | `advertencia`, `advertir`, `warn` |
| `group-warnings.js` | `advertencias`, `listwarns`, `veradvertencias`, `warnings` | `advertencias`, `listwarns`, `veradvertencias`, `warnings` |
| `grupo-bot-off-on.js` | `grupo` | `grupo` |
| `hentai.js` | `hent`, `hentai`, `hentaisearch` | `hent`, `hentai`, `hentaisearch` |
| `ia-anime.js` | `animagine`, `animg`, `ia-anime` | `animagine`, `animg`, `ia-anime` |
| `ia-chatgpt.js` | `chatgpt`, `gpt`, `ia` | `chatgpt`, `gpt`, `ia` |
| `ia-copilot.js` | `bing`, `copi`, `copilot`, `msft` | `bing`, `copi`, `copilot`, `msft` |
| `ia-kora.js` | `ia-kora`, `kora`, `korai` | `ia-kora`, `kora`, `korai` |
| `ia-ocr.js` | `leerimg`, `leertexto`, `ocr`, `text` | `leerimg`, `leertexto`, `ocr`, `text` |
| `ia-replia.js` | `repli`, `replia`, `repliai`, `ripleai` | `repli`, `replia`, `repliai`, `ripleai` |
| `img-hd.js` | `calidad`, `enhd`, `hd`, `mejorar`, `nitidez`, `upscale` | `calidad`, `enhd`, `hd`, `mejorar`, `nitidez` |
| `img-imgay.js` | `gayfilter`, `imgay`, `pridefilter` | `gayfilter`, `imgay`, `pridefilter` |
| `img-meme.js` | `meme`, `memerandom`, `memes`, `memito` | `memerandom`, `memes`, `memito` |
| `img-pdf.js` | `imagenpdf`, `imgpdf`, `pdf`, `topdf` | `imagenpdf`, `imgpdf`, `pdf`, `topdf` |
| `img-resize.js` | `redimensionar`, `resize`, `rs`, `tamano`, `tamaño` | `redimensionar`, `resize`, `rs`, `tamano`, `tamaño` |
| `img-sfimg.js` | `fototexto`, `memefoto`, `sfimg` | `fototexto`, `memefoto`, `sfimg` |
| `img-ssimg.js` | `img`, `nowplaying`, `spotifyimg`, `spotimg`, `ssimg` | `nowplaying`, `spotifyimg`, `spotimg`, `ssimg` |
| `info-grupo.js` | `groupinfo`, `infogp`, `infogrupo` | `infogp`, `infogrupo` |
| `info-ip.js` | `ip`, `ipinfo`, `ipwhois` | `ip`, `ipwhois` |
| `info-ip2.js` | `ip2`, `ipwhois2`, `whois` | `ip2`, `ipwhois2` |
| `info-sher.js` | `dx`, `sher` | `dx`, `sher` |
| `info-tiktok.js` | `tik` | `tik` |
| `info-web.js` | `pagina`, `web`, `webinfo` | `pagina`, `web`, `webinfo` |
| `main-creador.js` | `creador`, `creator`, `dueño`, `owner` | `creador`, `creator`, `dueño` |
| `main-menu2.js` | `help`, `menu`, `menú` | — |
| `modo-custom.js` | `custommode`, `modo`, `modocustom`, `modopersonalizado` | `custommode`, `modo`, `modocustom`, `modopersonalizado` |
| `modo-descargas.js` | `autodl`, `mododescargas`, `modolinks` | `autodl`, `mododescargas`, `modolinks` |
| `modo-hot.js` | `hotai`, `hotmode`, `modohot`, `modosexy` | `hotai`, `hotmode`, `modohot`, `modosexy` |
| `modo-human.js` | `humandigital`, `humanmode`, `modoh`, `modohuman` | `humandigital`, `humanmode`, `modoh`, `modohuman` |
| `modo-ia.js` | `aimode`, `autoai`, `iamode`, `modoia` | `aimode`, `autoai`, `iamode`, `modoia` |
| `modo-ilegal.js` | `ilegal`, `ilegalmode`, `modoilegal` | `ilegal`, `ilegalmode`, `modoilegal` |
| `modo-psico.js` | `modopsico`, `modopsicologo`, `modospico`, `psicologo`, `psicomode` | `modopsico`, `modopsicologo`, `modospico`, `psicologo`, `psicomode` |
| `modo-sad.js` | `humansad`, `modos`, `modosad`, `sadmode` | `humansad`, `modos`, `modosad`, `sadmode` |
| `modo-sub.js` | `botactivo`, `modobot`, `modosub`, `onlybot` | `botactivo`, `modobot`, `modosub`, `onlybot` |
| `onlyfans-info.js` | `of`, `onlyfans`, `onlyfansinfo` | `of`, `onlyfans`, `onlyfansinfo` |
| `owner-add-plugin.js` | `addplugin`, `crearplugin`, `plugin` | `addplugin`, `crearplugin`, `plugin` |
| `owner-exit.js` | `exit`, `leave` | `exit` |
| `owner-join.js` | `join` | — |
| `owner-mod.js` | `addmod`, `mod`, `staff` | `addmod`, `mod`, `staff` |
| `owner-nameplugins.js` | `nameplugins`, `renameplugin`, `renombrarplugin` | `nameplugins`, `renameplugin`, `renombrarplugin` |
| `owner-one.js` | `alquiler`, `one`, `rent` | `alquiler`, `one`, `rent` |
| `owner-reconnect-bots.js` | `reconnect`, `reconnectbots` | `reconnect`, `reconnectbots` |
| `owner-replugin.js` | `reemplazarplugin`, `replaceplugin`, `replugin` | `reemplazarplugin`, `replaceplugin`, `replugin` |
| `owner-restart.js` | `reboot`, `reiniciar`, `restart` | `reboot`, `reiniciar` |
| `owner-setvist.js` | `setvist`, `setvisto` | `setvist`, `setvisto` |
| `owner-soporte.js` | `gruposoporte`, `soporte`, `support` | `gruposoporte`, `soporte`, `support` |
| `owner-subme.js` | `subme`, `submessage`, `submsg` | `subme`, `submessage`, `submsg` |
| `owner-update.js` | `actualizar`, `fix`, `fixed`, `update` | `actualizar`, `fix`, `fixed`, `update` |
| `owner-verplugin.js` | `verplugin`, `viewplugin` | `verplugin`, `viewplugin` |
| `perfiles-allbirths.js` | `allbirthdays`, `allbirths` | `allbirthdays`, `allbirths` |
| `perfiles-birthdays.js` | `birthdays`, `births`, `cumpleaños` | `birthdays`, `births`, `cumpleaños` |
| `perfiles-delbirth.js` | `delbirth` | `delbirth` |
| `perfiles-delgenre.js` | `delgenre` | `delgenre` |
| `perfiles-perfil.js` | `perfil`, `profile` | — |
| `perfiles-setbirth.js` | `setbirth` | — |
| `perfiles-setdesc.js` | `setdesc`, `setdescription` | — |
| `perfiles-setfav.js` | `setfav`, `setfavourite` | `setfav`, `setfavourite` |
| `perfiles-setgenre.js` | `setgenre` | — |
| `perfiles-setname.js` | `cambiarnombre`, `nombre`, `setname` | `cambiarnombre`, `nombre` |
| `qr-generate.js` | `ge`, `generarqr`, `genqr`, `qr`, `qrcode` | `ge`, `generarqr`, `genqr`, `qrcode` |
| `qr-read.js` | `leercodigo`, `leerqr`, `qrread`, `readqr`, `scanqr` | `leercodigo`, `leerqr`, `qrread`, `readqr`, `scanqr` |
| `random-cat.js` | `cat`, `catmeme`, `gato`, `randomcat` | `cat`, `catmeme`, `gato`, `randomcat` |
| `reaccion-abrazo.js` | `abrazo`, `hug` | — |
| `reaccion-beso.js` | `beso`, `kiss` | — |
| `reaccion-dance.js` | `dance`, `danzar` | `danzar` |
| `reaccion-enojado.js` | `angry`, `enojado` | `enojado` |
| `reaccion-happy.js` | `alegre`, `feliz`, `happy` | `alegre` |
| `reaccion-reir.js` | `reir`, `risa` | `reir`, `risa` |
| `reaccion-sad.js` | `sad`, `triste` | — |
| `reaccion-slap.js` | `bang`, `bofetada`, `slap` | `bang`, `bofetada` |
| `reconnect-bots.js` | `reconnect`, `reconnectbots` | `reconnect`, `reconnectbots` |
| `rpg-adivinanza.js` | `adivinanza`, `adivinanzas`, `riddle` | `adivinanza`, `adivinanzas` |
| `rpg-banco.js` | `banco`, `bank`, `change`, `deposit`, `unirsebank`, `withdraw` | `banco`, `bank`, `change`, `unirsebank` |
| `rpg-bomba.js` | `bomba` | `bomba` |
| `rpg-char-buy.js` | `buyg`, `comprarg`, `comprargacha` | `buyg`, `comprarg`, `comprargacha` |
| `rpg-char-cancel.js` | `cancelarg`, `cancelartienda`, `cancelarvender`, `cancelg` | `cancelarg`, `cancelartienda`, `cancelarvender`, `cancelg` |
| `rpg-char-claim.js` | `c`, `claim`, `comprar`, `reclamar` | `c`, `claim`, `comprar` |
| `rpg-char-gift.js` | `darharem`, `darhr`, `givehr`, `regalarhr` | `darharem`, `darhr`, `givehr`, `regalarhr` |
| `rpg-char-harem.js` | `chars`, `coleccion`, `harem`, `mischars`, `personajes` | `chars`, `coleccion`, `harem`, `mischars`, `personajes` |
| `rpg-char-roll.js` | `personaje`, `rollchar`, `rw`, `w` | `personaje`, `rollchar`, `rw` |
| `rpg-char-sell.js` | `cvender`, `sellchar`, `vender`, `venderchar` | `cvender`, `sellchar`, `vender`, `venderchar` |
| `rpg-char-shop.js` | `charshop`, `gshop`, `tiendag`, `tiendagacha` | `charshop`, `gshop`, `tiendag`, `tiendagacha` |
| `rpg-char-topharem.js` | `gacha`, `topchars`, `topgacha`, `topharem`, `topharems` | `gacha`, `topchars`, `topgacha`, `topharem`, `topharems` |
| `rpg-char-view.js` | `charinfo`, `verharem`, `vh`, `vharem` | `charinfo`, `verharem`, `vh`, `vharem` |
| `rpg-dado.js` | `dado`, `dados`, `dice` | `dado`, `dados`, `dice` |
| `rpg-daily.js` | `daily`, `day`, `diario` | `day`, `diario` |
| `rpg-michi.js` | `3enraya`, `michi`, `tictactoe`, `ttt` | `3enraya`, `michi`, `tictactoe`, `ttt` |
| `rpg-miner.js` | `miner` | `miner` |
| `rpg-moneda.js` | `moneda` | `moneda` |
| `rpg-pescar.js` | `fish`, `fishing`, `pescar` | `fish`, `fishing`, `pescar` |
| `rpg-robar.js` | `rob`, `robar`, `steal` | — |
| `rpg-ruleta.js` | `roulette`, `rule`, `ruleta` | `rule` |
| `rpg-slot.js` | `apostar`, `slot`, `slots` | `apostar`, `slot`, `slots` |
| `rpg-sorpresa.js` | `sorpresa`, `surprise` | `sorpresa`, `surprise` |
| `rpg-suerte.js` | `fortuna`, `luck`, `suerte` | `fortuna`, `luck`, `suerte` |
| `rpg-transfer.js` | `dar`, `donar`, `transf`, `transfer` | `dar`, `donar`, `transf` |
| `rpg-work.js` | `trabajar`, `trabajo`, `work` | `trabajar`, `trabajo` |
| `search-lyrics.js` | `letra`, `letras`, `ly`, `lyrics` | `letra`, `letras`, `ly` |
| `search-soundcloud.js` | `scs`, `scsearch`, `soundcloudsearch` | `scs`, `scsearch`, `soundcloudsearch` |
| `search-sticker.js` | `bsticker`, `search-sticker`, `sticker-search` | `bsticker`, `search-sticker`, `sticker-search` |
| `search-wallcraft.js` | `fondo`, `wall`, `wallcraft`, `wallpaper` | `fondo`, `wall`, `wallcraft`, `wallpaper` |
| `serbot-serbot.js` | `code`, `qrr` | `qrr` |
| `set-autoread.js` | `setautoread` | `setautoread` |
| `set-botimg.js` | `setbotimg` | `setbotimg` |
| `set-botname.js` | `setbotname` | `setbotname` |
| `solo-admin.js` | `adminonly`, `onlyadmin`, `soladmin`, `soloadmin` | `soladmin`, `soloadmin` |
| `sticker-toimg.js` | `ss`, `toimg` | — |
| `stickers-clearmeta.js` | `delstickermeta` | `delstickermeta` |
| `stickers-delmeta.js` | `delmeta`, `remeta`, `take`, `wm` | `delmeta`, `remeta`, `take`, `wm` |
| `stickers-setmeta.js` | `setmeta`, `setstickermeta` | `setmeta`, `setstickermeta` |
| `stickers-sgay.js` | `sgay`, `sgayfilter`, `stickergay` | `sgay`, `sgayfilter`, `stickergay` |
| `stickers-sp.js` | `brat`, `bratgen`, `memetext`, `sp`, `stickerplain` | `brat`, `bratgen`, `memetext`, `sp`, `stickerplain` |
| `stickers-sss.js` | `sss` | `sss` |
| `stickers-sticker.js` | `s`, `sticker`, `stickers` | `stickers` |
| `stickers-sw.js` | `fakemsg`, `msgfake`, `stickerwa`, `sw` | `fakemsg`, `msgfake`, `stickerwa`, `sw` |
| `stickers-text.js` | `st`, `stext`, `stickeranim`, `stickertext`, `textsticker` | `st`, `stext`, `stickeranim`, `stickertext` |
| `sub-bots.js` | `bots`, `listbots`, `listjadibot`, `subbots` | `bots`, `listbots`, `listjadibot` |
| `subbots-botinfo.js` | `botinfo`, `info`, `infobot` | `botinfo`, `info`, `infobot` |
| `subbots-maxsubs.js` | `limsubs`, `maxsub`, `maxsubs` | `limsubs`, `maxsub`, `maxsubs` |
| `tag-all.js` | `hidetag`, `notificar`, `notify`, `tag` | `notificar` |
| `text-pdf.js` | `tepdf`, `textopdf`, `textpdf`, `txtpdf` | `tepdf`, `textopdf`, `textpdf`, `txtpdf` |
| `tiktok-2.js` | `tiktok2`, `tiktoks2`, `tt2`, `tts2` | `tiktok2`, `tiktoks2`, `tt2`, `tts2` |
| `tiktok-search.js` | `tiktok`, `tt`, `ttsearch` | `ttsearch` |
| `timer.js` | `temp`, `timer` | `temp` |
| `top-activos.js` | `activos`, `topactive`, `topactivos`, `topmsg` | `activos`, `topactive`, `topactivos`, `topmsg` |
| `top-burros.js` | `burros`, `burrotop`, `topburro`, `topburros` | `burros`, `burrotop`, `topburro`, `topburros` |
| `top-coins.js` | `richest`, `ricos`, `top-coins`, `topcoin`, `topcoins` | `richest`, `ricos`, `top-coins`, `topcoin`, `topcoins` |
| `top-custom.js` | `top` | `top` |
| `top-femboys.js` | `femboys`, `topfem`, `topfemboy`, `topfemboys` | `femboys`, `topfem`, `topfemboy`, `topfemboys` |
| `top-feos.js` | `feos`, `feotop`, `topfeo`, `topfeos` | `feos`, `feotop`, `topfeo`, `topfeos` |
| `top-fieles.js` | `fieles`, `fieletop`, `topfiel`, `topfieles` | `fieles`, `fieletop`, `topfiel`, `topfieles` |
| `top-fracasados.js` | `fracasados`, `topfra`, `topfracasado`, `topfracasados` | `fracasados`, `topfra`, `topfracasado`, `topfracasados` |
| `top-gays.js` | `gays`, `gaytop`, `topgay`, `topgays` | `gays`, `gaytop`, `topgay`, `topgays` |
| `top-inactivos.js` | `inactivos`, `sinmensajes`, `topinactive`, `topinactivos` | `inactivos`, `sinmensajes`, `topinactive`, `topinactivos` |
| `top-infieles.js` | `infieles`, `infieltop`, `topinfiel`, `topinfieles` | `infieles`, `infieltop`, `topinfiel`, `topinfieles` |
| `top-ingenieros.js` | `ingenieros`, `toping`, `topingeniero`, `topingenieros` | `ingenieros`, `toping`, `topingeniero`, `topingenieros` |
| `top-lindos.js` | `lindos`, `lindotop`, `toplindo`, `toplindos` | `lindos`, `lindotop`, `toplindo`, `toplindos` |
| `top-machos.js` | `machos`, `machotop`, `topmacho`, `topmachos` | `machos`, `machotop`, `topmacho`, `topmachos` |
| `top-mancos.js` | `mancos`, `mancotop`, `topmanco`, `topmancos` | `mancos`, `mancotop`, `topmanco`, `topmancos` |
| `top-otakus.js` | `otakus`, `otakutop`, `topotaku`, `topotakus` | `otakus`, `otakutop`, `topotaku`, `topotakus` |
| `top-pajeros.js` | `pajeros`, `pajerotop`, `toppajero`, `toppajeros` | `pajeros`, `pajerotop`, `toppajero`, `toppajeros` |
| `top-parejas.js` | `parejas`, `parejatop`, `toppareja`, `topparejas` | `parejas`, `parejatop`, `toppareja`, `topparejas` |
| `top-transexuales.js` | `toptrans`, `toptransexuales`, `transexuales`, `transexutop` | `toptrans`, `toptransexuales`, `transexuales`, `transexutop` |
| `traduc.js` | `traduc`, `traducir` | `traduc` |
| `waifu-corean.js` | `corean`, `coreanas` | `corean`, `coreanas` |
| `waifu-girls.js` | `girls`, `girls18` | `girls`, `girls18` |
| `waifu-nsfw.js` | `neko`, `waifu18` | `neko`, `waifu18` |
| `waifu-tetas.js` | `tch`, `tetas`, `ts` | `tch`, `tetas`, `ts` |
| `waifu-tik18.js` | `tik18`, `tk`, `tk18` | `tik18`, `tk`, `tk18` |
| `waifu.js` | `waifu`, `waifus` | `waifu`, `waifus` |
| `waifu2.js` | `waifu2`, `waifus2` | `waifu2`, `waifus2` |
| `welcome-group.js` | `bienvenida`, `bienvenidas`, `welcome` | `bienvenidas` |
| `xnxx.js` | `xnxx`, `xnxxdl`, `xnxxsearch` | `xnxx`, `xnxxdl`, `xnxxsearch` |
| `xvideos.js` | `xvid`, `xvideos`, `xvideosdl`, `xvsearch` | `xvid`, `xvideos`, `xvideosdl`, `xvsearch` |

## Bloqueados para importación automática

`spam`, `callbomb`, `crash`, `nuke`, `freeze`, `bug`, comandos de ataques, módulos NSFW, modos ilegales y comandos de modificación remota del bot.

## Estado de integración

Pain Bot usa `type: module`, un cargador de plugins propio, objetos `m`/`conn` distintos y dependencias adicionales. Por eso no se copiaron plugins directamente al dispatcher de JK-Bot: hacerlo activaría errores en runtime y podría reemplazar configuraciones del usuario.

La integración debe hacerse por módulos compatibles y conservar la licencia GPL-3.0-or-later y los créditos de Pain Bot/Sunkovv. Se excluyen de la importación automática comandos de spam, ataques, llamadas/SMS masivos, crash/freeze/bug, nuke, modos ilegales, NSFW y modificación remota del bot.
