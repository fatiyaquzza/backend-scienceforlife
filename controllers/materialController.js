const pool = require('../config/database');

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
    const { sub_module_id, description, video_url, reference_links } = req.body;
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;
    const referenceLinks = normalizeReferenceLinks(reference_links);

    if (!sub_module_id) {
      return res.status(400).json({ message: 'Sub module ID is required' });
    }

    // Check if sub module exists
    const [subModules] = await pool.execute(
      'SELECT id FROM sub_modules WHERE id = ?',
      [sub_module_id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ message: 'Sub module not found' });
    }

    const [result] = await pool.execute(
      'INSERT INTO materials (sub_module_id, description, video_url, file_url, references_json) VALUES (?, ?, ?, ?, ?)',
      [
        sub_module_id,
        description || null,
        video_url || null,
        fileUrl,
        JSON.stringify(referenceLinks),
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, video_url, reference_links } = req.body;

    // Check if material exists
    const [materials] = await pool.execute(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    if (materials.length === 0) {
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

    await pool.execute(
      'UPDATE materials SET description = ?, video_url = ?, file_url = ?, references_json = ? WHERE id = ?',
      [
        description !== undefined ? description : materials[0].description,
        video_url !== undefined ? video_url : materials[0].video_url,
        fileUrl,
        nextReferenceLinks,
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
    res.status(500).json({ message: 'Server error', error: error.message });
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
