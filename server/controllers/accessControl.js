const logger = require('../../utils/logger');
const { query } = require('../../utils/db');
const DEFAULT_HIERARCHY = ["FOH", "BOH", "management"];

const MODULE_GROUPS = [
  { category: "operations", modules: ["order", "stations"] },
  {
    category: "admin",
    modules: [
      "menu",
      "theme",
      "inventory",
      "reports",
      "employees",
      "locations",
      "backup",
      "updates",
    ],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.modules);

let hierarchy = [...DEFAULT_HIERARCHY];
let permissions = {};

function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  const norm = role.trim().toLowerCase();
  if (['admin', 'administrator', 'manager'].includes(norm)) return 'management';
  return norm;
}

function normalizeModuleName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

async function loadHierarchy(db) {
  try {
    const [rows] = await query(
      db,
      "SELECT setting_value FROM settings WHERE setting_key='role_hierarchy' LIMIT 1",
    );
    if (rows.length) {
      try {
        const data = JSON.parse(rows[0].setting_value);
        if (Array.isArray(data) && data.length) hierarchy = data;
      } catch {
        /* ignore */
      }
    }
    return hierarchy;
  } catch (err) {
    logger.error('Error loading hierarchy:', err);
    throw err;
  }
}

async function saveHierarchy(db, arr) {
  if (Array.isArray(arr) && arr.length) {
    hierarchy = arr.map((r) => (typeof r === 'string' ? r.trim() : r));
    if (!hierarchy.some((r) => normalizeRole(r) === 'management')) {
      hierarchy.push('management');
    }
  }
  try {
    await query(
      db,
      "INSERT INTO settings (setting_key, setting_value) VALUES ('role_hierarchy', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
      [JSON.stringify(hierarchy)],
    );
  } catch (err) {
    logger.error('Error saving hierarchy:', err);
    throw err;
  }
}

async function loadPermissions(db) {
  try {
    const [rows] = await query(
      db,
      "SELECT setting_value FROM settings WHERE setting_key='role_permissions' LIMIT 1",
    );
    if (rows.length) {
      try {
        const data = JSON.parse(rows[0].setting_value);
        if (data && typeof data === 'object') {
          const norm = {};
          Object.entries(data).forEach(([roleKey, mods]) => {
            if (!Array.isArray(mods)) return;
            norm[roleKey] = mods
              .map((m) => normalizeModuleName(m))
              .filter(Boolean);
          });
          permissions = norm;
        }
      } catch (e) {
        logger.error(
          'Error parsing role_permissions from settings table:',
          e.message,
        );
      }
    }
    return permissions;
  } catch (err) {
    throw err;
  }
}

async function savePermissions(db, obj) {
  if (obj && typeof obj === 'object') {
    const norm = {};
    Object.entries(obj).forEach(([roleKey, mods]) => {
      if (!Array.isArray(mods)) return;
      const key = typeof roleKey === 'string' ? roleKey.trim() : roleKey;
      norm[key] = mods.map((m) => normalizeModuleName(m)).filter(Boolean);
    });
    permissions = norm;
  }
  try {
    await query(
      db,
      "INSERT INTO settings (setting_key, setting_value) VALUES ('role_permissions', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
      [JSON.stringify(permissions)],
    );
  } catch (err) {
    logger.error('Error saving permissions:', err);
    throw err;
  }
}

async function ensureDefaults(db) {
  try {
    const [rows] = await query(
      db,
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('role_hierarchy','role_permissions')",
    );
    const map = {};
    rows.forEach((r) => {
      map[r.setting_key] = r.setting_value;
    });
    if (!map.role_hierarchy) {
      await query(
        db,
        "INSERT INTO settings (setting_key, setting_value) VALUES ('role_hierarchy', ?)",
        [JSON.stringify(DEFAULT_HIERARCHY)],
      );
    } else {
      try {
        const arr = JSON.parse(map.role_hierarchy);
        if (Array.isArray(arr) && !arr.includes('management')) {
          arr.push('management');
          await query(
            db,
            "UPDATE settings SET setting_value=? WHERE setting_key='role_hierarchy'",
            [JSON.stringify(arr)],
          );
        }
      } catch {
        /* ignore */
      }
    }
    if (!map.role_permissions) {
      const defaults = {
        management: ALL_MODULES,
        BOH: ['stations'],
        FOH: ['order'],
      };
      await query(
        db,
        "INSERT INTO settings (setting_key, setting_value) VALUES ('role_permissions', ?)",
        [JSON.stringify(defaults)],
      );
    }
  } catch (err) {
    logger.error('Error ensuring defaults:', err);
  }
}

function getHierarchy() {
  if (!hierarchy.length) return ['management'];
  return hierarchy.slice();
}

function getRoleLevel(role) {
  const norm = normalizeRole(role);
  for (let i = 0; i < hierarchy.length; i += 1) {
    if (normalizeRole(hierarchy[i]) === norm) return i;
  }
  return -1;
}

function hasLevel(role, minRole) {
  const r = getRoleLevel(role);
  const m = getRoleLevel(minRole);
  return r >= 0 && m >= 0 && r >= m;
}

function getPermissions() {
  return { ...permissions };
}

function getRolePermissions(role) {
  const roles = getHierarchy();
  const topRole = roles.slice(-1)[0] || 'management';
  const norm = normalizeRole(role);
  const level = roles.findIndex((r) => normalizeRole(r) === norm);
  if (level < 0) return [];

  const collected = new Set();
  for (let i = 0; i <= level; i += 1) {
    const r = roles[i];
    const key = Object.keys(permissions).find(
      (k) => normalizeRole(k) === normalizeRole(r),
    );
    if (key && Array.isArray(permissions[key])) {
      permissions[key].forEach((m) => {
        const nm = normalizeModuleName(m);
        if (nm) collected.add(nm);
      });
    }
  }

  const topNorm = normalizeRole(topRole);
  const topKey = Object.keys(permissions).find(
    (k) => normalizeRole(k) === topNorm,
  );
  if (norm === topNorm && (!topKey || !Array.isArray(permissions[topKey]))) {
    return ALL_MODULES.map((m) => normalizeModuleName(m));
  }

  return Array.from(collected);
}

function roleHasAccess(role, component) {
  const comp = normalizeModuleName(component);
  if (!comp) return false;
  const allowed = getRolePermissions(role);
  return allowed.includes(comp);
}

module.exports = {
  loadHierarchy,
  saveHierarchy,
  loadPermissions,
  savePermissions,
  ensureDefaults,
  normalizeRole,
  normalizeModuleName,
  getHierarchy,
  getRoleLevel,
  hasLevel,
  getPermissions,
  getRolePermissions,
  roleHasAccess,
  ALL_MODULES,
  MODULE_GROUPS,
};
