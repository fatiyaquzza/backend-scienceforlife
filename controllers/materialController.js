const pool = require('../config/database');
const fs = require('fs/promises');
const { normalizeMaterialInteractions } = require('../utils/materialInteractions');

const removeUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

const validatePdfSignature = async (file) => {
  if (!file) return;
  const handle = await fs.open(file.path, 'r');
  try {
    const header = Buffer.alloc(5);
    await handle.read(header, 0, 5, 0);
    if (header.toString() !== '%PDF-') {
      throw new Error('File yang diunggah bukan PDF yang valid');
    }
  } finally {
    await handle.close();
  }
};

const parsePageCount = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2000) {
    throw new Error('Jumlah halaman PDF tidak valid');
  }
  return parsed;
};

const normalizeReferenceLinks = (input) => {
  if (input == null || input === "") return [];

  let parsed = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      title: String(item?.title || "").trim(),
      href: String(item?.href || "").trim(),
    }))
    .filter((item) => item.title && item.href);
};

const getMaterialsBySubModule = async (req, res) => {
  try {
    const { subModuleId } = req.params;

    const [materials] = await pool.execute(
      'SELECT * FROM materials WHERE sub_module_id = ? ORDER BY created_at ASC',
      [subModuleId]
    );

    res.json({ materials });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createMaterial = async (req, res) => {
  try {
    const { sub_module_id, description, video_url, reference_links, interactions, pdf_page_count } = req.body;
    await validatePdfSignature(req.file);
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;
    const referenceLinks = normalizeReferenceLinks(reference_links);
    const pageCount = parsePageCount(pdf_page_count);
    const materialInteractions = normalizeMaterialInteractions(interactions, pageCount);

    if (!sub_module_id) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: 'Sub module ID is required' });
    }

    // Check if sub module exists
    const [subModules] = await pool.execute(
      'SELECT id FROM sub_modules WHERE id = ?',
      [sub_module_id]
    );

    if (subModules.length === 0) {
      await removeUploadedFile(req.file);
      return res.status(404).json({ message: 'Sub module not found' });
    }

    const [result] = await pool.execute(
      'INSERT INTO materials (sub_module_id, description, video_url, file_url, references_json, interactions_json, pdf_page_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        sub_module_id,
        description || null,
        video_url || null,
        fileUrl,
        JSON.stringify(referenceLinks),
        JSON.stringify(materialInteractions),
        pageCount,
      ]
    );

    const [newMaterial] = await pool.execute(
      'SELECT * FROM materials WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Material created successfully',
      material: newMaterial[0]
    });
  } catch (error) {
    await removeUploadedFile(req.file);
    const validationError = error.message.includes('PDF') || error.message.includes('interaksi') || error.message.includes('Tautan') || error.message.includes('Video') || error.message.includes('Gambar') || error.message.includes('halaman');
    res.status(validationError ? 400 : 500).json({ message: validationError ? error.message : 'Server error', error: validationError ? undefined : error.message });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, video_url, reference_links, interactions, pdf_page_count } = req.body;
    await validatePdfSignature(req.file);

    // Check if material exists
    const [materials] = await pool.execute(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    if (materials.length === 0) {
      await removeUploadedFile(req.file);
      return res.status(404).json({ message: 'Material not found' });
    }

    let fileUrl = materials[0].file_url;
    if (req.file) {
      fileUrl = `/uploads/materials/${req.file.filename}`;
    }

    const nextReferenceLinks =
      reference_links !== undefined
        ? JSON.stringify(normalizeReferenceLinks(reference_links))
        : materials[0].references_json;

    const pageCount =
      pdf_page_count !== undefined
        ? parsePageCount(pdf_page_count)
        : materials[0].pdf_page_count;
    const nextInteractions =
      interactions !== undefined
        ? JSON.stringify(normalizeMaterialInteractions(interactions, pageCount))
        : materials[0].interactions_json;

    await pool.execute(
      'UPDATE materials SET description = ?, video_url = ?, file_url = ?, references_json = ?, interactions_json = ?, pdf_page_count = ? WHERE id = ?',
      [
        description !== undefined ? description : materials[0].description,
        video_url !== undefined ? video_url : materials[0].video_url,
        fileUrl,
        nextReferenceLinks,
        nextInteractions,
        pageCount,
        id
      ]
    );

    const [updatedMaterial] = await pool.execute(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Material updated successfully',
      material: updatedMaterial[0]
    });
  } catch (error) {
    await removeUploadedFile(req.file);
    const validationError = error.message.includes('PDF') || error.message.includes('interaksi') || error.message.includes('Tautan') || error.message.includes('Video') || error.message.includes('Gambar') || error.message.includes('halaman');
    res.status(validationError ? 400 : 500).json({ message: validationError ? error.message : 'Server error', error: validationError ? undefined : error.message });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const [materials] = await pool.execute(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    if (materials.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    await pool.execute('DELETE FROM materials WHERE id = ?', [id]);

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMaterialsBySubModule,
  createMaterial,
  updateMaterial,
  deleteMaterial
};
