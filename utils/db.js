const query = (db, sql, params = []) => {
  return db.promise().query(sql, params);
};

module.exports = { query };

