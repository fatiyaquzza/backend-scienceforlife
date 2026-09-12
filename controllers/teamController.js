const fs = require('fs/promises');
const pool = require('../config/database');

const parseBoolean = (value, fallback = true) => {
  if (value === undefined) return fallback;
  return value === true || value === 'true' || value === '1' || value === 1;
};

const parseOrder = (value) => {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const validateImageSignature = async (file) => {
  if (!file) return;
  const bytes = await fs.readFile(file.path);
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const signature = bytes.subarray(0, 6).toString('ascii');
  const isGif = signature === 'GIF87a' || signature === 'GIF89a';
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isPng && !isJpeg && !isGif && !isWebp) throw new Error('File foto bukan gambar yang valid');
};

const removeUpload = async (file) => {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
};

const getTeam = async (req, res) => {
  try {
    const includeInactive = req.user?.role === 'admin' && req.query.all === '1';
    const activeClause = includeInactive ? '' : 'WHERE tc.is_active = TRUE';
    const [categories] = await pool.execute(
      `SELECT tc.* FROM team_categories tc ${activeClause} ORDER BY tc.sort_order ASC, tc.id ASC`
    );
    const [members] = await pool.execute(
      `SELECT tm.* FROM team_members tm
       JOIN team_categories tc ON tc.id = tm.category_id
       ${includeInactive ? '' : 'WHERE tm.is_active = TRUE AND tc.is_active = TRUE'}
       ORDER BY tc.sort_order ASC, tm.sort_order ASC, tm.id ASC`
    );

    res.json({
      categories: categories.map((category) => ({
        ...category,
        is_active: Boolean(category.is_active),
        members: members
          .filter((member) => member.category_id === category.id)
          .map((member) => ({ ...member, is_active: Boolean(member.is_active) })),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const layout = req.body.layout === 'featured' ? 'featured' : 'grid';
    if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
    const [result] = await pool.execute(
      'INSERT INTO team_categories (name, layout, sort_order, is_active) VALUES (?, ?, ?, ?)',
      [name, layout, parseOrder(req.body.sort_order), parseBoolean(req.body.is_active)]
    );
    const [rows] = await pool.execute('SELECT * FROM team_categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ category: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM team_categories WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    const current = rows[0];
    const name = String(req.body.name ?? current.name).trim();
    const layout = req.body.layout === undefined ? current.layout : req.body.layout === 'featured' ? 'featured' : 'grid';
    if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
    await pool.execute(
      'UPDATE team_categories SET name = ?, layout = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, layout, parseOrder(req.body.sort_order ?? current.sort_order), parseBoolean(req.body.is_active, Boolean(current.is_active)), req.params.id]
    );
    const [updated] = await pool.execute('SELECT * FROM team_categories WHERE id = ?', [req.params.id]);
    res.json({ category: updated[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM team_categories WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createMember = async (req, res) => {
  try {
    await validateImageSignature(req.file);
    const name = String(req.body.name || '').trim();
    const role = String(req.body.role || '').trim();
    const categoryId = Number(req.body.category_id);
    if (!name || !role || !Number.isInteger(categoryId)) {
      await removeUpload(req.file);
      return res.status(400).json({ message: 'Kategori, nama, dan jabatan wajib diisi' });
    }
    const [category] = await pool.execute('SELECT id FROM team_categories WHERE id = ?', [categoryId]);
    if (!category.length) {
      await removeUpload(req.file);
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }
    const imageUrl = req.file ? `/uploads/team/${req.file.filename}` : null;
    const [result] = await pool.execute(
      'INSERT INTO team_members (category_id, name, role, image_url, bio, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [categoryId, name, role, imageUrl, String(req.body.bio || '').trim() || null, parseOrder(req.body.sort_order), parseBoolean(req.body.is_active)]
    );
    const [rows] = await pool.execute('SELECT * FROM team_members WHERE id = ?', [result.insertId]);
    res.status(201).json({ member: rows[0] });
  } catch (error) {
    await removeUpload(req.file);
    res.status(error.message.includes('gambar') ? 400 : 500).json({ message: error.message.includes('gambar') ? error.message : 'Server error', error: error.message.includes('gambar') ? undefined : error.message });
  }
};

const updateMember = async (req, res) => {
  try {
    await validateImageSignature(req.file);
    const [rows] = await pool.execute('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      await removeUpload(req.file);
      return res.status(404).json({ message: 'Anggota tidak ditemukan' });
    }
    const current = rows[0];
    const categoryId = Number(req.body.category_id ?? current.category_id);
    const name = String(req.body.name ?? current.name).trim();
    const role = String(req.body.role ?? current.role).trim();
    if (!name || !role || !Number.isInteger(categoryId)) {
      await removeUpload(req.file);
      return res.status(400).json({ message: 'Kategori, nama, dan jabatan wajib diisi' });
    }
    const [categories] = await pool.execute('SELECT id FROM team_categories WHERE id = ?', [categoryId]);
    if (!categories.length) {
      await removeUpload(req.file);
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }
    const imageUrl = req.file ? `/uploads/team/${req.file.filename}` : current.image_url;
    await pool.execute(
      'UPDATE team_members SET category_id = ?, name = ?, role = ?, image_url = ?, bio = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [categoryId, name, role, imageUrl, String(req.body.bio ?? current.bio ?? '').trim() || null, parseOrder(req.body.sort_order ?? current.sort_order), parseBoolean(req.body.is_active, Boolean(current.is_active)), req.params.id]
    );
    const [updated] = await pool.execute('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
    res.json({ member: updated[0] });
  } catch (error) {
    await removeUpload(req.file);
    res.status(error.message.includes('gambar') ? 400 : 500).json({ message: error.message.includes('gambar') ? error.message : 'Server error', error: error.message.includes('gambar') ? undefined : error.message });
  }
};

const deleteMember = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM team_members WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Anggota tidak ditemukan' });
    res.json({ message: 'Anggota berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getTeam, createCategory, updateCategory, deleteCategory, createMember, updateMember, deleteMember };
