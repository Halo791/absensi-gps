const DAY_MS = 24 * 60 * 60 * 1000;

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateParts(date) {
  const parts = String(date || "").split("-");
  if (parts.length !== 3) {
    return null;
  }
  return parts;
}

function formatDateLabel(date) {
  const parts = formatDateParts(date);
  if (!parts) return String(date || "");
  const [year, month, day] = parts;
  return `${day}/${month}`;
}

function formatDateLabelWithYear(date) {
  const parts = formatDateParts(date);
  if (!parts) return String(date || "");
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function formatWibClock(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 5);
  }
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);
}

function formatWibLabel(value) {
  const time = formatWibClock(value);
  return time ? `${time} WIB (UTC+7)` : "";
}

function toExcelTimeFraction(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const ms = parsed.getTime() + 7 * 60 * 60 * 1000;
  const normalized = ((ms % DAY_MS) + DAY_MS) % DAY_MS;
  return normalized / DAY_MS;
}

function columnName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function cellRef(columnIndex, rowIndex) {
  return `${columnName(columnIndex)}${rowIndex}`;
}

function buildInlineCell(columnIndex, rowIndex, value, styleIndex = 0) {
  const text = escapeXml(value ?? "");
  return `<c r="${cellRef(columnIndex, rowIndex)}" t="inlineStr" s="${styleIndex}"><is><t>${text}</t></is></c>`;
}

function buildNumberCell(columnIndex, rowIndex, value, styleIndex = 0) {
  return `<c r="${cellRef(columnIndex, rowIndex)}" s="${styleIndex}"><v>${value}</v></c>`;
}

function getStatusLabel(row) {
  if (!row) return "";
  if (row.status === "alpha") return "ALPHA";
  if (row.status === "leave") return "IZIN";
  if (row.status === "late") return "TELAT";
  if (row.status === "early_leave") return "PULANG AWAL";
  return String(row.status || "").replaceAll("_", " ").toUpperCase();
}

function getStatusStyle(row) {
  if (!row) return 2;
  if (row.status === "alpha") return 3;
  if (row.status === "leave") return 4;
  if (row.status === "late" || row.status === "early_leave" || Number(row.lateMinutes) > 0) return 5;
  return 2;
}

function formatMatrixCell(row) {
  if (!row) return "";

  if (row.status === "alpha") {
    return "ALPHA";
  }
  if (row.status === "leave") {
    return "IZIN";
  }

  const checkIn = formatWibLabel(row.checkInTimeRaw);
  const checkOut = formatWibLabel(row.checkOutTimeRaw);
  if (checkIn || checkOut) {
    return `${checkIn || "-"} - ${checkOut || "-"}`;
  }

  return getStatusLabel(row);
}

function buildAttendanceSheet(rows) {
  const employeeMap = new Map();
  const dates = [];

  for (const row of rows) {
    if (!employeeMap.has(row.nik)) {
      employeeMap.set(row.nik, {
        nik: row.nik,
        name: row.name,
        department: row.department,
        attendanceByDate: new Map()
      });
    }

    const employee = employeeMap.get(row.nik);
    employee.attendanceByDate.set(row.date, row);

    if (!dates.includes(row.date)) {
      dates.push(row.date);
    }
  }

  dates.sort();
  const employees = [...employeeMap.values()].sort((left, right) => {
    if (left.name === right.name) {
      return String(left.nik).localeCompare(String(right.nik));
    }
    return left.name.localeCompare(right.name);
  });

  const headers = ["NIK", "Nama", "Departemen", ...dates.map((date) => formatDateLabel(date))];
  const rowsXml = [];
  rowsXml.push(`<row r="1">${headers.map((header, index) => buildInlineCell(index, 1, header, 1)).join("")}</row>`);

  employees.forEach((employee, employeeIndex) => {
    const rowNumber = employeeIndex + 2;
    const cells = [
      buildInlineCell(0, rowNumber, employee.nik, 2),
      buildInlineCell(1, rowNumber, employee.name, 2),
      buildInlineCell(2, rowNumber, employee.department || "-", 2),
      ...dates.map((date, dateIndex) => {
        const row = employee.attendanceByDate.get(date);
        return buildInlineCell(dateIndex + 3, rowNumber, formatMatrixCell(row), getStatusStyle(row));
      })
    ];
    rowsXml.push(`<row r="${rowNumber}">${cells.join("")}</row>`);
  });

  const lastColumn = columnName(headers.length - 1);
  const lastRow = employees.length + 1;

  return {
    dimension: `A1:${lastColumn}${lastRow}`,
    sheetData: rowsXml.join("")
  };
}

function buildDetailSheet(rows) {
  const headers = [
    "NIK",
    "Nama",
    "Departemen",
    "Tanggal",
    "Masuk Pukul (WIB UTC+7)",
    "Pulang Pukul (WIB UTC+7)",
    "Telat (Menit)",
    "Status"
  ];

  const sortedRows = [...rows].sort((left, right) => {
    if (left.date === right.date) {
      return left.name.localeCompare(right.name);
    }
    return left.date < right.date ? 1 : -1;
  });

  const rowsXml = [];
  rowsXml.push(`<row r="1">${headers.map((header, index) => buildInlineCell(index, 1, header, 1)).join("")}</row>`);

  sortedRows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const cells = [
      buildInlineCell(0, rowNumber, row.nik, 2),
      buildInlineCell(1, rowNumber, row.name, 2),
      buildInlineCell(2, rowNumber, row.department || "-", 2),
      buildInlineCell(3, rowNumber, formatDateLabelWithYear(row.date), 2),
      row.checkInTimeRaw
        ? buildNumberCell(4, rowNumber, toExcelTimeFraction(row.checkInTimeRaw), 6)
        : buildInlineCell(4, rowNumber, "", 2),
      row.checkOutTimeRaw
        ? buildNumberCell(5, rowNumber, toExcelTimeFraction(row.checkOutTimeRaw), 6)
        : buildInlineCell(5, rowNumber, "", 2),
      buildNumberCell(6, rowNumber, Number(row.lateMinutes) || 0, 2),
      buildInlineCell(7, rowNumber, getStatusLabel(row), getStatusStyle(row))
    ];
    rowsXml.push(`<row r="${rowNumber}">${cells.join("")}</row>`);
  });

  const lastRow = sortedRows.length + 1;
  return {
    dimension: `A1:H${lastRow}`,
    sheetData: rowsXml.join("")
  };
}

function buildWorksheetXml(name, dimension, sheetData) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr />
  <dimension ref="${dimension}" />
  <sheetViews>
    <sheetView workbookViewId="0" tabSelected="1" />
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18" />
  <cols>
    ${
      name === "Attendance"
        ? `<col min="1" max="1" width="16" customWidth="1" /><col min="2" max="2" width="30" customWidth="1" /><col min="3" max="3" width="18" customWidth="1" />`
        : `<col min="1" max="1" width="16" customWidth="1" /><col min="2" max="2" width="28" customWidth="1" /><col min="3" max="3" width="18" customWidth="1" /><col min="4" max="4" width="14" customWidth="1" /><col min="5" max="6" width="20" customWidth="1" /><col min="7" max="7" width="12" customWidth="1" /><col min="8" max="8" width="16" customWidth="1" />`
    }
  </cols>
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="10"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><name val="Arial"/><color rgb="FF111827"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8D7DA"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD1E7DD"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFE5B4"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="0" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
}

function buildWorkbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Attendance" sheetId="1" r:id="rId1"/>
    <sheet name="Detail" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;
}

function buildWorkbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function crc32(buffer) {
  const table = crc32.table || (crc32.table = (() => {
    const tableBuffer = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      tableBuffer[n] = c >>> 0;
    }
    return tableBuffer;
  })());

  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16LE(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function writeUInt32LE(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function createStoredZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const dataBuffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const crc = crc32(dataBuffer);

    const localHeader = Buffer.concat([
      writeUInt32LE(0x04034b50),
      writeUInt16LE(20),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(crc),
      writeUInt32LE(dataBuffer.length),
      writeUInt32LE(dataBuffer.length),
      writeUInt16LE(nameBuffer.length),
      writeUInt16LE(0)
    ]);

    localParts.push(localHeader, nameBuffer, dataBuffer);

    const centralHeader = Buffer.concat([
      writeUInt32LE(0x02014b50),
      writeUInt16LE(20),
      writeUInt16LE(20),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(crc),
      writeUInt32LE(dataBuffer.length),
      writeUInt32LE(dataBuffer.length),
      writeUInt16LE(nameBuffer.length),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(offset)
    ]);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localFiles = Buffer.concat(localParts);
  const endRecord = Buffer.concat([
    writeUInt32LE(0x06054b50),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(files.length),
    writeUInt16LE(files.length),
    writeUInt32LE(centralDirectory.length),
    writeUInt32LE(localFiles.length),
    writeUInt16LE(0)
  ]);

  return Buffer.concat([localFiles, centralDirectory, endRecord]);
}

export function buildAttendanceWorkbookXlsx(rows) {
  const attendanceSheet = buildAttendanceSheet(rows);
  const detailSheet = buildDetailSheet(rows);

  return createStoredZip([
    { name: "[Content_Types].xml", data: buildContentTypesXml() },
    { name: "_rels/.rels", data: buildRootRelsXml() },
    { name: "xl/workbook.xml", data: buildWorkbookXml() },
    { name: "xl/_rels/workbook.xml.rels", data: buildWorkbookRelsXml() },
    { name: "xl/styles.xml", data: buildStylesXml() },
    { name: "xl/worksheets/sheet1.xml", data: buildWorksheetXml("Attendance", attendanceSheet.dimension, attendanceSheet.sheetData) },
    { name: "xl/worksheets/sheet2.xml", data: buildWorksheetXml("Detail", detailSheet.dimension, detailSheet.sheetData) }
  ]);
}
