# Créditos

Solo se listan recursos cuya licencia se verificó en los paquetes instalados o en la fuente indicada.

## Tipografías

| Recurso | Uso | Licencia |
| --- | --- | --- |
| Fredoka | Títulos y cifras (`--font-display`) | SIL Open Font License 1.1, vía Google Fonts (`next/font/google`, se sirve desde el propio sitio) |
| Inter | Texto general (`--font-body`) | SIL Open Font License 1.1, vía Google Fonts (`next/font/google`) |

Nota: la licencia OFL de ambas familias es la publicada por Google Fonts; no hay copia local en `node_modules` que verificar.

## Iconos

- [lucide-react](https://lucide.dev) 1.55.0 — licencia ISC (verificada en `node_modules/lucide-react/LICENSE`; incluye derivados de Feather, MIT, Cole Bemis).

## Avatares

- Estilo **Thumbs** de [DiceBear](https://www.dicebear.com), generado localmente con `@dicebear/core` y `@dicebear/collection` (9.4.x).
  - Diseño: DiceBear — licencia **CC0 1.0** (verificado en `node_modules/@dicebear/thumbs/LICENSE`). No exige atribución.
  - Código de las librerías DiceBear: MIT.

## Sonidos (Kenney CC0)

Efectos de [Kenney.nl](https://kenney.nl), licencia **CC0 1.0**
(verificada en el `LICENSE.txt`/`License.txt` de cada paquete; no exige atribución).

| Archivo en `public/sounds/` | Origen | Paquete |
| --- | --- | --- |
| `click.ogg` | `click_002.wav` → OGG (ffmpeg, libvorbis) | [Interface Sounds 1.0](https://kenney.nl/assets/interface-sounds) (11-02-2020) |
| `acierto.ogg` | `confirmation_002.wav` → OGG (ffmpeg, libvorbis) | Interface Sounds 1.0 |
| `error.ogg` | `error_001.wav` → OGG (ffmpeg, libvorbis) | Interface Sounds 1.0 |
| `alerta.ogg` | `threeTone1.ogg` (original del paquete, sin convertir) | [Digital Audio](https://kenney.nl/assets/digital-audio), de Kenney Vleugels |

Notas:
- Los WAV de Interface Sounds vienen del espejo [Calinou/kenney-interface-sounds](https://github.com/Calinou/kenney-interface-sounds)
  (conversión sin pérdidas de los OGG originales de Kenney); el `threeTone1.ogg` de Digital Audio,
  del espejo [ETdoFresh/kenney.nl](https://github.com/ETdoFresh/kenney.nl) (`kenney_digitalaudio/Audio`).
- Uso: `src/lib/sound.tsx` (`useSonido()` → `play("click" | "alerta" | "acierto" | "error")`).
