// routes/adminRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

import Admin from "../models/Admin.js";
import Profil from "../models/Profil.js";
import Guru from "../models/Guru.js";
import Siswa from "../models/Siswa.js";
import Alumni from "../models/Alumni.js";
import Berita from "../models/Berita.js";
import Galeri from "../models/Galeri.js";
import Pengumuman from "../models/Pengumuman.js";
import PPDB from "../models/PPDB.js";

const router = express.Router();

// ========== MULTER SETUP ===========
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// ========== AUTH MIDDLEWARE ===========
const auth = (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
};

// ========== ADMIN (seed/register/login) ===========
// register (optional) - protect in production
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing fields" });
    const exists = await Admin.findOne({ username });
    if (exists) return res.status(400).json({ message: "Admin exists" });
    const hash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, password: hash });
    res.json({ message: "Admin created", admin: { id: admin._id, username: admin.username }});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: "User not found" });
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(400).json({ message: "Wrong password" });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========== UPLOAD ENDPOINT ===========
router.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  res.json({ filename: req.file.filename, path: `/uploads/${req.file.filename}` });
});

// ========== CRUD GENERIC HELPERS (for clarity we implement separately) ===========

// ---------- Profil ----------
router.get("/profil", async (req, res) => {
  const items = await Profil.find().sort({ createdAt: -1 });
  res.json(items);
});
router.post("/profil", auth, upload.single("image"), async (req, res) => {
  const { type, title, content } = req.body;
  const image = req.file ? req.file.filename : undefined;
  const doc = await Profil.create({ type, title, content, image });
  res.json(doc);
});
router.put("/profil/:id", auth, upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  if (req.file) body.image = req.file.filename;
  const u = await Profil.findByIdAndUpdate(id, body, { new: true });
  res.json(u);
});
router.delete("/profil/:id", auth, async (req, res) => {
  await Profil.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

// ---------- Guru ----------
router.get("/guru", async (req, res) => {
  const items = await Guru.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post("/guru", auth, upload.single("foto"), async (req, res) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILE:", req.file);
  const obj = { ...req.body };
  if (req.file) obj.foto = req.file.filename;
  const doc = await Guru.create(obj);
  res.json(doc);
});

router.put("/guru/:id", auth, upload.single("foto"), async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.foto = req.file.filename;
  const u = await Guru.findByIdAndUpdate(req.params.id, body, { new: true });
  res.json(u);
});

router.delete("/guru/:id", auth, async (req, res) => {
  try {
    const guru = await Guru.findById(req.params.id);
    if (!guru) {
      return res.status(404).json({ message: "Guru tidak ditemukan" });
    }

    // Hapus file foto jika ada
    if (guru.foto) {
      const filePath = path.join(process.cwd(), "uploads", guru.foto);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Hapus data dari DB
    await Guru.findByIdAndDelete(req.params.id);

    res.json({ message: "Data dan foto berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menghapus data guru" });
  }
});

// ---------- Siswa ----------
router.get("/siswa", async (req, res) => {
  const items = await Siswa.find().sort({ createdAt: -1 });
  res.json(items);
});
router.post("/siswa", auth, upload.single("foto"), async (req, res) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILE:", req.file);
  const obj = { ...req.body };
  if (req.file) obj.foto = req.file.filename;
  const doc = await Siswa.create(obj);
  res.json(doc);
});
router.put("/siswa/:id", auth, upload.single("foto"), async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.foto = req.file.filename;
  const u = await Siswa.findByIdAndUpdate(req.params.id, body, { new: true });
  res.json(u);
});
router.delete("/siswa/:id", auth, async (req, res) => {
  await Siswa.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

// ---------- Alumni ----------
router.get("/alumni", async (req, res) => {
  const items = await Alumni.find().sort({ createdAt: -1 });
  res.json(items);
});
router.post("/alumni", auth, upload.single("foto"), async (req, res) => {
  const obj = { ...req.body };
  if (req.file) obj.foto = req.file.filename;
  const doc = await Alumni.create(obj);
  res.json(doc);
});
router.put("/alumni/:id", auth, upload.single("foto"), async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.foto = req.file.filename;
  const u = await Alumni.findByIdAndUpdate(req.params.id, body, { new: true });
  res.json(u);
});
router.delete("/alumni/:id", auth, async (req, res) => {
  await Alumni.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

// ---------- Berita ----------
router.get("/berita", async (req, res) => {
  const items = await Berita.find().sort({ createdAt: -1 });
  res.json(items);
});
router.get("/berita/:id", async (req, res) => {
  const item = await Berita.findById(req.params.id);
  res.json(item);
});
router.post("/berita", auth, upload.single("foto"), async (req, res) => {
  const obj = { ...req.body };
  if (req.file) obj.cover = req.file.filename;
  const doc = await Berita.create(obj);
  res.json(doc);
});
router.put("/berita/:id", auth, upload.single("foto"), async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.cover = req.file.filename;
  const u = await Berita.findByIdAndUpdate(req.params.id, body, { new: true });
  res.json(u);
});
router.delete("/berita/:id", auth, async (req, res) => {
  await Berita.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

// ---------- Galeri ----------
router.get("/galeri", async (req, res) => {
  const items = await Galeri.find().sort({ createdAt: -1 });
  res.json(items);
});
router.post("/galeri", auth, upload.single("file"), async (req, res) => {
  try {
    const { tipe, judul } = req.body;
    const file = req.file ? req.file.filename : undefined;

    if (!tipe) {
      return res.status(400).json({ error: "Field 'tipe' wajib diisi (foto/vidio)" });
    }

    const doc = await Galeri.create({ tipe, judul, file });
    res.json(doc);
  } catch (err) {
    console.error("❌ Error simpan galeri:", err.message);
    res.status(500).json({ error: "Gagal menyimpan galeri" });
  }
});

router.put("/galeri/:id", auth, upload.single("file"), async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.file = req.file.filename;
  const u = await Galeri.findByIdAndUpdate(req.params.id, body, { new: true });
  res.json(u);
});
router.delete("/galeri/:id", auth, async (req, res) => {
  await Galeri.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

// ---------- Pengumuman ----------
router.get("/pengumuman", async (req, res) => {
  const items = await Pengumuman.find().sort({ createdAt: -1 });
  res.json(items);
});
router.post("/pengumuman", auth, async (req, res) => {
  const doc = await Pengumuman.create(req.body);
  res.json(doc);
});
router.put("/pengumuman/:id", auth, async (req, res) => {
  const u = await Pengumuman.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(u);
});
router.delete("/pengumuman/:id", auth, async (req, res) => {
  await Pengumuman.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

// ---------- PPDB (pendaftar) ----------

router.post("/ppdb/formulir", upload.single("dokumen"), async (req, res) => {
  try {
    const ppdb = new PPDB({
      type: "Formulir",
      nama: req.body.nama,
      nisn: req.body.nisn,
      tgl_lahir: req.body.tgl_lahir,
      alamat: req.body.alamat,
      nama_orangtua: req.body.nama_orangtua,
      hp_orangtua: req.body.hp_orangtua,
      dokumen: req.file ? req.file.filename : null,
    });
    await ppdb.save();
    res.json({ message: "Pendaftaran berhasil", data: ppdb });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal simpan data" });
  }
});

// ADMIN GET ALL
router.get("/ppdb", auth, async (req, res) => {
  try {
    const data = await PPDB.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal ambil data" });
  }
});

// ADMIN UPDATE
router.put("/ppdb/:id", auth, async (req, res) => {
  try {
    const updated = await PPDB.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Gagal update data" });
  }
});

// ADMIN DELETE
router.delete("/ppdb/:id", auth, async (req, res) => {
  try {
    await PPDB.findByIdAndDelete(req.params.id);
    res.json({ message: "Data berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus data" });
  }
});


// Ambil semua data guru
router.get("/guru", async (req, res) => {
  try {
    const data = await Guru.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




export default router;
