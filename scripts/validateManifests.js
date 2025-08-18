const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

function findManifests(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findManifests(full));
    } else if (entry.isFile() && entry.name === "plugin.json") {
      results.push(full);
    }
  }
  return results;
}

function validate() {
  const schemaPath = path.resolve(
    __dirname,
    "..",
    "schemas",
    "plugin-manifest.schema@1.1.0.json",
  );
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  const pluginsDir = path.resolve(__dirname, "..", "src", "plugins");
  const manifests = findManifests(pluginsDir);

  let valid = true;
  manifests.forEach((file) => {
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const ok = validate(data);
    if (!ok) {
      console.error(`Manifest validation failed for ${file}:`);
      console.error(validate.errors);
      valid = false;
    }
  });

  if (!valid) {
    process.exit(1);
  } else {
    console.log("All plugin manifests are valid.");
  }
}

validate();
