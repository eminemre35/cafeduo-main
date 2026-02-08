const PIN_REGEX = /^\d{4}$/;
const MAX_NAME_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 240;
const MIN_TABLE_COUNT = 1;
const MAX_TABLE_COUNT = 300;
const MIN_RADIUS = 10;
const MAX_RADIUS = 5000;

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFiniteInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  return parsed;
};

const validateRange = (value, min, max) => value >= min && value <= max;

const normalizePin = (value) => {
  const pin = asTrimmedString(value);
  if (!PIN_REGEX.test(pin)) {
    return { ok: false, error: 'PIN 4 haneli sayısal olmalıdır.' };
  }
  return { ok: true, value: pin };
};

const normalizeTableCount = (value) => {
  const tableCount = toFiniteInteger(value);
  if (tableCount === null || !validateRange(tableCount, MIN_TABLE_COUNT, MAX_TABLE_COUNT)) {
    return {
      ok: false,
      error: `Masa sayısı ${MIN_TABLE_COUNT}-${MAX_TABLE_COUNT} aralığında bir tam sayı olmalıdır.`,
    };
  }
  return { ok: true, value: tableCount };
};

const normalizeLatitude = (value) => {
  const latitude = toFiniteNumber(value);
  if (latitude === null || !validateRange(latitude, -90, 90)) {
    return { ok: false, error: 'Enlem değeri -90 ile 90 arasında olmalıdır.' };
  }
  return { ok: true, value: latitude };
};

const normalizeLongitude = (value) => {
  const longitude = toFiniteNumber(value);
  if (longitude === null || !validateRange(longitude, -180, 180)) {
    return { ok: false, error: 'Boylam değeri -180 ile 180 arasında olmalıdır.' };
  }
  return { ok: true, value: longitude };
};

const normalizeRadius = (value) => {
  const radius = toFiniteInteger(value);
  if (radius === null || !validateRange(radius, MIN_RADIUS, MAX_RADIUS)) {
    return {
      ok: false,
      error: `Yarıçap ${MIN_RADIUS}-${MAX_RADIUS} metre aralığında bir tam sayı olmalıdır.`,
    };
  }
  return { ok: true, value: radius };
};

const normalizeCafeCreatePayload = (payload = {}) => {
  const name = asTrimmedString(payload.name);
  if (!name) {
    return { ok: false, error: 'Kafe adı zorunludur.' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Kafe adı en fazla ${MAX_NAME_LENGTH} karakter olabilir.` };
  }

  const address = asTrimmedString(payload.address);
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, error: `Adres en fazla ${MAX_ADDRESS_LENGTH} karakter olabilir.` };
  }

  const tableCountRaw =
    payload.total_tables !== undefined ? payload.total_tables : payload.table_count;
  const tableCountCheck =
    tableCountRaw === undefined ? { ok: true, value: 20 } : normalizeTableCount(tableCountRaw);
  if (!tableCountCheck.ok) {
    return tableCountCheck;
  }

  const pinCheck = normalizePin(payload.pin !== undefined ? payload.pin : '1234');
  if (!pinCheck.ok) {
    return pinCheck;
  }

  const latitudeCheck =
    payload.latitude === undefined || payload.latitude === null
      ? { ok: true, value: null }
      : normalizeLatitude(payload.latitude);
  if (!latitudeCheck.ok) {
    return latitudeCheck;
  }

  const longitudeCheck =
    payload.longitude === undefined || payload.longitude === null
      ? { ok: true, value: null }
      : normalizeLongitude(payload.longitude);
  if (!longitudeCheck.ok) {
    return longitudeCheck;
  }

  const radiusCheck =
    payload.radius === undefined || payload.radius === null
      ? { ok: true, value: 500 }
      : normalizeRadius(payload.radius);
  if (!radiusCheck.ok) {
    return radiusCheck;
  }

  return {
    ok: true,
    value: {
      name,
      address,
      totalTables: tableCountCheck.value,
      tableCount: tableCountCheck.value,
      pin: pinCheck.value,
      latitude: latitudeCheck.value,
      longitude: longitudeCheck.value,
      radius: radiusCheck.value,
    },
  };
};

const normalizeCafeUpdatePayload = (payload = {}) => {
  const updates = {};

  if (payload.address !== undefined) {
    const address = asTrimmedString(payload.address);
    if (address.length > MAX_ADDRESS_LENGTH) {
      return { ok: false, error: `Adres en fazla ${MAX_ADDRESS_LENGTH} karakter olabilir.` };
    }
    updates.address = address;
  }

  if (payload.total_tables !== undefined || payload.table_count !== undefined) {
    const tableCountRaw =
      payload.total_tables !== undefined ? payload.total_tables : payload.table_count;
    const tableCountCheck = normalizeTableCount(tableCountRaw);
    if (!tableCountCheck.ok) {
      return tableCountCheck;
    }
    updates.totalTables = tableCountCheck.value;
    updates.tableCount = tableCountCheck.value;
  }

  if (payload.pin !== undefined) {
    const pinCheck = normalizePin(payload.pin);
    if (!pinCheck.ok) {
      return pinCheck;
    }
    updates.pin = pinCheck.value;
  }

  if (payload.latitude !== undefined) {
    if (payload.latitude === null || payload.latitude === '') {
      updates.latitude = null;
    } else {
      const latitudeCheck = normalizeLatitude(payload.latitude);
      if (!latitudeCheck.ok) return latitudeCheck;
      updates.latitude = latitudeCheck.value;
    }
  }

  if (payload.longitude !== undefined) {
    if (payload.longitude === null || payload.longitude === '') {
      updates.longitude = null;
    } else {
      const longitudeCheck = normalizeLongitude(payload.longitude);
      if (!longitudeCheck.ok) return longitudeCheck;
      updates.longitude = longitudeCheck.value;
    }
  }

  if (payload.radius !== undefined) {
    if (payload.radius === null || payload.radius === '') {
      updates.radius = null;
    } else {
      const radiusCheck = normalizeRadius(payload.radius);
      if (!radiusCheck.ok) return radiusCheck;
      updates.radius = radiusCheck.value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'Güncellenecek alan bulunamadı.' };
  }

  return { ok: true, value: updates };
};

module.exports = {
  normalizeCafeCreatePayload,
  normalizeCafeUpdatePayload,
};

