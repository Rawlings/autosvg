import { sized } from '@autosvg/engine'

/**
 * A drawing as an inline <svg> at a pixel size. The markup always comes from the engine (canonical() of what is on the
 * canvas), which sanitizes everything it parses, so injecting it is safe.
 */
export function InlineSvg({ svg, size, className }: { svg: string; size: number; className?: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: engine-generated, sanitized markup (see above)
  return <span className={className} dangerouslySetInnerHTML={{ __html: sized(svg, size) }} />
}
