import { g as attr } from './index5-DltsKoco.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import './date-utils-xyIWAIQq.js';
import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import './button-1bYQaKO-.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './client-BGGljB7r.js';
import './exports-Ci9YzwMm.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import './_commonjsHelpers-C1uiShF5.js';
import './utils2-CVx6kO_W.js';
import './create-id-BLMzD-FL.js';
import './events-C5y5VZ_W.js';

function extractUrl(source) {
  if (!source) return null;
  if (typeof source === "string") {
    return source;
  }
  if (typeof source === "object" && "url" in source && source.url) {
    return source.url;
  }
  if (typeof source === "object" && "asset" in source && source.asset) {
    if (typeof source.asset === "object" && "url" in source.asset) {
      return source.asset.url;
    }
  }
  return null;
}
class ImageUrlBuilder {
  _source = null;
  _options = {};
  /**
   * Set the image source
   */
  image(source) {
    this._source = source;
    return this;
  }
  /**
   * Set width (for future dynamic image rendering)
   */
  width(width) {
    this._options.width = width;
    return this;
  }
  /**
   * Set height (for future dynamic image rendering)
   */
  height(height) {
    this._options.height = height;
    return this;
  }
  /**
   * Set both width and height (for future dynamic image rendering)
   */
  size(width, height) {
    this._options.width = width;
    this._options.height = height;
    return this;
  }
  /**
   * Set quality (for future dynamic image rendering)
   */
  quality(quality) {
    this._options.quality = Math.max(1, Math.min(100, quality));
    return this;
  }
  /**
   * Set format (for future dynamic image rendering)
   */
  format(format) {
    this._options.format = format;
    return this;
  }
  /**
   * Set fit mode (for future dynamic image rendering)
   */
  fit(fit) {
    this._options.fit = fit;
    return this;
  }
  /**
   * Enable automatic format selection (for future dynamic image rendering)
   */
  auto(mode) {
    this._options.auto = mode;
    return this;
  }
  /**
   * Build the final URL
   * Returns /api/assets/{id}?dl=1 which redirects to the actual S3/R2 URL
   * Transformations (.width(), .quality(), etc) are stored but not yet applied
   *
   * For multi-tenant access, use signAssetUrl config to generate signed URLs
   * TODO: Add dynamic image rendering support
   */
  url() {
    cmsLogger.debug("[ImageUrlBuilder] url() called with source:", JSON.stringify(this._source));
    if (!this._source) {
      cmsLogger.debug("[ImageUrlBuilder] No source provided");
      return null;
    }
    const directUrl = extractUrl(this._source);
    if (directUrl) {
      cmsLogger.debug("[ImageUrlBuilder] Using direct URL from resolved asset:", directUrl);
      return directUrl;
    }
    let assetId = null;
    if (typeof this._source === "string") {
      cmsLogger.debug("[ImageUrlBuilder] Source is string:", this._source);
      assetId = this._source;
    } else if (typeof this._source === "object") {
      cmsLogger.debug("[ImageUrlBuilder] Source is object, checking for asset._ref or _ref");
      if ("asset" in this._source && this._source.asset?._ref) {
        assetId = this._source.asset._ref;
        cmsLogger.debug("[ImageUrlBuilder] Found asset._ref:", assetId);
      } else if ("_ref" in this._source) {
        assetId = this._source._ref;
        cmsLogger.debug("[ImageUrlBuilder] Found _ref:", assetId);
      }
    }
    if (!assetId) {
      cmsLogger.warn("[ImageUrlBuilder] Could not extract asset ID from source:", this._source);
      return null;
    }
    const finalUrl = `/media/${assetId}/image`;
    cmsLogger.debug("[ImageUrlBuilder] Building CDN URL:", finalUrl);
    return finalUrl;
  }
  /**
   * Alias for url()
   */
  toString() {
    return this.url();
  }
}
function imageUrlBuilder() {
  return (source) => {
    const builder = new ImageUrlBuilder();
    if (source) {
      builder.image(source);
    }
    return builder;
  };
}
const urlFor = imageUrlBuilder();
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const { pageRender } = data;
    const hero = pageRender?.hero;
    const backgroundImage = hero?.backgroundImage;
    if (pageRender) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`${escape_html(JSON.stringify(pageRender))} `);
      if (hero && backgroundImage) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div><img${attr("alt", hero.heading)}${attr("src", urlFor(backgroundImage).url())}/> <h1>${escape_html(hero.heading)}</h1> `);
        if (hero.subheading) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p>${escape_html(hero.subheading)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-VnVlicR_.js.map
