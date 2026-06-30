const apiCatalog = [
  {
    group: "Auth",
    description: "Autentikasi pengguna dan bootstrap sesi frontend.",
    endpoints: [
      { method: "POST", path: "/api/auth/register", auth: "Public", summary: "Registrasi user baru." },
      { method: "POST", path: "/api/auth/login", auth: "Public", summary: "Login dan ambil JWT." },
      { method: "GET", path: "/api/auth/me", auth: "Bearer", summary: "Ambil profil user yang sedang login." },
    ],
  },
  {
    group: "Module",
    description: "Master data modul pembelajaran.",
    endpoints: [
      { method: "GET", path: "/api/modules", auth: "Public", summary: "Daftar semua modul." },
      { method: "GET", path: "/api/modules/:id", auth: "Public", summary: "Detail satu modul." },
      { method: "POST", path: "/api/modules", auth: "Admin", summary: "Tambah modul baru dengan gambar." },
      { method: "PUT", path: "/api/modules/:id", auth: "Admin", summary: "Ubah modul." },
      { method: "DELETE", path: "/api/modules/:id", auth: "Admin", summary: "Hapus modul." },
    ],
  },
  {
    group: "Sub Module",
    description: "Materi turunan di dalam modul.",
    endpoints: [
      { method: "GET", path: "/api/submodules/module/:moduleId", auth: "Public", summary: "Daftar sub modul per modul." },
      { method: "GET", path: "/api/submodules/:id", auth: "Public", summary: "Detail sub modul." },
      { method: "POST", path: "/api/submodules", auth: "Admin", summary: "Tambah sub modul." },
      { method: "PUT", path: "/api/submodules/:id", auth: "Admin", summary: "Ubah sub modul." },
      { method: "DELETE", path: "/api/submodules/:id", auth: "Admin", summary: "Hapus sub modul." },
    ],
  },
  {
    group: "Material",
    description: "Konten materi, PDF, video, dan referensi.",
    endpoints: [
      { method: "GET", path: "/api/materials/submodule/:subModuleId", auth: "Public", summary: "Ambil materi berdasarkan sub modul." },
      { method: "POST", path: "/api/materials", auth: "Admin", summary: "Tambah materi dengan PDF opsional." },
      { method: "PUT", path: "/api/materials/:id", auth: "Admin", summary: "Ubah materi dan reference links." },
      { method: "DELETE", path: "/api/materials/:id", auth: "Admin", summary: "Hapus materi." },
    ],
  },
  {
    group: "Question & Test",
    description: "Bank soal pretest/postest dan submit jawaban.",
    endpoints: [
      { method: "GET", path: "/api/questions/submodule/:subModuleId/:type", auth: "Public", summary: "Daftar soal pretest/postest." },
      { method: "POST", path: "/api/questions", auth: "Admin", summary: "Tambah soal pilihan ganda." },
      { method: "PUT", path: "/api/questions/:id", auth: "Admin", summary: "Ubah soal dan opsi jawaban." },
      { method: "DELETE", path: "/api/questions/:id", auth: "Admin", summary: "Hapus soal." },
      { method: "POST", path: "/api/questions/submit", auth: "Bearer", summary: "Submit jawaban test user." },
    ],
  },
  {
    group: "Progress",
    description: "Status belajar user per sub modul.",
    endpoints: [
      { method: "GET", path: "/api/progress/submodule/:subModuleId", auth: "Bearer", summary: "Progress user login untuk satu sub modul." },
      { method: "GET", path: "/api/progress/user/:userId", auth: "Bearer/Admin", summary: "Daftar progress per user." },
    ],
  },
  {
    group: "User Admin",
    description: "Manajemen pengguna dan export data nilai.",
    endpoints: [
      { method: "GET", path: "/api/users", auth: "Admin", summary: "Daftar semua user." },
      { method: "GET", path: "/api/users/export-progress?subModuleId=", auth: "Admin", summary: "Export CSV pretest/postest per materi." },
      { method: "GET", path: "/api/users/:id", auth: "Admin", summary: "Detail user." },
      { method: "PUT", path: "/api/users/:id", auth: "Admin", summary: "Ubah user." },
      { method: "DELETE", path: "/api/users/:id", auth: "Admin", summary: "Hapus user." },
    ],
  },
  {
    group: "Upload",
    description: "Upload gambar inline editor.",
    endpoints: [
      { method: "POST", path: "/api/upload-image", auth: "Admin", summary: "Upload gambar isi materi/soal." },
    ],
  },
  {
    group: "Contact",
    description: "Feedback publik dari website.",
    endpoints: [
      { method: "GET", path: "/api/contact/feedback", auth: "Admin", summary: "Ambil semua feedback." },
      { method: "PATCH", path: "/api/contact/feedback/:id/status", auth: "Admin", summary: "Tandai feedback sebagai selesai atau buka kembali." },
      { method: "DELETE", path: "/api/contact/feedback/:id", auth: "Admin", summary: "Hapus feedback." },
      { method: "POST", path: "/api/contact/feedback", auth: "Public", summary: "Kirim feedback." },
    ],
  },
  {
    group: "AI",
    description: "Endpoint chat AI internal aplikasi.",
    endpoints: [
      { method: "POST", path: "/api/ai/chat", auth: "Bearer", summary: "Chat AI dengan konteks user login." },
    ],
  },
  {
    group: "Ops",
    description: "Monitoring ringan backend.",
    endpoints: [
      { method: "GET", path: "/api/health", auth: "Public", summary: "Health check sederhana backend." },
      { method: "GET", path: "/", auth: "Public", summary: "Dashboard status backend berbasis EJS." },
      { method: "GET", path: "/docs", auth: "Public", summary: "Dokumentasi visual seluruh endpoint." },
    ],
  },
];

const totalEndpointCount = apiCatalog.reduce(
  (total, group) => total + group.endpoints.length,
  0
);

module.exports = {
  apiCatalog,
  totalEndpointCount,
};
