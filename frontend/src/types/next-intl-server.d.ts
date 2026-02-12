declare module 'next-intl/server' {
  interface RequestConfig {
    messages: Record<string, unknown>;
  }

  export function getRequestConfig(
    fn: (params: { locale: string }) => Promise<RequestConfig>
  ): (params: { locale: string }) => Promise<RequestConfig>;
}
