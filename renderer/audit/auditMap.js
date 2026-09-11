import { buildRowLabelMap } from "../core/RowLabels.js";

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);
const isIdentifier = (value) =>
  typeof value === "string" && value.trim().length > 0;
const seatLabelValue = (seat, fallback) =>
  seat.n ?? seat.number ?? seat.seatNumber ?? fallback;

/**
 * Collect every map problem that can be identified safely without changing the
 * supplied object. Paths use JavaScript/JSON notation so reports can point back
 * to the source map without pretending to know authoritative replacement data.
 */
export function auditMap(input, { currency = "MXN" } = {}) {
  const issues = [];
  const add = (severity, code, message, path = "", details) => {
    const issue = { severity, code, message, path };
    if (details !== undefined) issue.details = details;
    issues.push(issue);
  };
  const error = (code, message, path = "", details) =>
    add("error", code, message, path, details);

  let currencyDigits = 2;
  try {
    currencyDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    error(
      "INVALID_CURRENCY",
      `Unsupported currency ${String(currency)}`,
      "currency",
    );
  }

  if (!isObject(input)) {
    error("INVALID_MAP", "Expected an SMF object");
    return finish(issues, 0, 0);
  }
  if (input.format !== "SMF")
    error("INVALID_FORMAT", 'Expected format "SMF"', "format");
  if (
    typeof input.version !== "string" ||
    !/^2\.(0|1)\.\d+$/.test(input.version)
  )
    error(
      "UNSUPPORTED_VERSION",
      "Supported SMF versions are 2.0 and 2.1",
      "version",
    );
  if (!Array.isArray(input.sections)) {
    error("INVALID_SECTIONS", "Expected sections array", "sections");
    auditUnderlay(input.underlay, error);
    return finish(issues, 0, 0);
  }

  const sectionIds = new Map();
  const seatIds = new Map();
  const inventoryKeys = new Map();
  let seatCount = 0;

  input.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    if (!isObject(section)) {
      error("INVALID_SECTION", "Expected section object", sectionPath);
      return;
    }

    const sectionId = section.id ?? section.name;
    if (!isIdentifier(sectionId)) {
      error(
        "INVALID_SECTION_ID",
        "Expected a nonempty section identifier",
        `${sectionPath}.id`,
      );
    } else {
      recordDuplicate(
        sectionIds,
        sectionId,
        `${sectionPath}.id`,
        "DUPLICATE_SECTION_ID",
        "Duplicate section ID",
        error,
      );
    }

    const sectionName = section.name ?? sectionId;
    if (typeof sectionName !== "string" || !sectionName.trim())
      error(
        "INVALID_SECTION_NAME",
        "Expected a nonempty section name",
        `${sectionPath}.name`,
      );

    const sectionType = section.type ?? "regular";
    if (!["regular", "ga"].includes(sectionType))
      error(
        "INVALID_SECTION_TYPE",
        "Expected section type regular or ga",
        `${sectionPath}.type`,
      );

    for (const field of ["width", "height"]) {
      const path = `${sectionPath}.${field}`;
      if (!isFiniteNumber(section[field]))
        error("INVALID_GEOMETRY", "Expected a finite number", path);
      else if (section[field] <= 0)
        error("INVALID_GEOMETRY", "Dimension must be positive", path);
    }
    for (const field of ["x", "y"]) {
      if (section[field] !== undefined && !isFiniteNumber(section[field]))
        error(
          "INVALID_GEOMETRY",
          "Expected a finite number",
          `${sectionPath}.${field}`,
        );
    }
    for (const field of [
      "centerX",
      "centerY",
      "layoutShiftX",
      "layoutShiftY",
    ]) {
      if (section[field] !== undefined && !isFiniteNumber(section[field]))
        error(
          "INVALID_GEOMETRY",
          "Expected a finite number",
          `${sectionPath}.${field}`,
        );
    }
    if (
      section.transform?.rotation !== undefined &&
      !isFiniteNumber(section.transform.rotation)
    )
      error(
        "INVALID_GEOMETRY",
        "Expected a finite rotation",
        `${sectionPath}.transform.rotation`,
      );
    if (section.points !== undefined && !validPolygon(section.points))
      error(
        "INVALID_POLYGON",
        "Expected at least three finite coordinate pairs",
        `${sectionPath}.points`,
      );

    auditRowLabels(section.rowLabels, sectionPath, error);
    auditLegacyPrice(
      section.pricing?.basePrice ?? 0,
      currencyDigits,
      `${sectionPath}.pricing.basePrice`,
      error,
    );

    const seats = section.seats ?? [];
    if (!Array.isArray(seats)) {
      error("INVALID_SEATS", "Expected seats array", `${sectionPath}.seats`);
      return;
    }
    if (seats.length && (sectionType === "ga" || section.isZone))
      error(
        "SEATS_IN_ZONE",
        "GA and zone sections cannot contain seats",
        `${sectionPath}.seats`,
      );

    const usableSeats = [];
    seats.forEach((seat, seatIndex) => {
      seatCount += 1;
      const seatPath = `${sectionPath}.seats[${seatIndex}]`;
      if (!isObject(seat)) {
        error("INVALID_SEAT", "Expected seat object", seatPath);
        return;
      }

      const row = seat.r ?? seat.rowIndex ?? 0;
      const column = seat.c ?? seat.columnIndex ?? seatIndex;
      if (!Number.isSafeInteger(row) || row < 0)
        error(
          "INVALID_SEAT_INDEX",
          "Expected a nonnegative integer row",
          `${seatPath}.r`,
        );
      if (!Number.isSafeInteger(column) || column < 0)
        error(
          "INVALID_SEAT_INDEX",
          "Expected a nonnegative integer column",
          `${seatPath}.c`,
        );

      for (const [field, value] of [
        ["x", seat.x ?? seat.relativeX ?? seat.baseX],
        ["y", seat.y ?? seat.relativeY ?? seat.baseY],
      ]) {
        if (!isFiniteNumber(value))
          error(
            "INVALID_GEOMETRY",
            "Expected a finite seat coordinate",
            `${seatPath}.${field}`,
          );
      }

      const rawLabel = seatLabelValue(
        seat,
        Number.isSafeInteger(column) ? column + 1 : seatIndex + 1,
      );
      const labelPath =
        seat.n !== undefined
          ? `${seatPath}.n`
          : seat.number !== undefined
            ? `${seatPath}.number`
            : seat.seatNumber !== undefined
              ? `${seatPath}.seatNumber`
              : `${seatPath}.n`;
      if (
        !["string", "number"].includes(typeof rawLabel) ||
        !String(rawLabel).trim()
      )
        error(
          "INVALID_SEAT_LABEL",
          "Expected a nonempty string or number",
          labelPath,
        );
      else if (String(rawLabel).trim() === "accessible_forward")
        error(
          "INVALID_SEAT_LABEL",
          "Accessibility icon token cannot be used as the seat label",
          labelPath,
        );

      const normalizedLabel = String(rawLabel);
      const normalizedId =
        seat.id ??
        (isIdentifier(sectionId) && Number.isSafeInteger(row)
          ? `legacy:${JSON.stringify([sectionId, row, normalizedLabel])}`
          : undefined);
      if (!isIdentifier(normalizedId))
        error(
          "INVALID_SEAT_ID",
          "Expected a nonempty seat identifier",
          `${seatPath}.id`,
        );
      else
        recordDuplicate(
          seatIds,
          normalizedId,
          `${seatPath}.id`,
          "DUPLICATE_SEAT_ID",
          "Duplicate seat ID",
          error,
        );

      if (seat.price !== undefined)
        auditLegacyPrice(
          seat.price,
          currencyDigits,
          `${seatPath}.price`,
          error,
        );
      if (Number.isSafeInteger(row))
        usableSeats.push({ seat, row, label: normalizedLabel, path: seatPath });
    });

    const rowInput = usableSeats.map(({ seat, row }) => ({ ...seat, r: row }));
    const rows = validRowLabels(section.rowLabels)
      ? buildRowLabelMap(rowInput, section.rowLabels)
      : {};
    for (const { row, label, path } of usableSeats) {
      if (
        typeof sectionName !== "string" ||
        !sectionName.trim() ||
        !label.trim()
      )
        continue;
      const rowLabel = rows[row] || String(row + 1);
      const key = `${sectionName};;${rowLabel};;${label}`;
      recordDuplicate(
        inventoryKeys,
        key,
        path,
        "AMBIGUOUS_INVENTORY_KEY",
        "Ambiguous section/row/seat inventory key",
        error,
      );
    }
  });

  auditUnderlay(input.underlay, error);
  return finish(issues, input.sections.length, seatCount);
}

function finish(issues, sections, seats) {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  return {
    valid: errors === 0,
    summary: { errors, warnings, sections, seats },
    issues,
  };
}

function recordDuplicate(registry, value, path, code, message, error) {
  const firstPath = registry.get(value);
  if (firstPath) error(code, message, path, { value, firstPath });
  else registry.set(value, path);
}

function validPolygon(points) {
  return (
    Array.isArray(points) &&
    points.length >= 6 &&
    points.length % 2 === 0 &&
    points.every(isFiniteNumber)
  );
}

function validRowLabels(rowLabels) {
  if (rowLabels === undefined) return true;
  if (!isObject(rowLabels)) return false;
  if (
    rowLabels.type !== undefined &&
    !["letters", "numbers", "none"].includes(rowLabels.type)
  )
    return false;
  if (
    rowLabels.start !== undefined &&
    !["string", "number"].includes(typeof rowLabels.start)
  )
    return false;
  if (
    rowLabels.type === "letters" &&
    rowLabels.start !== undefined &&
    (typeof rowLabels.start !== "string" || !/^[A-Z]+$/.test(rowLabels.start))
  )
    return false;
  return true;
}

function auditRowLabels(rowLabels, sectionPath, error) {
  if (rowLabels === undefined) return;
  const path = `${sectionPath}.rowLabels`;
  if (!isObject(rowLabels)) {
    error("INVALID_ROW_LABELS", "Expected row label configuration", path);
    return;
  }
  if (
    rowLabels.type !== undefined &&
    !["letters", "numbers", "none"].includes(rowLabels.type)
  )
    error(
      "INVALID_ROW_LABEL_TYPE",
      "Expected letters, numbers, or none",
      `${path}.type`,
    );
  if (
    rowLabels.start !== undefined &&
    !["string", "number"].includes(typeof rowLabels.start)
  )
    error(
      "INVALID_ROW_LABEL_START",
      "Expected a string or number",
      `${path}.start`,
    );
  if (
    rowLabels.type === "letters" &&
    rowLabels.start !== undefined &&
    (typeof rowLabels.start !== "string" || !/^[A-Z]+$/.test(rowLabels.start))
  )
    error(
      "INVALID_ROW_LABEL_START",
      "Letter rows require an uppercase start label",
      `${path}.start`,
    );
}

function auditLegacyPrice(value, digits, path, error) {
  if (!isFiniteNumber(value) || value < 0) {
    error(
      "INVALID_PRICE",
      "Expected a nonnegative finite major-unit price",
      path,
    );
    return;
  }
  if (value > Number.MAX_SAFE_INTEGER / 10 ** digits)
    error("INVALID_PRICE", "Price exceeds safe integer minor units", path);
}

function auditUnderlay(underlay, error) {
  if (underlay === undefined || underlay === null) return;
  if (!isObject(underlay)) {
    error("INVALID_UNDERLAY", "Expected underlay object", "underlay");
    return;
  }
  for (const field of ["x", "y", "scale", "opacity", "width", "height"]) {
    if (underlay[field] !== undefined && !isFiniteNumber(underlay[field]))
      error(
        "INVALID_GEOMETRY",
        "Expected a finite number",
        `underlay.${field}`,
      );
  }
  if (isFiniteNumber(underlay.scale) && underlay.scale <= 0)
    error(
      "INVALID_GEOMETRY",
      "Underlay scale must be positive",
      "underlay.scale",
    );
  for (const field of ["sourceUrl", "dataUrl"]) {
    if (
      underlay[field] !== undefined &&
      underlay[field] !== null &&
      typeof underlay[field] !== "string"
    )
      error(
        "INVALID_UNDERLAY_URL",
        "Expected a string image URL",
        `underlay.${field}`,
      );
  }
}
