# Medusa Show — sitio web + panel de contenido

Sitio estático bilingüe (EN/ES) de [medusashownyc.vercel.app](https://medusashownyc.vercel.app),
generado con [Eleventy](https://www.11ty.dev/) a partir de contenido editable desde
un panel propio para la clienta (`/admin/`, móvil primero, acceso con correo y
contraseña). Daniel edita `content/` directamente en el repo cuando hace falta.

```
content/            ← TODO el contenido editable (JSON con { en, es })
  settings.json       contacto, logos, SEO, Cal.com
  strings.json        textos de menús y botones
  home/*.json         secciones de la página de inicio
  shows/*.json        un archivo por show → genera show-<slug>.html
src/
  index.njk           plantilla de la página de inicio
  show.njk            plantilla de cada show (paginación sobre content/shows)
  _includes/          layout.njk (header/footer), macros.njk, icons.json
  admin/              panel de contenido para la clienta (Preact + htm, sin build)
    vendor/             preact, preact/hooks y htm servidos desde aquí (import map en index.html)
    app.js              raíz: sesión, caché de contenido, rutas (#/…), publicación
    lib/schema.js       QUÉ se edita: secciones y campos, en palabras de la clienta
    lib/backend.js      llamadas a /api/panel/* (cookie de sesión httpOnly; sin tokens en el navegador)
    lib/form.js         { en, es } ⇄ formulario, validación, slugs
    lib/images.js       redimensiona y convierte a WebP en el navegador
    lib/batches.js      parte un guardado con muchas fotos en varios commits (≤3,5 MB y ≤30 archivos cada uno)
    components/         una pantalla o campo por archivo
  build.njk           genera /build.json (commit publicado) para el aviso “Ya está en la web”
  assets/             logos, favicon, images/ (biblioteca de fotos del CMS)
  *.css, *.js         estilos y scripts del sitio (sin cambios de diseño)
lib/
  load-content.js     lee content/ y lo expone a las plantillas como `cms`
  panel-auth.js       contraseña (scrypt), sesiones firmadas, cookie, límite de intentos
  panel-api.js        handlers de /api/panel/* (login, lectura, commit) con validación
  github-store.js     acceso al repo desde el servidor con GITHUB_TOKEN
  repo.js             owner/repo/branch
api/panel/{session,content,commit}.js   funciones de Vercel del panel
scripts/make-password.js                genera contraseña + hash + secreto de sesión
eleventy.config.js  vercel.json  package.json
```

## Desarrollo

```bash
npm install
npm run dev       # sitio en http://localhost:8080 + panel en /admin/ (modo local)
npm run dev:site  # solo el sitio, con recarga automática en el navegador
npm run build     # genera _site/ (lo que Vercel publica)
```

`npm run dev` arranca Eleventy y `scripts/dev-panel-api.js` (puerto 8082), que
ejecuta los mismos handlers que las funciones de Vercel pero guardando en
`content/` y `src/assets/` del disco. Si no hay `.env` con `PANEL_EMAIL` y
`PANEL_PASSWORD_HASH` (créalo con `node scripts/make-password.js --write`),
el login local acepta `dev@local` / `dev` y lo indica en pantalla. En ese
modo la recarga automática está apagada (reiniciaría el panel a mitad de un
guardado); usa `dev:site` cuando trabajes en plantillas o CSS. Los cambios en
`lib/`, `eleventy.config.js` o archivos de datos nuevos (`*.11tydata.js`)
requieren reiniciar el servidor. Eleventy no borra
salidas antiguas: si eliminas un show en local, su `show-<slug>.html` sigue en
`_site/` hasta el próximo `npm run clean && npm run build` (en Vercel cada
deploy construye desde cero).
El HTML generado es equivalente al anterior: mismo CSS, mismos scripts, mismas
clases; solo cambió de dónde sale el contenido.

## Cómo funciona el panel

1. La clienta entra a `https://medusashownyc.vercel.app/admin/` desde el móvil o el
   ordenador con **su correo y su contraseña** (no necesita GitHub ni ninguna
   otra cuenta). La contraseña no se guarda en ningún sitio: en Vercel solo
   vive su hash scrypt (`PANEL_PASSWORD_HASH`).
2. Al entrar, el servidor firma una sesión (HMAC-SHA256 con `SESSION_SECRET`,
   7 días) y la deja en una cookie `httpOnly; Secure; SameSite=Strict` con
   `Path=/api/panel`: el JavaScript del navegador nunca ve la sesión, ni la
   contraseña, ni ningún token.
3. La portada del panel muestra la web como tarjetas con miniaturas reales; en
   pantallas grandes (≥1200 px) aparece además una barra lateral con todas las
   secciones y "Nuevo show", las tarjetas van a dos columnas y los formularios
   muestran español e inglés lado a lado. Es la misma app con dos disposiciones
   (`src/admin/components/Sidebar.js` + media query al final de
   `src/admin/styles.css`); por debajo de 1200 px (móvil y tablet) se usa la
   columna única. Las tarjetas son
   (Portada, Universo Medusa, Nosotros, Paquetes, Clientes, Contacto, Shows,
   Ajustes). Toca una, edita textos (español e inglés lado a lado) o fotos
   (**Cambiar foto** → subir desde el teléfono o elegir de la biblioteca).
4. **Guardar y publicar** envía los cambios a `/api/panel/commit`; la función de
   Vercel (la única que conoce `GITHUB_TOKEN`) valida rutas y tamaños y hace un
   commit en `main` con el JSON y las fotos nuevas (varios commits seguidos si
   las fotos superan 3,5 MB), firmado como `Panel Medusa Show`. Vercel
   construye y el panel espera hasta que `/build.json` devuelve el commit
   final (o uno posterior) para decir **Ya está en la web** (≈1 minuto).

Las fotos se convierten a **WebP** (JPEG si el navegador no sabe codificar
WebP) y se limitan a 2400 px antes de subirse. Se guardan en
`src/assets/images/` y aparecen en la biblioteca para reutilizarlas.

Si un guardado lleva muchas fotos, el panel lo parte en varios commits
consecutivos (las funciones de Vercel no aceptan cuerpos de más de 4,5 MB) y lo
indica en el telón ("Guardando los cambios (2 de 3)").

Guía para la clienta (sin tecnicismos): [docs/GUIA-CMS.md](docs/GUIA-CMS.md).

### Qué puede editar

| Sección del panel | Archivo | Qué controla |
| --- | --- | --- |
| Página de inicio → Portada | `content/home/hero.json` | Las tres palabras del hero |
| Página de inicio → Nosotros | `content/home/about.json` | Foto, insignia, textos, cifras |
| Página de inicio → Paquetes | `content/home/packages.json` | Paquetes rotativos, qué incluyen, fotos |
| Página de inicio → Clientes | `content/home/clients.json` | Testimonios y cinta de fotos |
| Página de inicio → Contacto | `content/home/contact.json` | Textos de reserva y tarjeta de Cal.com |
| Página de inicio → Galería | `content/home/gallery.json` | Fotos del túnel "Universo Medusa" |
| Shows | `content/shows/<slug>.json` | Todo el contenido de cada show; crear/borrar shows |
| Configuración → General | `content/settings.json` | Email, WhatsApp, redes sociales, Cal.com, logos, SEO |
| Configuración → Textos | `content/strings.json` | Etiquetas de menú y botones |

Crear un show nuevo en el panel genera su página (`show-<slug>.html`) y lo
añade al menú, al carrusel de la portada y a las tarjetas relacionadas. El
orden del menú/carrusel es el campo `order`, que también se reescribe al
arrastrar los shows en la lista del panel (`reorder: true`).

## Configurar el acceso de la clienta (una sola vez)

1. Generar las credenciales (la contraseña se muestra una sola vez; guardarla en
   un gestor de contraseñas y dársela a la clienta por un canal seguro):

   ```bash
   node scripts/make-password.js --email correo@de.la.clienta
   ```

2. Crear en GitHub un **token fine-grained** (Settings → Developer settings →
   Personal access tokens → Fine-grained): *Resource owner* la cuenta dueña del
   repo, *Only select repositories* → `medusashownyc`, permiso *Contents:
   Read and write*. Caduca como máximo al año: apuntar la fecha para renovarlo
   (si caduca, el panel avisa "El acceso del panel al repositorio caducó").

3. En Vercel → *Settings → Environment Variables* (Production):

   | Variable | Valor |
   | --- | --- |
   | `PANEL_EMAIL` | correo con el que entra la clienta (`medusashowny@gmail.com`) |
   | `PANEL_PASSWORD_HASH` | el hash que imprime el script (empieza por `scrypt$`) |
   | `SESSION_SECRET` | el secreto que imprime el script |
   | `GITHUB_TOKEN` | el token fine-grained |
   | `PANEL_NAME` | (opcional) nombre de la clienta solo para el saludo del panel (nunca aparece en los commits) |
   | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | claves de Cloudflare Turnstile (reto anti-bots del login). **Obligatorias en producción, las dos**: sin ellas el login responde "Falta la verificación anti-bots". Si Cloudflare no responde, el login dice "inténtalo en un momento" sin contar el intento como fallido. Gratis: dash.cloudflare.com → Turnstile → Add site (dominio `medusashownyc.vercel.app`, modo Managed) |
   | `PANEL_AUTHOR_EMAIL` | (opcional) correo de autoría de los commits; por defecto `panel@medusa-show.invalid` para no publicar el correo real de la clienta en el historial del repo público |
   | `PANEL_ALLOW_NO_TURNSTILE` | (no recomendado) `1` para permitir el login sin Turnstile |

4. Redeploy. Listo: `/admin/` → correo + contraseña.

Para cambiar la contraseña (o si pierde el teléfono): volver a ejecutar el
script y sustituir `PANEL_PASSWORD_HASH`. Las sesiones van ligadas a la
contraseña, así que ese cambio cierra automáticamente todas las sesiones
abiertas en cualquier dispositivo; sustituir también `SESSION_SECRET` es un
extra sin coste.

### Qué protege y qué no

- Contraseña de 24 caracteres sobre 55 símbolos (~138 bits) generada sin
  sesgo; hash scrypt (N=2¹⁵) con comparación en tiempo constante; si el correo
  no coincide se calcula igual un hash señuelo (sin diferencias de tiempo).
- Turnstile obligatorio en producción: un bot no llega a probar contraseñas.
  Detrás, límites en memoria por IP (5 fallos/15 min), por correo (20/15 min) y
  global (60/min por instancia), con pausa aleatoria en cada fallo. La IP se
  toma de `x-vercel-forwarded-for`/`x-real-ip` (fijadas por Vercel), nunca del
  primer valor de `x-forwarded-for`, que el cliente puede falsificar.
- Sesión de 7 días en cookie httpOnly + Secure + SameSite=Strict + Path
  `/api/panel`, firmada (HMAC-SHA256) y ligada a la contraseña vigente. Las
  escrituras exigen además `Origin` del propio sitio y el header
  `X-Requested-With: medusa-panel` (los orígenes localhost solo cuentan cuando
  el servidor también es localhost).
- Cabeceras en `vercel.json` para `/admin` y `/api/*`: CSP (scripts propios,
  hash del import map y Turnstile; sin iframes), `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `no-store`. Preact/htm se sirven desde el
  propio sitio, sin CDN. **Si se edita el bloque `<script type="importmap">`
  de `src/admin/index.html`, hay que recalcular su hash SHA-256 (base64) y
  sustituirlo en los dos bloques CSP de `vercel.json`**; si no, el panel
  queda en blanco en producción:
  `node -e "const h=require('fs').readFileSync('src/admin/index.html','utf8').match(/<script type=\"importmap\">([\\s\\S]*?)<\\/script>/)[1];console.log('sha256-'+require('crypto').createHash('sha256').update(h).digest('base64'))"`
- El servidor solo escribe JSON en `content/` e imágenes ráster (webp, jpg,
  png, gif, avif) en `src/assets/`; los SVG no se aceptan (pueden llevar
  scripts); solo borra `content/shows/*.json` (máx. 10 por guardado); máx. 40
  archivos y 4 MB por commit. El token de GitHub nunca sale de Vercel.
- Los commits del panel se firman con `Panel Medusa Show
  <panel@medusa-show.invalid>` (repositorio público: el correo real no se
  publica).
- Lo que no cubre: el límite de intentos vive en memoria de cada instancia
  serverless (por eso Turnstile es obligatorio); un token de GitHub caducado
  se avisa en el panel pero hay que renovarlo a mano; el sitio público no
  lleva CSP (usa scripts inline y CDNs de GSAP/three.js heredados).

## Notas técnicas

- `i18n.js` sigue funcionando igual: el HTML sale en inglés y cada texto lleva
  su traducción en `data-es*`. Las plantillas solo emiten `data-es` cuando el
  español difiere del inglés.
- `carousel.js` toma las fotos y enlaces del `.service-row` que genera
  `index.njk` y mide la proporción de cada imagen al cargarla (antes estaba
  escrita a mano y se desincronizaba al cambiar fotos).
- `experiences.js` lee la galería del bloque `<script type="application/json" id="galleryData">`.
- `sections.js` lee los "incluye" de cada paquete como JSON en `data-includes`
  (etiqueta EN/ES + enlace e icono del show vinculado).
- Los iconos disponibles están en `src/_includes/icons.json` (se publican como
  `/admin/site-icons.json` para que el panel los dibuje); para añadir uno nuevo
  hay que agregarlo ahí y en `SITE_ICONS` de `src/admin/lib/schema.js`.
- Si se añade un campo nuevo a `content/`, hay que declararlo en
  `src/admin/lib/schema.js`; los campos que el panel no declara se conservan
  tal cual al guardar.
- El panel sencillo no depende de ningún CDN de JavaScript: Preact 10.24.3,
  sus hooks y htm 3.1.1 están copiados en `src/admin/vendor/` y se resuelven
  con el import map de `src/admin/index.html`. Para actualizarlos, sustituir
  esos tres archivos (`dist/preact.module.js`, `hooks/dist/hooks.module.js`,
  `dist/htm.module.js` de npm). No hay paso de build ni dependencias npm.
- Las miniaturas del panel usan la optimización de imágenes de Vercel
  (`/_vercel/image?url=…&w=320`, tamaños declarados en `vercel.json` →
  `images`); si el endpoint no responde, `Thumb.js` recurre a la imagen
  original. En localhost se usan siempre los archivos originales. La
  biblioteca oculta archivos de más de 6 MB (hay dos JPG de 16 MB sin uso en
  `src/assets/images/`; conviene borrarlos del repo).
- El navegador no guarda ningún token: "Salir" borra la cookie de sesión en
  el servidor y en el navegador. Los commits se firman como `Panel Medusa Show
  <panel@medusa-show.invalid>` (autor) y con el usuario del token como committer.
- Si un guardado con varias fotos falla en un lote intermedio, las fotos de
  los lotes anteriores ya están en el repo (sin referencia hasta que se
  reintente); el telón lo dice y "Intentar otra vez" vuelve a enviar lo mismo
  sin duplicar. Si la clienta abandona, quedan fotos huérfanas en
  `src/assets/images/` (solo peso, ningún efecto en la web).
- Cada foto subida (~0,5–1 MB en WebP) queda en el historial de git para
  siempre. El panel no borra fotos; para limpiar la biblioteca, borrar archivos
  de `src/assets/images/` en el repo.
- Si Daniel empuja un commit mientras la clienta publica, el panel da por
  publicado el cambio en cuanto ve un build nuevo posterior a su guardado
  (cualquier commit posterior en `main` incluye el suyo).
- Al renombrar un show, la dirección de su página (`show-<slug>.html`) no
  cambia: protege los enlaces ya compartidos. Para cambiarla hay que crear el
  show de nuevo y borrar el antiguo.
- Textos que la clienta rellena en un solo idioma se publican en los dos
  (el panel lo avisa bajo el campo, sin bloquear el guardado).
- No hay flujo de borradores: cada guardado se publica.
- No hay vista previa dentro del panel (la previsualización genérica no
  refleja el diseño). Cada sección y cada show tienen enlace **Ver** a la
  página real, y el telón de publicación ofrece **Ver la web** al terminar.
- El panel siempre escribe JSON válido, pero si un archivo de `content/`
  se corrompe a mano, `npm run build` falla indicando la ruta del archivo y
  Vercel conserva la versión anterior publicada (el panel ya habrá dicho
  "guardado"). Conviene activar en Vercel → *Settings → Notifications* el
  aviso de *Deployment failed* al correo de Daniel; la guía de la clienta le
  indica avisar si un cambio no aparece en 5 minutos.
- Las secciones opcionales de un show (párrafos, datos, "Qué incluye", "Ideal
  para", relacionados) se omiten en la página si su lista queda vacía; las
  listas de la portada (paquetes, testimonios, fotos, galería) exigen al menos
  un elemento porque el diseño depende de ellas.
