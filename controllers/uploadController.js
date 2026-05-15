const uploadContentImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }

  const url = `/uploads/images/${req.file.filename}`;
  res.json({ url, message: "Image uploaded successfully" });
};

module.exports = { uploadContentImage };
