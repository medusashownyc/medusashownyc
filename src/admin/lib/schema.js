// What the client can edit, in her words. Mirrors the site's content files
// (content/*.json, { en, es }): same files, same field names. Fields not
// declared here are kept untouched when saving.

export const ACCENTS = [
  { value: 'green', label: 'Verde', color: '#00b87e' },
  { value: 'magenta', label: 'Magenta', color: '#ff0d73' },
  { value: 'blue', label: 'Azul', color: '#00b6ff' },
  { value: 'purple', label: 'Morado', color: '#8a2cff' },
  { value: 'gold', label: 'Dorado', color: '#c9a24b' },
];

export const SITE_ICONS = [
  { value: 'ondas', label: 'Ondas' },
  { value: 'fuego', label: 'Fuego' },
  { value: 'corona', label: 'Corona' },
  { value: 'rayo', label: 'Rayo' },
  { value: 'musica', label: 'Música' },
  { value: 'robot', label: 'Robot' },
  { value: 'aro', label: 'Aro' },
  { value: 'corazon', label: 'Corazón' },
  { value: 'aro-soporte', label: 'Aro con soporte' },
  { value: 'personas', label: 'Personas' },
  { value: 'escudo', label: 'Escudo' },
  { value: 'foto', label: 'Foto' },
  { value: 'reloj', label: 'Reloj' },
  { value: 'robot-cara', label: 'Cara de robot' },
];

const text = (name, label, extra = {}) => ({ name, label, type: 'text', i18n: true, ...extra });
const textarea = (name, label, extra = {}) => ({ name, label, type: 'textarea', i18n: true, ...extra });
const image = (name, label, extra = {}) => ({ name, label, type: 'image', ...extra });
const alt = (name = 'image_alt') => ({ name, label: 'Descripción de la foto', type: 'text', i18n: true, hint: 'Para lectores de pantalla y Google. Una frase corta.', optional: true });

export const HOME_SECTIONS = [
  {
    id: 'hero',
    file: 'content/home/hero.json',
    title: 'Portada',
    kicker: 'Lo primero que se ve',
    description: 'Las tres palabras que abren la web.',
    preview: 'index.html',
    fields: [
      text('line1', 'Palabra 1'),
      text('line2', 'Palabra 2'),
      text('line3', 'Palabra 3'),
    ],
  },
  {
    id: 'gallery',
    file: 'content/home/gallery.json',
    title: 'Universo Medusa',
    kicker: 'Túnel de fotos',
    description: 'Las fotos que vuelan por el túnel 3D.',
    preview: 'index.html#experiences',
    fields: [
      text('heading', 'Título del túnel'),
      {
        name: 'images', label: 'Fotos', labelSingular: 'foto', type: 'list', min: 1, summary: 'alt', thumb: 'image',
        hint: 'Se muestran en orden aleatorio. Cuantas más, mejor.',
        fields: [
          image('image', 'Foto'),
          { ...alt('alt'), label: 'Qué se ve en la foto' },
          { name: 'big', label: 'Mostrar siempre en el marco más grande', type: 'toggle', default: false },
        ],
      },
    ],
  },
  {
    id: 'about',
    file: 'content/home/about.json',
    title: 'Nosotros',
    kicker: 'Quiénes somos',
    description: 'La foto del elenco, el texto de presentación y las cifras.',
    preview: 'index.html#about',
    fields: [
      image('image', 'Foto del elenco', { hint: 'Foto vertical. Aparece grande junto al texto.' }),
      alt(),
      { name: 'badge_number', label: 'Cifra de la insignia', type: 'text', hint: 'Ejemplo: 8+' },
      text('badge_label', 'Texto de la insignia'),
      text('eyebrow', 'Texto pequeño superior'),
      text('title', 'Título'),
      textarea('lead', 'Párrafo'),
      {
        name: 'stats', label: 'Cifras', labelSingular: 'cifra', type: 'list', min: 3, max: 3, summary: 'label',
        fields: [
          { name: 'number', label: 'Número', type: 'number', min: 0 },
          { name: 'suffix', label: 'Símbolo (va delante del número)', type: 'text', default: '+', optional: true, hint: 'Ejemplo: + para mostrar +400' },
          text('label', 'Etiqueta'),
        ],
      },
    ],
  },
  {
    id: 'packages',
    file: 'content/home/packages.json',
    title: 'Paquetes',
    kicker: 'Combinaciones de shows',
    description: 'Los paquetes que rotan en la portada y qué incluye cada uno.',
    preview: 'index.html#rituales',
    fields: [
      text('eyebrow', 'Texto pequeño superior'),
      text('title', 'Título'),
      textarea('lead', 'Párrafo introductorio'),
      {
        name: 'items', label: 'Paquetes', labelSingular: 'paquete', type: 'list', min: 1, summary: 'title', thumb: 'image',
        hint: 'El primero de la lista es el que se ve al abrir la web.',
        fields: [
          text('title', 'Nombre del paquete'),
          text('kicker', 'Etiqueta corta', { hint: 'Ejemplo: Experiencia completa' }),
          text('tag', 'Frase de apoyo', { hint: 'Aparece encima del nombre en el panel grande.' }),
          textarea('description', 'Descripción'),
          image('image', 'Foto'),
          alt(),
          { name: 'accent', label: 'Color', type: 'select', options: ACCENTS, default: 'green' },
          {
            name: 'includes', label: 'Qué incluye', labelSingular: 'elemento', type: 'list', summary: 'label',
            fields: [
              text('label', 'Nombre'),
              { name: 'show', label: 'Enlazar con un show', type: 'show', optional: true, hint: 'Añade el icono del show y un enlace a su página.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'clients',
    file: 'content/home/clients.json',
    title: 'Clientes',
    kicker: 'Testimonios',
    description: 'Lo que dicen los clientes y la cinta de fotos de eventos.',
    preview: 'index.html#testimonials',
    fields: [
      text('eyebrow', 'Texto pequeño superior'),
      text('title', 'Título'),
      {
        name: 'quotes', label: 'Testimonios', labelSingular: 'testimonio', type: 'list', min: 1, summary: 'author',
        fields: [
          textarea('text', 'Frase', { hint: 'Sin comillas, se añaden solas.' }),
          text('author', 'Quién lo dice', { hint: 'Ejemplo: Wedding Planner, Novia' }),
        ],
      },
      {
        name: 'photos', label: 'Fotos de eventos', labelSingular: 'foto', type: 'list', min: 1, thumb: 'image',
        fields: [image('image', 'Foto', { mediaFolder: 'Testimonio' })],
      },
    ],
  },
  {
    id: 'contact',
    file: 'content/home/contact.json',
    title: 'Contacto',
    kicker: 'Reservar una llamada',
    description: 'Los textos de la sección de reserva y de la tarjeta del calendario.',
    preview: 'index.html#booking',
    fields: [
      text('eyebrow', 'Texto pequeño superior'),
      text('title', 'Título'),
      textarea('text', 'Párrafo'),
      {
        name: 'points', label: 'Puntos clave', labelSingular: 'punto', type: 'list', summary: 'text',
        fields: [text('text', 'Texto')],
      },
      text('cal_event', 'Tarjeta: nombre de la llamada'),
      text('cal_duration', 'Tarjeta: duración'),
      text('cal_mode', 'Tarjeta: modalidad'),
      text('cal_timezone', 'Tarjeta: zona horaria'),
      textarea('cal_text', 'Tarjeta: texto'),
      text('cal_button', 'Tarjeta: botón'),
    ],
  },
];

export const SETTINGS_SECTIONS = [
  {
    id: 'settings',
    file: 'content/settings.json',
    title: 'Contacto y redes',
    kicker: 'Datos de la marca',
    description: 'Correo, WhatsApp, redes sociales, calendario y logos.',
    preview: 'index.html#booking',
    fields: [
      { name: 'site_name', label: 'Nombre de la marca', type: 'text' },
      { name: 'email', label: 'Correo de contacto', type: 'text', inputMode: 'email', pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, patternHint: 'Escribe un correo válido.' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'text', inputMode: 'numeric', hint: 'Solo números, con código de país. Ejemplo: 19297073536', pattern: /^[0-9]{8,15}$/, patternHint: 'Solo dígitos, entre 8 y 15.' },
      {
        name: 'social', label: 'Redes sociales', labelSingular: 'red social', type: 'list', summary: 'network',
        fields: [
          { name: 'network', label: 'Red', type: 'select', default: 'instagram', options: [
            { value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }, { value: 'facebook', label: 'Facebook' }, { value: 'youtube', label: 'YouTube' },
          ] },
          { name: 'url', label: 'Enlace', type: 'text', inputMode: 'url', pattern: /^https?:\/\//, patternHint: 'Debe empezar por https://' },
        ],
      },
      { name: 'cal_link', label: 'Enlace de Cal.com', type: 'text', hint: 'Solo usuario/evento, por ejemplo medusa-show-nyc/15min. Si pegas el enlace completo se recorta solo.', normalize: (v) => v.trim().replace(/^https?:\/\/(app\.|www\.)?cal\.com\//, '').replace(/[?#].*$/, '').replace(/\/+$/, ''), pattern: /^[\w.-]+\/[\w.-]+$/, patternHint: 'Debe tener la forma usuario/evento, por ejemplo medusa-show-nyc/15min.' },
      text('footer_tagline', 'Frase del pie de página'),
      text('copyright', 'Texto de derechos'),
      text('seo_title', 'Título en Google'),
      textarea('seo_description', 'Descripción en Google'),
      image('logo_dark', 'Logo oscuro (fondo claro)', { mediaFolder: '..', accept: 'image/png,image/jpeg,image/webp', hint: 'PNG con fondo transparente. Los SVG los cambia Daniel.' }),
      image('logo_light', 'Logo blanco (fondo oscuro)', { mediaFolder: '..', accept: 'image/png,image/jpeg,image/webp', hint: 'PNG con fondo transparente.' }),
      image('symbol', 'Símbolo blanco (botones)', { mediaFolder: '..', accept: 'image/png,image/jpeg,image/webp' }),
      image('favicon', 'Icono de la pestaña', { mediaFolder: '..', accept: 'image/png,image/jpeg,image/webp', hint: 'Cuadrado, mínimo 256 px.' }),
    ],
  },
  {
    id: 'strings',
    file: 'content/strings.json',
    title: 'Textos de menús y botones',
    kicker: 'Palabras repetidas por toda la web',
    description: 'Etiquetas del menú, botones y títulos fijos de las páginas de show.',
    preview: 'index.html',
    fields: [
      text('nav_shows', 'Menú: Shows'),
      text('nav_about', 'Menú: Nosotros'),
      text('nav_packages', 'Menú: Paquetes'),
      text('nav_clients', 'Menú: Clientes'),
      text('nav_contact', 'Menú: Contacto'),
      text('book_now', 'Botón: Reservar cita'),
      text('book_this_show', 'Botón: Reservar este show'),
      text('see_all_shows', 'Botón: Ver todos los shows'),
      text('quote_package', 'Botón: Cotizar este paquete'),
      text('direct_whatsapp', 'Enlace: WhatsApp directo'),
      text('footer_whatsapp', 'Pie: enlace de WhatsApp'),
      text('about_the_show', 'Show: “Sobre el show”'),
      text('whats_included', 'Show: “Qué incluye”'),
      text('features_title', 'Show: título de “Qué incluye”'),
      text('ideal_for', 'Show: “Ideal para”'),
      text('cta_card_title', 'Show: pregunta final'),
      text('discover_more', 'Show: “Descubre más”'),
      text('other_shows', 'Show: “Otros shows del elenco”'),
      text('footer_navigation', 'Pie: “Navegación”'),
      text('footer_contact', 'Pie: “Contacto”'),
    ],
  },
];

export const SHOW = {
  folder: 'content/shows',
  preview: (slug) => `show-${slug}.html`,
  fields: [
    text('name', 'Nombre del show', { hint: 'Aparece en el menú, en la portada y como título de “Sobre el show”. La dirección de la página no cambia al renombrar.' }),
    image('cover', 'Foto principal', { hint: 'Foto vertical. Se usa en el menú, el carrusel, la página del show y las tarjetas relacionadas.' }),
    { ...alt('cover_alt') },
    { name: 'crop', label: 'Encuadre de la foto', type: 'select', default: 'center', options: [
      { value: 'center', label: 'Centrada' }, { value: 'top', label: 'Priorizar la parte de arriba' },
    ], hint: 'Elige “arriba” si a la persona se le corta la cabeza en las miniaturas.' },
    { name: 'accent', label: 'Color de la página', type: 'select', options: ACCENTS, default: 'green' },
    { name: 'dark', label: 'Página con fondo oscuro', type: 'toggle', default: false, hint: 'Negro y dorado, como Belly Dancers.' },
    { name: 'icon', label: 'Icono', type: 'select', options: SITE_ICONS, siteIcon: true, default: 'rayo' },
    text('badge', 'Etiqueta sobre la foto'),
    text('eyebrow', 'Texto pequeño sobre el título', { hint: 'Ejemplo: Acto de fuego en vivo' }),
    text('headline', 'Título principal'),
    { name: 'paragraphs', label: 'Sobre el show', labelSingular: 'párrafo', type: 'list', summary: 'text', fields: [textarea('text', 'Texto')] },
    {
      name: 'stats', label: 'Datos rápidos', labelSingular: 'dato', type: 'list', min: 3, max: 3, summary: 'label',
      fields: [text('value', 'Valor', { hint: 'Ejemplo: 5–12 min, 1–2, Aire libre' }), text('label', 'Etiqueta', { hint: 'Ejemplo: Duración' })],
    },
    {
      name: 'features', label: 'Qué incluye', labelSingular: 'elemento', type: 'list', summary: 'title',
      fields: [
        { name: 'icon', label: 'Icono', type: 'select', options: SITE_ICONS, siteIcon: true, default: 'rayo' },
        text('title', 'Título'),
        textarea('description', 'Descripción'),
      ],
    },
    { name: 'tags', label: 'Ideal para', labelSingular: 'ocasión', type: 'list', summary: 'label', fields: [text('label', 'Ocasión')] },
    { name: 'related', label: 'Otros shows relacionados', type: 'shows', max: 3, hint: 'Hasta 3. Si no eliges ninguno, se muestran otros shows automáticamente.' },
    text('seo_title', 'Título en Google'),
    textarea('seo_description', 'Descripción en Google'),
  ],
};

/** Every section the panel knows, keyed by id (used by the router and the cache). */
export const ALL_SECTIONS = Object.fromEntries([...HOME_SECTIONS, ...SETTINGS_SECTIONS].map((s) => [s.id, s]));
