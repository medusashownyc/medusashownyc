// Page titles/descriptions for every template under src/, computed in JS
// (not in YAML front matter) so quotes or colons typed in the CMS can never
// break the build.
export default {
  eleventyComputed: {
    pageTitle: (data) => (data.show ? data.show.en.seo_title : data.cms.settings.en.seo_title),
    pageTitleEs: (data) => (data.show ? data.show.es.seo_title : data.cms.settings.es.seo_title),
    pageDescription: (data) => (data.show ? data.show.en.seo_description : data.cms.settings.en.seo_description),
    pageDescriptionEs: (data) => (data.show ? data.show.es.seo_description : data.cms.settings.es.seo_description),
  },
};
