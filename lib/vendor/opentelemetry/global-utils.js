const VERSION = '1.9.0';

const _globalThis =
  typeof globalThis === 'object'
    ? globalThis
    : typeof global !== 'undefined'
        ? global
        : self;

const versionRe = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;

function _makeCompatibilityCheck(ownVersion) {
  const acceptedVersions = new Set([ownVersion]);
  const rejectedVersions = new Set();
  const myVersionMatch = ownVersion.match(versionRe);
  if (!myVersionMatch) {
    return () => false;
  }

  const ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4],
  };

  if (ownVersionParsed.prerelease != null) {
    return (globalVersion) => globalVersion === ownVersion;
  }

  const reject = (v) => {
    rejectedVersions.add(v);
    return false;
  };
  const accept = (v) => {
    acceptedVersions.add(v);
    return true;
  };

  return (globalVersion) => {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }

    const match = globalVersion.match(versionRe);
    if (!match) {
      return reject(globalVersion);
    }

    const parsed = {
      major: +match[1],
      minor: +match[2],
      patch: +match[3],
      prerelease: match[4],
    };

    if (parsed.prerelease != null) {
      return reject(globalVersion);
    }

    if (ownVersionParsed.major !== parsed.major) {
      return reject(globalVersion);
    }

    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === parsed.minor && ownVersionParsed.patch <= parsed.patch) {
        return accept(globalVersion);
      }
      return reject(globalVersion);
    }

    if (ownVersionParsed.minor <= parsed.minor) {
      return accept(globalVersion);
    }

    return reject(globalVersion);
  };
}

export const isCompatible = _makeCompatibilityCheck(VERSION);

const major = VERSION.split('.')[0];
const GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for(`opentelemetry.js.api.${major}`);
const _global = _globalThis;

export function registerGlobal(type, instance, diag, allowOverride = false) {
  const api = (_global[GLOBAL_OPENTELEMETRY_API_KEY] = _global[GLOBAL_OPENTELEMETRY_API_KEY] ?? {
    version: VERSION,
  });

  if (!allowOverride && api[type]) {
    const err = new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
    diag.error(err.stack || err.message);
    return false;
  }

  if (api.version !== VERSION) {
    const err = new Error(
      `@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${VERSION}`
    );
    diag.error(err.stack || err.message);
    return false;
  }

  api[type] = instance;
  diag.debug(`@opentelemetry/api: Registered a global for ${type} v${VERSION}.`);
  return true;
}

export function getGlobal(type) {
  const globalVersion = _global[GLOBAL_OPENTELEMETRY_API_KEY]?.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return undefined;
  }
  return _global[GLOBAL_OPENTELEMETRY_API_KEY]?.[type];
}

export function unregisterGlobal(type, diag) {
  diag.debug(`@opentelemetry/api: Unregistering a global for ${type} v${VERSION}.`);
  const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
