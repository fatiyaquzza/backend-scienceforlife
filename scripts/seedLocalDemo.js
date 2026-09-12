require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
if (process.env.NODE_ENV === "production") {
  console.error("Seed demo ditolak pada environment production.");
  process.exit(1);
}
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const DEMO_EMAIL = "demo.student@ilmana.local";
const DEMO_PASSWORD = "Demo123!";
const choices = [
  ["A", "Pilihan A"],
  ["B", "Pilihan B"],
  ["C", "Pilihan C"],
  ["D", "Pilihan D"],
];

const questionSets = {
  pretest: [
    ["Konsep awal apa yang paling tepat untuk memulai materi ini?", "A"],
    ["Sikap ilmiah mana yang membantu memahami materi secara bertanggung jawab?", "B"],
    ["Mengapa konsep kimia perlu dikaitkan dengan kehidupan sehari-hari?", "C"],
  ],
  postest: [
    ["Bagaimana cara menerapkan gagasan utama materi ini dalam kehidupan sehari-hari?", "A"],
    ["Pilihan mana yang menunjukkan penggunaan pengetahuan secara bertanggung jawab?", "B"],
    ["Apa manfaat mengevaluasi dampak suatu bahan atau proses sebelum digunakan?", "C"],
  ],
};

const demoTeam = {
  Pendiri: [
    ["Dr. Dra. Sulastri, M.Si.", "Pendiri", "Mengembangkan arah pembelajaran ILMANA agar ilmu kimia dekat dengan kehidupan sehari-hari.", "/team-demo/founder-1.jpg"],
    ["Profil Pendiri 02", "Pendiri", "Profil demo untuk memperlihatkan komposisi dua pendiri pada landing page.", "/team-demo/founder-2.jpg"],
  ],
  "Tim Editor": [
    ["Muzainah Salahuddin S.Pd.", "Koordinator Proyek", "Mengoordinasikan penyusunan dan penyuntingan materi pembelajaran.", "/team-demo/editor-1.jpg"],
    ["Profil Editor 02", "Editor Materi", "Profil demo editor materi ILMANA.", "/team-demo/editor-2.jpg"],
    ["Profil Editor 03", "Editor Visual", "Profil demo editor visual ILMANA.", "/team-demo/editor-3.jpg"],
    ["Profil Editor 04", "Penelaah Konten", "Profil demo penelaah konten ILMANA.", "/team-demo/editor-4.jpg"],
    ["Profil Editor 05", "Editor Pembelajaran", "Profil demo editor pembelajaran ILMANA.", "/team-demo/editor-5.jpg"],
  ],
};

async function seedLocalDemo() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.beginTransaction();
    const [users] = await connection.execute("SELECT id FROM users WHERE email = ?", [DEMO_EMAIL]);
    if (!users.length) {
      await connection.execute(
        "INSERT INTO users (name, email, password, role, job) VALUES (?, ?, ?, 'user', ?)",
        ["Siswa Demo ILMANA", DEMO_EMAIL, bcrypt.hashSync(DEMO_PASSWORD, 10), "Penguji lokal"],
      );
    }

    const [subModules] = await connection.execute("SELECT id, name FROM sub_modules ORDER BY id");
    for (const subModule of subModules) {
      for (const [testType, questions] of Object.entries(questionSets)) {
        for (let index = 0; index < questions.length; index += 1) {
          const marker = `<!-- demo-local:${subModule.id}:${testType}:${index + 1} -->`;
          const [existing] = await connection.execute(
            "SELECT id FROM questions WHERE sub_module_id = ? AND type = ? AND question_text LIKE ?",
            [subModule.id, testType, `${marker}%`],
          );
          if (existing.length) continue;

          const [text, correctAnswer] = questions[index];
          const [result] = await connection.execute(
            "INSERT INTO questions (sub_module_id, type, question_type, question_text, correct_answer) VALUES (?, ?, 'choice', ?, ?)",
            [subModule.id, testType, `${marker}<p>${text}</p>`, correctAnswer],
          );
          for (const [label, fallback] of choices) {
            const optionText = label === correctAnswer
              ? `${fallback} — jawaban yang paling sesuai dengan tujuan pembelajaran.`
              : `${fallback} — alternatif untuk menguji pemahaman konsep.`;
            await connection.execute(
              "INSERT INTO question_options (question_id, option_label, option_text) VALUES (?, ?, ?)",
              [result.insertId, label, optionText],
            );
          }
        }
      }
    }

    await connection.execute("DELETE FROM team_members WHERE LOWER(TRIM(name)) IN ('sdsv')");
    for (const [categoryName, members] of Object.entries(demoTeam)) {
      const layout = categoryName === "Pendiri" ? "featured" : "grid";
      await connection.execute(
        `INSERT INTO team_categories (name, layout, sort_order, is_active)
         SELECT ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM team_categories WHERE name = ?)`,
        [categoryName, layout, layout === "featured" ? 1 : 2, categoryName],
      );
      const [[category]] = await connection.execute("SELECT id FROM team_categories WHERE name = ? LIMIT 1", [categoryName]);
      for (let index = 0; index < members.length; index += 1) {
        const [name, role, bio, imageUrl] = members[index];
        const [existing] = await connection.execute("SELECT id FROM team_members WHERE name = ? LIMIT 1", [name]);
        if (existing.length) {
          await connection.execute(
            "UPDATE team_members SET category_id = ?, role = ?, bio = ?, image_url = ?, sort_order = ?, is_active = 1 WHERE id = ?",
            [category.id, role, bio, imageUrl, index + 1, existing[0].id],
          );
        } else {
          await connection.execute(
            "INSERT INTO team_members (category_id, name, role, bio, image_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
            [category.id, name, role, bio, imageUrl, index + 1],
          );
        }
      }
    }
    await connection.commit();
    console.log(`Demo lokal siap: ${subModules.length} submodul, 2 pendiri, 5 editor, akun ${DEMO_EMAIL}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seedLocalDemo().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
