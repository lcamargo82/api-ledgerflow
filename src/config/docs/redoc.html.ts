import type { ConfigService } from '@nestjs/config';

export function getRedocHtml(config: ConfigService) {
  const appName = config.get<string>('APP_NAME') ?? 'ApiLedgerflow';

  return `<!doctype html>
<html>
  <head>
    <title>${appName} API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url="/api/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`;
}
