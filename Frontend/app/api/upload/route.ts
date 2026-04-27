import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Файл не знайдено" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Підтримуються тільки JPG, PNG, GIF та WebP" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Файл занадто великий (макс. 10MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const extension = file.name.split(".").pop() || "jpg"
    const filename = `${uniqueId}.${extension}`
    const filePath = path.join(uploadDir, filename)

    await writeFile(filePath, buffer)

    const url = `/uploads/${filename}`

    return NextResponse.json({ url, filename })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Помилка при завантаженні файлу" }, { status: 500 })
  }
}