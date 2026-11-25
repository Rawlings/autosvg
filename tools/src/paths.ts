// Where the files the tools read and write live. Everything is found from this file, so the tools run from any directory.

/** The repository root, as a directory URL. */
export const root = new URL('../../', import.meta.url)

/** The icon files, `packages/icons/svg/`, as a directory URL. */
export const iconDir = new URL('packages/icons/svg/', root)

/** The runtime's stylesheets, `packages/runtime/src/css/`, as a directory URL. */
export const cssDir = new URL('packages/runtime/src/css/', root)
