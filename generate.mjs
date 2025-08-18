import { generate } from 'openapi-typescript-codegen';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await generate({
  input: path.resolve(__dirname, './openapi.yaml'),
  output: path.resolve(__dirname, './generated'),
  httpClient: 'fetch',
  useOptions: true,
  useUnionTypes: true,
});
