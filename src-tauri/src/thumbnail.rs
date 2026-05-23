use image::imageops::FilterType;
use image::GenericImageView;
use std::path::Path;

pub fn generate_thumbnail(
    source_path: &Path,
    target_path: &Path,
    max_width: u32,
    quality: u8,
) -> Result<(), String> {
    let img = image::open(source_path).map_err(|e| format!("打开图片失败: {}", e))?;
    let (w, h) = img.dimensions();

    if w <= max_width {
        // Image is already small enough, just save as JPEG
        img.save(target_path).map_err(|e| format!("保存缩略图失败: {}", e))?;
        return Ok(());
    }

    let ratio = max_width as f64 / w as f64;
    let new_h = (h as f64 * ratio) as u32;

    let thumbnail = img.resize(max_width, new_h, FilterType::Lanczos3);
    let mut output = std::fs::File::create(target_path).map_err(|e| e.to_string())?;

    let mut jpeg_encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality);
    let rgb_image = thumbnail.to_rgb8();
    jpeg_encoder.encode_image(&rgb_image).map_err(|e| format!("编码缩略图失败: {}", e))?;

    Ok(())
}

pub fn generate_preview(
    source_path: &Path,
    target_path: &Path,
    max_width: u32,
) -> Result<(), String> {
    generate_thumbnail(source_path, target_path, max_width, 80)
}
