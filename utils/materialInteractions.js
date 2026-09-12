const INTERACTION_TYPES = new Set(["link", "image", "youtube"]);

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const isYouTubeUrl = (value) => {
  if (!isHttpsUrl(value)) return false;

  const hostname = new URL(value).hostname.replace(/^www\./, "");
  return hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtu.be";
};

const clampNumber = (value, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
};

const normalizeMaterialInteractions = (input, pageCount) => {
  if (input == null || input === "") return [];

  let parsed = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error("Format interaksi materi tidak valid");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Interaksi materi harus berupa daftar");
  }

  if (parsed.length > 200) {
    throw new Error("Maksimal 200 interaksi per materi");
  }

  const maxPage = Number(pageCount) || Number.MAX_SAFE_INTEGER;

  return parsed.map((item, index) => {
    const type = String(item?.type || "").trim();
    const page = Number(item?.page);
    const x = clampNumber(item?.x, 0, 100);
    const y = clampNumber(item?.y, 0, 100);
    const width = clampNumber(item?.width, 3, 100);
    const height = clampNumber(item?.height, 3, 100);
    const url = String(item?.url || "").trim();
    const label = String(item?.label || "").trim().slice(0, 120);

    if (!INTERACTION_TYPES.has(type)) {
      throw new Error(`Tipe interaksi ke-${index + 1} tidak didukung`);
    }
    if (!Number.isInteger(page) || page < 1 || page > maxPage) {
      throw new Error(`Nomor halaman interaksi ke-${index + 1} tidak valid`);
    }
    if ([x, y, width, height].some((value) => value == null) || x + width > 100 || y + height > 100) {
      throw new Error(`Posisi interaksi ke-${index + 1} berada di luar halaman`);
    }
    if (type === "image") {
      if (!url.startsWith("/uploads/images/")) {
        throw new Error(`Gambar interaksi ke-${index + 1} harus berasal dari upload ILMANA`);
      }
    } else if (type === "youtube") {
      if (!isYouTubeUrl(url)) {
        throw new Error(`Video interaksi ke-${index + 1} harus menggunakan URL YouTube HTTPS`);
      }
    } else if (!isHttpsUrl(url)) {
      throw new Error(`Tautan interaksi ke-${index + 1} harus menggunakan HTTPS`);
    }

    return {
      id: String(item?.id || `interaction-${index + 1}`).slice(0, 80),
      type,
      page,
      x,
      y,
      width,
      height,
      url,
      label,
    };
  });
};

module.exports = {
  isHttpsUrl,
  isYouTubeUrl,
  normalizeMaterialInteractions,
};
