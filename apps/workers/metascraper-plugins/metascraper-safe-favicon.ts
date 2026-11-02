import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import metascraperLogo from "metascraper-logo-favicon";

import serverConfig from "@karakeep/shared/config";

import { getRandomProxy } from "../network";

type FaviconResolver = NonNullable<
  Parameters<typeof metascraperLogo>[0]
>["resolveFaviconUrl"];
type PickFn = NonNullable<Parameters<typeof metascraperLogo>[0]>["pickFn"];
type SizeCandidate = Parameters<NonNullable<PickFn>>[0][number];

interface FaviconResolution {
  url: string;
}

async function resolveSafeFaviconUrl(
  faviconUrl: string,
): Promise<FaviconResolution | undefined> {
  let url: URL;
  try {
    url = new URL(faviconUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return undefined;
  }

  return { url: url.toString() };
}

// Because resolveSafeFaviconUrl skips network reachability checks (for SSRF
// safety), metascraper-logo-favicon's default pickBiggerSize blindly prefers
// larger <meta name="msapplication-TileImage"> tags (270x270) over real
// <link rel="icon"> tags (192x192), even when the TileImage 404s. Prefer
// <link> icons whenever present.
function pickLinkFaviconFirst(
  sizes: SizeCandidate[],
  opts: {
    pickBiggerSize: (sizes: SizeCandidate[], opts: unknown) => Promise<unknown>;
  },
) {
  const linkCandidates = sizes.filter((s) => !("name" in s) && "rel" in s);
  return opts.pickBiggerSize(
    linkCandidates.length > 0 ? linkCandidates : sizes,
    opts,
  );
}

const metascraperSafeFavicon = () =>
  metascraperLogo({
    gotOpts: {
      agent: {
        http: serverConfig.proxy.httpProxy
          ? new HttpProxyAgent(getRandomProxy(serverConfig.proxy.httpProxy))
          : undefined,
        https: serverConfig.proxy.httpsProxy
          ? new HttpsProxyAgent(getRandomProxy(serverConfig.proxy.httpsProxy))
          : undefined,
      },
    },
    // Do not use the upstream default resolver for page-provided favicon URLs:
    // it checks reachability with reachable-url/got. This resolver only returns
    // normalized http(s) URLs, so attacker-controlled favicon URLs from the HTML
    // are never fetched from the worker.
    resolveFaviconUrl: resolveSafeFaviconUrl as FaviconResolver,
    pickFn: pickLinkFaviconFirst as unknown as PickFn,
    // Without reachability checks, withFavicon/withRootFavicon always return a
    // blind `/favicon.ico` URL even when the site has none, preventing the
    // Google favicon fallback from running.
    favicon: false,
    rootFavicon: false,
    google: true,
  });

export default metascraperSafeFavicon;
