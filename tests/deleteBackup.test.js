const { expect } = require("chai");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { deleteBackup, setBackupDir } = require("../server/controllers/dbBackup");
const config = require("../config");

describe("deleteBackup", () => {
  const tmp = path.join(os.tmpdir(), "kds-test");
  before(() => {
    fs.mkdirSync(tmp, { recursive: true });
    setBackupDir(tmp);
  });
  after(() => {
    setBackupDir(config.backupDir);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch (_err) {
      /* ignore cleanup errors */
    }
  });

  it("rejects invalid paths", (done) => {
    deleteBackup(null, "../hack.sql", (err) => {
      expect(err).to.be.an("error");
      expect(err.message).to.equal("Invalid path");
      done();
    });
  });
});
