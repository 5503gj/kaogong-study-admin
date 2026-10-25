export async function compressPhoto(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw new Error('请选择8MiB以内的JPG/PNG/WebP')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片无法解码'))
      img.src = url
    })
    if (image.naturalWidth * image.naturalHeight > 12_000_000)
      throw new Error('图片不能超过1200万像素')
    const ratio = Math.min(
        1,
        1280 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持图片处理')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const result = canvas.toDataURL('image/jpeg', 0.75)
    if (result.length > 800_000)
      throw new Error('图片压缩后仍过大，请裁剪题目后上传')
    return result
  } finally {
    URL.revokeObjectURL(url)
  }
}
