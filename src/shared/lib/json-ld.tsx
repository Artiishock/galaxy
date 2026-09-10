/**
 * Вывод structured data (§6).
 *
 * `dangerouslySetInnerHTML` здесь допустим по §10: внутрь идут только
 * собственные данные из конфигурации, без пользовательского ввода.
 * `<` экранируется, чтобы содержимое нельзя было закрыть тегом раньше времени.
 */
export function JsonLd({ data }: { readonly data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
