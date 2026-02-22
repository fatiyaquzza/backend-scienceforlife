const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');

const chat = async (req, res) => {
  try {
    const { message, sub_module_id } = req.body;

    if (!message || !sub_module_id) {
      return res.status(400).json({ message: 'Message and sub_module_id are required' });
    }

    // Get sub module info for context
    const [subModules] = await pool.execute(
      `SELECT sm.*, m.name as module_name
       FROM sub_modules sm
       JOIN modules m ON sm.module_id = m.id
       WHERE sm.id = ?`,
      [sub_module_id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ message: 'Sub module not found' });
    }

    const subModule = subModules[0];

    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        message: 'GEMINI_API_KEY is not configured on the server'
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Nama model diambil dari ENV agar bisa disesuaikan dengan akun Anda.
    // Contoh yang umum: "gemini-pro", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest"
    const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Create context prompt
    const contextPrompt = `Kamu adalah asisten pembelajaran untuk materi "${subModule.name}" dari modul "${subModule.module_name}".
Deskripsi materi: ${subModule.description || 'Tidak ada deskripsi tersedia'}.
Tugasmu adalah membantu user memahami materi ini dengan menjawab pertanyaan mereka seputar topik tersebut.
Jawablah dengan bahasa Indonesia yang jelas, ramah, dan mudah dipahami. Jika pertanyaan tidak berkaitan dengan materi ini, jelaskan secara sopan dan arahkan kembali ke topik materi.`;

    const prompt = `${contextPrompt}\n\nPertanyaan user: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      message: text,
      sub_module_name: subModule.name
    });
  } catch (error) {
    // Tangani kasus model 404 dengan pesan yang lebih jelas ke frontend
    if (error.message && error.message.includes('404 Not Found')) {
      return res.status(500).json({
        message: 'Model Gemini tidak ditemukan atau tidak mendukung generateContent. ' +
          'Silakan cek nama model di Google AI Studio dan set ENV GEMINI_MODEL sesuai nama model yang tersedia.',
        error: error.message
      });
    }

    res.status(500).json({ 
      message: 'Error communicating with AI', 
      error: error.message 
    });
  }
};

module.exports = { chat };
