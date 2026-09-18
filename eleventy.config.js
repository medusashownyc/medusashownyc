import { loadContent, roman, iconSvg } from './lib/load-content.js';

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/admin': 'admin' });
  eleventyConfig.addPassthroughCopy({ 'src/_includes/icons.json': 'admin/site-icons.json' });
  eleventyConfig.addPassthroughCopy('src/*.css');
  eleventyConfig.addPassthroughCopy({ 'src/i18n.js': 'i18n.js', 'src/carousel.js': 'carousel.js', 'src/intro.js': 'intro.js', 'src/experiences.js': 'experiences.js', 'src/sections.js': 'sections.js' });
  eleventyConfig.addWatchTarget('content/');
  eleventyConfig.addWatchTarget('lib/');
  eleventyConfig.addGlobalData('cms', () => loadContent());
  eleventyConfig.addFilter('roman', roman);
  // `npm run dev` runs the site next to the content panel: a live reload
  // would restart the panel mid-save every time it writes a content file.
  if (process.env.PANEL_DEV) eleventyConfig.setServerOptions({ liveReload: false });
  eleventyConfig.addFilter('icon', (icons, name, strokeWidth) => iconSvg(icons, name, strokeWidth));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
