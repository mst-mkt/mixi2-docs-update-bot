import type { DocMap } from './diff'

const DOC_TOP_URL = 'https://developer.mixi.social'

const getDocPaths = async () => {
  const res = await fetch(`${DOC_TOP_URL}/docs/llms-full.txt`)
  if (!res.ok) throw new Error(`Failed to fetch llms-full.txt: ${res.status}`)
  const llmsFullText = await res.text()

  const textLines = llmsFullText.split('\n')
  const headings = textLines.filter((line) => line.startsWith('# ') && line.endsWith(')'))
  const docPaths = headings
    .map((heading) => {
      const pathWithParens = heading.split(' ').at(-1) ?? ''
      return pathWithParens.slice(1, -1)
    })
    .filter((path) => path !== '/docs/')

  return docPaths
}

const getDocContent = async (path: string) => {
  const res = await fetch(`${DOC_TOP_URL}${path}.mdx`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}.mdx: ${res.status}`)
  return await res.text()
}

export const getAllDocs = async (): Promise<DocMap> => {
  const docPaths = await getDocPaths()
  const entries = await Promise.all(
    docPaths.map(async (path): Promise<[string, string]> => [path, await getDocContent(path)]),
  )
  return new Map(entries)
}
