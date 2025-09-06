const helmet = require('helmet');

module.exports = function helmetMiddleware() {
  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
  delete cspDirectives['upgrade-insecure-requests'];
  // Allow Ajv (and some dev tooling) to use eval in non-production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const scriptSrc = cspDirectives['script-src'] || ["'self'"];
    if (!scriptSrc.includes("'unsafe-eval'")) scriptSrc.push("'unsafe-eval'");
    // Support engines that honor wasm-unsafe-eval separately
    if (!scriptSrc.includes("'wasm-unsafe-eval'")) scriptSrc.push("'wasm-unsafe-eval'");
    cspDirectives['script-src'] = scriptSrc;
  }
  return helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    hsts: { maxAge: 0 },
  });
};
